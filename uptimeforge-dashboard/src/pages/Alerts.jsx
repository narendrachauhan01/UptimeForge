let _loaded_Alerts = false;
import React, { useEffect, useState } from 'react';
import { getAlerts } from '../api';

function timeAgo(d) {
    const s = Math.floor((Date.now()-new Date(d))/1000);
    if(s<60) return 'just now';
    if(s<3600) return `${Math.floor(s/60)}m ago`;
    if(s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}

function fmt(d) {
    return new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

const PER_PAGE = 20;

export default function Alerts() {
  const [alerts, setAlerts]         = useState([]);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [page, setPage]             = useState(1);
  const [pageLoading, setPageLoading] = useState(!_loaded_Alerts);

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

  useEffect(() => {
    getAlerts().then(r => { 
      setAlerts(r.data); 
      setPageLoading(false); 
      _loaded_Alerts = true; 
    }).catch(() => setPageLoading(false));
  }, []);

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const ms = a.serverName?.toLowerCase().includes(q) || a.serverUrl?.toLowerCase().includes(q) || a.sentTo?.some(r=>r.name.toLowerCase().includes(q));
    const mf = filter==='all' || a.type===filter;
    return ms && mf;
  });

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage    = Math.min(page, totalPages);
  const pageItems   = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  // Reset to page 1 when search or filter changes
  useEffect(() => { setPage(1); }, [search, filter]);

  const downCount      = alerts.filter(a=>a.type==='down').length;
  const recoveredCount = alerts.filter(a=>a.type==='recovered').length;

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
          --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
          --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
          --input-focus-shadow: rgba(124, 58, 237, 0.08);
          --stats-total-bg: #eef2ff;
          --stats-down-bg: #fef2f2;
          --stats-up-bg: #f0fdf4;
          --stats-total-border: #ddd6fe;
          --stats-down-border: #fecdd3;
          --stats-up-border: #bbf7d0;
          --hover-row-bg: rgba(124, 58, 237, 0.04);
        }

        /* Dark Theme Scope */
        .perf-page-container.dark {
          --bg-primary: #0b0f19;
          --bg-card: #131a26;
          --bg-input: #1b2535;
          --border-color: rgba(255, 255, 255, 0.07);
          --text-main: #f8fafc;
          --text-muted: #94a3b8;
          --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
          --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
          --input-focus-shadow: rgba(139, 92, 246, 0.15);
          --stats-total-bg: rgba(124, 58, 237, 0.08);
          --stats-down-bg: rgba(244, 63, 94, 0.08);
          --stats-up-bg: rgba(16, 185, 129, 0.08);
          --stats-total-border: rgba(124, 58, 237, 0.25);
          --stats-down-border: rgba(244, 63, 94, 0.25);
          --stats-up-border: rgba(16, 185, 129, 0.25);
          --hover-row-bg: rgba(124, 58, 237, 0.08);
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

        /* Page wrapper */
        .perf-page-container .pg-wrap {
          background: transparent !important;
          min-height: auto;
          position: relative;
          z-index: 10;
          padding: 0 4px;
        }
        .perf-page-container .pg-header {
          margin-bottom: 28px;
        }
        .perf-page-container .pg-title {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main) !important;
          letter-spacing: -0.8px;
          margin: 0 0 6px;
        }
        .perf-page-container .pg-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }

        /* Stats Row */
        .perf-page-container .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }
        .perf-page-container .stat-card {
          background: var(--bg-card) !important;
          border-radius: 16px;
          padding: 16px 18px;
          cursor: pointer;
          box-shadow: var(--card-shadow);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .perf-page-container .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--card-hover-shadow);
        }
        
        .perf-page-container .stat-num {
          font-family: 'Outfit', sans-serif;
          font-size: 26px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 6px;
        }
        .perf-page-container .stat-lbl {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }

        /* Table Card Container */
        .perf-page-container .incidents-card {
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 20px;
          box-shadow: var(--card-shadow);
          overflow: hidden;
        }

        /* Toolbar */
        .perf-page-container .incidents-toolbar {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-color) !important;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Search wrapper */
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
          color: var(--text-muted) !important;
          z-index: 10;
        }
        .perf-page-container .mon-search {
          width: 100%;
          padding: 9px 36px 9px 36px !important;
          border: 1.5px solid var(--border-color) !important;
          border-radius: 12px !important;
          background: var(--bg-input) !important;
          color: var(--text-main) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          outline: none !important;
          box-sizing: border-box !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          transition: all 0.2s !important;
        }
        .perf-page-container .mon-search:focus {
          border-color: var(--primary) !important;
          background: var(--bg-card) !important;
          box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
        }
        .perf-page-container .search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none !important;
          border: none !important;
          color: var(--text-muted) !important;
          cursor: pointer !important;
          font-size: 14px !important;
          z-index: 10;
          padding: 0 !important;
          transition: all 0.2s !important;
        }
        .perf-page-container .search-clear:hover {
          color: var(--danger) !important;
        }

        /* Filter Pills */
        .perf-page-container .filter-pills {
          display: flex;
          gap: 4px;
          background: var(--bg-input) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px;
          padding: 4px;
        }
        
        .perf-page-container .filter-pill {
          padding: 6px 14px !important;
          border: none !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          background: transparent !important;
          color: var(--text-muted) !important;
          transition: all 0.2s !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .perf-page-container .filter-pill:hover {
          color: var(--text-main) !important;
        }
        .perf-page-container .filter-pill.active {
          background: var(--bg-card) !important;
          color: var(--text-main) !important;
          box-shadow: var(--card-shadow) !important;
        }
        .perf-page-container .filter-pill.active.down {
          color: var(--danger) !important;
        }
        .perf-page-container .filter-pill.active.recovered {
          color: var(--success) !important;
        }

        /* Incidents List Row */
        .perf-page-container .incident-row {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color) !important;
          display: flex;
          gap: 14px;
          align-items: flex-start;
          transition: background-color 0.15s ease;
        }
        .perf-page-container .incident-row:last-child {
          border-bottom: none !important;
        }
        .perf-page-container .incident-row:hover {
          background-color: var(--hover-row-bg) !important;
        }

        .perf-page-container .status-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          transition: all 0.2s;
        }
        .perf-page-container .status-icon.down {
          background: var(--stats-down-bg);
          border: 1px solid var(--stats-down-border);
          color: var(--danger);
        }
        .perf-page-container .status-icon.recovered {
          background: var(--stats-up-bg);
          border: 1px solid var(--stats-up-border);
          color: var(--success);
        }

        .perf-page-container .incident-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: var(--text-main) !important;
        }
        
        .perf-page-container .badge {
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .perf-page-container .badge.down {
          background: var(--stats-down-bg);
          color: var(--danger);
          border: 1px solid var(--stats-down-border);
        }
        .perf-page-container .badge.recovered {
          background: var(--stats-up-bg);
          color: var(--success);
          border: 1px solid var(--stats-up-border);
        }
        .perf-page-container .badge.ping {
          background: rgba(6, 182, 212, 0.08);
          color: var(--info);
          border: 1px solid rgba(6, 182, 212, 0.2);
        }

        .perf-page-container .incident-url {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          color: var(--text-muted) !important;
        }

        .perf-page-container .notified-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .perf-page-container .recipient-tag {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          background: var(--stats-total-bg);
          color: var(--primary);
          padding: 2px 8px;
          border-radius: 20px;
          border: 1px solid var(--stats-total-border);
        }

        .perf-page-container .incident-time {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          color: var(--text-main);
          font-weight: 600;
        }
        .perf-page-container .incident-ago {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        /* Pagination */
        .perf-page-container .pg-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 10px;
        }
        .perf-page-container .pg-info {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .perf-page-container .pg-btns {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .perf-page-container .pg-btn {
          padding: 6px 14px !important;
          border: 1.5px solid var(--border-color) !important;
          border-radius: 10px !important;
          background: var(--bg-input) !important;
          color: var(--text-main) !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          transition: all 0.2s !important;
        }
        .perf-page-container .pg-btn:hover:not(:disabled) {
          border-color: var(--primary) !important;
          color: var(--primary) !important;
        }
        .perf-page-container .pg-btn:disabled {
          opacity: 0.35 !important;
          cursor: not-allowed !important;
        }
        .perf-page-container .pg-btn.active {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
          color: #fff !important;
        }

        /* Empty State */
        .perf-page-container .empty-box {
          padding: 60px 20px;
          text-align: center;
        }
        .perf-page-container .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .perf-page-container .empty-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
          color: var(--text-main);
          font-size: 15px;
          margin-bottom: 6px;
        }
        .perf-page-container .empty-text {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
        }
      `}</style>

      {/* Decorative Glows */}
      <div className="perf-bg-glow-1" />

      <div className="pg-wrap">
        {/* Header */}
        <div className="pg-header">
          <h1 className="pg-title">Incidents</h1>
          <p className="pg-sub">Monitor downtime events and recovery alerts</p>
        </div>

        {/* Stats row */}
        <div className="stats-grid">
          {[
            { label:'Total Alerts',   value:alerts.length,   color:'var(--primary)', border:'var(--stats-total-border)', f:'all', activeColor:'var(--primary)', shadowColor:'rgba(124, 58, 237, 0.15)' },
            { label:'Down Events',    value:downCount,        color:'var(--danger)', border:'var(--stats-down-border)', f:'down', activeColor:'var(--danger)', shadowColor:'rgba(244, 63, 94, 0.15)' },
            { label:'Recovered',      value:recoveredCount,   color:'var(--success)', border:'var(--stats-up-border)', f:'recovered', activeColor:'var(--success)', shadowColor:'rgba(16, 185, 129, 0.15)' },
          ].map(s=>{
            const active=filter===s.f;
            return (
              <div key={s.label} onClick={()=>setFilter(active?'all':s.f)} className="stat-card"
                style={{
                  border: `1px solid ${active ? s.activeColor : 'var(--border-color)'}`,
                  borderTop: `3px solid ${s.color}`,
                  boxShadow: active ? `0 6px 20px ${s.shadowColor}` : 'var(--card-shadow)'
                }}>
                <div className="stat-num" style={{ color: active ? s.activeColor : 'var(--text-main)' }}>{s.value}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Table card */}
        <div className="incidents-card">
          {/* Toolbar */}
          <div className="incidents-toolbar">
            {/* Search */}
            <div className="mon-search-wrap">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by site or recipient..." className="mon-search" />
              {search && <button onClick={()=>setSearch('')} className="search-clear">✕</button>}
            </div>
            {/* Filter pills */}
            <div className="filter-pills">
              {[
                ['all', `All (${alerts.length})`, 'all'],
                ['down', '↓ Down', 'down'],
                ['recovered', '↑ Recovered', 'recovered']
              ].map(([k, l, cls]) => (
                <button key={k} onClick={() => setFilter(k)} className={`filter-pill ${cls} ${filter===k?'active':''}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          {pageLoading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:14 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
              <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>Loading...</div>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-box">
              <div className="empty-icon">🔔</div>
              <div className="empty-title">
                {alerts.length===0 ? 'No alerts yet' : 'No results found'}
              </div>
              <div className="empty-text">
                {alerts.length===0 ? 'Alerts appear here when a site goes down.' : 'Try a different search or filter.'}
              </div>
            </div>
          ) : (
            <>
              <div>
                {pageItems.map((a) => {
                  const isDown = a.type==='down';
                  return (
                    <div key={a._id} className="incident-row">
                      {/* Status icon */}
                      <div className={`status-icon ${isDown ? 'down' : 'recovered'}`}>
                        {isDown ? '↓' : '↑'}
                      </div>

                      {/* Content */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                          <span className="incident-title">{a.serverName}</span>
                          <span className={`badge ${isDown ? 'down' : 'recovered'}`}>
                            {isDown ? '↓ Down' : '↑ Recovered'}
                          </span>
                          {a.source === 'ping' && (
                            <span className="badge ping">
                              📡 Ping
                            </span>
                          )}
                        </div>
                        <div className="incident-url" style={{ marginBottom: a.sentTo?.length?6:0 }}>{a.serverUrl}</div>
                        {a.sentTo?.length > 0 && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                            <span className="notified-label">📨 Notified:</span>
                            {a.sentTo.map((r,i) => (
                              <span key={i} className="recipient-tag">{r.name}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div className="incident-time">{fmt(a.createdAt)}</div>
                        <div className="incident-ago">{timeAgo(a.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="pg-controls">
                  <span className="pg-info">
                    Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                  </span>
                  <div className="pg-btns">
                    <button className="pg-btn" disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => p === '…'
                        ? <span key={`e${i}`} style={{ padding:'0 4px', color:'var(--text-muted)', fontSize:13 }}>…</span>
                        : <button key={p} className={`pg-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                      )}
                    <button className="pg-btn" disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
