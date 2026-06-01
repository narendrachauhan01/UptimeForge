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

export default function Alerts() {
  const [alerts, setAlerts]         = useState([]);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [pageLoading, setPageLoading] = useState(!_loaded_Alerts);

  useEffect(() => {
    getAlerts().then(r => { setAlerts(r.data); setPageLoading(false); _loaded_Alerts = true; }).catch(()=>setPageLoading(false));
  }, []);

  const filtered = alerts.filter(a => {
    const q = search.toLowerCase();
    const ms = a.serverName?.toLowerCase().includes(q) || a.serverUrl?.toLowerCase().includes(q) || a.sentTo?.some(r=>r.name.toLowerCase().includes(q));
    const mf = filter==='all' || a.type===filter;
    return ms && mf;
  });

  const downCount      = alerts.filter(a=>a.type==='down').length;
  const recoveredCount = alerts.filter(a=>a.type==='recovered').length;

  return (
    <div className="pg-wrap">
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>Incidents</h1>
        <p style={{ fontSize:14, color:'#6B7280', margin:0 }}>Monitor downtime events and recovery alerts</p>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Alerts',   value:alerts.length,   color:'#7C3AED', bg:'#EEF2FF', border:'#DDD6FE', f:'all' },
          { label:'Down Events',    value:downCount,        color:'#EF4444', bg:'#FEF2F2', border:'#FECDD3', f:'down' },
          { label:'Recovered',      value:recoveredCount,   color:'#10B981', bg:'#F0FDF4', border:'#BBF7D0', f:'recovered' },
        ].map(s=>{
          const active=filter===s.f;
          return (
            <div key={s.label} onClick={()=>setFilter(active?'all':s.f)}
              style={{ background:'#fff', borderRadius:10, border:`1px solid ${active?s.color:s.border}`, borderTop:`3px solid ${s.color}`, padding:'16px 18px', cursor:'pointer', boxShadow:active?`0 4px 12px ${s.color}20`:'0 1px 3px rgba(0,0,0,0.06)', transition:'all 0.15s' }}>
              <div style={{ fontSize:26, fontWeight:800, color:active?s.color:'#111827', lineHeight:1, marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#6B7280' }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>

        {/* Toolbar */}
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          {/* Search */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:8, flex:1, minWidth:180 }}>
            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by site or recipient..."
              style={{ border:'none', outline:'none', fontSize:13, color:'#374151', width:'100%', background:'transparent' }}/>
            {search && <button onClick={()=>setSearch('')} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:14 }}>✕</button>}
          </div>
          {/* Filter pills */}
          <div style={{ display:'flex', gap:4, background:'#F3F4F6', borderRadius:8, padding:3 }}>
            {[['all',`All (${alerts.length})`],['down','↓ Down'],['recovered','↑ Recovered']].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)}
                style={{ padding:'5px 12px', borderRadius:6, border:'none', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s',
                  background:filter===k?'#fff':'transparent',
                  color:filter===k?(k==='down'?'#EF4444':k==='recovered'?'#10B981':'#111827'):'#6B7280',
                  boxShadow:filter===k?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {pageLoading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:14 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <div style={{ fontSize:13, color:'#94a3b8', fontWeight:500 }}>Loading...</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'60px 20px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
            <div style={{ fontWeight:600, color:'#374151', fontSize:15, marginBottom:6 }}>
              {alerts.length===0 ? 'No alerts yet' : 'No results found'}
            </div>
            <div style={{ fontSize:13, color:'#9CA3AF' }}>
              {alerts.length===0 ? 'Alerts appear here when a site goes down.' : 'Try a different search or filter.'}
            </div>
          </div>
        ) : (
          <div>
            {filtered.map((a, i) => {
              const isDown = a.type==='down';
              return (
                <div key={a._id} style={{ padding:'16px 20px', borderBottom: i<filtered.length-1?'1px solid #F3F4F6':'none', display:'flex', gap:14, alignItems:'flex-start' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>

                  {/* Status icon */}
                  <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                    background: isDown?'#FEF2F2':'#F0FDF4',
                    border: `1px solid ${isDown?'#FECDD3':'#BBF7D0'}` }}>
                    {isDown ? '↓' : '↑'}
                  </div>

                  {/* Content */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{a.serverName}</span>
                      <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                        background: isDown?'#FEF2F2':'#F0FDF4',
                        color: isDown?'#DC2626':'#16A34A',
                        border: `1px solid ${isDown?'#FECDD3':'#BBF7D0'}` }}>
                        {isDown ? '↓ Down' : '↑ Recovered'}
                      </span>
                      {a.source === 'ping' && (
                        <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:'#EFF6FF', color:'#2563EB', border:'1px solid #BFDBFE' }}>
                          📡 Ping
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:'#9CA3AF', marginBottom: a.sentTo?.length?6:0 }}>{a.serverUrl}</div>
                    {a.sentTo?.length > 0 && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:12, color:'#6B7280' }}>📨 Notified:</span>
                        {a.sentTo.map((r,i) => (
                          <span key={i} style={{ fontSize:11, fontWeight:600, background:'#EEF2FF', color:'#4F46E5', padding:'1px 8px', borderRadius:20 }}>{r.name}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontSize:12, color:'#6B7280', fontWeight:500 }}>{fmt(a.createdAt)}</div>
                    <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{timeAgo(a.createdAt)}</div>
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
