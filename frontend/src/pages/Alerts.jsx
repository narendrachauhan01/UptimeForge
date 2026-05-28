import React, { useEffect, useState } from 'react';
import { getAlerts } from '../api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');

  useEffect(() => { getAlerts().then(r => setAlerts(r.data)); }, []);

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.serverName?.toLowerCase().includes(q)
      || a.serverUrl?.toLowerCase().includes(q)
      || a.sentTo?.some(r => r.name.toLowerCase().includes(q));
    const matchFilter = filter === 'all' || a.type === filter;
    return matchSearch && matchFilter;
  });

  const fmt = (d) => new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Incidents</h1>
          <p className="pg-sub">{alerts.length} total alerts logged</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="al-filter-bar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="search-input" placeholder="Search by site name or recipient..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="al-pills">
          {[['all', `All (${alerts.length})`], ['down', `↓ Down`], ['recovered', `↑ Recovered`]].map(([k, l]) => (
            <button key={k} className={`al-pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Alert list */}
      <div className="al-list">
        {filtered.length === 0 ? (
          <div className="al-empty">
            {alerts.length === 0 ? 'No alerts yet — alerts appear here when a site goes down.' : 'No results match your search.'}
          </div>
        ) : filtered.map(a => (
          <div key={a._id} className={`al-card al-${a.type}`}>
            {/* Top row */}
            <div className="al-top">
              <span className={`al-badge ${a.type}`}>
                {a.type === 'down' ? '↓ Down' : '↑ Recovered'}
              </span>
              <div className="al-site-info">
                <div className="al-site-name">{a.serverName}</div>
                <div className="al-site-url">{a.serverUrl}</div>
              </div>
            </div>
            {/* Bottom row */}
            <div className="al-bottom">
              {a.sentTo?.length > 0 && (
                <span className="al-recipients">
                  📨 {a.sentTo.map(r => r.name).join(', ')}
                </span>
              )}
              <span className="al-time">{fmt(a.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
