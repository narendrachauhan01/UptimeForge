let _loaded_DomainSSL = false;
import React, { useEffect, useState } from 'react';
import { getServers, getExpiry } from '../api';

export default function DomainSSL() {
  const [servers, setServers] = useState([]);
  const [checking, setChecking] = useState({});
  const [results, setResults] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [checkingAll, setCheckingAll] = useState(false);
  const [pageLoading, setPageLoading] = useState(!_loaded_DomainSSL);

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

  const load = () => getServers().then(r => { setServers(r.data); setPageLoading(false); _loaded_DomainSSL = true; }).catch(()=>setPageLoading(false));
  useEffect(() => { load(); }, []);

  const checkOne = async (server) => {
    setChecking(p => ({ ...p, [server._id]: true }));
    try {
      const res = await getExpiry(server._id);
      setResults(p => ({ ...p, [server._id]: res.data }));
      load();
    } catch (e) {
      setResults(p => ({ ...p, [server._id]: { error: 'Failed' } }));
    }
    setChecking(p => ({ ...p, [server._id]: false }));
  };

  const checkAll = async () => {
    setCheckingAll(true);
    for (const s of servers) await checkOne(s);
    setCheckingAll(false);
  };

  const daysLeft = (date) => {
    if (!date) return null;
    return Math.floor((new Date(date) - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const expiryColor = (days) => {
    if (days == null) return 'var(--text-muted)';
    if (days <= 7) return 'var(--danger)';
    if (days <= 30) return 'var(--warning)';
    return 'var(--success)';
  };

  const expiryBg = (days) => {
    if (days == null) return 'var(--bg-input)';
    if (days <= 7) return 'rgba(244,63,94,0.08)';
    if (days <= 30) return 'rgba(245,158,11,0.08)';
    return 'rgba(16,185,129,0.08)';
  };

  const getSsl = (s) => {
    const r = results[s._id];
    if (r?.ssl) return { days: r.ssl.daysLeft, date: r.ssl.expiry };
    if (s.sslExpiry) return { days: s.sslDaysLeft, date: s.sslExpiry };
    return null;
  };

  const getDomain = (s) => {
    const r = results[s._id];
    if (r?.domain) return { days: r.domain.daysLeft, date: r.domain.expiry, registrar: r.domain.registrar };
    if (s.domainExpiry) return { days: daysLeft(s.domainExpiry), date: s.domainExpiry };
    return null;
  };

  const filtered = servers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q);
    const ssl = getSsl(s); const dom = getDomain(s);
    if (filter === 'ssl-warn') return matchSearch && ssl && ssl.days <= 30;
    if (filter === 'dom-warn') return matchSearch && dom && dom.days <= 30;
    return matchSearch;
  });

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

        /* Wrap Adapters */
        .perf-page-container .pg-wrap {
          background: transparent !important;
          min-height: auto;
          position: relative;
          z-index: 10;
          padding: 0 4px;
        }
        .perf-page-container .pg-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .perf-page-container .pg-title {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main) !important;
          letter-spacing: -0.8px;
          margin: 0;
        }
        .perf-page-container .pg-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: var(--text-muted);
          margin-top: 6px;
        }
        
        .perf-page-container .btn-primary-pill {
          padding: 8px 18px !important;
          background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
          color: #fff !important;
          border: none !important;
          border-radius: 12px !important;
          font-size: 13px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          box-shadow: 0 4px 12px rgba(124,58,237,0.2) !important;
        }
        .perf-page-container .btn-primary-pill:hover:not(:disabled) {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important;
        }

        /* Filter bar */
        .perf-page-container .filter-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          align-items: center;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
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
          color: var(--primary) !important;
          box-shadow: var(--card-shadow) !important;
        }

        /* Site Cards Grid */
        .perf-page-container .ssl-site-card {
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 20px;
          box-shadow: var(--card-shadow);
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .perf-page-container .ssl-site-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--card-hover-shadow);
          border-color: rgba(var(--primary-rgb), 0.15) !important;
        }
        
        .perf-page-container .ssl-site-header {
          border-bottom: 1px solid var(--border-color) !important;
          padding: 16px 20px;
        }
        .perf-page-container .ssl-site-name {
          color: var(--text-main) !important;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 700;
        }
        .perf-page-container .ssl-site-url {
          color: var(--primary) !important;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
        }
        
        .perf-page-container .ssl-check-btn {
          padding: 6px 12px !important;
          background: var(--bg-input) !important;
          color: var(--text-main) !important;
          border: 1.5px solid var(--border-color) !important;
          border-radius: 8px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s !important;
          box-shadow: none !important;
          font-family: 'Plus Jakarta Sans', sans-serif !important;
        }
        .perf-page-container .ssl-check-btn:hover:not(:disabled) {
          background: var(--bg-card) !important;
          border-color: var(--text-muted) !important;
        }

        .perf-page-container .ssl-expiry-box {
          border: none !important;
          padding: 18px 20px;
        }
        .perf-page-container .ssl-expiry-box:first-child {
          border-right: 1px solid var(--border-color) !important;
        }
        
        .perf-page-container .ssl-expiry-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted) !important;
          letter-spacing: 0.3px;
        }
        .perf-page-container .ssl-val {
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 18px;
        }
        .perf-page-container .ssl-date {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: var(--text-muted) !important;
        }
        .perf-page-container .ssl-registrar {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: var(--primary) !important;
          font-weight: 600;
        }
        .perf-page-container .ssl-na {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: var(--text-muted) !important;
          font-style: italic;
        }
        .perf-page-container .ssl-checking {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: var(--primary) !important;
        }

        .perf-page-container .empty-msg {
          color: var(--text-muted) !important;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-weight: 600;
        }
        .perf-page-container .data-card {
          background: var(--bg-card) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 20px;
          box-shadow: var(--card-shadow);
          padding: 24px;
          text-align: center;
        }
      `}</style>

      {/* Decorative Glows */}
      <div className="perf-bg-glow-1" />

      <div className="pg-wrap">
        <div className="pg-header">
          <div>
            <h1 className="pg-title">Domain & SSL</h1>
            <p className="pg-sub">Monitor SSL certificates and domain expiry</p>
          </div>
          <button className="btn-primary-pill" onClick={checkAll} disabled={checkingAll}>
            {checkingAll ? '⏳ Checking...' : '🔍 Check All'}
          </button>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <div className="mon-search-wrap">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input className="mon-search" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
          <div className="filter-pills">
            {[['all','All'], ['ssl-warn','⚠️ SSL Expiring'], ['dom-warn','⚠️ Domain Expiring']].map(([k,l]) => (
              <button key={k} className={`filter-pill ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>

        {/* Cards */}
        {pageLoading ? (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 0',gap:14}}>
            <div style={{width:44,height:44,borderRadius:'50%',border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
            <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Loading...</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="data-card"><div className="empty-msg">No sites found.</div></div>
        ) : (
          <div className="ssl-cards-grid">
            {filtered.map(s => {
              const ssl = getSsl(s);
              const dom = getDomain(s);
              const r = results[s._id];
              const isChecking = checking[s._id];
              return (
                <div key={s._id} className="ssl-site-card">
                  {/* Card Header */}
                  <div className="ssl-site-header">
                    <div className="ssl-site-dot" style={{ background: s.status === 'up' ? '#10b981' : s.status === 'down' ? '#ef4444' : '#f59e0b' }} />
                    <div className="ssl-site-info">
                      <div className="ssl-site-name">{s.name}</div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="ssl-site-url" onClick={e => e.stopPropagation()}>{s.url}</a>
                    </div>
                    <button className="ssl-check-btn" onClick={() => checkOne(s)} disabled={isChecking}>
                      {isChecking ? '⏳' : '🔍 Check'}
                    </button>
                  </div>

                  {/* SSL + Domain */}
                  <div className="ssl-expiry-grid">
                    <div className="ssl-expiry-box" style={{ background: ssl ? expiryBg(ssl.days) : 'var(--bg-input)', borderColor: ssl ? expiryColor(ssl.days) + '30' : 'var(--border-color)' }}>
                      <div className="ssl-expiry-label">🔒 SSL Certificate</div>
                      {isChecking ? (
                        <div className="ssl-checking">Checking...</div>
                      ) : r?.error ? (
                        <div className="ssl-val" style={{ color: 'var(--danger)' }}>Check failed</div>
                      ) : ssl ? (
                        <>
                          <div className="ssl-val" style={{ color: expiryColor(ssl.days) }}>{ssl.days} days left</div>
                          <div className="ssl-date">{new Date(ssl.date).toLocaleDateString('en-IN')}</div>
                        </>
                      ) : (
                        <div className="ssl-na">Click Check</div>
                      )}
                    </div>

                    <div className="ssl-expiry-box" style={{ background: dom ? expiryBg(dom.days) : 'var(--bg-input)', borderColor: dom ? expiryColor(dom.days) + '30' : 'var(--border-color)' }}>
                      <div className="ssl-expiry-label">🌐 Domain Expiry</div>
                      {isChecking ? (
                        <div className="ssl-checking">Checking...</div>
                      ) : dom ? (
                        <>
                          <div className="ssl-val" style={{ color: expiryColor(dom.days) }}>{dom.days} days left</div>
                          <div className="ssl-date">{new Date(dom.date).toLocaleDateString('en-IN')}</div>
                          {dom.registrar && <div className="ssl-registrar">🏢 {dom.registrar}</div>}
                        </>
                      ) : (
                        <div className="ssl-na">Click Check</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
