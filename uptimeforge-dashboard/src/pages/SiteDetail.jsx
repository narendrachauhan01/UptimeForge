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

    const loadCore = async () => {
        // Stage 1: Load server + history FAST → show page immediately
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
        setLoading(false); // Show page as soon as server data is ready
    };

    const loadBackground = async () => {
        // Stage 2: Load alerts (server-filtered) + expiry in background
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
        loadCore().then(() => loadBackground()); // core first, then background
        const t = setInterval(() => loadCore(), 60000);
        return () => clearInterval(t);
    }, [id, range, showCustom, customFrom, customTo]);

    const togglePause = async () => {
        setPausing(true);
        await axios.put(`${API_URL}/api/servers/${id}`, { active: !server.active }, authCfg);
        await loadCore();
        setPausing(false);
    };

    // Filter history by range
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

    // Uptime calculations from history
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

    // 24h uptime bar
    const hist24 = server?.history?.slice(-48) || [];

    if (loading || !server) return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:400, gap:16 }}>
            <div style={{
                width:48, height:48, borderRadius:'50%',
                border:'4px solid #e2e8f0',
                borderTop:'4px solid #7c3aed',
                animation:'spin 0.8s linear infinite'
            }}/>
            <div style={{ fontSize:14, color:'#94a3b8', fontWeight:500 }}>Loading site data...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const statusColor = server.status==='up' ? '#10b981' : server.status==='down' ? '#ef4444' : '#f59e0b';
    const sslDays = expiry?.ssl?.daysLeft ?? server.sslDaysLeft;
    const domDays = expiry?.domain?.daysLeft ?? (server.domainExpiry ? Math.floor((new Date(server.domainExpiry)-Date.now())/(1000*60*60*24)) : null);

    return (
        <div className="sit-page">
            {/* ── Top bar ── */}
            <div className="sit-topbar">
                <button className="sit-back" onClick={()=>navigate('/monitoring')}>
                    ← Monitoring
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
                                <div className="sit-card-sub" style={{color:'#ef4444'}}>Down since {fmt(server.lastDownAt)}</div>
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
                            <div className="sit-card-sub" style={{color: uptime24h>=99?'#10b981':uptime24h>=95?'#f59e0b':'#ef4444', fontWeight:700}}>
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
                                <div className="sit-uptime-val" style={{ color: val===null ? '#94a3b8' : val>=99 ? '#10b981' : val>=95 ? '#f59e0b' : '#ef4444' }}>
                                    {val !== null ? `${val}%` : '—'}
                                </div>
                            </div>
                        ))}
                        <div className="sit-uptime-box">
                            <div className="sit-uptime-label">Response</div>
                            <div className="sit-uptime-val" style={{ color:'#7c3aed' }}>
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
                            <div className="sit-custom-range">
                                <input type="datetime-local" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} className="sit-date-input" />
                                <span style={{color:'#94a3b8'}}>to</span>
                                <input type="datetime-local" value={customTo} onChange={e=>setCustomTo(e.target.value)} className="sit-date-input" />
                            </div>
                        )}

                        {chartData.length > 1 ? (
                            <div className="sit-chart-wrap">
                            <ResponsiveContainer width="99%" height={200}>
                            <AreaChart
                                data={chartData}
                                margin={{top:10,right:10,left:0,bottom:0}}
                            >
                                    <defs>
                                        <linearGradient id="sitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                                    <XAxis dataKey="time" tick={{fontSize:10,fill:'#94a3b8'}} interval={Math.floor(chartData.length/6)||1} tickLine={false} axisLine={false}/>
                                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} unit="ms" tickLine={false} axisLine={false} width={44}/>
                                    <Tooltip contentStyle={{borderRadius:10,fontSize:12,border:'1px solid #e2e8f0'}} formatter={v=>[`${v}ms`,'Response']}/>
                                    {avgMs>0 && <ReferenceLine y={avgMs} stroke="#c4b5fd" strokeDasharray="4 4" label={{value:`avg`,position:'insideTopRight',fontSize:10,fill:'#a78bfa'}}/>}
                                    <Area type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2.5} fill="url(#sitGrad)" dot={false} activeDot={{r:4,fill:'#7c3aed'}}/>
                                </AreaChart>
                            </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="sit-chart-empty">Not enough data for selected range</div>
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
                        <div className="sit-incidents-header">
                            <div className="sit-chart-title">⚠️ Latest Incidents</div>
                        </div>
                        {incidents.length === 0 && !expiry ? (
                            <div style={{padding:'16px 0', color:'#94a3b8', fontSize:13, display:'flex', alignItems:'center', gap:8}}>
                                <span style={{display:'inline-block', width:12, height:12, border:'2px solid #e2e8f0', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite'}} />
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
                                                <td style={{color:'#64748b',fontSize:12}}>HTTP</td>
                                                <td style={{color:'#475569',fontSize:13}}>{a.message||'—'}</td>
                                                <td style={{color:'#94a3b8',fontSize:12,whiteSpace:'nowrap'}}>{fmt(a.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile cards */}
                            <div className="sit-inc-mobile">
                                {incidents.map(a => (
                                    <div key={a._id} style={{padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                                            <span className={`sit-inc-badge sit-inc-${a.type}`}>{a.type==='down'?'● Down':'● Recovered'}</span>
                                            <span style={{fontSize:11,color:'#94a3b8'}}>{fmt(a.createdAt)}</span>
                                        </div>
                                        <div style={{fontSize:12,color:'#475569'}}>{a.message||'—'}</div>
                                    </div>
                                ))}
                            </div>
                        </>) : (
                            <div className="sit-chart-empty" style={{color:'#10b981'}}>✓ No incidents recorded</div>
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
                                <>
                                    <div className="sit-right-val" style={{color: domDays<=30?'#ef4444':domDays<=60?'#f59e0b':'#10b981'}}>{domDays} days left</div>
                                    {server.domainExpiry && <div className="sit-right-sub">{new Date(server.domainExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                                </>
                            ) : <div className="sit-right-na">Not checked</div>}
                        </div>
                        <div className="sit-right-item" style={{marginTop:14}}>
                            <div className="sit-right-label">🔒 SSL valid until</div>
                            {sslDays !== null ? (
                                <>
                                    <div className="sit-right-val" style={{color: sslDays<=7?'#ef4444':sslDays<=30?'#f59e0b':'#10b981'}}>{sslDays} days left</div>
                                    {server.sslExpiry && <div className="sit-right-sub">{new Date(server.sslExpiry).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                                </>
                            ) : <div className="sit-right-na">Not checked</div>}
                        </div>
                    </div>

                    <div className="sit-right-card">
                        <div className="sit-right-title">Monitor info</div>
                        <div className="sit-info-row"><span>Type</span><span>HTTP/S</span></div>
                        <div className="sit-info-row"><span>Status</span><span style={{color:statusColor,fontWeight:700}}>{server.status}</span></div>
                        <div className="sit-info-row"><span>Active</span><span style={{color:server.active?'#10b981':'#94a3b8'}}>{server.active?'Yes':'Paused'}</span></div>
                        <div className="sit-info-row"><span>HTTP code</span><span>{server.httpCode||'—'}</span></div>
                        <div className="sit-info-row"><span>Last check</span><span>{timeAgo(server.lastChecked)}</span></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
