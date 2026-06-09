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

        return {
            name: srv.name,
            url: srv.url,
            status: srv.status,
            uptime: Math.round(uptime * 100) / 100,
            avgResponseTime,
            incidents: downEvents.length,
            sslDaysLeft: srv.sslDaysLeft ?? null,
            domainExpiry: srv.domainExpiry ? new Date(srv.domainExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : null,
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
    const rt      = (r) => r === null ? '—' : `${r}&nbsp;ms`;
    const badge   = (s) => s === 'up'
        ? '<span class="b-up">UP</span>'
        : s === 'down'
            ? '<span class="b-dn">DOWN</span>'
            : '<span class="b-uk">—</span>';
    const pct     = (u) => `<span style="font-weight:700;color:${upColor(u)}">${u}%</span>`;
    const esc     = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

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
        </tr>`).join('')
        : '<tr><td colspan="6" class="empty">No monitors found</td></tr>';

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

    const sslWarnings = data.monitors.filter(m => m.sslDaysLeft !== null && m.sslDaysLeft < 30);
    const sslSection  = sslWarnings.length ? `
        <div class="ssl-box">
            <div class="ssl-title">&#9888;&nbsp; SSL Certificates Expiring Soon</div>
            ${sslWarnings.map(m => `<div class="ssl-row">&bull; <strong>${esc(m.name)}</strong> — expires in <span style="color:#dc2626;font-weight:700">${m.sslDaysLeft} days</span></div>`).join('')}
        </div>` : '';

    const avgUptimeColor = upColor(data.summary.avgUptime);
    const incColor       = data.summary.totalIncidents > 0 ? '#dc2626' : '#059669';
    const typeLabel      = data.type === 'weekly' ? 'WEEKLY REPORT' : 'MONTHLY REPORT';

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
@page { size: A4; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: #f1f5f9;
  color: #1e293b;
  -webkit-font-smoothing: antialiased;
  font-size: 13.5px;
  line-height: 1.5;
}

/* ── Print button ─────────────────────────── */
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

/* ── COVER PAGE ───────────────────────────── */
.cover {
  width: 100%;
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 48px 56px 56px;
  position: relative;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.cover-logo {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0;
}
.cover-logo-inner {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cover-logo-icon {
  width: 44px; height: 44px; border-radius: 11px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.cover-logo-text { text-align: right; }
.cover-logo-name { font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; line-height: 1; }
.cover-logo-name em { color: #6366f1; font-style: normal; }
.cover-logo-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; font-weight: 500; }

.cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px 0 20px;
}

.cover-type {
  font-size: 13px; font-weight: 700; color: #6366f1;
  text-transform: uppercase; letter-spacing: 2px;
  margin-bottom: 18px;
}
.cover-title {
  font-size: 52px; font-weight: 900; color: #0f172a;
  letter-spacing: -2px; line-height: 1.05;
  margin-bottom: 10px;
}
.cover-period {
  font-size: 22px; font-weight: 500; color: #475569;
  letter-spacing: -0.3px; margin-bottom: 32px;
}
.cover-divider {
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 40%, #06b6d4 100%);
  border-radius: 3px;
  margin-bottom: 36px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

.cover-meta { display: flex; gap: 56px; }
.cover-meta-item {}
.cover-meta-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
.cover-meta-value { font-size: 14px; font-weight: 600; color: #1e293b; }

.cover-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 40px;
  border-top: 1px solid #f1f5f9;
  margin-top: 20px;
}
.cover-user-name  { font-size: 15px; font-weight: 800; color: #0f172a; }
.cover-user-email { font-size: 12px; color: #64748b; margin-top: 3px; }
.cover-user-id    { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.cover-uptime-big {
  text-align: right;
}
.cover-uptime-num { font-size: 42px; font-weight: 900; letter-spacing: -2px; line-height: 1; color: ${upColor(data.summary.avgUptime)}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cover-uptime-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8; margin-top: 4px; }

/* ── DATA PAGES ───────────────────────────── */
.data-pages {
  max-width: 1020px;
  margin: 0 auto;
  padding: 28px 20px 56px;
}

/* Stats row */
.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 20px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
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

/* Section card */
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
tr.alt td { background: #fff8f8; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.nm { font-weight: 700; color: #0f172a; font-size: 12.5px; }
.nu { font-size: 10.5px; color: #94a3b8; margin-top: 1px; font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.empty { padding: 20px; text-align: center; color: #94a3b8; font-weight: 500; }

/* Badges */
.b-up, .b-dn, .b-uk {
  display: inline-block; padding: 3px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 800; white-space: nowrap;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.b-up { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.b-dn { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
.b-uk { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }

/* SSL warning */
.ssl-box {
  background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
  padding: 14px 18px; margin-bottom: 18px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.ssl-title { font-size: 12.5px; font-weight: 800; color: #92400e; margin-bottom: 7px; }
.ssl-row   { font-size: 12px; color: #a16207; margin-top: 4px; }

/* Footer */
.ftr { text-align: center; padding: 24px 0 0; color: #94a3b8; font-size: 11.5px; line-height: 1.6; }
.ftr strong { color: #4f46e5; }

/* Print */
@media print {
  @page { size: A4; margin: 0; }
  .pdf-btn { display: none !important; }
  body { background: #fff !important; }

  .cover {
    min-height: 297mm;
    height: 297mm;
    page-break-after: always;
    break-after: page;
    padding: 44px 52px 52px;
  }

  .data-pages { padding: 14mm 14mm 14mm; max-width: 100%; }

  .stats { gap: 7px; margin-bottom: 14px; grid-template-columns: repeat(5,1fr) !important; }
  .sc { padding: 12px 8px; border-radius: 8px; }
  .sc-num { font-size: 22px; }
  .sec { margin-bottom: 12px; border-radius: 8px; page-break-inside: avoid; break-inside: avoid; }
  th, td { padding: 7px 11px; }
  .nu { max-width: 220px; }
  tr:hover td { background: transparent !important; }
}
</style>
<script>
  // If ?autoprint=1 is in the URL, trigger print dialog automatically after fonts load
  (function() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('autoprint') === '1') {
      document.addEventListener('DOMContentLoaded', function() {
        // Wait for fonts to render, then print
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(function() {
            setTimeout(function() {
              window.print();
              // Close tab after print dialog is dismissed
              window.addEventListener('afterprint', function() { window.close(); });
            }, 800);
          });
        } else {
          setTimeout(function() {
            window.print();
            window.addEventListener('afterprint', function() { window.close(); });
          }, 1200);
        }
      });
    }
  })();
</script>
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

<!-- ═══════════════════════════════════════════════════
     COVER PAGE
════════════════════════════════════════════════════ -->
<div class="cover">

  <!-- Logo top-right -->
  <div class="cover-logo">
    <div class="cover-logo-inner">
      <div class="cover-logo-text">
        <div class="cover-logo-name">Uptime<em>Forge</em><span style="font-size:11px;color:#6366f1;font-weight:600">.in</span></div>
        <div class="cover-logo-sub">Professional Uptime Monitoring</div>
      </div>
      <div class="cover-logo-icon">&#9889;</div>
    </div>
  </div>

  <!-- Main cover body -->
  <div class="cover-body">
    <div class="cover-type">${typeLabel}</div>
    <div class="cover-title">${esc(data.type === 'weekly' ? 'Weekly\nReport' : 'Monthly\nReport')}</div>
    <div class="cover-period">${esc(data.type === 'weekly'
        ? fmtDate(data.periodStart) + ' – ' + fmtDate(data.periodEnd)
        : new Date(data.periodStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))}</div>

    <div class="cover-divider"></div>

    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Generated</div>
        <div class="cover-meta-value">${data.generatedAt} IST</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Monitors</div>
        <div class="cover-meta-value">${data.summary.totalMonitors} active</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Incidents</div>
        <div class="cover-meta-value" style="color:${incColor}">${data.summary.totalIncidents} event${data.summary.totalIncidents !== 1 ? 's' : ''}</div>
      </div>
    </div>
  </div>

  <!-- Cover footer: user info + uptime big number -->
  <div class="cover-footer">
    <div>
      <div class="cover-user-name">${esc(data.user.name)}</div>
      <div class="cover-user-email">${esc(data.user.email)}</div>
      <div class="cover-user-id">Account ID: ${esc(data.user.accountId)}</div>
    </div>
    <div class="cover-uptime-big">
      <div class="cover-uptime-num">${data.summary.avgUptime}%</div>
      <div class="cover-uptime-lbl">Avg Uptime</div>
    </div>
  </div>

</div>

<!-- ═══════════════════════════════════════════════════
     DATA PAGES
════════════════════════════════════════════════════ -->
<div class="data-pages">

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
      <div class="sc-num" style="font-size:${data.summary.avgResponseTime && data.summary.avgResponseTime > 9999 ? '16px' : data.summary.avgResponseTime && data.summary.avgResponseTime > 999 ? '19px' : '24px'}">${data.summary.avgResponseTime ? data.summary.avgResponseTime + '&nbsp;ms' : '—'}</div>
      <div class="sc-lbl">Avg Response</div>
    </div>
  </div>

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
      ${data.incidents.length > 0 ? `<span class="sec-cnt">${data.incidents.length} event${data.incidents.length > 1 ? 's' : ''}</span>` : ''}
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
