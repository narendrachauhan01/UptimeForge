let _loaded_Charts = false;
import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
  ReferenceLine,
} from 'recharts';
import { getServers, getAlerts, API_URL } from '../api';
import axios from 'axios';

export default function Charts({ theme = 'light' }) {
  const [localTheme, setLocalTheme] = useState(() => {
    const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
    if (match) return match[1];
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const isDark = localTheme === 'dark';

  const switchTheme = (next) => {
    setLocalTheme(next);
    const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
    document.cookie = `charts_theme=${next}; expires=${exp}; path=/; SameSite=Lax`;
  };

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

  const [servers, setServers]       = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory]       = useState([]);
  const [siteSearch, setSiteSearch]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [uptimeSearch, setUptimeSearch] = useState('');
  const [pageLoading, setPageLoading]   = useState(false);
  const [statsFilter, setStatsFilter]   = useState('all'); // 'all' | 'up' | 'down' | 'incidents'

  useEffect(() => {
    setPageLoading(true);
    getServers().then(r => {
      setServers(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0]._id);
      setPageLoading(false); _loaded_Charts = true;
    }).catch(()=>setPageLoading(false));
    getAlerts().then(r => setAlerts(r.data));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    
    axios.get(`${API_URL}/api/servers/${selectedId}/history`, { withCredentials: true })
      .then(r => setHistory(r.data?.history || []));
  }, [selectedId]);

  const selectedServer = servers.find(s => s._id === selectedId);

  const chartData = history.slice(-60).map(h => ({
    time: new Date(h.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    responseTime: h.responseTime || 0,
    status: h.status === 'up' ? 1 : 0,
  }));

  const avgResponseTime = chartData.length
    ? Math.round(chartData.reduce((s, d) => s + d.responseTime, 0) / chartData.length)
    : 0;

  const uptimeData = servers.map(s => {
    const hist      = s.historyBar || s.history || [];
    const total     = hist.length;
    const upCount   = hist.filter(h => h.status === 'up').length;
    const downCount = total - upCount;
    const pct       = total > 0 ? parseFloat(((upCount / total) * 100).toFixed(2)) : 100;
    const rtValues  = hist.map(h => h.responseTime).filter(Boolean);
    const avgRt     = rtValues.length ? Math.round(rtValues.reduce((a, b) => a + b, 0) / rtValues.length) : null;
    const minRt     = rtValues.length ? Math.min(...rtValues) : null;
    const maxRt     = rtValues.length ? Math.max(...rtValues) : null;
    return { id: s._id, name: s.name, url: s.url, status: s.status, uptime: pct, total, upCount, downCount, avgRt, minRt, maxRt };
  }).sort((a, b) => b.uptime - a.uptime);

  const filteredUptimeData = uptimeData.filter(s => {
    const matchesSearch = uptimeSearch.trim() === '' ||
      s.name.toLowerCase().includes(uptimeSearch.toLowerCase()) ||
      s.url.toLowerCase().includes(uptimeSearch.toLowerCase());
      
    if (!matchesSearch) return false;
    if (statsFilter === 'up') return s.status === 'up';
    if (statsFilter === 'down') return s.status === 'down';
    if (statsFilter === 'incidents') return s.downCount > 0;
    return true;
  });

  const alertMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    alertMap[key] = { date: key, down: 0, recovered: 0 };
  }
  alerts.forEach(a => {
    const key = new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (alertMap[key]) { if (a.type === 'down') alertMap[key].down++; else alertMap[key].recovered++; }
  });
  const alertData = Object.values(alertMap);

  const up      = servers.filter(s => s.status === 'up').length;
  const down    = servers.filter(s => s.status === 'down').length;
  const unknown = servers.filter(s => s.status === 'unknown').length;
  const pieData = [
    { name: 'Online',  value: up,      color: '#10b981' },
    { name: 'Offline', value: down,    color: '#f43f5e' },
    { name: 'Unknown', value: unknown, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const uptimeColor = v => v >= 99 ? '#10b981' : v >= 95 ? '#f59e0b' : '#f43f5e';
  const rtColor     = v => !v ? '#94a3b8' : v > 2000 ? '#f43f5e' : v > 800 ? '#f59e0b' : '#10b981';

  const downloadCSV = () => {
    const headers = ['Site Name', 'URL', 'Status', 'Uptime %', 'Total Checks', 'Up Checks', 'Down Checks', 'Avg RT (ms)', 'Min RT (ms)', 'Max RT (ms)'];
    const rows = filteredUptimeData.map(s => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.url || '').replace(/"/g, '""')}"`,
      s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown',
      `${s.uptime}%`,
      s.total,
      s.upCount,
      s.downCount,
      s.avgRt ? s.avgRt : '',
      s.minRt ? s.minRt : '',
      s.maxRt ? s.maxRt : ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uptime-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const RtTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const isUp = payload[0].payload.status === 1;
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

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: '10px 14px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.color }} />
          <span style={{ fontWeight: 600, color: isDark ? '#cbd5e1' : '#475569' }}>{data.name}:</span>
          <span style={{ fontWeight: 800, color: data.color }}>{data.value} site{data.value !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  };

  const AlertTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: isDark ? '#1e293b' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: '12px 14px',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
        <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, marginBottom: 8 }}>{label}</div>
        {payload.map((p, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'space-between', marginTop: idx > 0 ? 4 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 4, borderRadius: 2, background: p.color }} />
              <span style={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#475569', fontWeight: 500 }}>{p.name}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: p.color }}>{p.value} incident{p.value !== 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
    );
  };

  if (pageLoading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:500,gap:14,background: isDark ? '#0b0f19' : '#f8fafc',transition:'background-color 0.3s'}}>
      <div style={{width:48,height:48,borderRadius:'50%',border:'4px solid rgba(124,58,237,0.1)',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
      <div style={{fontSize:14,color:'#94a3b8',fontWeight:600,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>Loading Analytics...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className={`perf-page-container ${localTheme}`}>
      <style>{`
        /* Global CSS Variables for performance scope */
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
          --glass-bg: rgba(255, 255, 255, 0.7);
          --glass-border: rgba(226, 232, 240, 0.6);
          --table-header-bg: #f8fafc;
          --table-row-hover: #faf5ff;
          --input-focus-shadow: rgba(124, 58, 237, 0.08);
          --site-dropdown-bg: #ffffff;
          --site-dropdown-border: #e2e8f0;
          --pie-legend-border: rgba(0, 0, 0, 0.08);
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
          --glass-bg: rgba(19, 26, 38, 0.8);
          --glass-border: rgba(255, 255, 255, 0.08);
          --table-header-bg: #101622;
          --table-row-hover: #1e1b4b;
          --input-focus-shadow: rgba(139, 92, 246, 0.15);
          --site-dropdown-bg: #131a26;
          --site-dropdown-border: rgba(255, 255, 255, 0.1);
          --pie-legend-border: rgba(255, 255, 255, 0.08);
        }

        /* Ambient glows for premium look */
        .perf-bg-glow-1 {
          position: absolute;
          top: -200px;
          right: 10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0) 70%);
          pointer-events: none;
          z-index: 0;
          transition: background 0.3s;
        }
        .perf-page-container.dark .perf-bg-glow-1 {
          background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0) 70%);
        }
        .perf-bg-glow-2 {
          position: absolute;
          bottom: -150px;
          left: -50px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%);
          pointer-events: none;
          z-index: 0;
          transition: background 0.3s;
        }
        .perf-page-container.dark .perf-bg-glow-2 {
          background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0) 70%);
        }

        /* Outer layout background overrides for charts view */
        body.charts-dark-theme {
          background-color: #0b0f19 !important;
        }
        body.charts-dark-theme .app-main,
        body.charts-dark-theme .content {
          background-color: #0b0f19 !important;
          transition: background-color 0.3s ease;
        }

        /* Page structure adaptations */
        .perf-page-container .pg-wrap {
          max-width: 100%;
          position: relative;
          z-index: 10;
        }
        .perf-page-container .pg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          gap: 16px;
        }
        .perf-page-container .pg-title {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.8px;
        }
        .perf-page-container .pg-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .perf-badge-pulse {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(124, 58, 237, 0.08);
          color: var(--primary);
          border: 1px solid rgba(124, 58, 237, 0.15);
        }
        .perf-page-container.dark .perf-badge-pulse {
          background: rgba(139, 92, 246, 0.15);
          color: #a78bfa;
          border-color: rgba(139, 92, 246, 0.25);
        }
        .perf-pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.4);
          animation: pulse-glow 1.5s infinite;
        }
        @keyframes pulse-glow {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 5px rgba(124, 58, 237, 0.2); }
          100% { transform: scale(0.9); opacity: 0.7; }
        }

        /* Metric Grid & Cards */
        .perf-page-container .chart-overview-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .perf-page-container .chart-stat-box {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          border-radius: 20px;
          padding: 22px 20px;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 125px;
          box-sizing: border-box;
        }
        .perf-page-container .chart-stat-box::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: transparent;
          transition: all 0.3s;
          border-radius: 4px 0 0 4px;
        }
        .perf-page-container .chart-stat-box:hover {
          transform: translateY(-4px);
          box-shadow: var(--card-hover-shadow);
          border-color: rgba(var(--primary-rgb), 0.25);
        }
        .perf-page-container .chart-stat-box.active-filter::before {
          background: var(--primary);
        }
        .perf-page-container .chart-stat-box.active-filter {
          border-color: var(--primary);
          background: var(--primary-glow);
          box-shadow: 0 8px 30px rgba(124, 58, 237, 0.08);
        }
        .perf-page-container .chart-stat-box.active-filter::after {
          content: 'Filter Active';
          position: absolute;
          bottom: 12px;
          right: 14px;
          font-size: 9px;
          font-weight: 800;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: rgba(124, 58, 237, 0.08);
          padding: 2px 6px;
          border-radius: 20px;
        }
        .perf-page-container.dark .chart-stat-box.active-filter::after {
          color: #a78bfa;
          background: rgba(139, 92, 246, 0.15);
        }
        .perf-page-container .chart-stat-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
        }
        .perf-page-container .chart-stat-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 0;
          line-height: 1.4;
        }
        .perf-page-container .chart-stat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          color: var(--text-muted);
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .metric-icon-svg {
          width: 16px;
          height: 16px;
        }
        .perf-page-container .chart-stat-box:hover .chart-stat-icon-wrap {
          color: var(--primary);
          background: rgba(var(--primary-rgb), 0.1);
          transform: scale(1.05);
        }
        .perf-page-container .chart-stat-value {
          font-family: 'Outfit', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: var(--text-main);
          margin-top: 14px;
          line-height: 1;
        }

        /* Chart Cards styles */
        .perf-page-container .chart-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          box-shadow: var(--card-shadow);
          border-radius: 24px;
          padding: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-sizing: border-box;
          margin-bottom: 24px;
        }
        .perf-page-container .chart-card:hover {
          border-color: rgba(var(--primary-rgb), 0.15);
        }
        .perf-page-container .chart-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        /* Site Search Input */
        .perf-page-container .site-search-wrap {
          position: relative;
          min-width: 260px;
        }
        .perf-page-container .site-search-input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 16px;
          border: 1.5px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-input);
          cursor: text;
          transition: all 0.2s;
        }
        .perf-page-container .site-search-input-box:focus-within {
          border-color: var(--primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 4px var(--input-focus-shadow);
        }
        .perf-page-container .site-search-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          font-family: 'Plus Jakarta Sans', sans-serif;
          width: 100%;
        }
        .perf-page-container .site-search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--site-dropdown-bg);
          border: 1px solid var(--site-dropdown-border);
          border-radius: 16px;
          box-shadow: var(--card-hover-shadow);
          z-index: 100;
          min-width: 280px;
          max-height: 240px;
          overflow-y: auto;
          padding: 8px;
          backdrop-filter: blur(10px);
        }
        .perf-page-container .site-search-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .perf-page-container .site-search-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .perf-page-container .site-search-dot.up { background: var(--success); }
        .perf-page-container .site-search-dot.down { background: var(--danger); }
        .perf-page-container .site-search-dot.unknown { background: var(--warning); }
        .perf-page-container .site-search-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }
        .perf-page-container .site-search-url {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Dynamic filter active dot in selector */
        .perf-search-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 6px;
        }
        .perf-search-indicator.up { background: var(--success); }
        .perf-search-indicator.down { background: var(--danger); }
        .perf-search-indicator.unknown { background: var(--warning); }

        /* Row 2 side-by-side grids */
        .perf-row-2 {
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 20px;
          margin-bottom: 24px;
        }
        .pie-wrap {
          display: flex;
          align-items: center;
          justify-content: space-around;
          gap: 16px;
          flex-wrap: wrap;
          padding: 10px 0;
        }
        .pie-chart-box {
          width: 150px;
          height: 150px;
          position: relative;
        }
        .pie-center-label {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          font-family: 'Outfit', sans-serif;
          pointer-events: none;
        }
        .pie-center-num {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
        }
        .pie-center-txt {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
          margin-top: 2px;
          letter-spacing: 0.5px;
        }
        .pie-legend {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 140px;
        }
        .pie-legend-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 13px;
        }

        /* Uptime Table styles */
        .perf-page-container .uptime-table-wrap {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .perf-page-container .uptime-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .perf-page-container .uptime-table thead tr {
          background: var(--table-header-bg);
        }
        .perf-page-container .uptime-table th {
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          border-bottom: 1px solid var(--border-color);
        }
        .perf-page-container .uptime-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
          transition: background-color 0.2s;
        }
        .perf-page-container .uptime-table tbody tr:last-child td {
          border-bottom: none;
        }
        .perf-page-container .uptime-table tbody tr:hover td {
          background: var(--table-row-hover);
        }
        
        /* Pulse status indicators for tables */
        .pulse-indicator {
          position: relative;
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          vertical-align: middle;
        }
        .pulse-indicator::after {
          content: '';
          position: absolute;
          top: -2px; left: -2px;
          width: 12px; height: 12px;
          border-radius: 50%;
          opacity: 0;
          animation: pulse-ring 2.2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
        }
        .pulse-indicator.up { background: var(--success); }
        .pulse-indicator.up::after { border: 2px solid var(--success); }
        .pulse-indicator.down { background: var(--danger); }
        .pulse-indicator.down::after { border: 2px solid var(--danger); }
        .pulse-indicator.unknown { background: var(--warning); }
        .pulse-indicator.unknown::after { border: 2px solid var(--warning); }

        @keyframes pulse-ring {
          0% { transform: scale(0.65); opacity: 1; }
          75%, 100% { transform: scale(1.6); opacity: 0; }
        }

        .uptime-status-text {
          font-size: 12px;
          font-weight: 700;
          vertical-align: middle;
        }
        .perf-page-container .uptime-pct {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          font-weight: 800;
        }
        .perf-page-container .uptime-bar-track {
          height: 8px;
          background: var(--bg-input);
          border-radius: 99px;
          overflow: hidden;
          width: 130px;
        }
        .perf-page-container .uptime-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s ease;
        }

        /* Search wrap for table */
        .perf-page-container .uptime-search-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border: 1.5px solid var(--border-color);
          border-radius: 12px;
          background: var(--bg-input);
          min-width: 250px;
        }
        .perf-page-container .uptime-search-wrap:focus-within {
          border-color: var(--primary);
          background: var(--bg-card);
          box-shadow: 0 0 0 4px var(--input-focus-shadow);
        }
        .uptime-search-clear {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 800;
          font-size: 11px;
          padding: 2px 4px;
          transition: color 0.15s;
        }
        .uptime-search-clear:hover {
          color: var(--text-main);
        }

        /* Action buttons in Table Header */
        .perf-table-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Mobile views cards */
        .perf-page-container .uptime-mob-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 12px;
          transition: all 0.25s ease;
        }
        .perf-page-container .uptime-mob-card:hover {
          box-shadow: var(--card-hover-shadow);
          border-color: rgba(var(--primary-rgb), 0.15);
        }
        .uptime-mob-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }
        .uptime-mob-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .uptime-mob-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          background: var(--bg-input);
          padding: 12px;
          border-radius: 14px;
          margin-top: 14px;
        }
        .uptime-mob-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .uptime-mob-stat-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .uptime-mob-stat-val {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          font-family: 'Outfit', sans-serif;
        }

        /* Empty state and generic loading styling */
        .perf-page-container .chart-empty {
          text-align: center;
          padding: 50px 20px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          background: var(--bg-input);
          border-radius: 16px;
          border: 1px dashed var(--border-color);
          margin: 10px 0;
        }

        /* Screen Sizes Overrides */
        @media (max-width: 1200px) {
          .perf-page-container .chart-overview-row {
            grid-template-columns: repeat(3, 1fr);
            gap: 14px;
          }
        }
        @media (max-width: 820px) {
          .perf-page-container .chart-overview-row {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .perf-row-2 {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (max-width: 600px) {
          .perf-page-container .chart-overview-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .perf-page-container .pg-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .perf-theme-switch-wrap {
            align-self: flex-end;
          }
          .perf-page-container .chart-card {
            padding: 16px;
          }
          .perf-page-container .uptime-search-wrap {
            width: 100%;
          }
          .perf-table-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
          .perf-page-container .btn-csv-export {
            justify-content: center;
          }
        }

        /* ── Theme toggle ── */
        .perf-theme-switch-wrap {
          display: flex;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 50px;
          padding: 4px;
          gap: 2px;
          backdrop-filter: blur(8px);
        }
        .perf-theme-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border: none;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
          color: rgba(255,255,255,0.45);
          font-family: inherit;
          letter-spacing: 0.3px;
        }
        .perf-theme-btn:hover {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.06);
        }
        .perf-theme-btn.active {
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          box-shadow: 0 2px 12px rgba(124,58,237,0.4);
        }

        /* ── CSV Export button ── */
        .btn-csv-export {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border: 1.5px solid rgba(124,58,237,0.4);
          border-radius: 10px;
          background: rgba(124,58,237,0.1);
          color: #a78bfa;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          white-space: nowrap;
        }
        .btn-csv-export:hover {
          background: rgba(124,58,237,0.2);
          border-color: #7c3aed;
          color: #c4b5fd;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(124,58,237,0.25);
        }
        .btn-csv-export:active {
          transform: translateY(0);
        }
      `}</style>

      {/* Decorative Glows */}
      <div className="perf-bg-glow-1" />
      <div className="perf-bg-glow-2" />

      <div className="pg-wrap" style={{ padding: '0 4px' }}>
        <div className="pg-header">
          <div>
            <h1 className="pg-title">Performance Analytics</h1>
            <div className="pg-sub">
              <span>Response time & uptime history</span>
              <span className="perf-badge-pulse">
                <span className="perf-pulse-dot" />
                Checks running: 1/min
              </span>
            </div>
          </div>
          
          {/* Local Theme Selector */}
          <div className="perf-theme-switch-wrap">
            <button className={`perf-theme-btn ${!isDark ? 'active' : ''}`} onClick={() => switchTheme('light')}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              Light
            </button>
            <button className={`perf-theme-btn ${isDark ? 'active' : ''}`} onClick={() => switchTheme('dark')}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
              Dark
            </button>
          </div>
        </div>

        {/* Dynamic Metric Stats row */}
        <div className="chart-overview-row">
          {/* Total Sites */}
          <div className={`chart-stat-box ${statsFilter === 'all' ? 'active-filter' : ''}`} onClick={() => setStatsFilter('all')}>
            <div className="chart-stat-header">
              <span className="chart-stat-label">Total Sites</span>
              <div className="chart-stat-icon-wrap">
                <svg className="metric-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
                </svg>
              </div>
            </div>
            <div className="chart-stat-value" style={{ color: '#7c3aed' }}>{servers.length}</div>
          </div>

          {/* Online */}
          <div className={`chart-stat-box ${statsFilter === 'up' ? 'active-filter' : ''}`} onClick={() => setStatsFilter('up')}>
            <div className="chart-stat-header">
              <span className="chart-stat-label">Online Sites</span>
              <div className="chart-stat-icon-wrap" style={{ color: 'var(--success)' }}>
                <svg className="metric-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>
            <div className="chart-stat-value" style={{ color: '#10b981' }}>{up}</div>
          </div>

          {/* Offline */}
          <div className={`chart-stat-box ${statsFilter === 'down' ? 'active-filter' : ''}`} onClick={() => setStatsFilter('down')}>
            <div className="chart-stat-header">
              <span className="chart-stat-label">Offline Sites</span>
              <div className="chart-stat-icon-wrap" style={{ color: 'var(--danger)' }}>
                <svg className="metric-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6z" />
                  <line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
                </svg>
              </div>
            </div>
            <div className="chart-stat-value" style={{ color: '#f43f5e' }}>{down}</div>
          </div>

          {/* Avg Response */}
          <div className="chart-stat-box" style={{ cursor: 'default' }}>
            <div className="chart-stat-header">
              <span className="chart-stat-label">Avg Response</span>
              <div className="chart-stat-icon-wrap" style={{ color: 'var(--info)' }}>
                <svg className="metric-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>
            <div className="chart-stat-value" style={{ color: rtColor(avgResponseTime), fontSize: 26 }}>
              {selectedServer ? `${avgResponseTime}ms` : '—'}
            </div>
          </div>

          {/* Alert Incidents */}
          <div className={`chart-stat-box ${statsFilter === 'incidents' ? 'active-filter' : ''}`} onClick={() => setStatsFilter('incidents')}>
            <div className="chart-stat-header">
              <span className="chart-stat-label">Alert Incidents</span>
              <div className="chart-stat-icon-wrap" style={{ color: 'var(--warning)' }}>
                <svg className="metric-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
              </div>
            </div>
            <div className="chart-stat-value" style={{ color: '#f59e0b' }}>{alerts.length}</div>
          </div>
        </div>

        {/* Row 1: Response Time (full width) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--primary)' }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Response Time History
              </h2>
              {selectedServer && (
                <div className="chart-card-sub">
                  <span className={`perf-search-indicator ${selectedServer.status}`} />
                  <strong>{selectedServer.name}</strong> ({selectedServer.url}) · Last hour · Avg {avgResponseTime}ms
                </div>
              )}
            </div>
            
            {/* Custom Auto-Suggest dropdown */}
            <div className="site-search-wrap" onBlur={() => setTimeout(() => setShowDropdown(false), 180)}>
              <div className="site-search-input-box" onClick={() => setShowDropdown(true)}>
                <span className="site-search-icon" style={{ opacity: 0.7 }}>🔍</span>
                <input className="site-search-input" placeholder="Search site to analyze..."
                  value={siteSearch || selectedServer?.name || ''}
                  onChange={e => { setSiteSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { setSiteSearch(''); setShowDropdown(true); }}
                />
              </div>
              {showDropdown && (
                <div className="site-search-dropdown">
                  {servers
                    .filter(s => s.name.toLowerCase().includes(siteSearch.toLowerCase()) || s.url.toLowerCase().includes(siteSearch.toLowerCase()))
                    .map(s => (
                      <div key={s._id} className={`site-search-option ${selectedId === s._id ? 'active' : ''}`}
                        onMouseDown={() => { setSelectedId(s._id); setSiteSearch(''); setShowDropdown(false); }}>
                        <span className={`site-search-dot ${s.status}`}></span>
                        <div>
                          <div className="site-search-name">{s.name}</div>
                          <div className="site-search-url">{s.url}</div>
                        </div>
                      </div>
                    ))}
                  {servers.filter(s => s.name.toLowerCase().includes(siteSearch.toLowerCase()) || s.url.toLowerCase().includes(siteSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No matching sites</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="chart-empty">No response history yet — checks initiate automatically within 1 minute.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} interval={4} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} unit="ms" tickLine={false} axisLine={false} width={50} />
                <Tooltip content={<RtTooltip />} />
                {avgResponseTime > 0 && (
                  <ReferenceLine y={avgResponseTime} stroke={isDark ? 'rgba(167,139,250,0.4)' : '#a78bfa'} strokeDasharray="4 4"
                    label={{ value: `avg ${avgResponseTime}ms`, position: 'insideTopRight', fontSize: 10, fill: isDark ? '#c084fc' : '#7c3aed', fontWeight: 700 }} />
                )}
                <Area type="monotone" dataKey="responseTime" stroke="#7c3aed" strokeWidth={2.5}
                  fill="url(#rtGrad)" dot={false} activeDot={{ r: 5, fill: '#7c3aed', stroke: isDark ? '#131a26' : '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Row 2: Site Status + Alert History side by side */}
        <div className="perf-row-2">
          {/* Status Donut Chart */}
          <div className="chart-card">
            <h2 className="chart-card-title" style={{ marginBottom: 20 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--success)' }}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              Site Status
            </h2>
            {pieData.length === 0 ? (
              <div className="chart-empty" style={{ padding: '30px 20px' }}>No sites registered</div>
            ) : (
              <div className="pie-wrap">
                <div className="pie-chart-box">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%"
                        innerRadius={46} outerRadius={68}
                        dataKey="value" paddingAngle={3}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} style={{ outline: 'none' }} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-center-label">
                    <div className="pie-center-num">{servers.length}</div>
                    <div className="pie-center-txt">Sites</div>
                  </div>
                </div>
                <div className="pie-legend">
                  {pieData.map((d, i) => {
                    const pct = servers.length > 0 ? Math.round((d.value / servers.length) * 100) : 0;
                    return (
                      <div key={i} className="pie-legend-row" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}`, paddingBottom: 6, marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="pie-dot" style={{ background: d.color, width: 8, height: 8, borderRadius: '50%' }} />
                          <span className="pie-label" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{d.name}</span>
                        </div>
                        <span className="pie-val" style={{ color: d.color, fontWeight: 700 }}>
                          {d.value} <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                  <div className="pie-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-main)', fontWeight: 700, paddingTop: 4 }}>
                    <span>Active Monitors</span>
                    <span>{servers.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Alert Incidents Trends */}
          <div className="chart-card">
            <h2 className="chart-card-title" style={{ marginBottom: 20 }}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--danger)' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Alerts Trends <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>(Last 7 Days)</span>
            </h2>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={alertData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} content={<AlertTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 10, color: 'var(--text-main)' }} />
                <Bar dataKey="down"      name="Downtime Alerts"      fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="recovered" name="Recovery Alerts" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Uptime Table & Details */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h2 className="chart-card-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: 'var(--info)' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                Detailed Performance & Uptime
              </h2>
              <div className="chart-card-sub">
                Last 24 hours · Checked 1/min · Showing {filteredUptimeData.length} of {uptimeData.length} sites
              </div>
            </div>

            {/* Actions Panel */}
            <div className="perf-table-actions">
              {/* Search wrap */}
              <div className="uptime-search-wrap">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  className="uptime-search-input"
                  placeholder={`Search from ${uptimeData.length} sites...`}
                  value={uptimeSearch}
                  onChange={e => setUptimeSearch(e.target.value)}
                />
                {uptimeSearch && <button className="uptime-search-clear" onClick={() => setUptimeSearch('')}>✕</button>}
              </div>

              {/* CSV Export Button */}
              <button className="btn-csv-export" onClick={downloadCSV} title="Export current dataset to CSV spreadsheet">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Export CSV
              </button>
            </div>
          </div>

          {uptimeData.length === 0 ? (
            <div className="chart-empty">No sites under monitoring yet. Start by adding a website in Dashboard.</div>
          ) : filteredUptimeData.length === 0 ? (
            <div className="chart-empty">No monitors match current filters or search query "{uptimeSearch}".</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="uptime-table-wrap uptime-desktop">
                <table className="uptime-table">
                  <thead>
                    <tr>
                      <th>Website Site Name</th>
                      <th>Status</th>
                      <th>Uptime %</th>
                      <th style={{ width: 140 }}>Uptime Bar</th>
                      <th>Total Checks</th>
                      <th>Online Checks</th>
                      <th>Downtime Checks</th>
                      <th>Avg response</th>
                      <th>Min response</th>
                      <th>Max response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUptimeData.map(s => {
                      const uc = uptimeColor(s.uptime);
                      const rc = rtColor(s.avgRt);
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className="uptime-site-name">{s.name}</div>
                            <div className="uptime-site-url">{s.url}</div>
                          </td>
                          <td>
                            <span className={`pulse-indicator ${s.status}`} />
                            <span className="uptime-status-text" style={{ color: s.status === 'up' ? '#10b981' : s.status === 'down' ? '#f43f5e' : '#f59e0b' }}>
                              {s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}
                            </span>
                          </td>
                          <td><span className="uptime-pct" style={{ color: uc }}>{s.uptime}%</span></td>
                          <td>
                            <div className="uptime-bar-track">
                              <div className="uptime-bar-fill" style={{ width: `${s.uptime}%`, background: `linear-gradient(90deg, ${uc} 0%, rgba(${uc === '#10b981' ? '16,185,129' : uc === '#f59e0b' ? '245,158,11' : '244,63,94'}, 0.7) 100%)` }} />
                            </div>
                          </td>
                          <td className="uptime-num">{s.total}</td>
                          <td className="uptime-num" style={{ color: '#10b981', fontWeight: 700 }}>{s.upCount}</td>
                          <td className="uptime-num" style={{ color: s.downCount > 0 ? '#f43f5e' : 'var(--text-muted)', fontWeight: s.downCount > 0 ? 800 : 500 }}>{s.downCount}</td>
                          <td className="uptime-num" style={{ color: rc }}>{s.avgRt ? `${s.avgRt}ms` : '—'}</td>
                          <td className="uptime-num" style={{ color: '#10b981' }}>{s.minRt ? `${s.minRt}ms` : '—'}</td>
                          <td className="uptime-num" style={{ color: s.maxRt > 2000 ? '#f43f5e' : 'var(--text-muted-darker)' }}>{s.maxRt ? `${s.maxRt}ms` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed View */}
              <div className="uptime-mobile" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: 2 }}>
                {filteredUptimeData.map(s => {
                  const uc = uptimeColor(s.uptime);
                  const rc = rtColor(s.avgRt);
                  return (
                    <div key={s.id} className="uptime-mob-card">
                      <div className="uptime-mob-top">
                        <div className="uptime-mob-left">
                          <span className={`pulse-indicator ${s.status}`} />
                          <div>
                            <div className="uptime-site-name">{s.name}</div>
                            <div className="uptime-site-url">{s.url}</div>
                          </div>
                        </div>
                        <span className="uptime-pct" style={{ color: uc, fontSize: 17 }}>{s.uptime}%</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="uptime-bar-track" style={{ width: '100%', margin: '12px 0' }}>
                        <div className="uptime-bar-fill" style={{ width: `${s.uptime}%`, background: uc }} />
                      </div>

                      {/* Stat Grid */}
                      <div className="uptime-mob-stats">
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Checks</span>
                          <span className="uptime-mob-stat-val">{s.total}</span>
                        </div>
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Online</span>
                          <span className="uptime-mob-stat-val" style={{ color: '#10b981' }}>{s.upCount}</span>
                        </div>
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Offline</span>
                          <span className="uptime-mob-stat-val" style={{ color: s.downCount > 0 ? '#f43f5e' : 'var(--text-muted)' }}>{s.downCount}</span>
                        </div>
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Avg RT</span>
                          <span className="uptime-mob-stat-val" style={{ color: rc }}>{s.avgRt ? `${s.avgRt}ms` : '—'}</span>
                        </div>
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Min RT</span>
                          <span className="uptime-mob-stat-val" style={{ color: '#10b981' }}>{s.minRt ? `${s.minRt}ms` : '—'}</span>
                        </div>
                        <div className="uptime-mob-stat">
                          <span className="uptime-mob-stat-label">Max RT</span>
                          <span className="uptime-mob-stat-val" style={{ color: s.maxRt > 2000 ? '#f43f5e' : 'var(--text-muted-darker)' }}>{s.maxRt ? `${s.maxRt}ms` : '—'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
