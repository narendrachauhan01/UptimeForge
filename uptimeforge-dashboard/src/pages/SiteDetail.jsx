import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { getAlerts, getExpiry, API_URL } from '../api';
import axios from 'axios';

const authCfg = { withCredentials: true };

function fmt(d) { if (!d) return '—'; return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function fmtTime(d) { if (!d) return '—'; return new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }); }
function timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s ago`;
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ago`;
}

const RANGES = [
    { label: 'Last 1h',  value: '1h',     minutes: 60 },
    { label: 'Last 24h', value: '24h',     minutes: 1440 },
    { label: 'Last 7d',  value: '7d',      minutes: 10080 },
];

export default function SiteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [server, setServer] = useState(null);
    const [expiry, setExpiry] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('1h');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo]   = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [pausing, setPausing] = useState(false);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark'; // Keep dark mode ON by default
    });

    const isDark = localTheme === 'dark';

    // Synchronize theme cookie shifts
    useEffect(() => {
        const checkThemeCookie = () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const current = match ? match[1] : 'dark';
            if (current !== localTheme) {
                setLocalTheme(current);
            }
        };
        checkThemeCookie();
        const interval = setInterval(checkThemeCookie, 1000);
        return () => clearInterval(interval);
    }, [localTheme]);

    useEffect(() => {
        if (localTheme === 'dark') {
            document.body.classList.add('charts-dark-theme');
        } else {
            document.body.classList.remove('charts-dark-theme');
        }
        return () => {
            document.body.classList.remove('charts-dark-theme');
        };
    }, [localTheme]);

    const loadCore = async () => {
        try {
            const rangeParam = showCustom && customFrom && customTo
                ? `from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`
                : `range=${range}`;
            const [serverRes, historyRes] = await Promise.all([
                axios.get(`${API_URL}/api/servers/${id}`, authCfg),
                axios.get(`${API_URL}/api/servers/${id}/history?${rangeParam}`, authCfg),
            ]);
            const s = serverRes.data;
            s.history = historyRes.data.history || [];
            setServer(s);
        } catch {}
        setLoading(false);
    };

    const loadBackground = async () => {
        try {
            const [alertsRes, expiryRes] = await Promise.allSettled([
                axios.get(`${API_URL}/api/alerts?server=${id}&limit=10`, authCfg),
                getExpiry(id),
            ]);
            if (alertsRes.status === 'fulfilled') setIncidents(alertsRes.value.data.slice(0, 10));
            if (expiryRes.status === 'fulfilled') setExpiry(expiryRes.value.data);
        } catch {}
    };

    useEffect(() => {
        setLoading(true);
        loadCore().then(() => loadBackground());
        const t = setInterval(() => loadCore(), 60000);
        return () => clearInterval(t);
    }, [id, range, showCustom, customFrom, customTo]);

    const togglePause = async () => {
        setPausing(true);
        await axios.put(`${API_URL}/api/servers/${id}`, { active: !server.active }, authCfg);
        await loadCore();
        setPausing(false);
    };

    const chartData = useMemo(() => {
        if (!server?.history) return [];
        let hist = [...server.history];
        if (showCustom && customFrom && customTo) {
            const from = new Date(customFrom).getTime();
            const to   = new Date(customTo).getTime();
            hist = hist.filter(h => { const t = new Date(h.time).getTime(); return t >= from && t <= to; });
        } else {
            const minutes = RANGES.find(r => r.value === range)?.minutes || 60;
            const cutoff = Date.now() - minutes * 60 * 1000;
            hist = hist.filter(h => new Date(h.time).getTime() >= cutoff);
        }
        return hist.map(h => ({
            time: fmtTime(h.time),
            ms:   h.responseTime || 0,
            status: h.status,
        }));
    }, [server, range, showCustom, customFrom, customTo]);

    const avgMs = chartData.filter(d=>d.ms).length ? Math.round(chartData.filter(d=>d.ms).reduce((s,d)=>s+d.ms,0)/chartData.filter(d=>d.ms).length) : 0;
    const minMs = chartData.filter(d=>d.ms).length ? Math.min(...chartData.filter(d=>d.ms).map(d=>d.ms)) : 0;
    const maxMs = chartData.filter(d=>d.ms).length ? Math.max(...chartData.filter(d=>d.ms).map(d=>d.ms)) : 0;

    const calcUptime = (minutes) => {
        if (!server?.history) return null;
        const cutoff = Date.now() - minutes * 60 * 1000;
        const slice = server.history.filter(h => new Date(h.time).getTime() >= cutoff);
        if (!slice.length) return null;
        return ((slice.filter(h=>h.status==='up').length / slice.length) * 100).toFixed(2);
    };

    const uptime1h  = calcUptime(60);
    const uptime24h = calcUptime(1440);
    const uptime7d  = calcUptime(10080);

    const hist24 = server?.history?.slice(-48) || [];

    const RtTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        const isUp = payload[0].payload.status === 'up';
        return (
            <div className="chart-tooltip" style={{
                background: isDark ? '#1e293b' : '#ffffff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                borderRadius: 14,
                padding: '12px 16px',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
                <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 6 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#c084fc' : '#7c3aed', fontFamily: "'Outfit', sans-serif" }}>
                        {payload[0]?.value}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a78bfa' : '#8b5cf6' }}>ms</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 8px', background: isUp ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)', borderRadius: 20, width: 'fit-content' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: isUp ? '#10b981' : '#f43f5e', display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: isUp ? '#10b981' : '#f43f5e' }}>{isUp ? 'Online' : 'Downtime Alert'}</span>
                </div>
            </div>
        );
    };

    if (loading || !server) return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:500, gap:16, background: isDark ? '#0b0f19' : '#f8fafc', transition:'background-color 0.3s' }}>
            <div style={{
                width:48, height:48, borderRadius:'50%',
                border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0',
                borderTop:'4px solid #7c3aed',
                animation:'spin 0.8s linear infinite'
            }}/>
            <div style={{ fontSize:14, color:'#94a3b8', fontWeight:600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading site metrics...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const statusColor = server.status==='up' ? '#10b981' : server.status==='down' ? '#f43f5e' : '#f59e0b';
    const sslDays = expiry?.ssl?.daysLeft ?? server.sslDaysLeft;
    const domDays = expiry?.domain?.daysLeft ?? (server.domainExpiry ? Math.floor((new Date(server.domainExpiry)-Date.now())/(1000*60*60*24)) : null);

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{`
                /* Global CSS Variables for scope */
                .perf-page-container {
                  --primary: #7c3aed;
                  --primary-hover: #6d28d9;
                  --primary-rgb: 124, 58, 237;
                  --success: #10b981;
                  --success-rgb: 16, 185, 129;
                  --danger: #f43f5e;
                  --danger-rgb: 244, 63, 94;
                  --warning: #f59e0b;
                  --warning-rgb: 245, 158, 11;
                  --info: #06b6d4;
                  
                  transition: background-color 0.3s ease;
                  min-height: 100vh;
                  position: relative;
                  z-index: 1;
                }

                /* Light Theme Scope */
                .perf-page-container.light {
                  --bg-primary: #f8fafc;
                  --bg-card: #ffffff;
                  --bg-input: #f1f5f9;
                  --border-color: rgba(226, 232, 240, 0.8);
                  --text-main: #0f172a;
                  --text-muted: #64748b;
                  --text-muted-darker: #475569;
                  --primary-glow: rgba(124, 58, 237, 0.04);
                  --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
                  --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
                  --input-focus-shadow: rgba(124, 58, 237, 0.08);
                }

                /* Dark Theme Scope */
                .perf-page-container.dark {
                  --bg-primary: #0b0f19;
                  --bg-card: #131a26;
                  --bg-input: #1b2535;
                  --border-color: rgba(255, 255, 255, 0.07);
                  --text-main: #f8fafc;
                  --text-muted: #94a3b8;
                  --text-muted-darker: #cbd5e1;
                  --primary-glow: rgba(139, 92, 246, 0.1);
                  --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
                  --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
                  --input-focus-shadow: rgba(139, 92, 246, 0.15);
                }

                /* Body background overrides */
                body.charts-dark-theme {
                  background-color: #0b0f19 !important;
                }
                body.charts-dark-theme .app-main,
                body.charts-dark-theme .content {
                  background-color: #0b0f19 !important;
                  transition: background-color 0.3s ease;
                }

                /* Decorative glows */
                .perf-bg-glow-1 {
                  position: absolute;
                  top: -200px;
                  right: 10%;
                  width: 600px;
                  height: 600px;
                  background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0) 70%);
                  pointer-events: none;
                  z-index: 0;
                }
                .perf-page-container.dark .perf-bg-glow-1 {
                  background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0) 70%);
                }

                /* Page Styling Adaptations */
                .perf-page-container .sit-page {
                  background: transparent !important;
                  min-height: auto;
                  position: relative;
                  z-index: 10;
                }
                .perf-page-container .sit-topbar {
                  background: var(--bg-card) !important;
                  border-bottom: 1px solid var(--border-color) !important;
                  border-radius: 16px;
                  padding: 16px 20px;
                  box-shadow: var(--card-shadow);
                  margin-bottom: 24px;
                }
                .perf-page-container .sit-back {
                  color: var(--primary) !important;
                  font-weight: 700;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                .perf-page-container .sit-action-btn {
                  border-radius: 10px !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                  transition: all 0.2s;
                }
                .perf-page-container .sit-action-btn:hover {
                  transform: translateY(-1px);
                }
                .perf-page-container .sit-action-btn.resume-btn {
                  background: var(--success) !important;
                }
                .perf-page-container .sit-action-btn.resume-btn:hover {
                  background: #059669 !important;
                  box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
                }
                .perf-page-container .sit-action-btn:not(.resume-btn):not([style*="background"]) {
                  background: var(--warning) !important;
                }
                .perf-page-container .sit-action-btn:not(.resume-btn):not([style*="background"]):hover {
                  background: #d97706 !important;
                  box-shadow: 0 4px 12px rgba(245,158,11,0.3) !important;
                }

                /* Header details */
                .perf-page-container .sit-header {
                  padding: 0;
                  margin-bottom: 24px;
                }
                .perf-page-container .sit-name {
                  font-family: 'Outfit', sans-serif;
                  font-size: 26px;
                  font-weight: 800;
                  color: var(--text-main) !important;
                  letter-spacing: -0.6px;
                }
                .perf-page-container .sit-url {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--primary) !important;
                  font-weight: 600;
                  font-size: 13px;
                }

                /* Layout structure */
                .perf-page-container .sit-layout {
                  display: flex;
                  gap: 20px;
                  padding: 0;
                }
                .perf-page-container .sit-main {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  gap: 20px;
                  min-width: 0;
                }
                .perf-page-container .sit-right {
                  width: 260px;
                  flex-shrink: 0;
                  display: flex;
                  flex-direction: column;
                  gap: 16px;
                }

                /* Card layouts */
                .perf-page-container .sit-card,
                .perf-page-container .sit-chart-card,
                .perf-page-container .sit-incidents-card,
                .perf-page-container .sit-right-card {
                  background: var(--bg-card) !important;
                  border: 1px solid var(--border-color) !important;
                  border-radius: 20px;
                  box-shadow: var(--card-shadow);
                  padding: 22px 20px;
                  transition: all 0.3s;
                }
                .perf-page-container .sit-card:hover,
                .perf-page-container .sit-chart-card:hover,
                .perf-page-container .sit-incidents-card:hover,
                .perf-page-container .sit-right-card:hover {
                  border-color: rgba(var(--primary-rgb), 0.15) !important;
                }
                .perf-page-container .sit-card-label {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--text-muted) !important;
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 0.5px;
                }
                .perf-page-container .sit-card-val {
                  font-family: 'Outfit', sans-serif;
                  color: var(--text-main) !important;
                  font-weight: 800;
                  font-size: 22px;
                }
                .perf-page-container .sit-card-sub {
                  color: var(--text-muted) !important;
                  font-size: 12px;
                }
                
                /* Bar segments */
                .perf-page-container .sit-bar-seg {
                  height: 18px;
                  border-radius: 2.5px;
                }
                .perf-page-container .sit-bar-up {
                  background: var(--success) !important;
                }
                .perf-page-container .sit-bar-down {
                  background: var(--danger) !important;
                }
                .perf-page-container .sit-bar-unknown {
                  background: var(--bg-input) !important;
                }

                /* Uptime row */
                .perf-page-container .sit-uptime-row {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 12px;
                }
                .perf-page-container .sit-uptime-box {
                  background: var(--bg-card) !important;
                  border: 1px solid var(--border-color) !important;
                  box-shadow: var(--card-shadow);
                  border-radius: 16px;
                  padding: 16px;
                  text-align: center;
                }
                .perf-page-container .sit-uptime-label {
                  color: var(--text-muted) !important;
                  font-size: 10px;
                  font-weight: 700;
                  letter-spacing: 0.5px;
                }
                .perf-page-container .sit-uptime-val {
                  font-family: 'Outfit', sans-serif;
                  font-size: 20px;
                  font-weight: 800;
                }

                /* Status dot ring */
                .perf-page-container .sit-status-circle {
                  position: relative;
                  display: inline-block;
                  width: 14px;
                  height: 14px;
                  border-radius: 50%;
                }
                .perf-page-container .sit-status-circle::after {
                  content: '';
                  position: absolute;
                  top: -2px; left: -2px;
                  width: 18px; height: 18px;
                  border-radius: 50%;
                  opacity: 0;
                  animation: pulse-ring 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
                }
                .perf-page-container .sit-status-circle.blink-up::after {
                  border: 2px solid var(--success);
                }
                .perf-page-container .sit-status-circle.blink-down::after {
                  border: 2px solid var(--danger);
                }

                /* Chart controls */
                .perf-page-container .sit-chart-title {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--text-main) !important;
                  font-weight: 700;
                  font-size: 15px;
                }
                .perf-page-container .sit-range-bar {
                  background: var(--bg-input) !important;
                  border: 1px solid var(--border-color) !important;
                  border-radius: 12px;
                  padding: 4px;
                }
                .perf-page-container .sit-range-btn {
                  font-weight: 700;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--text-muted) !important;
                  border-radius: 8px;
                  padding: 6px 14px;
                }
                .perf-page-container .sit-range-btn:hover {
                  color: var(--text-main) !important;
                  background: var(--bg-card) !important;
                }
                .perf-page-container .sit-range-btn.active {
                  background: var(--primary) !important;
                  color: #fff !important;
                  box-shadow: 0 2px 8px rgba(124,58,237,0.3) !important;
                }
                .perf-page-container .sit-date-input {
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 10px;
                  padding: 8px 12px;
                  outline: none;
                }
                .perf-page-container .sit-date-input:focus {
                  border-color: var(--primary) !important;
                  box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
                  background: var(--bg-card) !important;
                }

                /* Metric bottom stats */
                .perf-page-container .sit-resp-row {
                  border-top: 1px solid var(--border-color) !important;
                }
                .perf-page-container .sit-resp-icon {
                  color: var(--text-muted);
                }
                .perf-page-container .sit-resp-val {
                  font-family: 'Outfit', sans-serif;
                  color: var(--text-main) !important;
                  font-size: 18px;
                  font-weight: 800;
                }
                .perf-page-container .sit-resp-label {
                  font-size: 11px;
                  color: var(--text-muted) !important;
                  font-weight: 600;
                }

                /* Incidents Card */
                .perf-page-container .sit-inc-table {
                  width: 100%;
                  border-collapse: collapse;
                }
                .perf-page-container .sit-inc-table th {
                  color: var(--text-muted) !important;
                  border-bottom: 1px solid var(--border-color) !important;
                  font-weight: 700;
                  font-size: 11px;
                  letter-spacing: 0.5px;
                  padding: 12px 14px;
                  text-transform: uppercase;
                }
                .perf-page-container .sit-inc-table td {
                  padding: 12px 14px;
                  border-bottom: 1px solid var(--border-color) !important;
                  color: var(--text-main) !important;
                }
                .perf-page-container .sit-inc-badge {
                  display: inline-block;
                  padding: 3px 8px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 700;
                }
                .perf-page-container .sit-inc-badge.sit-inc-down {
                  background: rgba(244, 63, 94, 0.08) !important;
                  color: var(--danger) !important;
                }
                .perf-page-container .sit-inc-badge.sit-inc-recovered {
                  background: rgba(16, 185, 129, 0.08) !important;
                  color: var(--success) !important;
                }
                
                /* Right Column widgets */
                .perf-page-container .sit-right-title {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--text-main) !important;
                  font-weight: 700;
                  font-size: 13px;
                  margin-bottom: 14px;
                }
                .perf-page-container .sit-right-label {
                  color: var(--text-muted) !important;
                  font-size: 11px;
                  font-weight: 600;
                }
                .perf-page-container .sit-right-val {
                  font-family: 'Outfit', sans-serif;
                  font-size: 18px;
                  font-weight: 800;
                }
                .perf-page-container .sit-right-sub {
                  color: var(--text-muted) !important;
                  font-size: 11px;
                }
                .perf-page-container .sit-right-na {
                  color: var(--text-muted) !important;
                  background: var(--bg-input);
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 11px;
                  font-weight: 700;
                }
                .perf-page-container .sit-info-row {
                  display: flex;
                  justify-content: space-between;
                  font-size: 12px;
                  padding: 8px 0;
                  border-bottom: 1px solid var(--border-color);
                  color: var(--text-main);
                }
                .perf-page-container .sit-info-row:last-child {
                  border-bottom: none;
                }
                .perf-page-container .sit-info-row span:first-child {
                  color: var(--text-muted) !important;
                  font-weight: 600;
                }

                /* Mobile overrides */
                @media (max-width: 900px) {
                  .perf-page-container .sit-layout {
                    flex-direction: column !important;
                    gap: 20px;
                  }
                  .perf-page-container .sit-right {
                    width: 100% !important;
                  }
                  .perf-page-container .sit-cards-row {
                    grid-template-columns: 1fr !important;
                  }
                  .perf-page-container .sit-uptime-row {
                    grid-template-columns: 1fr 1fr !important;
                  }
                }
                @media (max-width: 600px) {
                  .perf-page-container .sit-uptime-row {
                    grid-template-columns: 1fr !important;
                  }
                  .perf-page-container .sit-resp-row {
                    flex-direction: column;
                    gap: 12px;
                  }
                }
            `}</style>

            <div className="perf-bg-glow-1" />

            <div className="sit-page" style={{ padding: '0 4px' }}>
                {/* ── Top bar ── */}
                <div className="sit-topbar">
                    <button className="sit-back" onClick={()=>navigate('/monitoring')}>
                        ← Monitors
                    </button>
                    <div className="sit-topbar-right">
                        <button className={`sit-action-btn${server.active ? '' : ' resume-btn'}`} onClick={togglePause} disabled={pausing}>
                            {server.active ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <button className="sit-action-btn" style={{background:'#7c3aed'}} onClick={() => navigate('/add-monitor', { state: { editServer: server } })}>
                            ✏️ Edit
                        </button>
                    </div>
                </div>

                {/* ── Site header ── */}
                <div className="sit-header">
                    <div className="sit-header-left">
                        <span className={`sit-status-circle ${server.status==='up'?'blink-up':server.status==='down'?'blink-down':''}`} style={{ background: statusColor }} />
                        <div>
                            <h1 className="sit-name">{server.name}</h1>
                            <a href={server.url} target="_blank" rel="noreferrer" className="sit-url">{server.url} ↗</a>
                        </div>
                    </div>
                </div>

                {/* ── Main layout ── */}
                <div className="sit-layout">
                    <div className="sit-main">

                        {/* Status cards row */}
                        <div className="sit-cards-row">
                            <div className="sit-card">
                                <div className="sit-card-label">Current status</div>
                                <div className="sit-card-val" style={{ color: statusColor, fontSize:22 }}>
                                    {server.status==='up' ? 'Up' : server.status==='down' ? 'Down' : 'Unknown'}
                                </div>
                                {server.lastUpAt && server.status==='up' && (
                                    <div className="sit-card-sub">Up since {fmt(server.lastUpAt)}</div>
                                )}
                                {server.lastDownAt && server.status==='down' && (
                                    <div className="sit-card-sub" style={{color:'#f43f5e'}}>Down since {fmt(server.lastDownAt)}</div>
                                )}
                            </div>

                            <div className="sit-card">
                                <div className="sit-card-label">Last check</div>
                                <div className="sit-card-val" style={{fontSize:18}}>{timeAgo(server.lastChecked)}</div>
                                <div className="sit-card-sub">HTTP {server.httpCode || '—'}</div>
                            </div>

                            <div className="sit-card">
                                <div className="sit-card-label">Last 24 hours</div>
                                <div className="sit-24-bar" style={{overflow:'hidden', maxWidth:'100%'}}>
                                    {hist24.slice(-36).map((h,i) => (
                                        <div key={i} className={`sit-bar-seg sit-bar-${h.status}`} title={`${fmtTime(h.time)} — ${h.status} ${h.responseTime?h.responseTime+'ms':''}`} />
                                    ))}
                                </div>
                                <div className="sit-card-sub" style={{color: uptime24h>=99?'#10b981':uptime24h>=95?'#f59e0b':'#f43f5e', fontWeight:700}}>
                                    {uptime24h !== null ? `${uptime24h}% uptime` : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Uptime stats */}
                        <div className="sit-uptime-row">
                            {[
                                { label:'Last 1h',  val: uptime1h },
                                { label:'Last 24h', val: uptime24h },
                                { label:'Last 7d',  val: uptime7d },
                            ].map(({ label, val }) => (
                                <div key={label} className="sit-uptime-box">
                                    <div className="sit-uptime-label">{label}</div>
                                    <div className="sit-uptime-val" style={{ color: val===null ? '#94a3b8' : val>=99 ? '#10b981' : val>=95 ? '#f59e0b' : '#f43f5e' }}>
                                        {val !== null ? `${val}%` : '—'}
                                    </div>
                                </div>
                            ))}
                            <div className="sit-uptime-box">
                                <div className="sit-uptime-label">Response</div>
                                <div className="sit-uptime-val" style={{ color:'var(--primary)' }}>
                                    {server.responseTime ? `${server.responseTime}ms` : '—'}
                                </div>
                            </div>
                        </div>

                        {/* Response time chart */}
                        <div className="sit-chart-card">
                            <div className="sit-chart-header">
                                <div className="sit-chart-title">⚡ Response Time</div>
                                <div className="sit-range-bar">
                                    {RANGES.map(r => (
                                        <button key={r.value} className={`sit-range-btn ${!showCustom && range===r.value ? 'active' : ''}`}
                                            onClick={()=>{ setRange(r.value); setShowCustom(false); }}>
                                            {r.label}
                                        </button>
                                    ))}
                                    <button className={`sit-range-btn ${showCustom ? 'active' : ''}`} onClick={()=>setShowCustom(s=>!s)}>
                                        📅 Custom
                                    </button>
                                </div>
                            </div>

                            {showCustom && (
                                <div className="sit-custom-range" style={{ marginBottom: 20 }}>
                                    <input type="datetime-local" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="sit-date-input" />
                                    <span style={{color:'var(--text-muted)', fontWeight: 600}}>to</span>
                                    <input type="datetime-local" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="sit-date-input" />
                                </div>
                            )}

                            {chartData.length > 1 ? (
                                <div className="sit-chart-wrap" style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{top:10,right:10,left:0,bottom:0}}
                                >
                                        <defs>
                                            <linearGradient id="sitGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25}/>
                                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} vertical={false}/>
                                        <XAxis dataKey="time" tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} interval={Math.floor(chartData.length/6)||1} tickLine={false} axisLine={false}/>
                                        <YAxis type="number" domain={[0, 'auto']} allowDecimals={false} tickFormatter={(v)=>`${Math.round(v)}ms`} tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} tickLine={false} axisLine={false} width={48}/>
                                        <Tooltip content={<RtTooltip />} />
                                        {avgMs>0 && <ReferenceLine y={avgMs} stroke={isDark ? 'rgba(167,139,250,0.4)' : '#a78bfa'} strokeDasharray="4 4" label={{value:`avg`,position:'insideTopRight',fontSize:10,fill: isDark ? '#c084fc' : '#7c3aed', fontWeight: 700}}/>}
                                        <Area type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2.5} fill="url(#sitGrad)" dot={false} activeDot={{r:5,fill:'#7c3aed', stroke: isDark ? '#131a26' : '#fff', strokeWidth: 2}}/>
                                    </AreaChart>
                                </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="sit-chart-empty">Not enough data to render chart for select metrics range</div>
                            )}

                            <div className="sit-resp-row">
                                <div className="sit-resp-stat">
                                    <span className="sit-resp-icon">≈</span>
                                    <span className="sit-resp-val">{avgMs ? `${avgMs} ms` : '—'}</span>
                                    <span className="sit-resp-label">Average</span>
                                </div>
                                <div className="sit-resp-stat">
                                    <span className="sit-resp-icon">↓</span>
                                    <span className="sit-resp-val" style={{color:'#10b981'}}>{minMs ? `${minMs} ms` : '—'}</span>
                                    <span className="sit-resp-label">Minimum</span>
                                </div>
                                <div className="sit-resp-stat">
                                    <span className="sit-resp-icon">↑</span>
                                    <span className="sit-resp-val" style={{color:'#f59e0b'}}>{maxMs ? `${maxMs} ms` : '—'}</span>
                                    <span className="sit-resp-label">Maximum</span>
                                </div>
                            </div>
                        </div>

                        {/* Incidents */}
                        <div className="sit-incidents-card">
                            <div className="sit-incidents-header" style={{ marginBottom: 20 }}>
                                <div className="sit-chart-title">⚠️ Latest Incidents</div>
                            </div>
                            {incidents.length === 0 && !expiry ? (
                                <div style={{padding:'16px 0', color:'var(--text-muted)', fontSize:13, display:'flex', alignItems:'center', gap:8}}>
                                    <span style={{display:'inline-block', width:12, height:12, border:'2px solid var(--border-color)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite'}} />
                                    Loading incidents...
                                </div>
                            ) : incidents.length > 0 ? (<>
                                {/* Desktop table */}
                                <div className="sit-inc-desktop">
                                    <table className="sit-inc-table">
                                        <thead><tr><th>Status</th><th>Type</th><th>Message</th><th>Time</th></tr></thead>
                                        <tbody>
                                            {incidents.map(a => (
                                                <tr key={a._id}>
                                                    <td><span className={`sit-inc-badge sit-inc-${a.type}`}>{a.type==='down'?'● Down':'● Recovered'}</span></td>
                                                    <td style={{color:'var(--text-muted)',fontSize:12, fontWeight: 600}}>HTTP</td>
                                                    <td style={{color:'var(--text-main)',fontSize:13, fontWeight: 500}}>{a.message||'—'}</td>
                                                    <td style={{color:'var(--text-muted)',fontSize:12,whiteSpace:'nowrap', fontWeight: 600}}>{fmt(a.createdAt)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Mobile cards */}
                                <div className="sit-inc-mobile">
                                    {incidents.map(a => (
                                        <div key={a._id} style={{padding:'14px 0',borderBottom:`1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`}}>
                                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                                <span className={`sit-inc-badge sit-inc-${a.type}`}>{a.type==='down'?'● Down':'● Recovered'}</span>
                                                <span style={{fontSize:11,color:'var(--text-muted)', fontWeight: 600}}>{fmt(a.createdAt)}</span>
                                            </div>
                                            <div style={{fontSize:13,color:'var(--text-main)', fontWeight: 500}}>{a.message||'—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </>) : (
                                <div className="sit-chart-empty" style={{color:'#10b981', background: 'transparent', border: 'none'}}>✓ No downtime incidents recorded</div>
                            )}
                        </div>
                    </div>

                    {/* ── Right panel ── */}
                    <div className="sit-right">
                        <div className="sit-right-card">
                            <div className="sit-right-title">Domain & SSL</div>
                            <div className="sit-right-item">
                                <div className="sit-right-label">🌐 Domain valid until</div>
                                {domDays !== null ? (
                                    <div style={{ marginTop: 8 }}>
                                        <div className="sit-right-val" style={{color: domDays<=30?'#f43f5e':domDays<=60?'#f59e0b':'#10b981'}}>{domDays} days left</div>
                                        {server.domainExpiry && <div className="sit-right-sub" style={{ marginTop: 4 }}>{new Date(server.domainExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                                    </div>
                                ) : <div className="sit-right-na" style={{ marginTop: 8 }}>Not checked</div>}
                            </div>
                            <div className="sit-right-item" style={{marginTop:20}}>
                                <div className="sit-right-label">🔒 SSL valid until</div>
                                {sslDays !== null ? (
                                    <div style={{ marginTop: 8 }}>
                                        <div className="sit-right-val" style={{color: sslDays<=7?'#f43f5e':sslDays<=30?'#f59e0b':'#10b981'}}>{sslDays} days left</div>
                                        {server.sslExpiry && <div className="sit-right-sub" style={{ marginTop: 4 }}>{new Date(server.sslExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                                    </div>
                                ) : <div className="sit-right-na" style={{ marginTop: 8 }}>Not checked</div>}
                            </div>
                        </div>

                        <div className="sit-right-card">
                            <div className="sit-right-title">Monitor info</div>
                            <div className="sit-info-row"><span>Type</span><span>HTTP/S</span></div>
                            <div className="sit-info-row"><span>Status</span><span style={{color:statusColor,fontWeight:700}}>{server.status}</span></div>
                            <div className="sit-info-row"><span>Active</span><span style={{color:server.active?'#10b981':'var(--text-muted)'}}>{server.active?'Yes':'Paused'}</span></div>
                            <div className="sit-info-row"><span>HTTP code</span><span>{server.httpCode||'—'}</span></div>
                            <div className="sit-info-row"><span>Last check</span><span>{timeAgo(server.lastChecked)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
