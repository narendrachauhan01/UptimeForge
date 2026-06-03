import React, { useEffect, useState, useRef } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
let _loaded = false;
import { useNavigate } from 'react-router-dom';
import { getServers, checkNow, deleteServer } from '../api';

function NewDropdown({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const go = (path) => { setOpen(false); onNavigate(path); };
  return (
    <div style={{ position:'relative' }} ref={ref}>
      <div style={{ display:'flex', borderRadius:10, overflow:'hidden', boxShadow:'0 2px 12px rgba(124,58,237,0.25)' }}>
        <button onClick={() => go('/add-monitor')} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, height:38 }}>
          + New
        </button>
        <button onClick={() => setOpen(o=>!o)} style={{ padding:'9px 13px', background:'linear-gradient(135deg,#6d28d9,#5b21b6)', color:'#fff', border:'none', borderLeft:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', height:38 }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'none', transition:'0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#131a26', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, minWidth:180, boxShadow:'0 12px 32px rgba(0,0,0,0.3)', overflow:'hidden', zIndex:999 }}>
          {[
            { icon:'🖥️', label:'Single monitor', path:'/add-monitor' },
          ].map(item => (
            <button key={item.label} onClick={() => go(item.path)}
              style={{ width:'100%', padding:'12px 16px', background:'transparent', border:'none', color:'rgba(255,255,255,0.85)', fontSize:14, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ readOnly = false }) {
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [checking, setChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(!_loaded);

  const [localTheme, setLocalTheme] = useState(() => {
    const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
    if (match) return match[1];
    return 'dark'; // Keep dark mode ON by default
  });

  const isDark = localTheme === 'dark';

  // Read theme changes from the cookie when component mounts or pulls updates
  useEffect(() => {
    const checkThemeCookie = () => {
      const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
      const current = match ? match[1] : 'dark';
      if (current !== localTheme) {
        setLocalTheme(current);
      }
    };
    
    // Check theme immediately and interval pool to detect changes from performance page
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

  const load = () => getServers().then(r => { setServers(r.data); setLastUpdated(new Date()); setPageLoading(false); _loaded = true; }).catch(()=>setPageLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const getExpiryClass = (days) => {
    if (days == null) return 'expiry-na';
    if (days <= 7) return 'expiry-critical';
    if (days <= 30) return 'expiry-warn';
    return 'expiry-ok';
  };

  const domainDaysLeft = (s) => {
    if (!s.domainExpiry) return null;
    return Math.floor((new Date(s.domainExpiry) - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const up = servers.filter(s => s.status === 'up').length;
  const down = servers.filter(s => s.status === 'down').length;
  const unknown = servers.filter(s => s.status === 'unknown').length;

  const handleCheckNow = async () => {
    setChecking(true);
    await checkNow();
    setTimeout(() => { load(); setChecking(false); }, 3000);
  };

  const openSite = (s) => navigate(`/site/${s._id}`);

  const downloadCSV = () => {
    const headers = ['Name', 'URL', 'Status', 'Response Time (ms)', 'Last Checked', 'SSL Days Left', 'SSL Expiry', 'Domain Days Left', 'Domain Expiry'];
    const rows = servers.map(s => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.url || '').replace(/"/g, '""')}"`,
      s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown',
      s.responseTime || '',
      s.lastChecked ? new Date(s.lastChecked).toLocaleString('en-IN') : '',
      s.sslDaysLeft ?? '',
      s.sslExpiry ? new Date(s.sslExpiry).toLocaleDateString('en-IN') : '',
      s.domainExpiry ? domainDaysLeft(s) : '',
      s.domainExpiry ? new Date(s.domainExpiry).toLocaleDateString('en-IN') : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Uptime bar: fixed 40 slots, pad with grey if fewer entries
  const UptimeBar = ({ history = [] }) => {
    const SLOTS = 40;
    const upPct = history.length ? Math.round((history.filter(h=>h.status==='up').length/history.length)*100) : null;
    const padded = history.length >= SLOTS ? history.slice(-SLOTS) : [
      ...Array(SLOTS - history.length).fill({ status: 'empty' }),
      ...history,
    ];
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
        <div style={{ display:'flex', gap:1.5, width: SLOTS * 5.5 + 'px' }}>
          {padded.map((h,i) => (
            <div key={i} style={{ flex:'1 0 0', height:24, borderRadius:2,
              background: h.status==='up' ? '#10b981' : h.status==='down' ? '#f43f5e' : isDark ? '#1b2535' : '#e2e8f0',
              opacity: h.status==='empty' ? 0.25 : 0.85,
            }} title={h.time ? `${new Date(h.time).toLocaleTimeString('en-IN')} — ${h.status}` : ''} />
          ))}
        </div>
        <span style={{ fontSize:11, fontWeight:700, color: upPct===100?'#10b981':upPct>=95?'#f59e0b':upPct===null?'#94a3b8':'#f43f5e' }}>
          {upPct !== null ? `${upPct}%` : '—'}
        </span>
      </div>
    );
  };

  // Overall uptime from all sites (using historyBar)
  const allHistory = servers.flatMap(s => s.historyBar || []);
  const overallUptime = allHistory.length ? Math.round((allHistory.filter(h=>h.status==='up').length/allHistory.length)*100*10)/10 : 100;
  const avgResponse = servers.filter(s=>s.responseTime).length ? Math.round(servers.filter(s=>s.responseTime).reduce((a,s)=>a+s.responseTime,0)/servers.filter(s=>s.responseTime).length) : 0;

  const filtered = servers.filter(s => statusFilter==='all' || s.status===statusFilter);
  const displayList = filtered.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`perf-page-container ${localTheme}`}>
      <ConfirmDialog />
      
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

        /* Decorative Glows */
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
        .perf-bg-glow-2 {
          position: absolute;
          bottom: -150px;
          left: -50px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%);
          pointer-events: none;
          z-index: 0;
        }
        .perf-page-container.dark .perf-bg-glow-2 {
          background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0) 70%);
        }

        /* Layout structure */
        .perf-page-container .mon-layout {
          display: flex;
          gap: 24px;
          min-height: calc(100vh - 60px);
          position: relative;
          z-index: 10;
        }
        .perf-page-container .mon-main {
          flex: 1;
          padding: 0;
          min-width: 0;
        }
        .perf-page-container .mon-panel {
          width: 280px;
          flex-shrink: 0;
          background: var(--bg-card) !important;
          border-left: 1px solid var(--border-color) !important;
          border-radius: 24px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
          box-shadow: var(--card-shadow);
          height: fit-content;
          box-sizing: border-box;
          transition: all 0.3s;
        }
        .perf-page-container .mon-panel:hover {
          border-color: rgba(var(--primary-rgb), 0.15) !important;
        }

        /* Header overrides */
        .perf-page-container .mon-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .perf-page-container .mon-title {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main) !important;
          letter-spacing: -0.8px;
          margin: 0;
        }
        .perf-page-container .mon-dot {
          color: var(--primary);
        }
        .perf-page-container .mon-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        .perf-page-container .mon-btn-csv {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: var(--bg-card) !important;
          border: 1.5px solid var(--border-color) !important;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main) !important;
          cursor: pointer;
          transition: all 0.2s;
        }
        .perf-page-container .mon-btn-csv:hover:not(:disabled) {
          background: var(--bg-input) !important;
          border-color: var(--text-muted) !important;
        }
        .perf-page-container .mon-btn-check {
          padding: 8px 18px;
          background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
          color: #fff !important;
          border: none !important;
          border-radius: 12px !important;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(124,58,237,0.2) !important;
        }
        .perf-page-container .mon-btn-check:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important;
        }

        /* Toolbar styles */
        .perf-page-container .mon-toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
        }
        .perf-page-container .mon-search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .perf-page-container .mon-search-wrap svg {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .perf-page-container .mon-search {
          width: 100%;
          padding: 9px 12px 9px 36px;
          border: 1.5px solid var(--border-color) !important;
          border-radius: 12px;
          background: var(--bg-input) !important;
          color: var(--text-main) !important;
          font-size: 13px;
          font-weight: 600;
          outline: none;
          box-sizing: border-box;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s;
        }
        .perf-page-container .mon-search:focus {
          border-color: var(--primary) !important;
          background: var(--bg-card) !important;
          box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
        }
        .perf-page-container .mon-filter-tabs {
          display: flex;
          gap: 4px;
          background: var(--bg-input) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px;
          padding: 4px;
        }
        .perf-page-container .mon-filter-tab {
          padding: 6px 14px;
          border: none !important;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background: transparent !important;
          color: var(--text-muted) !important;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .perf-page-container .mon-filter-tab:hover {
          color: var(--text-main) !important;
        }
        .perf-page-container .mon-filter-tab.active-all {
          background: var(--bg-card) !important;
          color: var(--primary) !important;
          box-shadow: var(--card-shadow) !important;
        }
        .perf-page-container .mon-filter-tab.active-up {
          background: rgba(16, 185, 129, 0.08) !important;
          color: var(--success) !important;
        }
        .perf-page-container .mon-filter-tab.active-down {
          background: rgba(244, 63, 94, 0.08) !important;
          color: var(--danger) !important;
        }
        .perf-page-container .mon-tab-count {
          background: var(--bg-card) !important;
          color: var(--text-muted-darker) !important;
          padding: 2px 7px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
        }

        /* List views */
        .perf-page-container .mon-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .perf-page-container .mon-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 20px;
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--card-shadow);
        }
        .perf-page-container .mon-row:hover {
          transform: translateY(-2px);
          box-shadow: var(--card-hover-shadow);
          border-color: rgba(var(--primary-rgb), 0.15) !important;
        }
        .perf-page-container .mon-row-down {
          border-left: 4px solid var(--danger) !important;
        }
        .perf-page-container .mon-row-up {
          border-left: 4px solid var(--success) !important;
        }
        .perf-page-container .mon-row-unknown {
          border-left: 4px solid var(--warning) !important;
        }
        .pulse-indicator {
          position: relative;
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pulse-indicator::after {
          content: '';
          position: absolute;
          top: -2px; left: -2px;
          width: 14px; height: 14px;
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

        .perf-page-container .mon-site-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 15px;
          color: var(--text-main) !important;
        }
        .perf-page-container .mon-site-meta {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .perf-page-container .mon-proto {
          background: var(--bg-input) !important;
          color: var(--text-muted-darker) !important;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: 700;
        }
        .perf-page-container .mon-status-up {
          color: var(--success) !important;
          background: rgba(16, 185, 129, 0.08) !important;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 700;
        }
        .perf-page-container .mon-status-down {
          color: var(--danger) !important;
          background: rgba(244, 63, 94, 0.08) !important;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 700;
        }
        .perf-page-container .mon-status-unknown {
          color: var(--warning) !important;
          background: rgba(245, 158, 11, 0.08) !important;
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 700;
        }
        .perf-page-container .mon-resp {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          background: var(--bg-input) !important;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .perf-page-container .mon-time {
          color: var(--text-muted);
          background: var(--bg-input) !important;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .perf-page-container .mon-del-btn {
          background: transparent !important;
          border: none !important;
          color: var(--text-muted) !important;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
          padding: 6px 10px;
          border-radius: 10px;
        }
        .perf-page-container .mon-del-btn:hover {
          color: var(--danger) !important;
          background: rgba(244, 63, 94, 0.08) !important;
        }

        /* Right panel list details */
        .perf-page-container .mon-panel-section {
          padding: 20px 0;
          border-bottom: 1px solid var(--border-color);
        }
        .perf-page-container .mon-panel-section:last-child {
          border-bottom: none;
        }
        .perf-page-container .mon-panel-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main) !important;
          margin-bottom: 14px;
        }
        .perf-page-container .mon-count-down {
          background: rgba(244, 63, 94, 0.08) !important;
          color: var(--danger) !important;
          border: 1px solid rgba(244, 63, 94, 0.15) !important;
          transition: all 0.2s;
        }
        .perf-page-container .mon-count-down:hover {
          background: rgba(244, 63, 94, 0.14) !important;
        }
        .perf-page-container .mon-count-up {
          background: rgba(16, 185, 129, 0.08) !important;
          color: var(--success) !important;
          border: 1px solid rgba(16, 185, 129, 0.15) !important;
          transition: all 0.2s;
        }
        .perf-page-container .mon-count-up:hover {
          background: rgba(16, 185, 129, 0.14) !important;
        }
        .perf-page-container .mon-count-unknown {
          background: rgba(245, 158, 11, 0.08) !important;
          color: var(--warning) !important;
          border: 1px solid rgba(245, 158, 11, 0.15) !important;
          transition: all 0.2s;
        }
        .perf-page-container .mon-count-unknown:hover {
          background: rgba(245, 158, 11, 0.14) !important;
        }
        .perf-page-container .mon-count-num {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
        }
        .perf-page-container .mon-count-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-top: 4px;
        }
        .perf-page-container .mon-panel-total {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          margin-top: 14px;
          text-align: center;
        }
        .perf-page-container .mon-uptime-val {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
        }
        .perf-page-container .mon-uptime-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .perf-page-container .mon-panel-uptime {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          text-align: center;
        }

        /* Empty states */
        .perf-page-container .mon-empty {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          background: var(--bg-input);
          border-radius: 18px;
          border: 1px dashed var(--border-color);
          margin: 10px 0;
        }

        /* Responsive overrides */
        @media (max-width: 900px) {
          .perf-page-container .mon-layout {
            flex-direction: column !important;
            gap: 20px;
          }
          .perf-page-container .mon-panel {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid var(--border-color) !important;
            margin-top: 10px;
          }
          .perf-page-container .mon-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
        }
        @media (max-width: 600px) {
          .perf-page-container .mon-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .perf-page-container .mon-filter-tabs {
            width: 100%;
            justify-content: space-around;
          }
          .perf-page-container .mon-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .perf-page-container .mon-bar-wrap {
            width: 100%;
            align-self: stretch;
          }
          .perf-page-container .mon-bar-wrap > div {
            align-items: flex-start !important;
          }
          .perf-page-container .mon-del-btn {
            align-self: flex-end;
          }
        }
      `}</style>

      {/* Decorative Glows */}
      <div className="perf-bg-glow-1" />
      <div className="perf-bg-glow-2" />

      <div className="mon-layout" style={{ padding: '0 4px' }}>
        
        {/* ── LEFT: Main monitor list ── */}
        <div className="mon-main">
          
          {/* Header */}
          <div className="mon-header">
            <div>
              <h1 className="mon-title">Monitors <span className="mon-dot">.</span></h1>
              {lastUpdated && <p className="mon-sub">Last updated: <strong>{lastUpdated.toLocaleTimeString('en-IN')}</strong></p>}
            </div>
            
            <div style={{ display:'flex', alignItems: 'center', gap:12, flexWrap: 'wrap' }}>
              <button className="mon-btn-csv" onClick={downloadCSV} disabled={servers.length===0} title="Download monitors state as CSV">
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                CSV
              </button>
              
              {!readOnly && (
                <>
                  <button className={`mon-btn-check ${checking?'checking':''}`} onClick={handleCheckNow} disabled={checking}>
                    {checking ? '⏳ Checking...' : '↺ Check Now'}
                  </button>
                  <NewDropdown onNavigate={navigate} />
                </>
              )}
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="mon-toolbar">
            <div className="mon-search-wrap">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by site name or URL..." className="mon-search" />
            </div>
            <div className="mon-filter-tabs">
              {[['all','All',servers.length],['up','Online',up],['down','Offline',down]].map(([v,l,c])=>(
                <button key={v} className={`mon-filter-tab ${statusFilter===v?'active-'+v:''}`} onClick={()=>setStatusFilter(v)}>
                  {l} <span className="mon-tab-count">{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Site list */}
          <div className="mon-list" style={{maxHeight:'calc(10 * 78px)', overflowY:'auto', paddingRight:2}}>
            {pageLoading ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 0',gap:14}}>
                  <div style={{width:44,height:44,borderRadius:'50%',border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
                  <div style={{fontSize:13,color: isDark ? '#cbd5e1' : '#94a3b8',fontWeight:600,fontFamily:"'Plus Jakarta Sans', sans-serif"}}>Loading monitors...</div>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : displayList.length===0 ? (
              <div className="mon-empty">
                <div style={{fontSize:48,marginBottom:12}}>🖥️</div>
                <div style={{fontWeight:700,color:'var(--text-main)'}}>No sites found</div>
                <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>Please clear filters or add new monitors above</div>
              </div>
            ) : displayList.map(s => (
              <div key={s._id} className={`mon-row mon-row-${s.status}`} onClick={()=>openSite(s)}>
                <span className={`pulse-indicator ${s.status}`} />
                <div className="mon-site-info">
                  <div className="mon-site-name">{s.name}</div>
                  <div className="mon-site-meta">
                    <span className="mon-proto">HTTPS</span>
                    <span className="mon-sep">·</span>
                    <span className={`mon-status-txt mon-status-${s.status}`}>
                      {s.status==='up'?'Up':s.status==='down'?'Down':'Unknown'}
                    </span>
                    {s.lastChecked && (
                      <>
                        <span className="mon-sep">·</span>
                        <span className="mon-time">{new Date(s.lastChecked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                      </>
                    )}
                    {s.responseTime && (
                      <>
                        <span className="mon-sep">·</span>
                        <span className="mon-resp" style={{color: s.responseTime<500?'#10b981':s.responseTime<1200?'#f59e0b':'#f43f5e'}}>{s.responseTime}ms</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="mon-bar-wrap">
                  <UptimeBar history={s.historyBar||[]} />
                </div>
                {!readOnly && (
                  <button
                    className="mon-del-btn"
                    onClick={e => {
                      e.stopPropagation();
                      confirm(`Delete "${s.name}"?`, { title:'Delete Site', confirmText:'Delete', danger:true }).then(ok => {
                        if (ok) deleteServer(s._id).then(load);
                      });
                    }}
                    title="Delete monitor"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Summary panel ── */}
        <div className="mon-panel">
          <div className="mon-panel-section" style={{ paddingTop: 0 }}>
            <div className="mon-panel-title">Current Status</div>
            <div className="mon-panel-counts">
              <div className="mon-count-item mon-count-down" onClick={()=>setStatusFilter(statusFilter==='down'?'all':'down')}
                style={{cursor:'pointer', outline: statusFilter==='down'?'2px solid var(--danger)':'none', borderRadius:12}}>
                <div className="mon-count-num">{down}</div>
                <div className="mon-count-label">Down</div>
              </div>
              <div className="mon-count-item mon-count-up" onClick={()=>setStatusFilter(statusFilter==='up'?'all':'up')}
                style={{cursor:'pointer', outline: statusFilter==='up'?'2px solid var(--success)':'none', borderRadius:12}}>
                <div className="mon-count-num">{up}</div>
                <div className="mon-count-label">Up</div>
              </div>
              <div className="mon-count-item mon-count-unknown" onClick={()=>setStatusFilter(statusFilter==='unknown'?'all':'unknown')}
                style={{cursor:'pointer', outline: statusFilter==='unknown'?'2px solid var(--warning)':'none', borderRadius:12}}>
                <div className="mon-count-num">{unknown}</div>
                <div className="mon-count-label">Unknown</div>
              </div>
            </div>
            <div className="mon-panel-total">Monitoring {servers.length} site{servers.length!==1?'s':''} total</div>
          </div>

          <div className="mon-panel-section">
            <div className="mon-panel-title">Last 24 Hours</div>
            <div className="mon-panel-uptime">
              <div>
                <div className="mon-uptime-val" style={{color: overallUptime>=99?'#10b981':overallUptime>=95?'#f59e0b':'#f43f5e'}}>
                  {overallUptime}%
                </div>
                <div className="mon-uptime-label">Overall uptime</div>
              </div>
              <div>
                <div className="mon-uptime-val" style={{color:'var(--primary)'}}>{avgResponse ? `${avgResponse}ms` : '—'}</div>
                <div className="mon-uptime-label">Avg response</div>
              </div>
            </div>
          </div>

          <div className="mon-panel-section" style={{ borderBottom: 'none' }}>
            <div className="mon-panel-title">Sites Breakdown</div>
            {servers.length > 0 ? (
              <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:4}}>
                {[
                  { label:'Online', count:up, color:'#10b981', bg: isDark ? 'rgba(16,185,129,0.1)' : '#dcfce7' },
                  { label:'Offline', count:down, color:'#f43f5e', bg: isDark ? 'rgba(244,63,94,0.1)' : '#fee2e2' },
                  { label:'Unknown', count:unknown, color:'#f59e0b', bg: isDark ? 'rgba(245,158,11,0.1)' : '#fef3c7' },
                ].map(item => (
                  <div key={item.label} style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{flex:1,height:6,background: isDark ? '#1b2535' : '#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                      <div style={{width:`${servers.length?Math.round(item.count/servers.length*100):0}%`,height:'100%',background:item.color,borderRadius:4}}/>
                    </div>
                    <span style={{fontSize:12,color:item.color,fontWeight:700,minWidth:20,textAlign:'right'}}>{item.count}</span>
                    <span style={{fontSize:11,color: isDark ? '#cbd5e1' : '#94a3b8',minWidth:48}}>{item.label}</span>
                  </div>
                ))}
              </div>
            ) : <div style={{fontSize:13,color:'var(--text-muted)',marginTop:8}}>No site breakdowns yet</div>}
          </div>
        </div>

      </div>
    </div>
  );
}
