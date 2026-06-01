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
    if (days == null) return '#94a3b8';
    if (days <= 7) return '#ef4444';
    if (days <= 30) return '#f59e0b';
    return '#10b981';
  };

  const expiryBg = (days) => {
    if (days == null) return '#f1f5f9';
    if (days <= 7) return 'rgba(239,68,68,0.08)';
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
        <div className="search-wrap">
          <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="search-input" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
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
          <div style={{width:44,height:44,borderRadius:'50%',border:'4px solid #e2e8f0',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
          <div style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>Loading...</div>
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
                  <div className="ssl-expiry-box" style={{ background: ssl ? expiryBg(ssl.days) : '#f8fafc', borderColor: ssl ? expiryColor(ssl.days) + '30' : '#e2e8f0' }}>
                    <div className="ssl-expiry-label">🔒 SSL Certificate</div>
                    {isChecking ? (
                      <div className="ssl-checking">Checking...</div>
                    ) : r?.error ? (
                      <div className="ssl-val" style={{ color: '#ef4444' }}>Check failed</div>
                    ) : ssl ? (
                      <>
                        <div className="ssl-val" style={{ color: expiryColor(ssl.days) }}>{ssl.days} days left</div>
                        <div className="ssl-date">{new Date(ssl.date).toLocaleDateString('en-IN')}</div>
                      </>
                    ) : (
                      <div className="ssl-na">Click Check</div>
                    )}
                  </div>

                  <div className="ssl-expiry-box" style={{ background: dom ? expiryBg(dom.days) : '#f8fafc', borderColor: dom ? expiryColor(dom.days) + '30' : '#e2e8f0' }}>
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
  );
}
