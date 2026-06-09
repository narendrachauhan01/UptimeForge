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
    const upColor = (u) => u >= 99 ? '#10b981' : u >= 95 ? '#f59e0b' : '#ef4444';
    const rt      = (r) => r === null ? '—' : `${r}&nbsp;ms`;
    const badge   = (s) => s === 'up'
        ? '<span class="b-up">UP</span>'
        : s === 'down'
            ? '<span class="b-dn">DOWN</span>'
            : '<span class="b-uk">—</span>';
    const pct     = (u) => `<span class="uptime-pct" style="color:${upColor(u)}">${u}%</span>`;
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
            <td class="tc">
                ${m.incidents > 0
                    ? `<span class="inc-badge active">${m.incidents}</span>`
                    : `<span class="inc-badge none">0</span>`}
            </td>
            <td class="tc mo">
                ${m.sslDaysLeft !== null
                    ? m.sslDaysLeft < 30
                        ? `<span class="ssl-badge warn">${m.sslDaysLeft}d</span>`
                        : `<span class="ssl-badge ok">${m.sslDaysLeft}d</span>`
                    : '—'}
            </td>
            <td class="tc" style="font-size:12px;color:${m.domainDaysLeft !== null && m.domainDaysLeft < 30 ? 'var(--danger)' : 'var(--text-secondary)'}">
                ${m.domainExpiry || '—'}
            </td>
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
            <td class="tc">
                ${p.incidents > 0
                    ? `<span class="inc-badge active">${p.incidents}</span>`
                    : `<span class="inc-badge none">0</span>`}
            </td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty">No ping targets configured</td></tr>';

    const incidentRows = data.incidents.length
        ? data.incidents.map((inc, i) => `
        <tr${i % 2 === 0 ? ' class="alt"' : ''}>
            <td><div class="nm">${esc(inc.serverName)}</div></td>
            <td class="mo url-td">${esc(inc.serverUrl || '—')}</td>
            <td class="tc"><span class="b-dn">DOWN</span></td>
            <td style="font-size:12px;color:var(--text-secondary)">${inc.at}</td>
            <td class="tc"><span class="inc-type-badge">${inc.source === 'ping' ? 'Ping' : 'HTTP'}</span></td>
        </tr>`).join('')
        : '<tr><td colspan="5" class="empty" style="color:var(--success)">No incidents during this period</td></tr>';

    const domainRows = data.monitors.length
        ? [...data.monitors]
            .sort((a, b) => {
                if (a.domainDaysLeft === null) return 1;
                if (b.domainDaysLeft === null) return -1;
                return a.domainDaysLeft - b.domainDaysLeft;
            })
            .map((m, i) => {
                const d = m.domainDaysLeft;
                const color = d === null ? 'var(--text-muted)'
                    : d < 0   ? 'var(--danger)'
                    : d < 14  ? 'var(--danger)'
                    : d < 30  ? 'var(--warning)'
                    : 'var(--success)';
                const label = d === null ? '—'
                    : d < 0   ? 'Expired'
                    : d < 14  ? `${d}d — Critical`
                    : d < 30  ? `${d}d — Expiring Soon`
                    : d < 90  ? `${d}d — Renew Soon`
                    : `${d}d — OK`;
                return `
        <tr${i % 2 === 0 ? ' class="alt"' : ''}>
            <td>
                <div class="nm">${esc(m.name)}</div>
                <div class="nu">${esc(m.url)}</div>
            </td>
            <td class="tc mo" style="font-size:12px">${m.domainExpiry || '—'}</td>
            <td class="tc" style="font-weight:700;color:${color}">${label}</td>
        </tr>`;
            }).join('')
        : '<tr><td colspan="3" class="empty">No monitors found</td></tr>';

    const sslWarnings    = data.monitors.filter(m => m.sslDaysLeft    !== null && m.sslDaysLeft    < 30);
    const domainWarnings = data.monitors.filter(m => m.domainDaysLeft !== null && m.domainDaysLeft < 30);

    const sslSection = sslWarnings.length ? `
        <div class="ssl-box">
            <div class="ssl-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                SSL Certificates Expiring Soon
            </div>
            ${sslWarnings.map(m => `<div class="ssl-row"><strong>${esc(m.name)}</strong> — expires in <span style="color:var(--danger);font-weight:700">${m.sslDaysLeft} days</span></div>`).join('')}
        </div>` : '';

    const domainWarnSection = domainWarnings.length ? `
        <div class="ssl-box" style="background:var(--danger-glow);border-color:rgba(239,68,68,0.2);">
            <div class="ssl-title" style="color:var(--danger)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Domain Names Expiring Soon
            </div>
            ${domainWarnings.map(m => `<div class="ssl-row" style="color:var(--text-primary)"><strong>${esc(m.name)}</strong> (${esc(m.url)}) — expires on <span style="color:var(--danger);font-weight:700">${m.domainExpiry}</span> (${m.domainDaysLeft} days left)</div>`).join('')}
        </div>` : '';

    const avgUptimeColor = upColor(data.summary.avgUptime);
    const incColor       = data.summary.totalIncidents > 0 ? '#ef4444' : '#10b981';
    const typeLabel      = data.type === 'weekly' ? 'WEEKLY REPORT' : 'MONTHLY REPORT';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.title)} — UptimeForge</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg-primary: #090d16;
  --bg-gradient: radial-gradient(ellipse at top, #0f172a, #090d16);
  --card-bg: rgba(13, 18, 31, 0.75);
  --card-border: rgba(255, 255, 255, 0.06);
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --primary: #8b5cf6;
  --primary-gradient: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.1);
  --danger: #ef4444;
  --danger-glow: rgba(239, 68, 68, 0.1);
  --warning: #f59e0b;
  --warning-glow: rgba(245, 158, 11, 0.1);
  --border-color: rgba(255, 255, 255, 0.05);
  --table-hdr-bg: rgba(19, 26, 38, 0.6);
  --shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  --glass-blur: blur(16px);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg-primary);
  background-image: var(--bg-gradient);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  font-size: 13.5px;
  line-height: 1.5;
  min-height: 100vh;
  padding: 40px 20px;
}
.report-wrap { max-width: 1040px; margin: 0 auto; display: flex; flex-direction: column; gap: 30px; }
.pdf-btn {
  position: fixed; top: 24px; right: 24px; z-index: 1000;
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  color: #fff; border: none; padding: 11px 22px; border-radius: 30px;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 24px rgba(124,58,237,0.4);
}

/* COVER */
.cover {
  width: 100%; min-height: 80vh;
  background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 24px;
  display: flex; flex-direction: column; padding: 64px 80px;
  box-shadow: var(--shadow); backdrop-filter: var(--glass-blur); overflow: hidden;
}
.cover-logo { margin-bottom: 40px; }
.cover-logo-inner { display: flex; align-items: center; gap: 12px; }
.cover-logo-icon {
  width: 38px; height: 38px; padding: 8px; border-radius: 10px;
  background: var(--primary-gradient); color: #fff;
}
.cover-logo-name { font-size: 19px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif; }
.cover-logo-name span { background: linear-gradient(135deg, #a78bfa, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.cover-logo-sub { font-size: 10.5px; color: var(--text-secondary); margin-top: 2px; }
.cover-main-grid { display: flex; align-items: center; justify-content: space-between; gap: 60px; flex: 1; padding: 30px 0; }
.cover-info-col { flex: 1; }
.cover-badge {
  display: inline-block; padding: 6px 16px;
  background: rgba(139,92,246,0.1); color: #a78bfa;
  border: 1px solid rgba(139,92,246,0.2); border-radius: 30px;
  font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 24px;
  text-transform: uppercase; font-family: 'Plus Jakarta Sans', sans-serif;
}
.cover-title { font-size: 48px; font-weight: 900; line-height: 1.15; letter-spacing: -1.8px; margin-bottom: 12px; font-family: 'Plus Jakarta Sans', sans-serif; color: #ffffff; }
.cover-period { font-size: 20px; font-weight: 500; color: var(--text-secondary); }
.cover-chart-col { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.uptime-ring-container { position: relative; width: 160px; height: 160px; }
.uptime-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 8; }
.ring-fill { fill: none; stroke-width: 8; stroke-linecap: round; }
.uptime-ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; display: flex; flex-direction: column; }
.uptime-ring-val { font-size: 30px; font-weight: 900; color: #ffffff; line-height: 1; font-family: 'Plus Jakarta Sans', sans-serif; }
.uptime-ring-lbl { font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-top: 5px; font-weight: 700; }
.cover-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid var(--border-color); padding-top: 40px; margin-top: 20px; }
.cover-footer-meta { display: flex; gap: 48px; }
.meta-item { display: flex; flex-direction: column; }
.meta-lbl { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-family: 'Plus Jakarta Sans', sans-serif; }
.meta-val { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
.cover-user-card { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); padding: 12px 18px; border-radius: 14px; }
.user-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-gradient); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 700; font-family: 'Plus Jakarta Sans', sans-serif; }
.user-name  { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.user-email { font-size: 11px; color: var(--text-secondary); margin-top: 1px; }
.user-id    { font-size: 9.5px; color: var(--text-muted); margin-top: 2px; }

/* STATS */
.stats-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 18px; padding: 22px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: var(--shadow); backdrop-filter: var(--glass-blur); }
.stat-icon-wrapper { width: 44px; height: 44px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); color: var(--primary); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
.stat-icon-wrapper.success { color: var(--success); }
.stat-icon-wrapper.danger  { color: var(--danger); }
.stat-icon  { width: 20px; height: 20px; }
.stat-value { font-size: 26px; font-weight: 800; color: var(--text-primary); line-height: 1.1; font-family: 'Plus Jakarta Sans', sans-serif; letter-spacing: -0.5px; }
.stat-label { font-size: 10.5px; font-weight: 700; color: var(--text-secondary); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

/* SECTIONS */
.sec { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; margin-bottom: 24px; box-shadow: var(--shadow); backdrop-filter: var(--glass-blur); overflow: hidden; }
.sec-hd { padding: 18px 24px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.01); }
.sec-title-icon { display: flex; align-items: center; justify-content: center; color: var(--primary); }
.sec-title-icon.danger { color: var(--danger); }
.sec-hd h2 { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
.sec-badge { margin-left: auto; font-size: 10.5px; font-weight: 700; color: var(--text-secondary); background: rgba(255,255,255,0.03); padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
.sec-badge.danger { background: var(--danger-glow); color: var(--danger); border-color: rgba(239,68,68,0.15); }

/* TABLES */
.tw { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.8px; padding: 14px 24px; border-bottom: 1.5px solid var(--border-color); background: var(--table-hdr-bg); }
th.tc { text-align: center; }
td { padding: 14px 24px; font-size: 13px; color: var(--text-primary); border-bottom: 1px solid var(--border-color); vertical-align: middle; }
td.tc { text-align: center; }
td.mo { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-secondary); }
td.url-td { font-size: 11.5px; color: var(--text-secondary); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr.alt td { background: rgba(255,255,255,0.01); }
.nm { font-weight: 700; color: var(--text-primary); font-size: 13.5px; font-family: 'Plus Jakarta Sans', sans-serif; }
.nu { font-size: 11px; color: var(--text-muted); margin-top: 3px; font-family: 'JetBrains Mono', monospace; max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { padding: 32px; text-align: center; color: var(--text-secondary); font-weight: 500; }
.b-up, .b-dn, .b-uk { display: inline-flex; align-items: center; justify-content: center; padding: 4px 10px; border-radius: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; }
.b-up { background: var(--success-glow); color: var(--success); border: 1px solid rgba(16,185,129,0.2); }
.b-dn { background: var(--danger-glow);  color: var(--danger);  border: 1px solid rgba(239,68,68,0.2); }
.b-uk { background: rgba(255,255,255,0.04); color: var(--text-secondary); border: 1px solid rgba(255,255,255,0.06); }
.uptime-pct { font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.inc-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 10px; font-size: 11px; font-weight: 700; }
.inc-badge.none   { color: var(--text-muted); }
.inc-badge.active { background: var(--danger-glow); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); }
.ssl-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.ssl-badge.ok   { background: rgba(255,255,255,0.04); color: var(--text-secondary); }
.ssl-badge.warn { background: var(--warning-glow); color: var(--warning); border: 1px solid rgba(245,158,11,0.2); }
.inc-type-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10.5px; font-weight: 600; text-transform: uppercase; background: rgba(255,255,255,0.03); color: var(--text-secondary); border: 1px solid var(--border-color); }

/* ALERT BOXES */
.ssl-box { background: var(--warning-glow); border: 1px solid rgba(245,158,11,0.2); border-radius: 18px; padding: 20px; margin-bottom: 24px; box-shadow: var(--shadow); backdrop-filter: var(--glass-blur); }
.ssl-title { font-size: 14px; font-weight: 800; color: var(--warning); display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-family: 'Plus Jakarta Sans', sans-serif; }
.ssl-row { font-size: 13px; color: var(--text-primary); margin-top: 6px; padding-left: 12px; }
.ssl-row::before { content: "•"; color: var(--warning); font-weight: bold; display: inline-block; width: 12px; margin-left: -12px; }

/* FOOTER */
.ftr { text-align: center; padding: 32px 0 16px; color: var(--text-muted); font-size: 12px; line-height: 1.6; border-top: 1px solid var(--border-color); }
.ftr strong { color: var(--primary); font-weight: 700; }

/* PRINT */
@media print {
  :root {
    --bg-primary: #ffffff; --bg-gradient: none;
    --card-bg: #ffffff; --card-border: #e2e8f0;
    --text-primary: #0f172a; --text-secondary: #334155; --text-muted: #64748b;
    --primary: #4f46e5;
    --success: #059669; --success-glow: rgba(5,150,105,0.08);
    --danger: #dc2626;  --danger-glow: rgba(220,38,38,0.08);
    --warning: #d97706; --warning-glow: rgba(217,119,6,0.08);
    --border-color: #e2e8f0; --table-hdr-bg: #f8fafc;
    --shadow: none; --glass-blur: none;
  }
  body { background: #ffffff !important; color: #0f172a !important; padding: 0 !important; font-size: 12px; }
  body::before, body::after { display: none !important; }
  .pdf-btn { display: none !important; }
  .report-wrap { max-width: 100%; gap: 0; background: #ffffff !important; }
  .data-pages { background: #ffffff !important; }
  .cover {
    min-height: 297mm; height: 297mm;
    page-break-after: always; break-after: page;
    padding: 40mm 20mm;
    border: none !important; border-radius: 0 !important;
    box-shadow: none !important; background: #ffffff !important; margin-bottom: 0 !important;
  }
  .cover-title { color: #0f172a !important; }
  .uptime-ring-val { color: #0f172a !important; }
  .ring-bg { stroke: #f1f5f9; }
  .cover-user-card { border: 1px solid #e2e8f0 !important; box-shadow: none !important; }
  .stats-grid { grid-template-columns: repeat(5,1fr) !important; gap: 10px !important; margin-bottom: 24px !important; page-break-inside: avoid; break-inside: avoid; }
  .stat-card { padding: 12px 8px !important; border-radius: 8px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; background: #ffffff !important; }
  .stat-value { font-size: 20px !important; }
  .sec { border-radius: 12px !important; margin-bottom: 20px !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; background: #ffffff !important; }
  th, td { padding: 10px 16px !important; }
  .nu { max-width: 240px !important; }
  tr:hover td { background: transparent !important; }
  tr.alt td { background: #fcfcfc !important; }
  .ssl-box { border-radius: 12px !important; border: 1px solid #fde68a !important; box-shadow: none !important; background: #fffbeb !important; padding: 16px !important; page-break-inside: avoid; break-inside: avoid; }
  .ftr { border-top: 1px solid #e2e8f0 !important; padding-top: 20px !important; }

}
</style>
</head>
<body>

<button class="pdf-btn" onclick="window.print()">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
  Save as PDF
</button>

<div class="report-wrap">

  <!-- COVER PAGE -->
  <div class="cover">
    <div class="cover-logo">
      <div class="cover-logo-inner">
        <svg class="cover-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <div>
          <div class="cover-logo-name">Uptime<span>Forge</span></div>
          <div class="cover-logo-sub">Professional Uptime Monitoring</div>
        </div>
      </div>
    </div>
    <div class="cover-main-grid">
      <div class="cover-info-col">
        <div class="cover-badge">${typeLabel}</div>
        <h1 class="cover-title">${esc(data.type === 'weekly' ? 'Weekly Status\nReport' : 'Monthly Status\nReport')}</h1>
        <p class="cover-period">${esc(data.type === 'weekly'
            ? fmtDate(data.periodStart) + ' – ' + fmtDate(data.periodEnd)
            : new Date(data.periodStart).toLocaleDateString('en-IN', { month:'long', year:'numeric' }))}</p>
      </div>
      <div class="cover-chart-col">
        <div class="uptime-ring-container">
          <svg class="uptime-ring" viewBox="0 0 100 100">
            <circle class="ring-bg" cx="50" cy="50" r="40"/>
            <circle class="ring-fill" cx="50" cy="50" r="40" style="stroke-dasharray:251.2;stroke-dashoffset:${251.2 - (251.2 * data.summary.avgUptime) / 100};stroke:${upColor(data.summary.avgUptime)};"/>
          </svg>
          <div class="uptime-ring-text">
            <span class="uptime-ring-val">${data.summary.avgUptime}%</span>
            <span class="uptime-ring-lbl">Avg Uptime</span>
          </div>
        </div>
      </div>
    </div>
    <div class="cover-footer">
      <div class="cover-footer-meta">
        <div class="meta-item"><span class="meta-lbl">Generated At</span><span class="meta-val">${data.generatedAt} IST</span></div>
        <div class="meta-item"><span class="meta-lbl">HTTP Monitors</span><span class="meta-val">${data.summary.totalMonitors} Active</span></div>
        <div class="meta-item"><span class="meta-lbl">Ping Targets</span><span class="meta-val">${data.summary.totalPingTargets} Active</span></div>
        <div class="meta-item"><span class="meta-lbl">Incidents</span><span class="meta-val" style="color:${data.summary.totalIncidents > 0 ? 'var(--danger)' : 'var(--success)'}">${data.summary.totalIncidents} Event${data.summary.totalIncidents !== 1 ? 's' : ''}</span></div>
      </div>
      <div class="cover-user-card">
        <div class="user-avatar">${data.user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div>
          <div class="user-name">${esc(data.user.name)}</div>
          <div class="user-email">${esc(data.user.email)}</div>
          <div class="user-id">ID: ${esc(data.user.accountId)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- DATA PAGES -->
  <div class="data-pages">

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon-wrapper"><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg></div>
        <div class="stat-value">${data.summary.totalMonitors}</div><div class="stat-label">HTTP Monitors</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper"><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.58 16.14a6 6 0 0 1 6.84 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg></div>
        <div class="stat-value">${data.summary.totalPingTargets}</div><div class="stat-label">Ping Targets</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper success"><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
        <div class="stat-value" style="color:var(--success)">${data.summary.avgUptime}%</div><div class="stat-label">Avg Uptime</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper danger"><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
        <div class="stat-value" style="color:${incColor}">${data.summary.totalIncidents}</div><div class="stat-label">Incidents</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper"><svg class="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-value">${data.summary.avgResponseTime ? data.summary.avgResponseTime + ' <span style="font-size:14px;font-weight:600;color:var(--text-secondary)">ms</span>' : '—'}</div><div class="stat-label">Avg Response</div>
      </div>
    </div>

    ${domainWarnSection}
    ${sslSection}

    <!-- HTTP Monitor Table -->
    <div class="sec">
      <div class="sec-hd">
        <span class="sec-title-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
        <h2>HTTP Monitor Performance</h2>
        <span class="sec-badge">${data.monitors.length} Monitors</span>
      </div>
      <div class="tw"><table>
        <thead><tr>
          <th>Monitor / URL</th><th class="tc">Status</th><th class="tc">Uptime</th>
          <th class="tc">Avg Response</th><th class="tc">Incidents</th>
          <th class="tc">SSL Expiry</th><th class="tc">Domain Expiry</th>
        </tr></thead>
        <tbody>${monitorRows}</tbody>
      </table></div>
    </div>

    <!-- Ping Targets -->
    ${data.pingTargets.length > 0 ? `
    <div class="sec">
      <div class="sec-hd">
        <span class="sec-title-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.58 16.14a6 6 0 0 1 6.84 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg></span>
        <h2>Ping Targets Performance</h2>
        <span class="sec-badge">${data.pingTargets.length} Targets</span>
      </div>
      <div class="tw"><table>
        <thead><tr>
          <th>Name / Host</th><th class="tc">Status</th><th class="tc">Uptime</th>
          <th class="tc">Avg Response</th><th class="tc">Incidents</th>
        </tr></thead>
        <tbody>${pingRows}</tbody>
      </table></div>
    </div>` : ''}

    <!-- Incidents -->
    <div class="sec">
      <div class="sec-hd">
        <span class="sec-title-icon ${data.incidents.length > 0 ? 'danger' : ''}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
        <h2>Recent Down Incidents</h2>
        ${data.incidents.length > 0 ? `<span class="sec-badge danger">${data.incidents.length} Event${data.incidents.length > 1 ? 's' : ''}</span>` : ''}
      </div>
      <div class="tw"><table>
        <thead><tr>
          <th>Monitor</th><th>URL / Host</th><th class="tc">Status</th><th>Time (IST)</th><th class="tc">Type</th>
        </tr></thead>
        <tbody>${incidentRows}</tbody>
      </table></div>
    </div>

    <!-- Footer -->
    <div class="ftr">
      <strong>UptimeForge.in</strong> — Professional Uptime Monitoring &nbsp;|&nbsp; &copy; 2026 UptimeForge.in<br>
      <span style="font-size:10.5px;display:block;margin-top:4.5px;opacity:0.7">This report was automatically generated from monitoring data logs for the selected period.</span>
    </div>

  </div>
</div>
</body>
</html>`;
}

module.exports = { buildReportData, generateHTML };
