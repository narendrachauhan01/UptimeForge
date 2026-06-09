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
    const up   = (u) => u >= 99 ? '#10b981' : u >= 95 ? '#d97706' : '#f43f5e';
    const rt   = (r) => r === null ? '—' : `${r} ms`;
    const stat = (s) => s === 'up' 
        ? '<span class="badge-up"><span class="dot-pulse"></span>UP</span>' 
        : s === 'down' 
            ? '<span class="badge-down"><span class="dot-pulse"></span>DOWN</span>' 
            : '<span style="background:rgba(100,116,139,0.08);color:#64748b;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;display:inline-block;white-space:nowrap">● —</span>';
    const pct  = (u) => `<span style="font-weight:700;color:${up(u)};font-family:'JetBrains Mono',monospace">${u}%</span>`;

    const monitorRows = data.monitors.length ? data.monitors.map((m, i) => `
        <tr class="row-hover">
            <td style="font-weight:700;color:#0f172a">${m.name}</td>
            <td style="color:#64748b;font-size:12.5px;word-break:break-all;font-family:'JetBrains Mono',monospace">${m.url}</td>
            <td style="text-align:center">${stat(m.status)}</td>
            <td style="text-align:center">${pct(m.uptime)}</td>
            <td style="text-align:center;color:#334155;font-weight:600;font-family:'JetBrains Mono',monospace">${rt(m.avgResponseTime)}</td>
            <td style="text-align:center;color:${m.incidents>0?'#f43f5e':'#10b981'};font-weight:700">${m.incidents}</td>
            <td style="text-align:center;color:${m.sslDaysLeft!==null&&m.sslDaysLeft<30?'#f43f5e':'#10b981'};font-size:12.5px;font-weight:600;font-family:'JetBrains Mono',monospace">${m.sslDaysLeft !== null ? `${m.sslDaysLeft}d` : '—'}</td>
        </tr>`).join('') : '<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8;font-weight:500">No monitors found</td></tr>';

    const pingRows = data.pingTargets.length ? data.pingTargets.map((p, i) => `
        <tr class="row-hover">
            <td style="font-weight:700;color:#0f172a">${p.name}</td>
            <td style="color:#64748b;font-family:'JetBrains Mono',monospace">${p.host}</td>
            <td style="text-align:center">${stat(p.status)}</td>
            <td style="text-align:center">${pct(p.uptime)}</td>
            <td style="text-align:center;color:#334155;font-weight:600;font-family:'JetBrains Mono',monospace">${rt(p.avgResponseTime)}</td>
            <td style="text-align:center;color:${p.incidents>0?'#f43f5e':'#10b981'};font-weight:700">${p.incidents}</td>
        </tr>`).join('') : '<tr><td colspan="6" style="padding:24px;text-align:center;color:#94a3b8;font-weight:500">No ping targets configured</td></tr>';

    const incidentRows = data.incidents.length ? data.incidents.map((inc, i) => `
        <tr class="row-hover" style="${i%2===0?'background:#fff8f8':''}">
            <td style="font-weight:700;color:#0f172a">${inc.serverName}</td>
            <td style="color:#64748b;font-size:12.5px;font-family:'JetBrains Mono',monospace">${inc.serverUrl || '—'}</td>
            <td style="text-align:center"><span style="background:rgba(244,63,94,0.1);color:#e11d48;border:1px solid rgba(244,63,94,0.2);padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;display:inline-block">DOWN</span></td>
            <td style="color:#64748b;font-size:12.5px">${inc.at}</td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:#64748b">${inc.source === 'ping' ? '📡 Ping' : '🌐 HTTP'}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="padding:24px;text-align:center;color:#10b981;font-weight:600;font-size:14px">No incidents during this period</td></tr>';

    const sslWarnings = data.monitors.filter(m => m.sslDaysLeft !== null && m.sslDaysLeft < 30);
    const sslSection = sslWarnings.length ? `
        <div style="margin-bottom:32px;padding:24px;background:#fffbeb;border:1px solid #fef08a;border-radius:24px;box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.05)">
            <div style="font-weight:800;color:#854d0e;margin-bottom:12px;font-size:15px;display:flex;align-items:center;gap:8px">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              SSL Certificates Expiring Soon
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${sslWarnings.map(m => `<div style="color:#a16207;font-size:14px;font-weight:500">• <strong style="color:#854d0e">${m.name}</strong> — SSL expires in <strong style="color:#e11d48">${m.sslDaysLeft} days</strong> (${m.url})</div>`).join('')}
            </div>
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
  body {
    font-family: 'Plus Jakarta Sans', sans-serif;
    background-color: #f1f5f9;
    background-image: radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.04) 0px, transparent 50%), radial-gradient(at 50% 0%, rgba(124, 58, 237, 0.04) 0px, transparent 50%);
    color: #334155;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  
  .print-btn {
    position: fixed;
    top: 24px;
    right: 24px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff;
    border: none;
    padding: 12px 24px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    z-index: 999;
  }
  .print-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
    background: linear-gradient(135deg, #4f46e5, #4338ca);
  }
  .print-btn:active {
    transform: translateY(0);
  }
  
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 24px 80px; }
  
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 24px;
    padding: 36px 40px;
    margin-bottom: 32px;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.3);
  }
  .header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
    pointer-events: none;
  }
  
  .brand-container { display: flex; align-items: center; gap: 12px; }
  .brand-logo {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: #fff;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 22px;
    font-family: 'Outfit', sans-serif;
    box-shadow: 0 8px 16px -4px rgba(99, 102, 241, 0.4);
  }
  .brand { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900; letter-spacing: -0.5px; line-height: 1; }
  .brand span { color: #818cf8; }
  .brand-sub { font-size: 13px; color: #94a3b8; margin-top: 4px; font-weight: 500; }
  
  .report-title-container { margin-top: 20px; }
  .report-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.3);
    color: #a5b4fc;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 8px;
  }
  .report-title { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; color: #fff; line-height: 1.2; }
  .report-meta { font-size: 13px; color: #94a3b8; margin-top: 8px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  
  .header-right { text-align: right; display: flex; flex-direction: column; justify-content: center; }
  .user-badge {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 16px 20px;
    border-radius: 16px;
    backdrop-filter: blur(8px);
  }
  .user-name { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.2px; }
  .user-meta { font-size: 13px; color: #94a3b8; margin-top: 6px; font-weight: 500; line-height: 1.5; }
  .user-meta a { color: #818cf8; text-decoration: none; }
  .user-meta a:hover { text-decoration: underline; }
  
  .section {
    background: #fff;
    border-radius: 24px;
    border: 1px solid #e2e8f0;
    margin-bottom: 32px;
    overflow: hidden;
    box-shadow: 0 10px 30px -10px rgba(148, 163, 184, 0.12);
    transition: box-shadow 0.3s ease;
  }
  .section:hover {
    box-shadow: 0 20px 40px -15px rgba(148, 163, 184, 0.18);
  }
  .section-head {
    padding: 20px 24px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #475569;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .section-head svg { color: #6366f1; }
  
  .summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; padding: 24px; }
  .stat-box {
    background: #f8fafc;
    border-radius: 18px;
    padding: 24px 16px;
    text-align: center;
    border: 1px solid #e2e8f0;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .stat-box:hover {
    transform: translateY(-4px);
    background: #fff;
    border-color: #cbd5e1;
    box-shadow: 0 12px 20px -5px rgba(148, 163, 184, 0.15);
  }
  
  .stat-icon-wrapper {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.08);
    color: #6366f1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
  }
  .stat-box:nth-child(3) .stat-icon-wrapper { background: rgba(16, 185, 129, 0.08); color: #10b981; }
  .stat-box:nth-child(4) .stat-icon-wrapper { background: rgba(244, 63, 94, 0.08); color: #f43f5e; }
  
  .stat-val { font-family: 'Outfit', sans-serif; font-size: 30px; font-weight: 900; color: #0f172a; line-height: 1.1; letter-spacing: -0.5px; }
  .stat-lbl { font-size: 11px; color: #64748b; margin-top: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; }
  
  .table-container { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { width: 100%; border-collapse: collapse; text-align: left; }
  th {
    padding: 16px 20px;
    background: #f8fafc;
    color: #475569;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 2px solid #e2e8f0;
  }
  th.center { text-align: center; }
  td { padding: 16px 20px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr.row-hover:hover td { background-color: #f8fafc; }
  
  /* Status badges */
  .badge-up {
    background: rgba(16, 185, 129, 0.1);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.2);
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .badge-down {
    background: rgba(244, 63, 94, 0.1);
    color: #e11d48;
    border: 1px solid rgba(244, 63, 94, 0.2);
    padding: 4px 10px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }
  .dot-pulse {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }
  .badge-up .dot-pulse { background-color: #10b981; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse-green 2s infinite; }
  .badge-down .dot-pulse { background-color: #f43f5e; box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); animation: pulse-red 2s infinite; }
  
  @keyframes pulse-green {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
  }
  @keyframes pulse-red {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
    70% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(244, 63, 94, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
  }
  
  .footer { text-align: center; padding: 40px 0 0; color: #64748b; font-size: 13px; line-height: 1.6; }
  .footer strong { color: #6366f1; }
  
  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  
  /* Mobile Responsiveness */
  @media (max-width: 900px) {
    .summary-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .header { flex-direction: column; align-items: flex-start; gap: 24px; padding: 28px 24px; }
    .header-right { text-align: left; width: 100%; }
    .user-badge { width: 100%; }
    .page { padding: 20px 16px 40px; }
    .summary-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px; }
    .stat-box { padding: 18px 12px; }
    .stat-val { font-size: 26px; }
  }
  @media (max-width: 480px) {
    .summary-grid { grid-template-columns: 1fr; }
  }
  
  @media print {
    .print-btn { display: none !important; }
    body { background: #fff !important; color: #000 !important; }
    .page { padding: 0; max-width: 100%; }
    .header {
      background: #0f172a !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border: none;
      color: #fff !important;
    }
    .header * { color: #fff !important; }
    .header .brand span { color: #818cf8 !important; }
    .section { box-shadow: none !important; border: 1px solid #e2e8f0; page-break-inside: avoid; }
    .stat-box {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
    }
    .badge-up {
      background: rgba(16, 185, 129, 0.1) !important;
      color: #059669 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .badge-down {
      background: rgba(244, 63, 94, 0.1) !important;
      color: #e11d48 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
      <div class="brand-container">
        <div class="brand-logo">⚡</div>
        <div>
          <div class="brand">Uptime<span>Forge</span><span style="font-size:13px;color:#818cf8;font-weight:600">.in</span></div>
          <div class="brand-sub">Professional Uptime Monitoring</div>
        </div>
      </div>
      <div class="report-title-container">
        <span class="report-badge">${data.type} report</span>
        <div class="report-title">${data.title}</div>
        <div class="report-meta">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Generated: ${data.generatedAt} IST
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="user-badge">
        <div class="user-name">${data.user.name}</div>
        <div class="user-meta">
          📧 ${data.user.email}<br>
          🆔 Account ID: <strong>${data.user.accountId}</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- Summary -->
  <div class="section">
    <div class="section-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
      Summary Overview
    </div>
    <div class="summary-grid">
      <div class="stat-box">
        <div class="stat-icon-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
        </div>
        <div class="stat-val">${data.summary.totalMonitors}</div>
        <div class="stat-lbl">Monitors</div>
      </div>
      <div class="stat-box">
        <div class="stat-icon-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path></svg>
        </div>
        <div class="stat-val">${data.summary.totalPingTargets}</div>
        <div class="stat-lbl">Ping Targets</div>
      </div>
      <div class="stat-box">
        <div class="stat-icon-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <div class="stat-val" style="color:${data.summary.avgUptime >= 99 ? '#10b981' : data.summary.avgUptime >= 95 ? '#d97706' : '#f43f5e'}">${data.summary.avgUptime}%</div>
        <div class="stat-lbl">Avg Uptime</div>
      </div>
      <div class="stat-box">
        <div class="stat-icon-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        <div class="stat-val" style="color:${data.summary.totalIncidents > 0 ? '#f43f5e' : '#10b981'}">${data.summary.totalIncidents}</div>
        <div class="stat-lbl">Incidents</div>
      </div>
      <div class="stat-box">
        <div class="stat-icon-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <div class="stat-val" style="font-size:22px">${data.summary.avgResponseTime ? data.summary.avgResponseTime + ' ms' : '—'}</div>
        <div class="stat-lbl">Avg Response</div>
      </div>
    </div>
  </div>

  ${sslSection}

  <!-- Monitor Table -->
  <div class="section">
    <div class="section-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
      Monitor Performance
    </div>
    <div class="table-container">
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
  </div>

  <!-- Ping Targets -->
  ${data.pingTargets.length > 0 ? `
  <div class="section">
    <div class="section-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.58 16.14a6 6 0 0 1 6.84 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
      Ping Monitor
    </div>
    <div class="table-container">
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
    </div>
  </div>` : ''}

  <!-- Incidents -->
  <div class="section">
    <div class="section-head">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      Incidents During Period ${data.incidents.length > 0 ? `<span style="background:rgba(244,63,94,0.1);color:#e11d48;border:1px solid rgba(244,63,94,0.2);padding:2px 10px;border-radius:20px;font-size:11px;margin-left:auto;text-transform:none;letter-spacing:0">${data.incidents.length} event${data.incidents.length>1?'s':''}</span>` : ''}
    </div>
    <div class="table-container">
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
