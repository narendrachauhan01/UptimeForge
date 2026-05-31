import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';
import axios from 'axios';


const latColor = ms => !ms ? '#94a3b8' : ms < 100 ? '#10b981' : ms < 300 ? '#f59e0b' : '#ef4444';

// ── Status dot with pulse ─────────────────────────────────────────────────────
function PulseDot({ status, size = 12 }) {
    const c = status === 'up' ? '#10b981' : status === 'down' ? '#ef4444' : '#f59e0b';
    return (
        <span style={{ position:'relative', display:'inline-flex', width:size, height:size, flexShrink:0 }}>
            {status !== 'unknown' && (
                <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:c, opacity:0.4,
                    animation: status==='down' ? 'ping 1s cubic-bezier(0,0,0.2,1) infinite' : 'ping 2s cubic-bezier(0,0,0.2,1) infinite' }} />
            )}
            <span style={{ position:'relative', width:size, height:size, borderRadius:'50%', background:c,
                boxShadow: `0 0 ${size/2}px ${c}` }} />
        </span>
    );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function TargetModal({ target, onClose, onSave }) {
    const [form,         setForm]         = useState(target || { name:'', host:'', port:'' });
    const [saving,       setSaving]       = useState(false);
    const [recipients,   setRecipients]   = useState([]);
    const [selected,     setSelected]     = useState([]);
    const [rSearch,      setRSearch]      = useState('');
    const [loadingR,     setLoadingR]     = useState(true);
    const [integrations, setIntegrations] = useState([]);
    const [integSites,   setIntegSites]   = useState({});
    const [integExpanded,setIntegExpanded]= useState(null);

    useEffect(() => {
        axios.get(`${API_URL}/api/integrations`, { withCredentials: true })
            .then(r => {
                setIntegrations(r.data);
                const m={};
                r.data.forEach(i => { m[i._id] = (i.servers||[]).map(s=>s._id||s); });
                setIntegSites(m);
            }).catch(()=>{});
        axios.get(`${API_URL}/api/recipients`, { withCredentials: true })
            .then(r => {
                const data = r.data.recipients ?? r.data;
                setRecipients(data);
                // Pre-select from existing target
                if (target?.notifyRecipients?.length > 0) {
                    setSelected(target.notifyRecipients.map(id => typeof id === 'string' ? id : id._id || id));
                }
            })
            .catch(() => {})
            .finally(() => setLoadingR(false));
    }, []);

    const save = async () => {
        if (!form.name.trim() || !form.host.trim()) return;
        setSaving(true);
        await onSave({ ...form, notifyRecipients: selected });
        setSaving(false);
        onClose();
    };

    const toggleR = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
    const activeRecs = recipients.filter(r => r.active && (r.email || r.phone));
    const filteredR  = activeRecs.filter(r => !rSearch || r.name.toLowerCase().includes(rSearch.toLowerCase()) || (r.email||'').includes(rSearch));

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:420, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.5)', position:'relative' }}>
                <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>
                <h2 style={{ color:'#fff', margin:'0 0 20px', fontSize:18, fontWeight:800 }}>
                    {target ? '✏️ Edit Target' : '➕ Add Ping Target'}
                </h2>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Name *</label>
                        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="My Server / Router"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} autoFocus />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Host / IP / URL *</label>
                        <input value={form.host} onChange={e=>setForm({...form,host:e.target.value})} placeholder="192.168.1.1 or mysite.com"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Port</label>
                        <input type="number" min="1" max="65535" placeholder="e.g. 443 (blank = auto)"
                            value={form.port}
                            onChange={e => setForm({...form, port: e.target.value === '' ? '' : Number(e.target.value)})}
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>Blank = auto (443→80) · 443=HTTPS · 80=HTTP · 22=SSH · 3306=MySQL</div>
                    </div>
                </div>
                {/* Recipients */}
                <div style={{ marginTop:4 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>🔔 Notify Recipients</label>
                        <span style={{ fontSize:11, color:'#94a3b8' }}>
                            {selected.length===0 ? '⚠️ No one selected — tick at least one' : `${selected.length} selected`}
                        </span>
                    </div>
                    {loadingR ? (
                        <div style={{ fontSize:12, color:'#94a3b8', padding:'8px 0' }}>Loading...</div>
                    ) : activeRecs.length === 0 ? (
                        <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                            <span>⚠️</span>
                            <div>
                                <div style={{ fontSize:12, color:'#fca5a5', fontWeight:600 }}>No recipients found</div>
                                <a href="/integrations" style={{ fontSize:11, color:'#a78bfa', fontWeight:700 }}>Go to Integrations → Add recipient</a>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', overflow:'hidden' }}>
                            {/* Search */}
                            <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', position:'relative' }}>
                                <svg style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)' }} width="12" height="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value={rSearch} onChange={e=>setRSearch(e.target.value)} placeholder="Search recipients..."
                                    style={{ width:'100%', padding:'6px 8px 6px 26px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:7, fontSize:12, color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            {/* List */}
                            <div style={{ maxHeight:180, overflowY:'auto' }}>
                                {filteredR.map(r => {
                                    const isChecked = selected.includes(r._id);
                                    const ac = `hsl(${(r.name||'').charCodeAt(0)*37%360},55%,48%)`;
                                    return (
                                        <label key={r._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)', cursor:'pointer',
                                            background: isChecked ? 'rgba(124,58,237,0.15)' : 'transparent', transition:'background 0.12s' }}>
                                            <input type="checkbox" checked={isChecked} onChange={()=>toggleR(r._id)}
                                                style={{ width:15, height:15, accentColor:'#7c3aed', cursor:'pointer', flexShrink:0 }} />
                                            <div style={{ width:28, height:28, borderRadius:'50%', background:ac, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>
                                                {(r.name||'?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex:1, minWidth:0 }}>
                                                <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{r.name}</div>
                                                <div style={{ fontSize:11, color:'#94a3b8', display:'flex', gap:6 }}>
                                                    {r.email && <span style={{display:'flex',alignItems:'center',gap:3}}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#EA4335"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                                                        {r.email}
                                                    </span>}
                                                    {r.phone && <span style={{display:'flex',alignItems:'center',gap:3}}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                                        +{r.phone.slice(0,12)}
                                                    </span>}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {selected.length === 0 && (
                                <div style={{ padding:'8px 14px', fontSize:11, color:'#94a3b8', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                                    ⚠️ No one selected — no alerts will be sent. Tick at least one recipient.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Integrations (Webhook etc.) */}
                {integrations.length > 0 && (
                    <div style={{ marginTop:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', marginBottom:8 }}>🔗 Active Integrations</div>
                        {integrations.map(intg => {
                            const siteSel = integSites[intg._id] || [];
                            const isExp = integExpanded === intg._id;
                            const icons = { webhook:'🔗', slack:'', discord:'🎮', telegram:'✈️' };
                            return (
                                <div key={intg._id} style={{ marginBottom:6 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:9 }}>
                                        <span>{icons[intg.type]||'🔗'}</span>
                                        <div style={{ flex:1 }}>
                                            <div style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', textTransform:'capitalize' }}>{intg.type}</div>
                                            <div style={{ fontSize:10, color:'#94a3b8' }}>{intg.config?.url?.slice(0,35)||'Configured'}</div>
                                        </div>
                                        <span style={{ fontSize:10, fontWeight:700, background:'rgba(16,185,129,0.2)', color:'#34d399', padding:'2px 7px', borderRadius:20 }}>✓ Active</span>
                                        <button type="button" onClick={async()=>{
                                            if(!window.confirm(`Remove ${intg.type} integration?`)) return;
                                            await axios.delete(`${API_URL}/api/integrations/${intg.type}`, { withCredentials: true });
                                            setIntegrations(p=>p.filter(x=>x._id!==intg._id));
                                        }} style={{ padding:'3px 8px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, color:'#f87171', fontSize:11, cursor:'pointer' }}>🗑</button>
                                    </div>
                                    {isExp && (
                                        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'0 0 9px 9px', padding:'8px 12px' }}>
                                            <div style={{ fontSize:10, color:'#94a3b8', marginBottom:6 }}>Select sites (empty = all):</div>
                                            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                                {[].concat(window._pingServers||[]).map(s => {
                                                    const sel = siteSel.includes(s._id);
                                                    return (
                                                        <button key={s._id} type="button"
                                                            onClick={async()=>{
                                                                const n = sel ? siteSel.filter(x=>x!==s._id) : [...siteSel, s._id];
                                                                setIntegSites(p=>({...p,[intg._id]:n}));
                                                                await axios.post(`${API_URL}/api/integrations/${intg.type}`,{config:intg.config,events:intg.events,servers:n}, { withCredentials: true });
                                                            }}
                                                            style={{ padding:'2px 8px', borderRadius:20, border:`1px solid ${sel?'#a78bfa':'rgba(255,255,255,0.15)'}`, background:sel?'rgba(124,58,237,0.2)':'transparent', color:sel?'#a78bfa':'#94a3b8', fontSize:10, cursor:'pointer' }}>
                                                            {s.name} {sel&&'✓'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button onClick={onClose} style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={save} disabled={saving || !form.name || !form.host}
                        style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(saving||!form.name||!form.host)?0.6:1 }}>
                        {saving ? 'Saving...' : target ? 'Save Changes' : 'Add Target'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ target, onClose, onDelete, onToggle, onEdit }) {
    const [lines,   setLines]   = useState([]);
    const [running, setRunning] = useState(false);
    const timerRef = useRef(null);
    const termRef  = useRef(null);
    const seqRef   = useRef(0);

    const hist48 = (target.history || []).slice(-48);
    const chartData = hist48.map(h => ({
        time: new Date(h.time).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}),
        ms: h.responseTime || 0,
    }));
    const avgMs = chartData.filter(d=>d.ms).length ? Math.round(chartData.filter(d=>d.ms).reduce((s,d)=>s+d.ms,0)/chartData.filter(d=>d.ms).length) : 0;
    const upPct = hist48.length ? ((hist48.filter(h=>h.status==='up').length/hist48.length)*100).toFixed(1) : '—';

    const addLine = (text, color='#4ade80') => {
        setLines(p => [...p.slice(-300), { text, color, id: Date.now()+Math.random() }]);
        setTimeout(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, 30);
    };

    const doPing = useCallback(async () => {
        seqRef.current++;
        const n = seqRef.current;
        try {
            const r = await axios.post(`${API_URL}/api/ping`, { target:target.host, port:target.port }, { withCredentials: true });
            r.data.alive
                ? addLine(`Reply from ${target.host}: seq=${n}  time=${r.data.ms}ms`, '#4ade80')
                : addLine(`Request timeout for seq ${n}`, '#f87171');
        } catch { addLine(`Error reaching ${target.host}`, '#f87171'); }
    }, [target]);

    const start = async () => {
        setRunning(true);
        addLine(`PING ${target.host}:${target.port}`, '#60a5fa');
        addLine('─'.repeat(42), '#1e2d3d');
        await doPing();
        timerRef.current = setInterval(doPing, 1000);
    };
    const stop = () => { clearInterval(timerRef.current); setRunning(false); addLine('Stopped.', '#94a3b8'); };
    useEffect(() => () => clearInterval(timerRef.current), []);

    const statColor = target.status==='up'?'#10b981':target.status==='down'?'#ef4444':'#f59e0b';

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#f8fafc', borderRadius:20, width:'100%', maxWidth:800, maxHeight:'94vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.3)' }}>

                {/* Header */}
                <div style={{ background:'linear-gradient(135deg,#1e1b4b,#2d2466)', padding:'18px 22px', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <PulseDot status={target.status} size={14} />
                        <div>
                            <div style={{ fontWeight:800, fontSize:17, color:'#fff' }}>{target.name}</div>
                            <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', fontFamily:'monospace' }}>{target.host}:{target.port}</div>
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20,
                            background: target.status==='up'?'#dcfce7':target.status==='down'?'#fee2e2':'#fef3c7',
                            color: statColor }}>
                            {target.status==='up'?'● UP':target.status==='down'?'● DOWN':'● Unknown'}
                        </span>
                        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:15 }}>✕</button>
                    </div>
                </div>

                <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Stats */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                        {[
                            { l:'Status',   v: target.status==='up'?'Online':target.status==='down'?'Offline':'Unknown', c:statColor },
                            { l:'Latency',  v: target.responseTime?`${target.responseTime}ms`:'—', c:latColor(target.responseTime) },
                            { l:'Uptime',   v: `${upPct}%`, c:'#10b981' },
                            { l:'Avg (48h)',v: avgMs?`${avgMs}ms`:'—', c:'#7c3aed' },
                        ].map(s => (
                            <div key={s.l} style={{ background:'#fff', borderRadius:12, padding:'12px 14px', border:'1px solid #e2e8f0', textAlign:'center' }}>
                                <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                            </div>
                        ))}
                    </div>

                    {/* Chart */}
                    <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', padding:'14px 16px' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'#1e1b4b', marginBottom:10 }}>📈 Response Time — Last 48 checks</div>
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={150}>
                                <AreaChart data={chartData} margin={{top:5,right:10,left:0,bottom:0}}>
                                    <defs><linearGradient id="pgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                                    <XAxis dataKey="time" tick={{fontSize:10,fill:'#94a3b8'}} interval={Math.floor(chartData.length/5)||1} tickLine={false} axisLine={false}/>
                                    <YAxis tick={{fontSize:10,fill:'#94a3b8'}} unit="ms" tickLine={false} axisLine={false} width={42}/>
                                    <Tooltip contentStyle={{borderRadius:8,fontSize:12}} formatter={v=>[`${v}ms`,'Latency']}/>
                                    <Area type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2.5} fill="url(#pgGrad)" dot={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div style={{ textAlign:'center', padding:30, color:'#94a3b8', fontSize:13 }}>No history yet — auto-updates every minute</div>}
                    </div>

                    {/* Terminal */}
                    <div style={{ background:'#0d1117', borderRadius:14, overflow:'hidden', border:'1px solid #30363d' }}>
                        <div style={{ background:'#161b22', padding:'9px 14px', display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ display:'flex', gap:5 }}>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#ff5f57', display:'block' }}/>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#febc2e', display:'block' }}/>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#28c840', display:'block' }}/>
                            </div>
                            <span style={{ flex:1, fontFamily:'monospace', fontSize:12, color:'#8b949e' }}>ping {target.host}:{target.port}</span>
                            <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => setLines([])} style={{ padding:'3px 10px', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#8b949e', fontSize:11, cursor:'pointer' }}>Clear</button>
                                {!running
                                    ? <button onClick={start} style={{ padding:'3px 12px', background:'#238636', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>▶ Start</button>
                                    : <button onClick={stop} style={{ padding:'3px 12px', background:'#da3633', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>■ Stop</button>
                                }
                            </div>
                        </div>
                        <div ref={termRef} style={{ height:180, overflowY:'auto', padding:'10px 14px', fontFamily:'monospace', fontSize:12, lineHeight:1.75 }}>
                            {lines.length===0 && <div style={{ color:'#4d5566' }}>Press ▶ Start to begin live ping test...</div>}
                            {lines.map(l => <div key={l.id} style={{ color:l.color }}>{l.text}</div>)}
                            {running && <div style={{ color:'#4ade80', animation:'blink 1s step-end infinite' }}>█</div>}
                        </div>
                    </div>

                    {/* Alerts info */}
                    <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#475569', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20 }}>🔔</span>
                        <div>
                            <strong style={{ color:'#7c3aed' }}>Alerts active</strong> — When this target goes DOWN or recovers UP, selected recipients will be notified via Email &amp; WhatsApp. Webhooks also fire automatically.
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                        <button onClick={() => onEdit(target)} style={{ padding:'8px 18px', background:'#f5f3ff', border:'1.5px solid #ddd6fe', borderRadius:10, fontSize:13, fontWeight:700, color:'#7c3aed', cursor:'pointer' }}>✏️ Edit</button>
                        <button onClick={() => onToggle(target)} style={{ padding:'8px 18px', background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
                            {target.active ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <button onClick={() => onDelete(target._id)} style={{ padding:'8px 18px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:10, fontSize:13, fontWeight:700, color:'#dc2626', cursor:'pointer' }}>🗑 Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PingMonitor() {
    const [targets,  setTargets]  = useState([]);
    const [search,   setSearch]   = useState('');
    const [selected, setSelected] = useState(null);
    const [addModal, setAddModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    const load = () =>
        axios.get(`${API_URL}/api/ping-targets`, { withCredentials: true }).then(r=>setTargets(r.data)).catch(()=>{});

    useEffect(() => { load(); const t=setInterval(load,30000); return()=>clearInterval(t); }, []);

    const addTarget = async (form) => {
        await axios.post(`${API_URL}/api/ping-targets`, form, { withCredentials: true });
        load();
    };
    const editTargetSave = async (form) => {
        await axios.put(`${API_URL}/api/ping-targets/${editTarget._id}`, form, { withCredentials: true });
        load();
    };
    const deleteTarget = async (id) => {
        if (!window.confirm('Delete this target?')) return;
        await axios.delete(`${API_URL}/api/ping-targets/${id}`, { withCredentials: true });
        setSelected(null); load();
    };
    const toggleTarget = async (t) => {
        await axios.put(`${API_URL}/api/ping-targets/${t._id}`, { active:!t.active }, { withCredentials: true });
        load();
    };

    const filtered = targets.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.host.includes(search));
    const up   = targets.filter(t=>t.status==='up').length;
    const down = targets.filter(t=>t.status==='down').length;

    // Uptime bar — same as monitoring page
    const UptimeBar = ({ history=[] }) => {
        const SLOTS = 30;
        const upPct = history.length ? Math.round((history.filter(h=>h.status==='up').length/history.length)*100) : null;
        const padded = history.length >= SLOTS ? history.slice(-SLOTS) : [...Array(SLOTS-history.length).fill({status:'empty'}), ...history];
        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                <div style={{display:'flex',gap:1.5}}>
                    {padded.map((h,i)=>(
                        <div key={i} style={{width:5,height:22,borderRadius:2,
                            background:h.status==='up'?'#10b981':h.status==='down'?'#ef4444':'#e2e8f0',
                            opacity:h.status==='empty'?0.3:0.85}} />
                    ))}
                </div>
                <span style={{fontSize:11,fontWeight:700,color:upPct===100?'#10b981':upPct>=95?'#f59e0b':upPct===null?'#94a3b8':'#ef4444'}}>
                    {upPct!==null?`${upPct}%`:'—'}
                </span>
            </div>
        );
    };

    const avgResp = targets.filter(t=>t.responseTime).length
        ? Math.round(targets.filter(t=>t.responseTime).reduce((a,t)=>a+t.responseTime,0)/targets.filter(t=>t.responseTime).length) : 0;

    return (
      <>
        <div className="mon-layout">
            {/* ── Left: list ── */}
            <div className="mon-main">
                <div className="mon-header">
                    <div>
                        <h1 className="mon-title">Ping Monitor <span className="mon-dot">.</span></h1>
                        <p className="mon-sub">TCP connectivity — alerts on DOWN/UP</p>
                    </div>
                    <button onClick={() => setAddModal(true)} className="mon-btn-check">+ Add Target</button>
                </div>

                {/* Toolbar */}
                <div className="mon-toolbar">
                    <div className="mon-search-wrap">
                        <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search targets..." className="mon-search" />
                    </div>
                    <div className="mon-filter-tabs">
                        {[['all','All',targets.length],['up','Online',up],['down','Offline',down]].map(([v,l,c])=>(
                            <button key={v} className={`mon-filter-tab ${search===''&&v==='all'?'active-all':''}`}
                                onClick={()=>setSearch('')}>{l} <span className="mon-tab-count">{c}</span></button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="mon-list" style={{maxHeight:'calc(10 * 68px)', overflowY:'auto'}}>
                    {filtered.length === 0 ? (
                        <div className="mon-empty">
                            <div style={{fontSize:48,marginBottom:12}}>📡</div>
                            <div style={{fontWeight:700,color:'#475569'}}>No targets yet</div>
                            <div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>Click + Add Target to start monitoring</div>
                        </div>
                    ) : filtered.map(t => (
                        <div key={t._id} className={`mon-row mon-row-${t.status}`} onClick={()=>setSelected(t)}>
                            <PulseDot status={t.active?t.status:'unknown'} size={12} />
                            <div className="mon-site-info">
                                <div className="mon-site-name">{t.name}</div>
                                <div className="mon-site-meta">
                                    <span className="mon-proto">TCP</span>
                                    <span className="mon-sep">·</span>
                                    <span className={`mon-status-txt mon-status-${t.status}`}>
                                        {t.status==='up'?'Up':t.status==='down'?'Down':'Unknown'}
                                    </span>
                                    <span className="mon-sep">·</span>
                                    <span className="mon-time" style={{fontFamily:'monospace',fontSize:11}}>{t.host}:{t.port}</span>
                                    {t.responseTime && <>
                                        <span className="mon-sep">·</span>
                                        <span className="mon-resp" style={{color:latColor(t.responseTime)}}>{t.responseTime}ms</span>
                                    </>}
                                    {t.lastChecked && <>
                                        <span className="mon-sep">·</span>
                                        <span className="mon-time">{new Date(t.lastChecked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span>
                                    </>}
                                </div>
                            </div>
                            <div className="mon-bar-wrap">
                                <UptimeBar history={t.history?.slice(-30)||[]} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel ── */}
            <div className="mon-panel">
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Current status</div>
                    <div className="mon-panel-counts">
                        <div className="mon-count-item mon-count-down"><div className="mon-count-num">{down}</div><div className="mon-count-label">Down</div></div>
                        <div className="mon-count-item mon-count-up"><div className="mon-count-num">{up}</div><div className="mon-count-label">Up</div></div>
                        <div className="mon-count-item mon-count-unknown"><div className="mon-count-num">{targets.filter(t=>t.status==='unknown').length}</div><div className="mon-count-label">Unknown</div></div>
                    </div>
                    <div className="mon-panel-total">Monitoring {targets.length} targets</div>
                </div>
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Response</div>
                    <div className="mon-panel-uptime">
                        <div style={{flex:1,background:'#f8fafc',borderRadius:10,padding:12,textAlign:'center',border:'1px solid #e2e8f0'}}>
                            <div className="mon-uptime-val" style={{color:avgResp<100?'#10b981':avgResp<300?'#f59e0b':'#ef4444'}}>{avgResp?`${avgResp}ms`:'—'}</div>
                            <div className="mon-uptime-label">Avg latency</div>
                        </div>
                    </div>
                </div>
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Breakdown</div>
                    {[{l:'Up',c:up,color:'#10b981'},{l:'Down',c:down,color:'#ef4444'}].map(item=>(
                        <div key={item.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                            <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:4,overflow:'hidden'}}>
                                <div style={{width:`${targets.length?Math.round(item.c/targets.length*100):0}%`,height:'100%',background:item.color,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,color:item.color,fontWeight:700,minWidth:20,textAlign:'right'}}>{item.c}</span>
                            <span style={{fontSize:11,color:'#94a3b8',minWidth:36}}>{item.l}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Modals */}
        {addModal && <TargetModal onClose={() => setAddModal(false)} onSave={addTarget} />}
        {editTarget && <TargetModal target={editTarget} onClose={() => setEditTarget(null)} onSave={editTargetSave} />}
        {selected && (
            <DetailModal
                target={targets.find(t=>t._id===selected._id) || selected}
                onClose={() => setSelected(null)}
                onDelete={deleteTarget}
                onToggle={toggleTarget}
                onEdit={(t) => { setSelected(null); setEditTarget(t); }}
            />
        )}
      </>
    );
}
