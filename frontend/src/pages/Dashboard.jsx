import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getServers, checkNow, getExpiry, getAlerts, API_URL } from '../api';
import axios from 'axios';

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [checking, setChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selected, setSelected] = useState(null);
  const [siteChecking, setSiteChecking] = useState(false);
  const [siteResult, setSiteResult] = useState(null);
  const [siteHistory, setSiteHistory] = useState([]);
  const [siteIncidents, setSiteIncidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('dash-view') || 'grid');

  const load = () => getServers().then(r => { setServers(r.data); setLastUpdated(new Date()); });

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
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

  const openSite = async (s) => {
    setSelected(s);
    setSiteResult(null);
    setSiteHistory([]);
    setSiteIncidents([]);
    setSiteChecking(true);
    try {
      const token = localStorage.getItem('sm_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [expiryRes, histRes, alertRes] = await Promise.allSettled([
        getExpiry(s._id),
        axios.get(`${API_URL}/api/servers/${s._id}/history`, { headers }),
        getAlerts(),
      ]);
      if (expiryRes.status === 'fulfilled') setSiteResult({ ssl: expiryRes.value.data.ssl, domain: expiryRes.value.data.domain });
      if (histRes.status === 'fulfilled') {
        const hist = histRes.value.data?.history || [];
        setSiteHistory(hist.slice(-60).map(h => ({
          time: new Date(h.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
          ms: h.responseTime || 0,
        })));
      }
      if (alertRes.status === 'fulfilled') {
        const incidents = alertRes.value.data.filter(a => a.server === s._id || a.server?._id === s._id).slice(0,5);
        setSiteIncidents(incidents);
      }
      load();
    } catch (e) { setSiteResult({ error: 'Check failed' }); }
    setSiteChecking(false);
  };

  const closeSite = () => { setSelected(null); setSiteResult(null); setSiteHistory([]); setSiteIncidents([]); };

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

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Monitoring</h1>
          {lastUpdated && <p className="pg-sub">Last updated: {lastUpdated.toLocaleTimeString('en-IN')}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn-download" onClick={downloadCSV} disabled={servers.length === 0}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download CSV
          </button>
          <button className={`btn-refresh ${checking ? 'checking' : ''}`} onClick={handleCheckNow} disabled={checking}>
            {checking ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className={`stat-box total ${statusFilter==='all'?'stat-active':''}`} onClick={() => setStatusFilter('all')} style={{cursor:'pointer'}}>
          <div className="stat-icon">🖥️</div>
          <div className="stat-info">
            <div className="stat-value">{servers.length}</div>
            <div className="stat-name">Total Sites</div>
          </div>
        </div>
        <div className={`stat-box online ${statusFilter==='up'?'stat-active':''}`} onClick={() => setStatusFilter(statusFilter==='up'?'all':'up')} style={{cursor:'pointer'}}>
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{up}</div>
            <div className="stat-name">Online</div>
          </div>
        </div>
        <div className={`stat-box offline ${statusFilter==='down'?'stat-active':''}`} onClick={() => setStatusFilter(statusFilter==='down'?'all':'down')} style={{cursor:'pointer'}}>
          <div className="stat-icon">🔴</div>
          <div className="stat-info">
            <div className="stat-value">{down}</div>
            <div className="stat-name">Offline</div>
          </div>
        </div>
        {unknown > 0 && (
          <div className={`stat-box unknown ${statusFilter==='unknown'?'stat-active':''}`} onClick={() => setStatusFilter(statusFilter==='unknown'?'all':'unknown')} style={{cursor:'pointer'}}>
            <div className="stat-icon">❓</div>
            <div className="stat-info">
              <div className="stat-value">{unknown}</div>
              <div className="stat-name">Unknown</div>
            </div>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="dash-view-toggle">
        <button
          className={`dash-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => { setViewMode('grid'); localStorage.setItem('dash-view', 'grid'); }}
          title="Grid view"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
          </svg>
          Grid
        </button>
        <button
          className={`dash-view-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => { setViewMode('list'); localStorage.setItem('dash-view', 'list'); }}
          title="List view"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="3" cy="6" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="3" cy="18" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          List
        </button>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="sites-grid">
          {servers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🖥️</div>
              <h3>No sites added yet</h3>
              <p>Go to <strong>Sites</strong> page to add your first site</p>
            </div>
          ) : (
            servers.filter(s => statusFilter === 'all' || s.status === statusFilter).map(s => (
              <div key={s._id} className={`site-card ${s.status}`} onClick={() => openSite(s)} style={{ cursor: 'pointer' }}>
                <div className="site-card-header">
                  <div className="site-status-dot" data-status={s.status}></div>
                  <span className={`site-badge ${s.status}`}>
                    {s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}
                  </span>
                </div>
                <div className="site-name">{s.name}</div>
                <a href={s.url} target="_blank" rel="noreferrer" className="site-url"
                  onClick={e => e.stopPropagation()}>{s.url}</a>
                <div className="site-meta">
                  <span className="meta-item">⚡ {s.responseTime ? `${s.responseTime}ms` : '—'}</span>
                  <span className="meta-item">🕐 {s.lastChecked ? new Date(s.lastChecked).toLocaleTimeString('en-IN') : 'Never'}</span>
                </div>
                <div className="expiry-row">
                  <div className={`expiry-badge ${getExpiryClass(s.sslDaysLeft)}`}>
                    🔒 SSL: {s.sslExpiry ? `${s.sslDaysLeft}d — ${new Date(s.sslExpiry).toLocaleDateString('en-IN')}` : 'Not checked'}
                  </div>
                  <div className={`expiry-badge ${getExpiryClass(domainDaysLeft(s))}`}>
                    🌐 Domain: {s.domainExpiry ? `${domainDaysLeft(s)}d — ${new Date(s.domainExpiry).toLocaleDateString('en-IN')}` : 'Not set'}
                  </div>
                </div>
                <div className="card-click-hint">Click for details</div>
              </div>
            ))
          )}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="sites-list">
          {servers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🖥️</div>
              <h3>No sites added yet</h3>
              <p>Go to <strong>Sites</strong> page to add your first site</p>
            </div>
          ) : (
            <>
              <div className="sl-header">
                <div className="sl-header-top">
                  <span>Status</span>
                  <span>Site</span>
                  <span>Last Checked</span>
                </div>
                <div className="sl-header-stats">
                  <span>Response</span>
                  <span>SSL Expiry</span>
                  <span>Domain Expiry</span>
                </div>
              </div>
              {servers.filter(s => statusFilter === 'all' || s.status === statusFilter).map(s => {
                const ddl = domainDaysLeft(s);
                const respColor = !s.responseTime ? '#94a3b8'
                  : s.responseTime < 500 ? '#10b981'
                  : s.responseTime < 1200 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={s._id} className={`sl-row sl-${s.status}`} onClick={() => openSite(s)}>
                    {/* Top: status + site + time */}
                    <div className="sl-top-row">
                      <div className="sl-status">
                        <span className={`sl-dot sl-dot-${s.status}`}></span>
                        <span className={`sl-badge sl-badge-${s.status}`}>
                          {s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}
                        </span>
                      </div>
                      <div className="sl-site">
                        <span className="sl-name">{s.name}</span>
                        <a href={s.url} target="_blank" rel="noreferrer" className="sl-url" onClick={e => e.stopPropagation()}>{s.url}</a>
                      </div>
                      <div className="sl-time">
                        {s.lastChecked ? new Date(s.lastChecked).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : 'Never'}
                      </div>
                    </div>
                    {/* Bottom: resp + ssl + domain */}
                    <div className="sl-stats-row">
                      <div className="sl-stat-cell">
                        <span className="sl-label">⚡ Response</span>
                        <span className="sl-resp-val" style={{ color: respColor }}>
                          {s.responseTime ? `${s.responseTime} ms` : '—'}
                        </span>
                      </div>
                      <div className={`sl-stat-cell ${getExpiryClass(s.sslDaysLeft)}`}>
                        <span className="sl-label">🔒 SSL</span>
                        <span className="sl-days">{s.sslDaysLeft != null ? `${s.sslDaysLeft}d` : '—'}</span>
                        {s.sslExpiry && <span className="sl-date">{new Date(s.sslExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>}
                      </div>
                      <div className={`sl-stat-cell ${getExpiryClass(ddl)}`}>
                        <span className="sl-label">🌐 Domain</span>
                        <span className="sl-days">{ddl != null ? `${ddl}d` : '—'}</span>
                        {s.domainExpiry && <span className="sl-date">{new Date(s.domainExpiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Site Detail Modal */}
      {selected && (
        <div className="sd-overlay" onClick={closeSite}>
          <div className="sd-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sd-header">
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <span className={`sd-dot ${selected.status}`} />
                <div>
                  <div className="sd-name">{selected.name}</div>
                  <a href={selected.url} target="_blank" rel="noreferrer" className="sd-url">{selected.url}</a>
                </div>
              </div>
              <button className="sd-close" onClick={closeSite}>✕</button>
            </div>

            <div className="sd-body">
              {/* Stats row */}
              <div className="sd-stats">
                <div className="sd-stat-box">
                  <div className="sd-stat-label">Current Status</div>
                  <div className="sd-stat-val" style={{ color: selected.status==='up' ? '#10b981' : selected.status==='down' ? '#ef4444' : '#f59e0b', fontSize:18 }}>
                    {selected.status==='up' ? '● Online' : selected.status==='down' ? '● Offline' : '● Unknown'}
                  </div>
                </div>
                <div className="sd-stat-box">
                  <div className="sd-stat-label">Response Time</div>
                  <div className="sd-stat-val" style={{ color: selected.responseTime < 300 ? '#10b981' : '#f59e0b' }}>
                    {selected.responseTime ? `${selected.responseTime}ms` : '—'}
                  </div>
                </div>
                <div className="sd-stat-box">
                  <div className="sd-stat-label">Last Checked</div>
                  <div className="sd-stat-val" style={{ fontSize:13, color:'#475569' }}>
                    {selected.lastChecked ? new Date(selected.lastChecked).toLocaleTimeString('en-IN') : '—'}
                  </div>
                </div>
                <div className="sd-stat-box">
                  <div className="sd-stat-label">HTTP Code</div>
                  <div className="sd-stat-val" style={{ color:'#7c3aed' }}>{selected.httpCode || '—'}</div>
                </div>
              </div>

              {/* Response time chart */}
              <div className="sd-section">
                <div className="sd-section-title">⚡ Response Time (last 1h)</div>
                {siteHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <AreaChart data={siteHistory} margin={{top:5,right:10,left:0,bottom:0}}>
                      <defs>
                        <linearGradient id="sdGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                      <XAxis dataKey="time" tick={{fontSize:10,fill:'#94a3b8'}} interval={Math.floor(siteHistory.length/5)} tickLine={false} axisLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#94a3b8'}} unit="ms" tickLine={false} axisLine={false} width={42}/>
                      <Tooltip contentStyle={{borderRadius:8,fontSize:12}} formatter={v=>[`${v}ms`,'Response']}/>
                      <Area type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2} fill="url(#sdGrad)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="sd-empty">{siteChecking ? '⏳ Loading...' : 'No history data yet'}</div>
                )}
              </div>

              {/* SSL & Domain */}
              <div className="sd-expiry-row">
                <div className="sd-expiry-box">
                  <div className="sd-section-title">🔒 SSL Certificate</div>
                  {siteChecking ? <div className="sd-empty">Checking...</div>
                  : siteResult?.ssl ? (
                    <>
                      <div className={`expiry-badge ${getExpiryClass(siteResult.ssl.daysLeft)}`}>{siteResult.ssl.daysLeft} days left</div>
                      <div className="sd-exp-date">Expires {new Date(siteResult.ssl.expiry).toLocaleDateString('en-IN')}</div>
                    </>
                  ) : selected.sslDaysLeft ? (
                    <>
                      <div className={`expiry-badge ${getExpiryClass(selected.sslDaysLeft)}`}>{selected.sslDaysLeft} days left</div>
                      <div className="sd-exp-date">Expires {new Date(selected.sslExpiry).toLocaleDateString('en-IN')}</div>
                    </>
                  ) : <div className="sd-empty">Not checked yet</div>}
                </div>
                <div className="sd-expiry-box">
                  <div className="sd-section-title">🌐 Domain Expiry</div>
                  {siteChecking ? <div className="sd-empty">Checking...</div>
                  : siteResult?.domain ? (
                    <>
                      <div className={`expiry-badge ${getExpiryClass(siteResult.domain.daysLeft)}`}>{siteResult.domain.daysLeft} days left</div>
                      <div className="sd-exp-date">Expires {new Date(siteResult.domain.expiry).toLocaleDateString('en-IN')}</div>
                      {siteResult.domain.registrar && <div className="sd-exp-date" style={{color:'#7c3aed'}}>🏢 {siteResult.domain.registrar}</div>}
                    </>
                  ) : selected.domainExpiry ? (
                    <>
                      <div className={`expiry-badge ${getExpiryClass(domainDaysLeft(selected))}`}>{domainDaysLeft(selected)} days left</div>
                      <div className="sd-exp-date">Expires {new Date(selected.domainExpiry).toLocaleDateString('en-IN')}</div>
                    </>
                  ) : <div className="sd-empty">Not available</div>}
                </div>
              </div>

              {/* Recent Incidents */}
              <div className="sd-section">
                <div className="sd-section-title">⚠️ Recent Incidents</div>
                {siteIncidents.length > 0 ? (
                  <div className="sd-incidents">
                    {siteIncidents.map(a => (
                      <div key={a._id} className="sd-incident-row">
                        <span className={`sd-incident-type ${a.type}`}>{a.type === 'down' ? '● Down' : '● Recovered'}</span>
                        <span className="sd-incident-msg">{a.message}</span>
                        <span className="sd-incident-time">{new Date(a.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sd-empty" style={{color:'#10b981'}}>✓ No incidents found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
