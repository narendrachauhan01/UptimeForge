const Server     = require('../models/Server');
const PingTarget = require('../models/PingTarget');
const Alert      = require('../models/Alert');
const User       = require('../models/User');

async function buildReportData(userId, type) {
    const now   = new Date();
    let periodStart, periodEnd, title;

    if (type === 'weekly') {
        periodEnd   = new Date(now);
        periodStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const fmt = (d) => d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        title = `Weekly Report: ${fmt(periodStart)} – ${fmt(periodEnd)}`;
    } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        periodEnd   = new Date(now);
        title = `Monthly Report: ${periodStart.toLocaleDateString('en-IN', { month:'long', year:'numeric' })}`;
    }

    const user    = await User.findById(userId).lean();
    const servers = await Server.find({ userId, active: true }).lean();
    const pings   = await PingTarget.find({ userId, active: true }).lean();

    const allIncidents = await Alert.find({
        userId,
        createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort('createdAt').lean();

    const periodMs = periodEnd - periodStart;

    const monitorData = servers.map(srv => {
        const srvAlerts  = allIncidents.filter(a => a.source !== 'ping' && a.serverName === srv.name);
        const downEvents = srvAlerts.filter(a => a.type === 'down');
        const upEvents   = srvAlerts.filter(a => a.type === 'recovered');

        let downtimeMs = 0;
        for (const evt of downEvents) {
            const recovery = upEvents.find(r => r.createdAt > evt.createdAt);
            const recTime  = recovery ? new Date(recovery.createdAt) : periodEnd;
            downtimeMs += Math.min(recTime - new Date(evt.createdAt), periodMs);
        }
        const uptime = Math.max(0, Math.min(100, ((periodMs - downtimeMs) / periodMs) * 100));

        const recentHistory   = (srv.history || []).slice(-100);
        const rtSamples       = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
        const avgResponseTime = rtSamples.length ? Math.round(rtSamples.reduce((a, b) => a + b, 0) / rtSamples.length) : (srv.responseTime || null);

        const domainDaysLeft = srv.domainExpiry
            ? Math.ceil((new Date(srv.domainExpiry) - now) / (1000 * 60 * 60 * 24))
            : null;

        return {
            name: srv.name,
            url: srv.url,
            status: srv.status,
            uptime: Math.round(uptime * 100) / 100,
            avgResponseTime,
            incidents: downEvents.length,
            sslDaysLeft: srv.sslDaysLeft ?? null,
            domainExpiry: srv.domainExpiry ? new Date(srv.domainExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : null,
            domainDaysLeft,
        };
    });

    const pingData = pings.map(pt => {
        const ptAlerts   = allIncidents.filter(a => a.source === 'ping' && a.serverName === pt.name);
        const downEvents = ptAlerts.filter(a => a.type === 'down');
        const upEvents   = ptAlerts.filter(a => a.type === 'recovered');

        let downtimeMs = 0;
        for (const evt of downEvents) {
            const recovery = upEvents.find(r => r.createdAt > evt.createdAt);
            const recTime  = recovery ? new Date(recovery.createdAt) : periodEnd;
            downtimeMs += Math.min(recTime - new Date(evt.createdAt), periodMs);
        }
        const uptime = Math.max(0, Math.min(100, ((periodMs - downtimeMs) / periodMs) * 100));
        const recentHistory   = (pt.history || []).slice(-100);
        const rtSamples       = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
        const avgResponseTime = rtSamples.length ? Math.round(rtSamples.reduce((a, b) => a + b, 0) / rtSamples.length) : (pt.responseTime || null);

        return {
            name: pt.name,
            host: `${pt.host}${pt.port ? ':' + pt.port : ''}`,
            status: pt.status,
            uptime: Math.round(uptime * 100) / 100,
            avgResponseTime,
            incidents: downEvents.length,
        };
    });

    const totalIncidents  = allIncidents.filter(a => a.type === 'down').length;
    const uptimeValues    = monitorData.map(m => m.uptime);
    const avgUptime       = uptimeValues.length ? Math.round((uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length) * 100) / 100 : 100;
    const rtAll           = monitorData.map(m => m.avgResponseTime).filter(Boolean);
    const avgResponseTime = rtAll.length ? Math.round(rtAll.reduce((a, b) => a + b, 0) / rtAll.length) : null;

    const incidentList = allIncidents.filter(a => a.type === 'down').slice(-20).reverse().map(a => ({
        serverName: a.serverName,
        serverUrl:  a.serverUrl,
        type:       a.type,
        source:     a.source || 'monitor',
        at: new Date(a.createdAt).toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }),
    }));

    return {
        type, title, periodStart, periodEnd,
        generatedAt: new Date().toLocaleString('en-IN', { timeZone:'Asia/Kolkata', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }),
        user: { name: user?.name || 'N/A', accountId: user?.accountId || 'N/A', email: user?.email || 'N/A' },
        summary: { totalMonitors: servers.length, totalPingTargets: pings.length, totalIncidents, avgUptime, avgResponseTime },
        monitors: monitorData,
        pingTargets: pingData,
        incidents: incidentList,
    };
}

function generateHTML(data) {
    const upColor = (u) => u >= 99 ? '#059669' : u >= 95 ? '#b45309' : '#dc2626';
    const rt      = (r) => r === null ? '—' : `${r} ms`;
    const badge   = (s) => s === 'up'
        ? '<span class="b-up">UP</span>'
        : s === 'down'
            ? '<span class="b-dn">DOWN</span>'
            : '<span class="b-uk">—</span>';
    const pct     = (u) => `<span style="font-weight:700;color:${upColor(u)}">${u}%</span>`;
    const esc     = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const monitorRows = data.monitors.length
        ? data.monitors.map(m => `
        <tr>
            <td>
                <div class="nm">${esc(m.name)}</div>
                <div class="nu">${esc(m.url)}</div>
            </td>
            <td class="tc">${badge(m.status)}</td>
            <td class="tc">${pct(m.uptime)}</td>
            <td class="tc mo">${rt(m.avgResponseTime)}</td>
            <td class="tc" style="color:${m.incidents > 0 ? '#dc2626' : '#059669'};font-weight:700">${m.incidents}</td>
            <td class="tc mo" style="color:${m.sslDaysLeft !== null && m.sslDaysLeft < 30 ? '#dc2626' : '#475569'}">${m.sslDaysLeft !== null ? `${m.sslDaysLeft}d` : '—'}</td>
            <td class="tc" style="color:${m.domainDaysLeft !== null && m.domainDaysLeft < 30 ? '#dc2626' : '#475569'};font-size:12px">${m.domainExpiry || '—'}</td>
        </tr>`).join('')
        : '<tr><td colspan="7" class="empty">No monitors found</td></tr>';

    const pingRows = data.pingTargets.length
        ? data.pingTargets.map(p => `
        <tr>
            <td>
                <div class="nm">${esc(p.name)}</div>
                <div class="nu">${esc(p.host)}</div>
            </td>
            <td class="tc">${badge(p.status)}</td>
            <td class="tc">${pct(p.uptime)}</td>
            <td class="tc mo">${rt(p.avgResponseTime)}</td>
            <td class="tc" style="color:${p.incidents > 0 ? '#dc2626' : '#059669'};font-weight:700">${p.incidents}</td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty">No ping targets configured</td></tr>';

    const incidentRows = data.incidents.length
        ? data.incidents.map((inc, i) => `
        <tr${i % 2 === 0 ? ' class="alt"' : ''}>
            <td><div class="nm">${esc(inc.serverName)}</div></td>
            <td class="mo url-td">${esc(inc.serverUrl || '—')}</td>
            <td class="tc"><span class="b-dn">DOWN</span></td>
            <td style="font-size:12px;color:#475569">${inc.at}</td>
            <td class="tc" style="font-size:11.5px;color:#64748b;font-weight:600">${inc.source === 'ping' ? 'Ping' : 'HTTP'}</td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty" style="color:#059669">No incidents during this period</td></tr>';

    // Domain expiry rows — all monitors sorted by days left ascending
    const domainRows = data.monitors.length
        ? [...data.monitors]
            .sort((a, b) => {
                if (a.domainDaysLeft === null) return 1;
                if (b.domainDaysLeft === null) return -1;
                return a.domainDaysLeft - b.domainDaysLeft;
            })
            .map((m, i) => {
                const daysLeft = m.domainDaysLeft;
                const statusColor = daysLeft === null ? '#94a3b8'
                    : daysLeft < 14  ? '#dc2626'
                    : daysLeft < 30  ? '#d97706'
                    : daysLeft < 90  ? '#b45309'
                    : '#059669';
                const statusLabel = daysLeft === null ? '—'
                    : daysLeft < 0   ? 'Expired'
                    : daysLeft < 14  ? `${daysLeft}d — Critical`
                    : daysLeft < 30  ? `${daysLeft}d — Expiring Soon`
                    : daysLeft < 90  ? `${daysLeft}d — Renew Soon`
                    : `${daysLeft}d — OK`;
                return `
        <tr${i % 2 !== 0 ? ' class="alt"' : ''}>
            <td>
                <div class="nm">${esc(m.name)}</div>
                <div class="nu">${esc(m.url)}</div>
            </td>
            <td class="tc mo" style="font-size:12px;color:#334155">${m.domainExpiry || '—'}</td>
            <td class="tc" style="font-weight:700;color:${statusColor}">${statusLabel}</td>
        </tr>`;
            }).join('')
        : '<tr><td colspan="3" class="empty">No monitors found</td></tr>';

    const sslWarnings    = data.monitors.filter(m => m.sslDaysLeft    !== null && m.sslDaysLeft    < 30);
    const domainWarnings = data.monitors.filter(m => m.domainDaysLeft !== null && m.domainDaysLeft < 30);

    const sslSection = sslWarnings.length ? `
        <div class="alert-box warn">
            <div class="alert-title">&#9888; SSL Certificates Expiring Soon</div>
            ${sslWarnings.map(m => `<div class="alert-row">&bull; <strong>${esc(m.name)}</strong> — expires in <span style="color:#dc2626;font-weight:700">${m.sslDaysLeft} days</span></div>`).join('')}
        </div>` : '';

    const domainWarnSection = domainWarnings.length ? `
        <div class="alert-box danger">
            <div class="alert-title" style="color:#991b1b">&#128683; Domain Names Expiring Soon</div>
            ${domainWarnings.map(m => `<div class="alert-row" style="color:#7f1d1d">&bull; <strong>${esc(m.name)}</strong> (${esc(m.url)}) — expires on <span style="color:#dc2626;font-weight:700">${m.domainExpiry}</span> (${m.domainDaysLeft} days left)</div>`).join('')}
        </div>` : '';

    const avgUptimeColor = upColor(data.summary.avgUptime);
    const incColor       = data.summary.totalIncidents > 0 ? '#dc2626' : '#059669';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.title)} — UptimeForge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm 14mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
  font-size: 13.5px;
  line-height: 1.5;
}

.pdf-btn {
  position: fixed; top: 18px; right: 18px; z-index: 999;
  background: #4f46e5; color: #fff; border: none;
  padding: 9px 18px; border-radius: 8px; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 4px 14px rgba(79,70,229,.3);
  transition: background .2s;
}
.pdf-btn:hover { background: #4338ca; }

.page { max-width: 1020px; margin: 0 auto; padding: 28px 20px 56px; }

/* Header */
.hdr {
  background: #0f172a;
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.brand-ico {
  width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.brand-txt { font-size: 20px; font-weight: 900; color: #f8fafc; letter-spacing: -0.4px; line-height: 1; }
.brand-txt em { color: #a5b4fc; font-style: normal; }
.brand-sub { font-size: 11.5px; color: #94a3b8; margin-top: 3px; }
.rpt-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px; margin-bottom: 7px;
  background: rgba(99,102,241,.18); border: 1px solid rgba(165,180,252,.3);
  color: #a5b4fc; font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 1.2px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.rpt-title { font-size: 18px; font-weight: 800; color: #f8fafc; letter-spacing: -0.3px; }
.rpt-time  { font-size: 11.5px; color: #94a3b8; margin-top: 5px; }
.user-box {
  background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
  border-radius: 10px; padding: 12px 16px; text-align: right; min-width: 200px; flex-shrink: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.user-name  { font-size: 13px; font-weight: 800; color: #f1f5f9; }
.user-email { font-size: 11.5px; color: #94a3b8; margin-top: 4px; }
.user-id    { font-size: 11px; color: #64748b; margin-top: 3px; font-weight: 600; }

/* Stats */
.stats {
  display: grid; grid-template-columns: repeat(5,1fr); gap: 10px;
  margin-bottom: 20px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sc {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 16px 10px; text-align: center;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sc-icon {
  width: 30px; height: 30px; border-radius: 8px; margin: 0 auto 9px;
  display: flex; align-items: center; justify-content: center;
  background: #f1f5f9; color: #6366f1;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sc-icon.g { background: #f0fdf4; color: #059669; }
.sc-icon.r { background: #fff1f2; color: #dc2626; }
.sc-num { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -1px; line-height: 1; }
.sc-lbl { font-size: 10px; color: #64748b; margin-top: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

/* Section */
.sec {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  margin-bottom: 18px; overflow: hidden;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sec-hd {
  padding: 11px 18px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  font-size: 10.5px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.8px; color: #475569;
  display: flex; align-items: center; gap: 8px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sec-cnt {
  margin-left: auto; background: #fff1f2; color: #dc2626;
  border: 1px solid #fecdd3; padding: 1px 8px; border-radius: 20px;
  font-size: 10.5px; font-weight: 700; text-transform: none; letter-spacing: 0;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.sec-cnt.ok {
  background: #f0fdf4; color: #059669; border-color: #bbf7d0;
}

/* Tables */
.tw { width: 100%; overflow-x: auto; }
table  { width: 100%; border-collapse: collapse; }
th {
  padding: 9px 14px; background: #f8fafc; color: #64748b;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.6px; border-bottom: 1.5px solid #e2e8f0; white-space: nowrap;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
th.tc { text-align: center; }
td { padding: 9px 14px; font-size: 12.5px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; }
td.tc { text-align: center; }
td.mo { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #475569; }
td.url-td { font-size: 11px; color: #64748b; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafafa; }
tr.alt td { background: #fef9f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.nm { font-weight: 700; color: #0f172a; font-size: 12.5px; }
.nu { font-size: 10.5px; color: #94a3b8; margin-top: 1px; font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.empty { padding: 20px; text-align: center; color: #94a3b8; font-weight: 500; }

/* Badges */
.b-up, .b-dn, .b-uk {
  display: inline-block; padding: 3px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 800;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.b-up { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.b-dn { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
.b-uk { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

/* Alert boxes */
.alert-box {
  border-radius: 10px; padding: 14px 18px; margin-bottom: 18px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.alert-box.warn   { background: #fffbeb; border: 1px solid #fde68a; }
.alert-box.danger { background: #fff1f2; border: 1px solid #fecdd3; }
.alert-title { font-size: 12.5px; font-weight: 800; color: #92400e; margin-bottom: 7px; }
.alert-row   { font-size: 12px; color: #a16207; margin-top: 4px; }

/* Footer */
.ftr { text-align: center; padding: 24px 0 0; color: #94a3b8; font-size: 11.5px; line-height: 1.6; }
.ftr strong { color: #4f46e5; }

@media (max-width: 700px) {
  .hdr { flex-direction: column; }
  .user-box { text-align: left; min-width: unset; width: 100%; }
  .stats { grid-template-columns: repeat(3,1fr); }
}

@media print {
  .pdf-btn { display: none !important; }
  body { background: #fff !important; }
  .page { padding: 0; max-width: 100%; }
  .hdr { border-radius: 8px; margin-bottom: 14px; padding: 18px 22px; }
  .stats { gap: 7px; margin-bottom: 14px; grid-template-columns: repeat(5,1fr) !important; }
  .sc { padding: 12px 8px; border-radius: 8px; }
  .sc-num { font-size: 22px; }
  .sec { margin-bottom: 12px; border-radius: 8px; page-break-inside: avoid; break-inside: avoid; }
  th, td { padding: 7px 11px; }
  .nu { max-width: 220px; }
  tr:hover td { background: transparent !important; }
  tr.alt td { background: #fef9f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>

<button class="pdf-btn" onclick="window.print()">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
  Save as PDF
</button>

<div class="page">

  <!-- Header -->
  <div class="hdr">
    <div style="flex:1;min-width:0">
      <div class="brand-row">
        <div class="brand-ico">&#9889;</div>
        <div>
          <div class="brand-txt">Uptime<em>Forge</em><span style="font-size:11px;color:#818cf8;font-weight:600">.in</span></div>
          <div class="brand-sub">Professional Uptime Monitoring</div>
        </div>
      </div>
      <span class="rpt-badge">${esc(data.type)} report</span>
      <div class="rpt-title">${esc(data.title)}</div>
      <div class="rpt-time">Generated: ${data.generatedAt} IST</div>
    </div>
    <div class="user-box">
      <div class="user-name">${esc(data.user.name)}</div>
      <div class="user-email">${esc(data.user.email)}</div>
      <div class="user-id">Account&nbsp;ID: ${esc(data.user.accountId)}</div>
    </div>
  </div>

  <!-- Summary Stats -->
  <div class="stats">
    <div class="sc">
      <div class="sc-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div>
      <div class="sc-num">${data.summary.totalMonitors}</div>
      <div class="sc-lbl">Monitors</div>
    </div>
    <div class="sc">
      <div class="sc-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.58 16.14a6 6 0 0 1 6.84 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg></div>
      <div class="sc-num">${data.summary.totalPingTargets}</div>
      <div class="sc-lbl">Ping Targets</div>
    </div>
    <div class="sc">
      <div class="sc-icon g"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="sc-num" style="color:${avgUptimeColor}">${data.summary.avgUptime}%</div>
      <div class="sc-lbl">Avg Uptime</div>
    </div>
    <div class="sc">
      <div class="sc-icon r"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      <div class="sc-num" style="color:${incColor}">${data.summary.totalIncidents}</div>
      <div class="sc-lbl">Incidents</div>
    </div>
    <div class="sc">
      <div class="sc-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      <div class="sc-num" style="font-size:${data.summary.avgResponseTime && data.summary.avgResponseTime > 999 ? '19px' : '24px'}">${data.summary.avgResponseTime ? data.summary.avgResponseTime + '&nbsp;ms' : '—'}</div>
      <div class="sc-lbl">Avg Response</div>
    </div>
  </div>

  ${domainWarnSection}
  ${sslSection}

  <!-- Monitor Performance -->
  <div class="sec">
    <div class="sec-hd">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      Monitor Performance
    </div>
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Monitor / URL</th>
            <th class="tc">Status</th>
            <th class="tc">Uptime</th>
            <th class="tc">Avg Response</th>
            <th class="tc">Incidents</th>
            <th class="tc">SSL</th>
            <th class="tc">Domain Expiry</th>
          </tr>
        </thead>
        <tbody>${monitorRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Ping Monitor -->
  ${data.pingTargets.length > 0 ? `
  <div class="sec">
    <div class="sec-hd">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.58 16.14a6 6 0 0 1 6.84 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
      Ping Monitor
    </div>
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Name / Host</th>
            <th class="tc">Status</th>
            <th class="tc">Uptime</th>
            <th class="tc">Avg Response</th>
            <th class="tc">Incidents</th>
          </tr>
        </thead>
        <tbody>${pingRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Incidents -->
  <div class="sec">
    <div class="sec-hd">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      Incidents During Period
      ${data.incidents.length > 0
        ? `<span class="sec-cnt">${data.incidents.length} event${data.incidents.length > 1 ? 's' : ''}</span>`
        : '<span class="sec-cnt ok">No Incidents</span>'}
    </div>
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Monitor</th>
            <th>URL / Host</th>
            <th class="tc">Event</th>
            <th>Time (IST)</th>
            <th class="tc">Type</th>
          </tr>
        </thead>
        <tbody>${incidentRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Domain Expiry Details -->
  <div class="sec">
    <div class="sec-hd">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Domain Expiry Details
      ${domainWarnings.length > 0
        ? `<span class="sec-cnt">${domainWarnings.length} expiring soon</span>`
        : ''}
    </div>
    <div class="tw">
      <table>
        <thead>
          <tr>
            <th>Site / URL</th>
            <th class="tc">Domain Expiry Date</th>
            <th class="tc">Status</th>
          </tr>
        </thead>
        <tbody>${domainRows}</tbody>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <div class="ftr">
    <strong>UptimeForge.in</strong> — Professional Uptime Monitoring &nbsp;|&nbsp; &copy; 2026 UptimeForge.in<br>
    <span style="font-size:10.5px;display:block;margin-top:3px">This report was automatically generated. Data is based on monitoring records for the selected period.</span>
  </div>

</div>
</body>
</html>`;
}

module.exports = { buildReportData, generateHTML };
