import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';
import axios from 'axios';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

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
    const [form,       setForm]       = useState(target || { name:'', host:'', port:443 });
    const [saving,     setSaving]     = useState(false);
    const [recipients, setRecipients] = useState([]);
    const [selected,   setSelected]   = useState([]); // selected recipient IDs
    const [rSearch,    setRSearch]    = useState('');
    const [loadingR,   setLoadingR]   = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/api/recipients`, { headers:authHeaders() })
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
                        <input type="number" min="1" max="65535" value={form.port} onChange={e=>setForm({...form,port:Number(e.target.value)||443})}
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>443=HTTPS · 80=HTTP · 22=SSH · 3306=MySQL</div>
                    </div>
                </div>
                {/* Recipients */}
                <div style={{ marginTop:4 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0' }}>🔔 Notify Recipients</label>
                        <span style={{ fontSize:11, color:'#94a3b8' }}>
                            {selected.length===0 ? 'All will be notified' : `${selected.length} selected`}
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
                                                    {r.email && <span>✉️ {r.email}</span>}
                                                    {r.phone && <span>💬 +{r.phone.replace(/^91/,'91 ').slice(0,12)}</span>}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {selected.length === 0 && (
                                <div style={{ padding:'8px 14px', fontSize:11, color:'#94a3b8', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                                    ℹ️ No selection = all active recipients will be notified
                                </div>
                            )}
                        </div>
                    )}
                </div>

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
            const r = await axios.post(`${API_URL}/api/ping`, { target:target.host, port:target.port }, { headers:authHeaders() });
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
                            <strong style={{ color:'#7c3aed' }}>Alerts active</strong> — When this target goes DOWN or recovers UP, all your configured recipients (Email + WhatsApp) will be notified automatically.
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
        axios.get(`${API_URL}/api/ping-targets`, { headers:authHeaders() }).then(r=>setTargets(r.data)).catch(()=>{});

    useEffect(() => { load(); const t=setInterval(load,30000); return()=>clearInterval(t); }, []);

    const addTarget = async (form) => {
        await axios.post(`${API_URL}/api/ping-targets`, form, { headers:authHeaders() });
        load();
    };
    const editTargetSave = async (form) => {
        await axios.put(`${API_URL}/api/ping-targets/${editTarget._id}`, form, { headers:authHeaders() });
        load();
    };
    const deleteTarget = async (id) => {
        if (!window.confirm('Delete this target?')) return;
        await axios.delete(`${API_URL}/api/ping-targets/${id}`, { headers:authHeaders() });
        setSelected(null); load();
    };
    const toggleTarget = async (t) => {
        await axios.put(`${API_URL}/api/ping-targets/${t._id}`, { active:!t.active }, { headers:authHeaders() });
        load();
    };

    const filtered = targets.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.host.includes(search));
    const up   = targets.filter(t=>t.status==='up').length;
    const down = targets.filter(t=>t.status==='down').length;

    return (
        <div className="pg-wrap">
            {/* Header */}
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Ping Monitor <span style={{color:'#7c3aed'}}>.</span></h1>
                    <p className="pg-sub">TCP connectivity monitoring — alerts on DOWN/UP</p>
                </div>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ background:'#dcfce7', color:'#16a34a', padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>● {up} Up</span>
                    <span style={{ background:'#fee2e2', color:'#dc2626', padding:'6px 14px', borderRadius:20, fontWeight:700, fontSize:13 }}>● {down} Down</span>
                    <button onClick={() => setAddModal(true)}
                        style={{ padding:'9px 20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        + Add Target
                    </button>
                </div>
            </div>

            {/* Search */}
            {targets.length > 3 && (
                <div style={{ position:'relative', marginBottom:16 }}>
                    <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} width="15" height="15" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search targets..."
                        style={{ width:'100%', padding:'10px 12px 10px 36px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, background:'#fff', boxSizing:'border-box', outline:'none' }} />
                </div>
            )}

            {/* Cards grid */}
            {filtered.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:14 }}>
                    {filtered.map(t => {
                        const barColor = t.status==='up'?'#10b981':t.status==='down'?'#ef4444':'#e2e8f0';
                        const lc = latColor(t.responseTime);
                        return (
                            <div key={t._id} onClick={() => setSelected(t)}
                                style={{ background:'#fff', borderRadius:16, border:`2px solid ${t.status==='down'?'#fecdd3':t.status==='up'?'#d1fae5':'#e2e8f0'}`,
                                    padding:18, cursor:'pointer', position:'relative', overflow:'hidden', transition:'all 0.18s' }}
                                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e=>{ e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>
                                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:barColor }} />
                                {!t.active && <div style={{ position:'absolute', top:10, right:10, fontSize:10, fontWeight:700, background:'#f1f5f9', color:'#94a3b8', padding:'2px 7px', borderRadius:10 }}>Paused</div>}
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                        <PulseDot status={t.active ? t.status : 'unknown'} size={10} />
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:14, color:'#1e1b4b' }}>{t.name}</div>
                                            <div style={{ fontSize:11, color:'#94a3b8', fontFamily:'monospace' }}>{t.host}:{t.port}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                        background: t.status==='up'?'#dcfce7':t.status==='down'?'#fee2e2':'#f8fafc',
                                        color: t.status==='up'?'#16a34a':t.status==='down'?'#dc2626':'#94a3b8' }}>
                                        {t.status==='up'?'UP':t.status==='down'?'DOWN':'—'}
                                    </span>
                                </div>
                                <div style={{ display:'flex', gap:16 }}>
                                    <div>
                                        <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' }}>Latency</div>
                                        <div style={{ fontSize:20, fontWeight:900, color:lc }}>{t.responseTime?`${t.responseTime}ms`:'—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' }}>Checked</div>
                                        <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                                            {t.lastChecked ? new Date(t.lastChecked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop:10, fontSize:11, color:'#94a3b8', textAlign:'center', borderTop:'1px solid #f1f5f9', paddingTop:8 }}>
                                    Click for details & live ping
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign:'center', padding:'70px 20px' }}>
                    <div style={{ fontSize:54, marginBottom:14 }}>📡</div>
                    <div style={{ fontSize:17, fontWeight:700, color:'#475569', marginBottom:6 }}>No targets yet</div>
                    <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>Add a host, IP or URL to start monitoring</div>
                    <button onClick={() => setAddModal(true)}
                        style={{ padding:'10px 24px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        + Add First Target
                    </button>
                </div>
            )}

            {/* Add Modal */}
            {addModal && <TargetModal onClose={() => setAddModal(false)} onSave={addTarget} />}

            {/* Edit Modal */}
            {editTarget && <TargetModal target={editTarget} onClose={() => setEditTarget(null)} onSave={editTargetSave} />}

            {/* Detail Modal */}
            {selected && (
                <DetailModal
                    target={targets.find(t=>t._id===selected._id) || selected}
                    onClose={() => setSelected(null)}
                    onDelete={deleteTarget}
                    onToggle={toggleTarget}
                    onEdit={(t) => { setSelected(null); setEditTarget(t); }}
                />
            )}
        </div>
    );
}
