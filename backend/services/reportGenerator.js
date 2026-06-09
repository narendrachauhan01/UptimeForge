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

        const recentHistory  = (srv.history || []).slice(-100);
        const rtSamples      = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
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
        const recentHistory  = (pt.history || []).slice(-100);
        const rtSamples      = recentHistory.filter(h => h.responseTime && h.status === 'up').map(h => h.responseTime);
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
}function generateHTML(data) {
    const upColor = (u) => u >= 99 ? '#10b981' : u >= 95 ? '#d97706' : '#f43f5e';
    const rt      = (r) => r === null ? '—' : `${r} ms`;
    const badge   = (s) => s === 'up'
        ? '<span class="b-up"><span class="dot-pulse"></span>UP</span>'
        : s === 'down'
            ? '<span class="b-dn"><span class="dot-pulse"></span>DOWN</span>'
            : '<span class="b-uk">—</span>';
    const pct     = (u) => `<span class="pct-val" style="color:${upColor(u)}">${u}%</span>`;
    const esc     = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const monitorRows = data.monitors.length
        ? data.monitors.map(m => `
        <tr class="row-hover">
            <td>
                <div class="nm">${esc(m.name)}</div>
                <div class="nu">${esc(m.url)}</div>
            </td>
            <td class="tc">${badge(m.status)}</td>
            <td class="tc">${pct(m.uptime)}</td>
            <td class="tc mo">${rt(m.avgResponseTime)}</td>
            <td class="tc" style="color:${m.incidents > 0 ? '#f43f5e' : '#10b981'};font-weight:700">${m.incidents}</td>
            <td class="tc mo" style="color:${m.sslDaysLeft !== null && m.sslDaysLeft < 30 ? '#f43f5e' : '#94a3b8'}">${m.sslDaysLeft !== null ? `${m.sslDaysLeft}d` : '—'}</td>
        </tr>`).join('')
        : '<tr><td colspan="6" class="empty">No monitors found</td></tr>';

    const pingRows = data.pingTargets.length
        ? data.pingTargets.map(p => `
        <tr class="row-hover">
            <td>
                <div class="nm">${esc(p.name)}</div>
                <div class="nu">${esc(p.host)}</div>
            </td>
            <td class="tc">${badge(p.status)}</td>
            <td class="tc">${pct(p.uptime)}</td>
            <td class="tc mo">${rt(p.avgResponseTime)}</td>
            <td class="tc" style="color:${p.incidents > 0 ? '#f43f5e' : '#10b981'};font-weight:700">${p.incidents}</td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty">No ping targets configured</td></tr>';

    const incidentRows = data.incidents.length
        ? data.incidents.map((inc, i) => `
        <tr class="row-hover${i % 2 === 0 ? ' alt' : ''}">
            <td><div class="nm">${esc(inc.serverName)}</div></td>
            <td class="mo url-td">${esc(inc.serverUrl || '—')}</td>
            <td class="tc"><span class="b-dn">DOWN</span></td>
            <td style="font-size:12px;color:#94a3b8" class="inc-time">${inc.at}</td>
            <td class="tc" style="font-size:11.5px;color:#cbd5e1;font-weight:600">${inc.source === 'ping' ? 'Ping' : 'HTTP'}</td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty" style="color:#10b981">No incidents during this period</td></tr>';

    const sslWarnings = data.monitors.filter(m => m.sslDaysLeft !== null && m.sslDaysLeft < 30);
    const sslSection  = sslWarnings.length ? `
        <div class="ssl-box">
            <div class="ssl-title">&#9888; SSL Certificates Expiring Soon</div>
            ${sslWarnings.map(m => `<div class="ssl-row">&bull; <strong>${esc(m.name)}</strong> — expires in <span style="color:#f43f5e;font-weight:700">${m.sslDaysLeft} days</span> &nbsp; ${esc(m.url)}</div>`).join('')}
        </div>` : '';

    const avgUptimeColor = upColor(data.summary.avgUptime);
    const incColor       = data.summary.totalIncidents > 0 ? '#f43f5e' : '#10b981';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.title)} — UptimeForge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm 14mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background-color: #0b0f19;
  background-image: 
    radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.1) 0px, transparent 50%), 
    radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
    radial-gradient(at 50% 100%, rgba(6, 182, 212, 0.05) 0px, transparent 50%);
  color: #cbd5e1;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* Print button */
.pdf-btn {
  position: fixed; top: 18px; right: 18px; z-index: 999;
  background: linear-gradient(135deg, #7c3aed, #6366f1);
  color: #fff; border: none;
  padding: 10px 20px; border-radius: 9999px; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 10px 30px -5px rgba(124, 58, 237, 0.5);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.pdf-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -5px rgba(124, 58, 237, 0.6);
  background: linear-gradient(135deg, #6d28d9, #4f46e5);
}

/* Page */
.page { max-width: 1020px; margin: 0 auto; padding: 28px 20px 56px; }

/* Header */
.hdr {
  background: linear-gradient(135deg, #0d121f 0%, #151c2e 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  padding: 30px 36px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.hdr::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);
  pointer-events: none;
}
.brand-row { display: flex; align-items: center; gap: 12px; }
.brand-ico {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg,#7c3aed,#06b6d4);
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  box-shadow: 0 8px 20px -4px rgba(124, 58, 237, 0.5);
}
.brand-txt { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 900; color: #f8fafc; letter-spacing: -0.5px; line-height: 1; }
.brand-txt em { color: #a78bfa; font-style: normal; }
.brand-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.rpt-badge {
  display: inline-block; padding: 4px 12px; border-radius: 9999px; margin-bottom: 10px;
  background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.3);
  color: #c084fc; font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1.5px;
}
.rpt-title { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.3px; line-height: 1.2; margin-top: 8px; }
.rpt-time  { font-size: 12px; color: #94a3b8; margin-top: 8px; display: flex; align-items: center; gap: 6px; }
.user-box {
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.05);
  border-radius: 16px; padding: 16px 20px; text-align: right; min-width: 200px; flex-shrink: 0;
  backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}
.user-name { font-size: 14px; font-weight: 800; color: #f1f5f9; }
.user-email { font-size: 12px; color: #94a3b8; margin-top: 6px; }
.user-id    { font-size: 11px; color: #cbd5e1; margin-top: 5px; font-weight: 600; }

/* Stats row */
.stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.sc {
  background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); border-radius: 18px;
  padding: 20px 10px; text-align: center; position: relative; overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sc::after {
  content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: transparent; transition: background-color 0.3s;
}
.sc:nth-child(1)::after { background: #6366f1; }
.sc:nth-child(2)::after { background: #06b6d4; }
.sc:nth-child(3)::after { background: #10b981; }
.sc:nth-child(4)::after { background: #f43f5e; }
.sc:nth-child(5)::after { background: #a855f7; }

.sc:hover {
  transform: translateY(-4px); background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}
.sc-icon {
  width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 10px;
  display: flex; align-items: center; justify-content: center;
}
.sc:nth-child(1) .sc-icon { color: #818cf8; background: rgba(99, 102, 241, 0.1); }
.sc:nth-child(2) .sc-icon { color: #22d3ee; background: rgba(6, 182, 212, 0.1); }
.sc:nth-child(3) .sc-icon { color: #34d399; background: rgba(16, 185, 129, 0.1); }
.sc:nth-child(4) .sc-icon { color: #fb7185; background: rgba(244, 63, 94, 0.1); }
.sc:nth-child(5) .sc-icon { color: #c084fc; background: rgba(168, 85, 247, 0.1); }

.sc-num   { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 900; color: #fff; letter-spacing: -0.5px; line-height: 1; }
.sc-lbl   { font-size: 10px; color: #94a3b8; margin-top: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; }

/* Section card */
.sec {
  background: #0d121f; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px;
  margin-bottom: 24px; overflow: hidden; box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}
.sec:hover { border-color: rgba(255, 255, 255, 0.1); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4); }

.sec-hd {
  padding: 16px 22px; background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; color: #cbd5e1;
  display: flex; align-items: center; gap: 8px;
}
.sec-hd svg { color: #a78bfa; }

.sec-cnt {
  margin-left: auto; background: rgba(244, 63, 94, 0.15); color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.25); padding: 2px 10px; border-radius: 20px;
  font-size: 10px; font-weight: 700; text-transform: none; letter-spacing: 0;
}

/* Tables */
.tw { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
table  { width: 100%; border-collapse: collapse; text-align: left; }
th {
  padding: 14px 18px; background: rgba(255, 255, 255, 0.02); color: #94a3b8;
  font-size: 10px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 1px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); white-space: nowrap;
}
th.tc { text-align: center; }
td { padding: 14px 18px; font-size: 13.5px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); vertical-align: middle; color: #cbd5e1; }
td.tc { text-align: center; }
td.mo { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #cbd5e1; }
td.url-td { font-size: 11.5px; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr.row-hover { transition: background-color 0.2s; }
tr.row-hover:hover td { background-color: rgba(255, 255, 255, 0.02); color: #fff; }
tr.row-hover.alt td { background: rgba(244, 63, 94, 0.02); }
tr.row-hover.alt:hover td { background: rgba(244, 63, 94, 0.04); }

.nm { font-weight: 700; color: #f8fafc; font-size: 13.5px; }
.nu { font-size: 11px; color: #94a3b8; margin-top: 2px; font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 350px; }
.pct-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
.empty { padding: 24px; text-align: center; color: #94a3b8; font-weight: 500; }

/* Badges */
.b-up, .b-dn, .b-uk {
  display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 9999px;
  font-size: 10px; font-weight: 800; white-space: nowrap;
}
.b-up { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); box-shadow: 0 0 10px rgba(16, 185, 129, 0.08); }
.b-dn { background: rgba(244, 63, 94, 0.1); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.2); box-shadow: 0 0 10px rgba(244, 63, 94, 0.08); }
.b-uk { background: rgba(255, 255, 255, 0.05); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.08); }

.dot-pulse {
  width: 6px; height: 6px; border-radius: 50%; display: inline-block;
}
.b-up .dot-pulse { background-color: #10b981; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); animation: pulse-green 2s infinite; }
.b-dn .dot-pulse { background-color: #f43f5e; box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); animation: pulse-red 2s infinite; }

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.15); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
@keyframes pulse-red {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.7); }
  70% { transform: scale(1.15); box-shadow: 0 0 0 5px rgba(244, 63, 94, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

/* SSL warning */
.ssl-box {
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 18px;
  padding: 16px 20px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.ssl-title { font-size: 13.5px; font-weight: 800; color: #f59e0b; margin-bottom: 8px; }
.ssl-row   { font-size: 12.5px; color: #fbbf24; margin-top: 5px; }

/* Footer */
.ftr { text-align: center; padding: 24px 0 0; color: #64748b; font-size: 12.5px; line-height: 1.6; }
.ftr strong { color: #a78bfa; }

/* Scrollbar */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #0b0f19; }
::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #334155; }

/* Responsive */
@media (max-width: 700px) {
  .hdr { flex-direction: column; align-items: flex-start; gap: 20px; padding: 24px; }
  .user-box { text-align: left; min-width: unset; width: 100%; }
  .stats { grid-template-columns: repeat(3,1fr); }
}
@media (max-width: 480px) {
  .stats { grid-template-columns: repeat(2,1fr); }
}

/* Print Overrides */
@media print {
  .pdf-btn { display: none !important; }
  body {
    background-color: #ffffff !important;
    background-image: none !important;
    color: #0f172a !important;
  }
  .page { padding: 0; max-width: 100%; }
  .hdr {
    background: #0f172a !important;
    color: #ffffff !important;
    border: none;
    box-shadow: none;
    border-radius: 8px; margin-bottom: 14px; padding: 18px 22px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .hdr * { color: #ffffff !important; }
  .hdr .brand-txt em { color: #818cf8 !important; }
  
  .stats { gap: 7px; margin-bottom: 14px; grid-template-columns: repeat(5,1fr) !important; }
  .sc {
    background: #f8fafc !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 8px;
    padding: 12px 8px;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sc::after { display: none !important; }
  .sc-num { color: #0f172a !important; font-size: 22px; }
  .sc-lbl { color: #475569 !important; }
  .sc-icon { background: #f1f5f9 !important; color: #475569 !important; }
  .sc:nth-child(1) .sc-icon { background: #f1f5f9 !important; color: #4f46e5 !important; }
  .sc:nth-child(2) .sc-icon { background: #e0f7fa !important; color: #0891b2 !important; }
  .sc:nth-child(3) .sc-icon { background: #e2fbf0 !important; color: #15803d !important; }
  .sc:nth-child(4) .sc-icon { background: #fee2e2 !important; color: #b91c1c !important; }
  .sc:nth-child(5) .sc-icon { background: #f3e8ff !important; color: #7e22ce !important; }
  
  .sec {
    background: #ffffff !important;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    margin-bottom: 12px;
    border-radius: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .sec-hd {
    background: #f8fafc !important;
    border-bottom: 1px solid #cbd5e1 !important;
    color: #334155 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sec-hd svg { color: #4f46e5 !important; }
  
  th {
    background: #f8fafc !important;
    color: #475569 !important;
    border-bottom: 2px solid #cbd5e1 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  td {
    color: #334155 !important;
    border-bottom: 1px solid #e2e8f0 !important;
  }
  tr.row-hover:hover td { background-color: transparent !important; color: #334155 !important; }
  tr.row-hover.alt td { background: #fff8f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .nm { color: #0f172a !important; }
  .nu { color: #64748b !important; max-width: 220px; }
  
  .b-up {
    background: #dcfce7 !important;
    color: #15803d !important;
    border: 1px solid #bbf7d0 !important;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .b-dn {
    background: #fee2e2 !important;
    color: #b91c1c !important;
    border: 1px solid #fecaca !important;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .b-uk {
    background: #f1f5f9 !important;
    color: #64748b !important;
    border: 1px solid #e2e8f0 !important;
  }
  .b-up .dot-pulse { background-color: #16a34a !important; animation: none !important; }
  .b-dn .dot-pulse { background-color: #dc2626 !important; animation: none !important; }
  
  .ssl-box {
    background: #fffbeb !important;
    border: 1px solid #fde68a !important;
    color: #a16207 !important;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ssl-title { color: #92400e !important; }
  .ssl-row   { color: #a16207 !important; }
  
  .ftr { color: #475569 !important; }
  .ftr strong { color: #4f46e5 !important; }
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
      <div class="rpt-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        Generated: ${data.generatedAt} IST
      </div>
    </div>
    <div class="user-box">
      <div class="user-name">${esc(data.user.name)}</div>
      <div class="user-email">${esc(data.user.email)}</div>
      <div class="user-id">Account&nbsp;ID: <strong>${esc(data.user.accountId)}</strong></div>
    </div>
  </div>

  <!-- Summary -->
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
      <div class="sc-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
      <div class="sc-num" style="color:${avgUptimeColor}">${data.summary.avgUptime}%</div>
      <div class="sc-lbl">Avg Uptime</div>
    </div>
    <div class="sc">
      <div class="sc-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.58 16.14a6 6 0 0 1 6.84 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
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
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:2px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
