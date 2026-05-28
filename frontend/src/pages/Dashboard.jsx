import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServers, checkNow } from '../api';

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
        <button onClick={() => go('/servers')} style={{ padding:'9px 18px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6, height:38 }}>
          + New
        </button>
        <button onClick={() => setOpen(o=>!o)} style={{ padding:'9px 13px', background:'linear-gradient(135deg,#6d28d9,#5b21b6)', color:'#fff', border:'none', borderLeft:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', height:38 }}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open?'rotate(180deg)':'none', transition:'0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, background:'#1e1b4b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, minWidth:180, boxShadow:'0 12px 32px rgba(0,0,0,0.3)', overflow:'hidden', zIndex:999 }}>
          {[
            { icon:'🖥️', label:'Single monitor', path:'/servers' },
            { icon:'📤', label:'Bulk upload', path:'/servers' },
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

export default function Dashboard() {
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [checking, setChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  // Uptime bar: last 30 history entries as colored segments
  const UptimeBar = ({ history = [] }) => {
    const last30 = history.slice(-30);
    if (last30.length === 0) return <div className="mon-bar-empty">—</div>;
    const upPct = Math.round((last30.filter(h=>h.status==='up').length/last30.length)*100);
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
        <div style={{ display:'flex', gap:1.5 }}>
          {last30.map((h,i) => (
            <div key={i} style={{ width:6, height:22, borderRadius:2, background: h.status==='up' ? '#10b981' : h.status==='down' ? '#ef4444' : '#e2e8f0', opacity:0.85 }} title={`${new Date(h.time).toLocaleTimeString('en-IN')} — ${h.status}`} />
          ))}
        </div>
        <span style={{ fontSize:11, fontWeight:700, color: upPct===100?'#10b981':upPct>=95?'#f59e0b':'#ef4444' }}>{upPct}%</span>
      </div>
    );
  };

  // Overall uptime from all sites
  const allHistory = servers.flatMap(s => s.history || []);
  const overallUptime = allHistory.length ? Math.round((allHistory.filter(h=>h.status==='up').length/allHistory.length)*100*10)/10 : 100;
  const avgResponse = servers.filter(s=>s.responseTime).length ? Math.round(servers.filter(s=>s.responseTime).reduce((a,s)=>a+s.responseTime,0)/servers.filter(s=>s.responseTime).length) : 0;

  const filtered = servers.filter(s => statusFilter==='all' || s.status===statusFilter);
  const displayList = filtered.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.url.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
    <div className="mon-layout">

      {/* ── LEFT: Main monitor list ── */}
      <div className="mon-main">
        {/* Header */}
        <div className="mon-header">
          <div>
            <h1 className="mon-title">Monitors <span className="mon-dot">.</span></h1>
            {lastUpdated && <p className="mon-sub">Updated {lastUpdated.toLocaleTimeString('en-IN')}</p>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="mon-btn-csv" onClick={downloadCSV} disabled={servers.length===0}>↓ CSV</button>
            <button className={`mon-btn-check ${checking?'checking':''}`} onClick={handleCheckNow} disabled={checking}>
              {checking ? '⏳ Checking...' : '↺ Check Now'}
            </button>
            <NewDropdown onNavigate={navigate} />
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="mon-toolbar">
          <div className="mon-search-wrap">
            <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or URL..." className="mon-search" />
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
        <div className="mon-list">
          {displayList.length===0 ? (
            <div className="mon-empty">
              <div style={{fontSize:48,marginBottom:12}}>🖥️</div>
              <div style={{fontWeight:700,color:'#475569'}}>No sites found</div>
              <div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Go to Sites to add monitors</div>
            </div>
          ) : displayList.map(s => (
            <div key={s._id} className={`mon-row mon-row-${s.status}`} onClick={()=>openSite(s)}>
              <div className={`mon-status-dot mon-dot-${s.status}`} />
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
                      <span className="mon-resp" style={{color: s.responseTime<500?'#10b981':s.responseTime<1200?'#f59e0b':'#ef4444'}}>{s.responseTime}ms</span>
                    </>
                  )}
                </div>
              </div>
              <div className="mon-bar-wrap">
                <UptimeBar history={s.history||[]} />
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ── RIGHT: Summary panel ── */}
      <div className="mon-panel">
        <div className="mon-panel-section">
          <div className="mon-panel-title">Current status</div>
          <div className="mon-panel-counts">
            <div className="mon-count-item mon-count-down">
              <div className="mon-count-num">{down}</div>
              <div className="mon-count-label">Down</div>
            </div>
            <div className="mon-count-item mon-count-up">
              <div className="mon-count-num">{up}</div>
              <div className="mon-count-label">Up</div>
            </div>
            <div className="mon-count-item mon-count-unknown">
              <div className="mon-count-num">{unknown}</div>
              <div className="mon-count-label">Unknown</div>
            </div>
          </div>
          <div className="mon-panel-total">Monitoring {servers.length} sites</div>
        </div>

        <div className="mon-panel-section">
          <div className="mon-panel-title">Last 24 hours</div>
          <div className="mon-panel-uptime">
            <div>
              <div className="mon-uptime-val" style={{color: overallUptime>=99?'#10b981':overallUptime>=95?'#f59e0b':'#ef4444'}}>
                {overallUptime}%
              </div>
              <div className="mon-uptime-label">Overall uptime</div>
            </div>
            <div>
              <div className="mon-uptime-val" style={{color:'#7c3aed'}}>{avgResponse ? `${avgResponse}ms` : '—'}</div>
              <div className="mon-uptime-label">Avg response</div>
            </div>
          </div>
        </div>

        <div className="mon-panel-section">
          <div className="mon-panel-title">Sites breakdown</div>
          {servers.length > 0 ? (
            <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:4}}>
              {[
                { label:'Online', count:up, color:'#10b981', bg:'#dcfce7' },
                { label:'Offline', count:down, color:'#ef4444', bg:'#fee2e2' },
                { label:'Unknown', count:unknown, color:'#f59e0b', bg:'#fef3c7' },
              ].map(item => (
                <div key={item.label} style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:`${servers.length?Math.round(item.count/servers.length*100):0}%`,height:'100%',background:item.color,borderRadius:4}}/>
                  </div>
                  <span style={{fontSize:12,color:item.color,fontWeight:700,minWidth:20,textAlign:'right'}}>{item.count}</span>
                  <span style={{fontSize:11,color:'#94a3b8',minWidth:48}}>{item.label}</span>
                </div>
              ))}
            </div>
          ) : <div style={{fontSize:13,color:'#94a3b8',marginTop:8}}>No sites yet</div>}
        </div>
      </div>


    </div>{/* end mon-layout */}

      {/* Site Detail Modal */}
      {false && (
        <div className="sd-overlay">
          <div className="sd-modal">

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
    </>
  );
}
