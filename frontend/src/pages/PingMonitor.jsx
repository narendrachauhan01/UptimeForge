import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { API_URL } from '../api';
import axios from 'axios';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

function StatusBadge({ status }) {
    const cfg = { up: ['#10b981','#dcfce7','UP'], down: ['#ef4444','#fee2e2','DOWN'], unknown: ['#f59e0b','#fef3c7','—'] };
    const [color, bg, label] = cfg[status] || cfg.unknown;
    return (
        <span style={{ background: bg, color, padding:'2px 10px', borderRadius:20, fontSize:12, fontWeight:700 }}>{label}</span>
    );
}

function TargetCard({ t, onClick }) {
    const isDown = t.status === 'down';
    return (
        <div onClick={() => onClick(t)} style={{ background:'#fff', borderRadius:16, border:`2px solid ${isDown ? '#fecdd3' : t.status === 'up' ? '#d1fae5' : '#e2e8f0'}`, padding:20, cursor:'pointer', transition:'all 0.18s', position:'relative', overflow:'hidden' }}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
            {isDown && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#ef4444' }} />}
            {t.status === 'up' && <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#10b981' }} />}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                    <div style={{ fontWeight:800, fontSize:15, color:'#1e1b4b', marginBottom:3 }}>{t.name}</div>
                    <div style={{ fontSize:12, color:'#64748b', fontFamily:'monospace' }}>{t.host}:{t.port}</div>
                </div>
                <StatusBadge status={t.status} />
            </div>
            <div style={{ display:'flex', gap:16 }}>
                <div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' }}>Latency</div>
                    <div style={{ fontSize:18, fontWeight:900, color: t.responseTime < 100 ? '#10b981' : t.responseTime < 300 ? '#f59e0b' : '#ef4444' }}>
                        {t.responseTime ? `${t.responseTime}ms` : '—'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase' }}>Last Check</div>
                    <div style={{ fontSize:12, color:'#475569', marginTop:2 }}>
                        {t.lastChecked ? new Date(t.lastChecked).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '—'}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ target, onClose, onDelete, onToggle }) {
    const [termLines, setTermLines] = useState([]);
    const [running, setRunning] = useState(false);
    const [seq, setSeq] = useState(0);
    const timerRef = useRef(null);
    const termRef = useRef(null);
    const seqRef = useRef(0);

    const chartData = (target.history || []).slice(-48).map(h => ({
        time: new Date(h.time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
        ms: h.responseTime || 0,
        status: h.status,
    }));

    const avgMs = chartData.filter(d => d.ms).length
        ? Math.round(chartData.filter(d => d.ms).reduce((s,d) => s + d.ms, 0) / chartData.filter(d => d.ms).length)
        : 0;

    const upCount = (target.history || []).filter(h => h.status === 'up').length;
    const total   = (target.history || []).length;
    const uptimePct = total > 0 ? ((upCount/total)*100).toFixed(1) : '—';

    const addLine = (text, color = '#4ade80') => {
        setTermLines(prev => [...prev.slice(-200), { text, color, id: Date.now() + Math.random() }]);
        setTimeout(() => { if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight; }, 50);
    };

    const doPing = useCallback(async () => {
        seqRef.current += 1;
        const n = seqRef.current;
        try {
            const res = await axios.post(`${API_URL}/api/ping`, { target: target.host, port: target.port }, { headers: authHeaders() });
            const { alive, ms } = res.data;
            if (alive) {
                addLine(`Reply from ${target.host}: seq=${n} time=${ms}ms`, '#4ade80');
            } else {
                addLine(`Request timeout for seq ${n}`, '#f87171');
            }
        } catch {
            addLine(`Error pinging ${target.host}`, '#f87171');
        }
    }, [target]);

    const startPing = async () => {
        setRunning(true);
        addLine(`PING ${target.host} port ${target.port}`, '#94a3b8');
        addLine('─'.repeat(45), '#334155');
        await doPing();
        timerRef.current = setInterval(doPing, 1000);
    };

    const stopPing = () => {
        clearInterval(timerRef.current);
        setRunning(false);
        addLine('─'.repeat(45), '#334155');
        addLine('Ping stopped.', '#94a3b8');
    };

    const clearTerm = () => setTermLines([]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={{ background:'#f8fafc', borderRadius:20, width:'100%', maxWidth:820, maxHeight:'92vh', overflowY:'auto', boxShadow:'0 24px 80px rgba(0,0,0,0.25)' }}>

                {/* Header */}
                <div style={{ background:'linear-gradient(135deg,#1e1b4b,#2d2466)', padding:'20px 24px', borderRadius:'20px 20px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                        <div style={{ fontWeight:800, fontSize:18, color:'#fff' }}>{target.name}</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', fontFamily:'monospace', marginTop:3 }}>{target.host}:{target.port}</div>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <StatusBadge status={target.status} />
                        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, color:'#fff', width:32, height:32, cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                </div>

                <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>

                    {/* Stats row */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                        {[
                            { l:'Status', v: target.status === 'up' ? '● Online' : target.status === 'down' ? '● Offline' : '● Unknown', c: target.status === 'up' ? '#10b981' : target.status === 'down' ? '#ef4444' : '#f59e0b' },
                            { l:'Latency', v: target.responseTime ? `${target.responseTime}ms` : '—', c:'#7c3aed' },
                            { l:'Uptime', v: `${uptimePct}%`, c:'#10b981' },
                            { l:'Avg (24h)', v: avgMs ? `${avgMs}ms` : '—', c:'#f59e0b' },
                        ].map(s => (
                            <div key={s.l} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0', textAlign:'center' }}>
                                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                            </div>
                        ))}
                    </div>

                    {/* 24h Chart */}
                    <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'16px 20px' }}>
                        <div style={{ fontWeight:700, fontSize:14, color:'#1e1b4b', marginBottom:12 }}>📈 Response Time — Last 24 Hours</div>
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={chartData} margin={{ top:5, right:10, left:0, bottom:0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="time" tick={{ fontSize:10, fill:'#94a3b8' }} interval={Math.floor(chartData.length/6)} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} unit="ms" tickLine={false} axisLine={false} width={44} />
                                    <Tooltip contentStyle={{ borderRadius:10, fontSize:12, border:'1px solid #e2e8f0' }} formatter={v => [`${v}ms`, 'Latency']} />
                                    {avgMs > 0 && <ReferenceLine y={avgMs} stroke="#c4b5fd" strokeDasharray="4 4" label={{ value:`avg ${avgMs}ms`, position:'insideTopRight', fontSize:10, fill:'#a78bfa' }} />}
                                    <Line type="monotone" dataKey="ms" stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#7c3aed' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ textAlign:'center', padding:40, color:'#94a3b8', fontSize:13 }}>No history yet — check again in a minute</div>
                        )}
                    </div>

                    {/* Terminal */}
                    <div style={{ background:'#0d1117', borderRadius:16, overflow:'hidden', border:'1px solid #30363d' }}>
                        {/* Terminal header */}
                        <div style={{ background:'#161b22', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <div style={{ display:'flex', gap:6 }}>
                                    <div style={{ width:12, height:12, borderRadius:'50%', background:'#ff5f57' }} />
                                    <div style={{ width:12, height:12, borderRadius:'50%', background:'#febc2e' }} />
                                    <div style={{ width:12, height:12, borderRadius:'50%', background:'#28c840' }} />
                                </div>
                                <span style={{ fontSize:13, color:'#8b949e', fontFamily:'monospace' }}>ping {target.host}</span>
                            </div>
                            <div style={{ display:'flex', gap:8 }}>
                                <button onClick={clearTerm} style={{ padding:'4px 12px', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#8b949e', fontSize:12, cursor:'pointer' }}>Clear</button>
                                {!running ? (
                                    <button onClick={startPing} style={{ padding:'4px 14px', background:'#238636', border:'none', borderRadius:6, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>▶ Start</button>
                                ) : (
                                    <button onClick={stopPing} style={{ padding:'4px 14px', background:'#da3633', border:'none', borderRadius:6, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>■ Stop</button>
                                )}
                            </div>
                        </div>
                        {/* Terminal body */}
                        <div ref={termRef} style={{ height:200, overflowY:'auto', padding:'12px 16px', fontFamily:'monospace', fontSize:13, lineHeight:1.7 }}>
                            {termLines.length === 0 && (
                                <div style={{ color:'#4d5566' }}>Press ▶ Start to begin live ping test...</div>
                            )}
                            {termLines.map(l => (
                                <div key={l.id} style={{ color: l.color }}>{l.text}</div>
                            ))}
                            {running && <div style={{ color:'#4d5566', animation:'blink 1s infinite' }}>█</div>}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                        <button onClick={() => onToggle(target)} style={{ padding:'8px 18px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, fontWeight:600, color:'#475569', cursor:'pointer' }}>
                            {target.active ? 'Pause Monitoring' : 'Resume Monitoring'}
                        </button>
                        <button onClick={() => onDelete(target._id)} style={{ padding:'8px 18px', background:'#fef2f2', border:'1px solid #fecdd3', borderRadius:10, fontSize:13, fontWeight:600, color:'#dc2626', cursor:'pointer' }}>
                            🗑 Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PingMonitor() {
    const [targets, setTargets] = useState([]);
    const [form, setForm] = useState({ name: '', host: '', port: 443 });
    const [addError, setAddError] = useState('');
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');

    const load = () =>
        axios.get(`${API_URL}/api/ping-targets`, { headers: authHeaders() }).then(r => setTargets(r.data)).catch(() => {});

    useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

    const addTarget = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.host.trim()) { setAddError('Name and host required'); return; }
        setSaving(true); setAddError('');
        try {
            await axios.post(`${API_URL}/api/ping-targets`, form, { headers: authHeaders() });
            setForm({ name: '', host: '', port: 443 });
            load();
        } catch (err) { setAddError(err.response?.data?.error || 'Failed'); }
        setSaving(false);
    };

    const deleteTarget = async (id) => {
        if (!window.confirm('Delete this ping target?')) return;
        await axios.delete(`${API_URL}/api/ping-targets/${id}`, { headers: authHeaders() });
        setSelected(null);
        load();
    };

    const toggleTarget = async (t) => {
        await axios.put(`${API_URL}/api/ping-targets/${t._id}`, { active: !t.active }, { headers: authHeaders() });
        load();
    };

    const filtered = targets.filter(t =>
        !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.host.includes(search)
    );

    const up = targets.filter(t => t.status === 'up').length;
    const down = targets.filter(t => t.status === 'down').length;

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Ping Monitor</h1>
                    <p className="pg-sub">Monitor TCP connectivity for any host, IP or port</p>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                    <div style={{ background:'#dcfce7', color:'#16a34a', padding:'6px 16px', borderRadius:20, fontWeight:700, fontSize:13 }}>● {up} Up</div>
                    <div style={{ background:'#fee2e2', color:'#dc2626', padding:'6px 16px', borderRadius:20, fontWeight:700, fontSize:13 }}>● {down} Down</div>
                </div>
            </div>

            {/* Add form */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:20, marginBottom:24 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:14 }}>➕ Add New Target</div>
                <form onSubmit={addTarget}>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
                        <div style={{ flex:'2 1 150px' }}>
                            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Name</label>
                            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                placeholder="My Server / Router"
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, boxSizing:'border-box', outline:'none' }} />
                        </div>
                        <div style={{ flex:'3 1 200px' }}>
                            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Host / IP / URL</label>
                            <input value={form.host} onChange={e => setForm({...form, host: e.target.value})}
                                placeholder="192.168.1.1 or mysite.com"
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, boxSizing:'border-box', outline:'none' }} />
                        </div>
                        <div style={{ flex:'1 1 90px' }}>
                            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Port</label>
                            <input type="number" value={form.port} onChange={e => setForm({...form, port: Number(e.target.value)})}
                                style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, boxSizing:'border-box', outline:'none' }} />
                        </div>
                        <button type="submit" disabled={saving}
                            style={{ padding:'10px 28px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', whiteSpace:'nowrap' }}>
                            {saving ? 'Adding...' : '+ Add'}
                        </button>
                    </div>
                    {addError && <div style={{ marginTop:8, fontSize:13, color:'#ef4444' }}>⚠️ {addError}</div>}
                </form>
            </div>

            {/* Search */}
            {targets.length > 3 && (
                <div style={{ marginBottom:16, position:'relative' }}>
                    <svg style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' }} width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search targets..."
                        style={{ width:'100%', padding:'10px 12px 10px 38px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, background:'#fff', boxSizing:'border-box', outline:'none' }} />
                </div>
            )}

            {/* Target cards */}
            {filtered.length > 0 ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
                    {filtered.map(t => <TargetCard key={t._id} t={t} onClick={setSelected} />)}
                </div>
            ) : (
                <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
                    <div style={{ fontSize:52, marginBottom:12 }}>📡</div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#475569' }}>No targets yet</div>
                    <div style={{ fontSize:13, marginTop:6 }}>Add a host above to start monitoring</div>
                </div>
            )}

            {/* Detail Modal */}
            {selected && (
                <DetailModal
                    target={targets.find(t => t._id === selected._id) || selected}
                    onClose={() => setSelected(null)}
                    onDelete={deleteTarget}
                    onToggle={toggleTarget}
                />
            )}
        </div>
    );
}
