const Server     = require('../models/Server');
const PingTarget = require('../models/PingTarget');
const Alert      = require('../models/Alert');
const User       = require('../models/User');

// ── Build report data from DB ──────────────────────────────────────────────
async function buildReportData(userId, type) {
    const now   = new Date();
    let periodStart, periodEnd, title;

    if (type === 'weekly') {
        periodEnd   = new Date(now);
        periodStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const fmt = (d) => d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
        title = `Weekly Report: ${fmt(periodStart)} – ${fmt(periodEnd)}`;
    } else {
        const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        periodStart = new Date(y, m, 1);
        periodEnd   = new Date(y, m + 1, 0, 23, 59, 59, 999);
        title = `Monthly Report: ${periodStart.toLocaleDateString('en-IN', { month:'long', year:'numeric' })}`;
    }

    const user    = await User.findById(userId).lean();
    const servers = await Server.find({ userId, active: true }).lean();
    const pings   = await PingTarget.find({ userId, active: true }).lean();

    // Incidents in period
    const allIncidents = await Alert.find({
        userId,
        createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort('createdAt').lean();

    const periodMs = periodEnd - periodStart;

    // Per-monitor uptime calculation using incident pairs
    const monitorData = servers.map(srv => {
        const srvAlerts = allIncidents.filter(a => a.source !== 'ping' && a.serverName === srv.name);
        const downEvents   = srvAlerts.filter(a => a.type === 'down');
        const upEvents     = srvAlerts.filter(a => a.type === 'recovered');

        let downtimeMs = 0;
        for (const evt of downEvents) {
            const recovery = upEvents.find(r => r.createdAt > evt.createdAt);
            const recTime  = recovery ? new Date(recovery.createdAt) : periodEnd;
            downtimeMs += Math.min(recTime - new Date(evt.createdAt), periodMs);
        }
        const uptime = Math.max(0, Math.min(100, ((periodMs - downtimeMs) / periodMs) * 100));

        // Avg response time from recent history
        const recentHistory = (srv.history || []).slice(-100);
        const rtSamples = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
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

    // Per-ping uptime
    const pingData = pings.map(pt => {
        const ptAlerts = allIncidents.filter(a => a.source === 'ping' && a.serverName === pt.name);
        const downEvents = ptAlerts.filter(a => a.type === 'down');
        const upEvents   = ptAlerts.filter(a => a.type === 'recovered');

        let downtimeMs = 0;
        for (const evt of downEvents) {
            const recovery = upEvents.find(r => r.createdAt > evt.createdAt);
            const recTime  = recovery ? new Date(recovery.createdAt) : periodEnd;
            downtimeMs += Math.min(recTime - new Date(evt.createdAt), periodMs);
        }
        const uptime = Math.max(0, Math.min(100, ((periodMs - downtimeMs) / periodMs) * 100));
        const recentHistory = (pt.history || []).slice(-100);
        const rtSamples = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
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

    const totalIncidents = allIncidents.filter(a => a.type === 'down').length;
    const uptimeValues   = monitorData.map(m => m.uptime);
    const avgUptime      = uptimeValues.length ? Math.round((uptimeValues.reduce((a, b) => a + b, 0) / uptimeValues.length) * 100) / 100 : 100;
    const rtAll          = monitorData.map(m => m.avgResponseTime).filter(Boolean);
    const avgResponseTime = rtAll.length ? Math.round(rtAll.reduce((a, b) => a + b, 0) / rtAll.length) : null;

    // Recent incidents list (last 20 in period)
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

// ── Generate HTML report ───────────────────────────────────────────────────
function generateHTML(data) {
    const up   = (u) => u >= 99 ? '#16a34a' : u >= 95 ? '#ca8a04' : '#dc2626';
    const rt   = (r) => r === null ? '—' : `${r} ms`;
    const stat = (s) => s === 'up' ? '<span style="background:rgba(22,163,74,0.08);color:#16a34a;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;white-space:nowrap">● UP</span>' : s === 'down' ? '<span style="background:rgba(220,38,38,0.08);color:#dc2626;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;white-space:nowrap">● DOWN</span>' : '<span style="background:rgba(100,116,139,0.08);color:#64748b;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;white-space:nowrap">● —</span>';
    const pct  = (u) => `<span style="font-weight:700;color:${up(u)};font-family:'JetBrains Mono',monospace">${u}%</span>`;

    const monitorRows = data.monitors.length ? data.monitors.map((m, i) => `
        <tr style="border-bottom:1px solid #e2e8f0;${i%2===0?'background:#f8fafc':''}">
            <td style="padding:12px 14px;font-weight:700;color:#0f172a">${m.name}</td>
            <td style="padding:12px 14px;color:#64748b;font-size:12px;word-break:break-all;font-family:'JetBrains Mono',monospace">${m.url}</td>
            <td style="padding:12px 14px;text-align:center">${stat(m.status)}</td>
            <td style="padding:12px 14px;text-align:center">${pct(m.uptime)}</td>
            <td style="padding:12px 14px;text-align:center;color:#334155;font-weight:600;font-family:'JetBrains Mono',monospace">${rt(m.avgResponseTime)}</td>
            <td style="padding:12px 14px;text-align:center;color:${m.incidents>0?'#dc2626':'#16a34a'};font-weight:700">${m.incidents}</td>
            <td style="padding:12px 14px;text-align:center;color:${m.sslDaysLeft!==null&&m.sslDaysLeft<30?'#dc2626':'#16a34a'};font-size:12px;font-weight:600;font-family:'JetBrains Mono',monospace">${m.sslDaysLeft !== null ? `${m.sslDaysLeft}d` : '—'}</td>
        </tr>`).join('') : '<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8;font-weight:500">No monitors found</td></tr>';

    const pingRows = data.pingTargets.length ? data.pingTargets.map((p, i) => `
        <tr style="border-bottom:1px solid #e2e8f0;${i%2===0?'background:#f8fafc':''}">
            <td style="padding:12px 14px;font-weight:700;color:#0f172a">${p.name}</td>
            <td style="padding:12px 14px;color:#64748b;font-family:'JetBrains Mono',monospace">${p.host}</td>
            <td style="padding:12px 14px;text-align:center">${stat(p.status)}</td>
            <td style="padding:12px 14px;text-align:center">${pct(p.uptime)}</td>
            <td style="padding:12px 14px;text-align:center;color:#334155;font-weight:600;font-family:'JetBrains Mono',monospace">${rt(p.avgResponseTime)}</td>
            <td style="padding:12px 14px;text-align:center;color:${p.incidents>0?'#dc2626':'#16a34a'};font-weight:700">${p.incidents}</td>
        </tr>`).join('') : '<tr><td colspan="6" style="padding:24px;text-align:center;color:#94a3b8;font-weight:500">No ping targets configured</td></tr>';

    const incidentRows = data.incidents.length ? data.incidents.map((inc, i) => `
        <tr style="border-bottom:1px solid #e2e8f0;${i%2===0?'background:#fff8f8':''}">
            <td style="padding:12px 14px;font-weight:700;color:#0f172a">${inc.serverName}</td>
            <td style="padding:12px 14px;color:#64748b;font-size:12px;font-family:'JetBrains Mono',monospace">${inc.serverUrl || '—'}</td>
            <td style="padding:12px 14px;text-align:center"><span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;display:inline-block">DOWN</span></td>
            <td style="padding:12px 14px;color:#64748b;font-size:12.5px">${inc.at}</td>
            <td style="padding:12px 14px;text-align:center;font-size:11.5px;font-weight:600;color:#64748b">${inc.source === 'ping' ? '📡 Ping' : '🌐 HTTP'}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="padding:24px;text-align:center;color:#16a34a;font-weight:600;font-size:14px">No incidents during this period</td></tr>';

    const sslWarnings = data.monitors.filter(m => m.sslDaysLeft !== null && m.sslDaysLeft < 30);
    const sslSection = sslWarnings.length ? `
        <div style="margin:28px 0;padding:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;box-shadow: 0 4px 15px rgba(245, 158, 11, 0.05)">
            <div style="font-weight:800;color:#92400e;margin-bottom:12px;font-size:14.5px;display:flex;align-items:center;gap:6px">⚠️ SSL Certificates Expiring Soon</div>
            ${sslWarnings.map(m => `<div style="color:#b45309;font-size:13.5px;margin:6px 0;font-weight:500">• <strong>${m.name}</strong> — SSL expires in <strong style="color:#dc2626">${m.sslDaysLeft} days</strong></div>`).join('')}
        </div>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${data.title} — UptimeForge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #1e293b; -webkit-font-smoothing: antialiased; }
  
  .print-btn {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    padding: 10px 24px;
    border-radius: 30px;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    z-index: 999;
  }
  .print-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
  }
  
  .page { max-width: 1000px; margin: 0 auto; padding: 40px 24px 60px; }
  
  .header {
    background: linear-gradient(135deg, #090d16 0%, #111827 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 32px 36px;
    margin-bottom: 28px;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  }
  
  .brand { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; }
  .brand span { color: #a78bfa; }
  .brand-sub { font-size: 12px; color: #94a3b8; margin-top: 3px; font-weight: 500; }
  .report-title { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; margin-top: 14px; color: #fff; }
  .report-meta { font-size: 12.5px; color: #94a3b8; margin-top: 5px; font-weight: 500; }
  .header-right { text-align: right; }
  .user-name { font-size: 15px; font-weight: 700; color: #fff; }
  .user-meta { font-size: 12px; color: #94a3b8; margin-top: 5px; line-height: 1.8; font-weight: 500; }
  
  .section { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.05); }
  .section-head { padding: 16px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #64748b; display: flex; align-items: center; gap: 8px; }
  
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; padding: 20px; }
  .stat-box { background: #f8fafc; border-radius: 12px; padding: 22px 14px; text-align: center; border: 1px solid #e2e8f0; transition: transform 0.2s; }
  .stat-box:hover { transform: translateY(-2px); }
  .stat-val { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900; color: #0f172a; line-height: 1; }
  .stat-lbl { font-size: 10.5px; color: #64748b; margin-top: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
  
  table { width: 100%; border-collapse: collapse; }
  th { padding: 12px 14px; background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 700; text-align: left; text-transform: uppercase; letter-spacing: .5px; border-bottom: 2px solid #e2e8f0; }
  th.center { text-align: center; }
  td { padding: 12px 14px; font-size: 13.5px; color: #1e293b; }
  
  .footer { text-align: center; padding: 32px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.6; }
  .footer strong { color: #7c3aed; }
  
  @media print {
    .print-btn { display: none !important; }
    body { background: #fff; }
    .page { padding: 0; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; border: none; }
    .section { box-shadow: none; border: 1px solid #e2e8f0; page-break-inside: avoid; }
    .stat-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f8fafc !important; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
  Save as PDF
</button>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">Uptime<span>Forge</span><span style="font-size:13px;color:#a78bfa;font-weight:600">.in</span></div>
      <div class="brand-sub">Professional Uptime Monitoring</div>
      <div class="report-title">${data.title}</div>
      <div class="report-meta">Generated: ${data.generatedAt} IST</div>
    </div>
    <div class="header-right">
      <div class="user-name">${data.user.name}</div>
      <div class="user-meta">
        📧 ${data.user.email}<br>
        🆔 ${data.user.accountId}
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-head">📊 Summary</div>
    <div class="summary-grid">
      <div class="stat-box">
        <div class="stat-val">${data.summary.totalMonitors}</div>
        <div class="stat-lbl">Monitors</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${data.summary.totalPingTargets}</div>
        <div class="stat-lbl">Ping Targets</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color:${data.summary.avgUptime >= 99 ? '#16a34a' : data.summary.avgUptime >= 95 ? '#ca8a04' : '#dc2626'}">${data.summary.avgUptime}%</div>
        <div class="stat-lbl">Avg Uptime</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color:${data.summary.totalIncidents > 0 ? '#dc2626' : '#16a34a'}">${data.summary.totalIncidents}</div>
        <div class="stat-lbl">Incidents</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="font-size:22px">${data.summary.avgResponseTime ? data.summary.avgResponseTime + ' ms' : '—'}</div>
        <div class="stat-lbl">Avg Response</div>
      </div>
    </div>
  </div>

  ${sslSection}

  <!-- Monitor Table -->
  <div class="section">
    <div class="section-head">🌐 Monitor Performance</div>
    <table>
      <thead>
        <tr>
          <th>Monitor Name</th>
          <th>URL</th>
          <th class="center">Status</th>
          <th class="center">Uptime %</th>
          <th class="center">Avg Response</th>
          <th class="center">Incidents</th>
          <th class="center">SSL (days)</th>
        </tr>
      </thead>
      <tbody>${monitorRows}</tbody>
    </table>
  </div>

  <!-- Ping Targets -->
  ${data.pingTargets.length > 0 ? `
  <div class="section">
    <div class="section-head">📡 Ping Monitor</div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Host</th>
          <th class="center">Status</th>
          <th class="center">Uptime %</th>
          <th class="center">Avg Response</th>
          <th class="center">Incidents</th>
        </tr>
      </thead>
      <tbody>${pingRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Incidents -->
  <div class="section">
    <div class="section-head">🚨 Incidents During Period ${data.incidents.length > 0 ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 10px;border-radius:20px;font-size:11px">${data.incidents.length} event${data.incidents.length>1?'s':''}</span>` : ''}</div>
    <table>
      <thead>
        <tr>
          <th>Monitor</th>
          <th>URL / Host</th>
          <th class="center">Event</th>
          <th>Time (IST)</th>
          <th class="center">Type</th>
        </tr>
      </thead>
      <tbody>${incidentRows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <strong>UptimeForge.in</strong> — Professional Uptime Monitoring &nbsp;|&nbsp; © 2026 UptimeForge.in<br>
    <span style="font-size:11px;margin-top:4px;display:block">This report was automatically generated by UptimeForge. Data is based on monitoring records for the selected period.</span>
  </div>

</div>
</body>
</html>`;
}

module.exports = { buildReportData, generateHTML };

