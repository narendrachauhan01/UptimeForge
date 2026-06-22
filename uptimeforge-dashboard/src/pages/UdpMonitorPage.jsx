let _loaded_UdpMonitor = false;
import { useConfirm } from '../components/ConfirmDialog';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';
import axios from 'axios';

const latColor = ms => !ms ? '#94a3b8' : ms < 100 ? '#10b981' : ms < 300 ? '#f59e0b' : '#ef4444';

const UDP_PORT_PRESETS = [
    { label: 'DNS',     port: 53   },
    { label: 'TFTP',    port: 69   },
    { label: 'DHCP',    port: 67   },
    { label: 'NTP',     port: 123  },
    { label: 'SNMP',    port: 161  },
    { label: 'Syslog',  port: 514  },
    { label: 'RADIUS',  port: 1812 },
];

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
    const [saveError,    setSaveError]    = useState('');
    const [recipients,   setRecipients]   = useState([]);
    const [selected,     setSelected]     = useState([]);
    const [rSearch,      setRSearch]      = useState('');
    const [loadingR,     setLoadingR]     = useState(true);
    const [integrations, setIntegrations] = useState([]);
    const [portDropdownOpen, setPortDropdownOpen] = useState(false);

    useEffect(() => {
        axios.get(`${API_URL}/api/integrations`, { withCredentials: true })
            .then(r => setIntegrations(r.data)).catch(()=>{});
        axios.get(`${API_URL}/api/recipients`, { withCredentials: true })
            .then(r => {
                const data = r.data.recipients ?? r.data;
                setRecipients(data);
                if (target?.notifyRecipients?.length > 0) {
                    setSelected(target.notifyRecipients.map(id => typeof id === 'string' ? id : id._id || id));
                }
            })
            .catch(() => {})
            .finally(() => setLoadingR(false));
    }, []);

    const save = async () => {
        if (!form.name.trim() || !form.host.trim() || !form.port) return;
        setSaving(true);
        setSaveError('');
        try {
            const payload = { name: form.name, host: form.host, port: Number(form.port), notifyRecipients: selected };
            await onSave(payload);
            onClose();
        } catch(e) {
            setSaveError(e.response?.data?.error || e.message || 'Save failed');
        }
        setSaving(false);
    };

    const toggleR = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
    const activeRecs = recipients.filter(r => r.active && (r.email || r.phone));
    const filteredR  = activeRecs.filter(r => !rSearch || r.name.toLowerCase().includes(rSearch.toLowerCase()) || (r.email||'').includes(rSearch));

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <style>{`
                .udp-modal-scroll::-webkit-scrollbar { width: 7px; }
                .udp-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .udp-modal-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 10px; }
                .udp-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.55); }
            `}</style>
            <div className="udp-modal-scroll" style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:20, width:'100%', maxWidth:600, padding:'32px 36px', boxShadow:'var(--card-shadow)', position:'relative', maxHeight:'92vh', overflowY:'auto' }}>
                <button onClick={onClose} style={{ position:'absolute', top:18, right:18, background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-main)', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:15 }}>✕</button>
                <h2 style={{ color:'var(--text-main)', margin:'0 0 24px', fontSize:20, fontWeight:800 }}>
                    {target ? '✏️ Edit Target' : '➕ Add UDP Monitoring Target'}
                </h2>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', display:'block', marginBottom:6 }}>Name *</label>
                        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Internal DNS Server"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border-color)', borderRadius:9, fontSize:14, background:'var(--bg-input)', color:'var(--text-main)', outline:'none', boxSizing:'border-box' }} autoFocus />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', display:'block', marginBottom:6 }}>Host / IP *</label>
                        <input value={form.host} onChange={e=>setForm({...form,host:e.target.value})} placeholder="192.168.1.1 or mysite.com"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border-color)', borderRadius:9, fontSize:14, background:'var(--bg-input)', color:'var(--text-main)', outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div style={{ position:'relative' }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', display:'block', marginBottom:6 }}>UDP port *</label>
                        <input type="number" min="1" max="65535" placeholder="E.g. 53"
                            value={form.port}
                            onChange={e => setForm({...form, port: e.target.value === '' ? '' : Number(e.target.value)})}
                            onFocus={() => setPortDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setPortDropdownOpen(false), 150)}
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border-color)', borderRadius:9, fontSize:14, background:'var(--bg-input)', color:'var(--text-main)', outline:'none', boxSizing:'border-box' }} />
                        <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>53=DNS · 67/68=DHCP · 69=TFTP · 123=NTP · 161=SNMP · 514=Syslog</div>
                        {portDropdownOpen && (
                            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:9, boxShadow:'var(--card-shadow)', maxHeight:220, overflowY:'auto', zIndex:20 }}>
                                {UDP_PORT_PRESETS.map(p => (
                                    <div key={p.port}
                                        onMouseDown={e => { e.preventDefault(); setForm({...form, port: p.port}); setPortDropdownOpen(false); }}
                                        style={{ padding:'9px 14px', fontSize:13, color:'var(--text-main)', cursor:'pointer', borderBottom:'1px solid var(--border-color)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-glow)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        {p.label} - {p.port}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recipients */}
                <div style={{ marginTop:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-main)' }}>🔔 Notify Recipients</label>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                            {selected.length===0 ? '⚠️ No one selected — tick at least one' : `${selected.length} selected`}
                        </span>
                    </div>
                    {loadingR ? (
                        <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 0' }}>Loading...</div>
                    ) : activeRecs.length === 0 ? (
                        <div style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                            <span>⚠️</span>
                            <div>
                                <div style={{ fontSize:12, color:'var(--danger)', fontWeight:600 }}>No recipients found</div>
                                <a href="/integrations" style={{ fontSize:11, color:'var(--primary)', fontWeight:700 }}>Go to Integrations → Add recipient</a>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background:'var(--bg-input)', borderRadius:10, border:'1px solid var(--border-color)', overflow:'hidden' }}>
                            <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--border-color)', position:'relative' }}>
                                <svg style={{ position:'absolute', left:20, top:'50%', transform:'translateY(-50%)' }} width="12" height="12" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value={rSearch} onChange={e=>setRSearch(e.target.value)} placeholder="Search recipients..."
                                    style={{ width:'100%', padding:'6px 8px 6px 26px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:7, fontSize:12, color:'var(--text-main)', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            <div style={{ maxHeight:160, overflowY:'auto' }}>
                                {filteredR.map(r => {
                                    const isChecked = selected.includes(r._id);
                                    const ac = `hsl(${(r.name||'').charCodeAt(0)*37%360},55%,48%)`;
                                    return (
                                        <label key={r._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom:'1px solid var(--border-color)', cursor:'pointer',
                                            background: isChecked ? 'var(--primary-glow)' : 'transparent', transition:'background 0.12s' }}>
                                            <input type="checkbox" checked={isChecked} onChange={()=>toggleR(r._id)}
                                                style={{ width:15, height:15, accentColor:'var(--primary)', cursor:'pointer', flexShrink:0 }} />
                                            <div style={{ width:28, height:28, borderRadius:'50%', background:ac, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:12, flexShrink:0 }}>
                                                {(r.name||'?')[0].toUpperCase()}
                                            </div>
                                            <div style={{ flex:1, minWidth:0 }}>
                                                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{r.name}</div>
                                                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{r.email || r.phone}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            {selected.length === 0 && (
                                <div style={{ padding:'8px 14px', fontSize:11, color:'var(--text-muted)', borderTop:'1px solid var(--border-color)' }}>
                                    ⚠️ No one selected — no alerts will be sent. Tick at least one recipient.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {integrations.length > 0 && (
                    <div style={{ marginTop:14 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', marginBottom:8 }}>🔗 Active Integrations</div>
                        {integrations.map(intg => {
                            const icons = { webhook:'🔗', slack:'', discord:'🎮', telegram:'✈️' };
                            return (
                                <div key={intg._id} style={{ marginBottom:6, display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:9 }}>
                                    <span>{icons[intg.type]||'🔗'}</span>
                                    <div style={{ flex:1 }}>
                                        <div style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', textTransform:'capitalize' }}>{intg.type}</div>
                                    </div>
                                    <span style={{ fontSize:10, fontWeight:700, background:'rgba(16,185,129,0.08)', color:'var(--success)', padding:'2px 7px', borderRadius:20, border:'1px solid rgba(16,185,129,0.15)' }}>✓ Active</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {saveError && (
                    <div style={{ marginTop:12, background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:10, padding:'12px 16px' }}>
                        <div style={{ color:'var(--danger)', fontSize:13, fontWeight:600, marginBottom: saveError.includes('limit') ? 8 : 0 }}>
                            ⚠️ {saveError}
                        </div>
                        {saveError.includes('limit') && (
                            <a href="/pay?plan=select" style={{ display:'inline-block', marginTop:4, padding:'6px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none' }}>
                                ⬆️ Upgrade Plan
                            </a>
                        )}
                    </div>
                )}

                <div style={{ display:'flex', gap:10, marginTop:16 }}>
                    <button onClick={onClose} style={{ flex:1, padding:'11px', border:'1.5px solid var(--border-color)', borderRadius:10, background:'var(--bg-card)', color:'var(--text-muted)', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={save} disabled={saving || !form.name || !form.host || !form.port}
                        style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(saving||!form.name||!form.host||!form.port)?0.6:1, boxShadow:'0 2px 8px rgba(124,58,237,0.2)' }}>
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
    const [probing, setProbing] = useState(false);
    const termRef  = useRef(null);

    const isDark = document.body.classList.contains('charts-dark-theme');

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

    const probeNow = async () => {
        setProbing(true);
        addLine(`udp-probe ${target.host}:${target.port}`, '#60a5fa');
        addLine('─'.repeat(42), '#1e2d3d');
        try {
            const r = await axios.post(`${API_URL}/api/udp/probe`, { host: target.host, port: target.port }, { withCredentials: true });
            r.data.alive
                ? addLine(`Response from ${target.host}:${target.port}  time=${r.data.ms}ms`, '#4ade80')
                : addLine(`No response from ${target.host}:${target.port} (timeout)`, '#f87171');
        } catch { addLine(`Error probing ${target.host}:${target.port}`, '#f87171'); }
        setProbing(false);
    };

    const statColor = target.status==='up'?'#10b981':target.status==='down'?'#ef4444':'#f59e0b';

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:12 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:20, width:'100%', maxWidth:800, maxHeight:'94vh', overflowY:'auto', boxShadow:'var(--card-shadow)' }}>

                <div style={{ background:'var(--bg-input)', padding:'18px 22px', borderBottom:'1px solid var(--border-color)', borderRadius:'20px 20px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <PulseDot status={target.status} size={14} />
                        <div>
                            <div style={{ fontWeight:800, fontSize:17, color:'var(--text-main)' }}>{target.name}</div>
                            <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>{target.host}:{target.port}</div>
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span style={{ fontSize:12, fontWeight:700, padding:'3px 10px', borderRadius:20,
                            background: target.status==='up'?'rgba(16,185,129,0.08)':target.status==='down'?'rgba(244,63,94,0.08)':'rgba(245,158,11,0.08)',
                            border:`1px solid ${target.status==='up'?'rgba(16,185,129,0.15)':target.status==='down'?'rgba(244,63,94,0.15)':'rgba(245,158,11,0.15)'}`,
                            color: statColor }}>
                            {target.status==='up'?'● UP':target.status==='down'?'● DOWN':'● Unknown'}
                        </span>
                        <button onClick={onClose} style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', color:'var(--text-main)', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:15 }}>✕</button>
                    </div>
                </div>

                <div style={{ padding:18, display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                        {[
                            { l:'Status',   v: target.status==='up'?'Responding':target.status==='down'?'No Response':'Unknown', c:statColor },
                            { l:'Latency',  v: target.responseTime?`${target.responseTime}ms`:'—', c:latColor(target.responseTime) },
                            { l:'Uptime',   v: `${upPct}%`, c:'#10b981' },
                            { l:'Avg (48h)',v: avgMs?`${avgMs}ms`:'—', c:'#7c3aed' },
                        ].map(s => (
                            <div key={s.l} style={{ background:'var(--bg-input)', borderRadius:12, padding:'12px 14px', border:'1px solid var(--border-color)', textAlign:'center' }}>
                                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ background:'var(--bg-input)', borderRadius:14, border:'1px solid var(--border-color)', padding:'14px 16px' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'var(--text-main)', marginBottom:10 }}>📈 Response Time — Last 48 checks</div>
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={150}>
                                <AreaChart data={chartData} margin={{top:5,right:10,left:8,bottom:0}}>
                                    <defs><linearGradient id="udpGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} vertical={false}/>
                                    <XAxis dataKey="time" tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} interval={Math.floor(chartData.length/5)||1} tickLine={false} axisLine={false}/>
                                    <YAxis type="number" domain={[0, 'auto']} allowDecimals={false} tickFormatter={(v)=>`${Math.round(v)}ms`} tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} tickLine={false} axisLine={false} width={42}/>
                                    <Tooltip contentStyle={{borderRadius:12,fontSize:12,background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'}} formatter={v=>[`${v}ms`,'Latency']}/>
                                    <Area type="monotone" dataKey="ms" stroke="var(--primary)" strokeWidth={2.5} fill="url(#udpGrad)" dot={false}/>
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div style={{ textAlign:'center', padding:30, color:'var(--text-muted)', fontSize:13 }}>No history yet — auto-updates every minute</div>}
                    </div>

                    {/* Terminal */}
                    <div style={{ background:'#0d1117', borderRadius:14, overflow:'hidden', border:'1px solid #30363d' }}>
                        <div style={{ background:'#161b22', padding:'9px 14px', display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ display:'flex', gap:5 }}>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#ff5f57', display:'block' }}/>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#febc2e', display:'block' }}/>
                                <span style={{ width:11, height:11, borderRadius:'50%', background:'#28c840', display:'block' }}/>
                            </div>
                            <span style={{ flex:1, fontFamily:'monospace', fontSize:12, color:'#8b949e' }}>udp-probe {target.host}:{target.port}</span>
                            <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => setLines([])} style={{ padding:'3px 10px', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#8b949e', fontSize:11, cursor:'pointer' }}>Clear</button>
                                <button onClick={probeNow} disabled={probing} style={{ padding:'3px 12px', background:'#238636', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:probing?0.6:1 }}>
                                    {probing ? '...' : '▶ Probe Now'}
                                </button>
                            </div>
                        </div>
                        <div ref={termRef} style={{ height:180, overflowY:'auto', padding:'10px 14px', fontFamily:'monospace', fontSize:12, lineHeight:1.75 }}>
                            {lines.length===0 && <div style={{ color:'#4d5566' }}>Press ▶ Probe Now to send a live UDP probe...</div>}
                            {lines.map(l => <div key={l.id} style={{ color:l.color }}>{l.text}</div>)}
                        </div>
                    </div>

                    <div style={{ background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:12, padding:'12px 16px', fontSize:13, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20 }}>🔔</span>
                        <div>
                            <strong style={{ color:'var(--primary)' }}>Alerts active</strong> — When this target stops responding or recovers, selected recipients will be notified via Email &amp; WhatsApp. Webhooks also fire automatically.
                        </div>
                    </div>

                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
                        <button onClick={() => onEdit(target)} style={{ padding:'8px 18px', background:'var(--primary-glow)', border:'1.5px solid var(--border-color)', borderRadius:10, fontSize:13, fontWeight:700, color:'var(--primary)', cursor:'pointer' }}>✏️ Edit</button>
                        <button onClick={() => onToggle(target)} style={{ padding:'8px 18px', background:'var(--bg-input)', border:'1.5px solid var(--border-color)', borderRadius:10, fontSize:13, fontWeight:600, color:'var(--text-muted)', cursor:'pointer' }}>
                            {target.active ? '⏸ Pause' : '▶ Resume'}
                        </button>
                        <button onClick={() => onDelete(target._id)} style={{ padding:'8px 18px', background:'rgba(244,63,94,0.08)', border:'1.5px solid rgba(244,63,94,0.15)', borderRadius:10, fontSize:13, fontWeight:700, color:'var(--danger)', cursor:'pointer' }}>🗑 Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UdpMonitorPage() {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [targets,     setTargets]     = useState([]);
    const [search,      setSearch]      = useState('');
    const [selected,    setSelected]    = useState(null);
    const [addModal,    setAddModal]    = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);
    const [pageLoading, setPageLoading] = useState(!_loaded_UdpMonitor);
    const [limitError,   setLimitError]   = useState('');
    const [pingLimit,    setPingLimit]    = useState(null);
    const [pingInterval, setPingInterval] = useState(null);
    const [userPlan,     setUserPlan]     = useState('free_trial');
    const [pingIvTip,    setPingIvTip]    = useState(null);
    const pingIvRef = useRef(null);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark';
    });

    const isDark = localTheme === 'dark';

    useEffect(() => {
        const checkThemeCookie = () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const current = match ? match[1] : 'dark';
            if (current !== localTheme) setLocalTheme(current);
        };
        checkThemeCookie();
        const interval = setInterval(checkThemeCookie, 1000);
        return () => clearInterval(interval);
    }, [localTheme]);

    useEffect(() => {
        if (localTheme === 'dark') document.body.classList.add('charts-dark-theme');
        else document.body.classList.remove('charts-dark-theme');
        return () => document.body.classList.remove('charts-dark-theme');
    }, [localTheme]);

    const load = () =>
        axios.get(`${API_URL}/api/udp-targets`, { withCredentials: true })
            .then(r=>{ setTargets(r.data); setPageLoading(false); _loaded_UdpMonitor = true; })
            .catch(()=>setPageLoading(false));

    useEffect(() => {
        load();
        Promise.all([
            axios.get(`${API_URL}/api/users/me`, { withCredentials: true }),
            axios.get(`${API_URL}/api/payment/plans`, { withCredentials: true }),
        ]).then(([meRes, plansRes]) => {
            const plan = meRes.data?.plan || 'free_trial';
            const plans = plansRes.data;
            setUserPlan(plan);
            if (plan === 'free_trial') {
                setPingLimit(plans?.freeTrialPingLimit ?? 2);
                setPingInterval(plans?.freeTrialPingInterval || 180);
            } else {
                setPingLimit(plans?.plans?.[plan]?.pingLimit ?? null);
                setPingInterval(plans?.plans?.[plan]?.pingInterval || 60);
            }
        }).catch(()=>{});
        const t = setInterval(load, 30000);
        return () => clearInterval(t);
    }, []);

    const addTarget = async (form) => {
        await axios.post(`${API_URL}/api/udp-targets`, form, { withCredentials: true });
        load();
    };
    const editTargetSave = async (form) => {
        const r = await axios.put(`${API_URL}/api/udp-targets/${editTarget._id}`, form, { withCredentials: true });
        setEditTarget(null);
        load();
        return r;
    };
    const deleteTarget = async (id) => {
        const _ok1 = await confirm('Delete this target?', { title:'Delete Target', confirmText:'Delete', danger:true }); if (!_ok1) return;
        await axios.delete(`${API_URL}/api/udp-targets/${id}`, { withCredentials: true });
        setSelected(null); load();
    };
    const toggleTarget = async (t) => {
        await axios.put(`${API_URL}/api/udp-targets/${t._id}`, { active:!t.active }, { withCredentials: true });
        load();
    };

    const filtered = targets.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.host.includes(search));
    const up   = targets.filter(t=>t.status==='up').length;
    const down = targets.filter(t=>t.status==='down').length;

    const UptimeBar = ({ history=[] }) => {
        const SLOTS = 30;
        const upPct = history.length ? Math.round((history.filter(h=>h.status==='up').length/history.length)*100) : null;
        const padded = history.length >= SLOTS ? history.slice(-SLOTS) : [...Array(SLOTS-history.length).fill({status:'empty'}), ...history];
        return (
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:3}}>
                <div style={{display:'flex',gap:1.5}}>
                    {padded.map((h,i)=>(
                        <div key={i} style={{width:5,height:22,borderRadius:2,
                            background:h.status==='up'?'#10b981':h.status==='down'?'#ef4444':isDark?'#1b2535':'#e2e8f0',
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
      <div className={`perf-page-container ${localTheme}`}>
        <style>{`
          .perf-page-container {
            --primary: #7c3aed; --primary-hover: #6d28d9; --primary-rgb: 124, 58, 237;
            --success: #10b981; --success-rgb: 16, 185, 129; --danger: #f43f5e; --danger-rgb: 244, 63, 94;
            --warning: #f59e0b; --warning-rgb: 245, 158, 11; --info: #06b6d4;
            transition: background-color 0.3s ease; min-height: 100vh; position: relative; z-index: 1;
          }
          .perf-page-container.light {
            --bg-primary: #f8fafc; --bg-card: #ffffff; --bg-input: #f1f5f9; --border-color: rgba(226, 232, 240, 0.8);
            --text-main: #0f172a; --text-muted: #64748b; --text-muted-darker: #475569; --primary-glow: rgba(124, 58, 237, 0.04);
            --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
            --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
            --input-focus-shadow: rgba(124, 58, 237, 0.08);
          }
          .perf-page-container.dark {
            --bg-primary: #0b0f19; --bg-card: #131a26; --bg-input: #1b2535; --border-color: rgba(255, 255, 255, 0.07);
            --text-main: #f8fafc; --text-muted: #94a3b8; --text-muted-darker: #cbd5e1; --primary-glow: rgba(139, 92, 246, 0.1);
            --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
            --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
            --input-focus-shadow: rgba(139, 92, 246, 0.15);
          }
          body.charts-dark-theme { background-color: #0b0f19 !important; }
          body.charts-dark-theme .app-main, body.charts-dark-theme .content { background-color: #0b0f19 !important; transition: background-color 0.3s ease; }
          .perf-bg-glow-1 { position: absolute; top: -200px; right: 10%; width: 600px; height: 600px; background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0) 70%); pointer-events: none; z-index: 0; }
          .perf-page-container.dark .perf-bg-glow-1 { background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0) 70%); }
          .perf-bg-glow-2 { position: absolute; bottom: -150px; left: -50px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 70%); pointer-events: none; z-index: 0; }
          .perf-page-container.dark .perf-bg-glow-2 { background: radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0) 70%); }
          .perf-page-container .mon-layout { display: flex; gap: 24px; min-height: calc(100vh - 60px); position: relative; z-index: 10; }
          .perf-page-container .mon-main { flex: 1; padding: 0; min-width: 0; }
          .perf-page-container .mon-panel { width: 280px; flex-shrink: 0; background: var(--bg-card) !important; border-left: 1px solid var(--border-color) !important; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 0; box-shadow: var(--card-shadow); height: fit-content; box-sizing: border-box; transition: all 0.3s; }
          .perf-page-container .mon-panel:hover { border-color: rgba(var(--primary-rgb), 0.15) !important; }
          .perf-page-container .mon-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
          .perf-page-container .mon-title { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: var(--text-main) !important; letter-spacing: -0.8px; margin: 0; }
          .perf-page-container .mon-dot { color: var(--primary); }
          .perf-page-container .mon-sub { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: var(--text-muted); margin-top: 6px; }
          .perf-page-container .mon-btn-check { padding: 8px 18px; background: linear-gradient(135deg, #7c3aed, #6d28d9) !important; color: #fff !important; border: none !important; border-radius: 12px !important; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(124,58,237,0.2) !important; }
          .perf-page-container .mon-btn-check:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important; }
          .perf-page-container .mon-toolbar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
          .perf-page-container .mon-search-wrap { position: relative; flex: 1; min-width: 200px; }
          .perf-page-container .mon-search-wrap svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
          .perf-page-container .mon-search { width: 100%; padding: 9px 12px 9px 36px; border: 1.5px solid var(--border-color) !important; border-radius: 12px; background: var(--bg-input) !important; color: var(--text-main) !important; font-size: 13px; font-weight: 600; outline: none; box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.2s; }
          .perf-page-container .mon-search:focus { border-color: var(--primary) !important; background: var(--bg-card) !important; box-shadow: 0 0 0 4px var(--input-focus-shadow) !important; }
          .perf-page-container .mon-filter-tabs { display: flex; gap: 4px; background: var(--bg-input) !important; border: 1px solid var(--border-color) !important; border-radius: 12px; padding: 4px; }
          .perf-page-container .mon-filter-tab { padding: 6px 14px; border: none !important; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; background: transparent !important; color: var(--text-muted) !important; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
          .perf-page-container .mon-filter-tab:hover { color: var(--text-main) !important; }
          .perf-page-container .mon-filter-tab.active-all { background: var(--bg-card) !important; color: var(--primary) !important; box-shadow: var(--card-shadow) !important; }
          .perf-page-container .mon-tab-count { background: var(--bg-card) !important; color: var(--text-muted-darker) !important; padding: 2px 7px; border-radius: 8px; font-size: 11px; font-weight: 700; }
          .perf-page-container .mon-list { display: flex; flex-direction: column; gap: 12px; }
          .perf-page-container .mon-row { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 20px; background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--card-shadow); }
          .perf-page-container .mon-row:hover { transform: translateY(-2px); box-shadow: var(--card-hover-shadow); border-color: rgba(var(--primary-rgb), 0.15) !important; }
          .perf-page-container .mon-row-down { border-left: 4px solid var(--danger) !important; }
          .perf-page-container .mon-row-up { border-left: 4px solid var(--success) !important; }
          .perf-page-container .mon-row-unknown { border-left: 4px solid var(--warning) !important; }
          .perf-page-container .mon-site-name { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 15px; color: var(--text-main) !important; }
          .perf-page-container .mon-site-meta { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text-muted); margin-top: 4px; }
          .perf-page-container .mon-proto { background: var(--bg-input) !important; color: var(--text-muted-darker) !important; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
          .perf-page-container .mon-resp { font-family: 'Outfit', sans-serif; font-weight: 700; background: var(--bg-input) !important; padding: 2px 8px; border-radius: 6px; }
          .perf-page-container .mon-time { color: var(--text-muted); background: var(--bg-input) !important; padding: 2px 8px; border-radius: 6px; }
          .perf-page-container .mon-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); font-size: 14px; font-weight: 500; background: var(--bg-input); border-radius: 18px; border: 1px dashed var(--border-color); margin: 10px 0; }
          .perf-page-container .mon-panel-section { padding: 20px 0; border-bottom: 1px solid var(--border-color); }
          .perf-page-container .mon-panel-section:last-child { border-bottom: none; }
          .perf-page-container .mon-panel-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 700; color: var(--text-main) !important; margin-bottom: 14px; }
          .perf-page-container .mon-count-down { background: rgba(244, 63, 94, 0.08) !important; color: var(--danger) !important; border: 1px solid rgba(244, 63, 94, 0.15) !important; transition: all 0.2s; }
          .perf-page-container .mon-count-up { background: rgba(16, 185, 129, 0.08) !important; color: var(--success) !important; border: 1px solid rgba(16, 185, 129, 0.15) !important; transition: all 0.2s; }
          .perf-page-container .mon-count-unknown { background: rgba(245, 158, 11, 0.08) !important; color: var(--warning) !important; border: 1px solid rgba(245, 158, 11, 0.15) !important; transition: all 0.2s; }
          .perf-page-container .mon-count-num { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; }
          .perf-page-container .mon-count-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 4px; }
          .perf-page-container .mon-panel-total { font-size: 12px; font-weight: 700; color: var(--text-muted); margin-top: 14px; text-align: center; }
          .perf-page-container .mon-uptime-val { font-family: 'Outfit', sans-serif; font-size: 24px; font-weight: 800; }
          .perf-page-container .mon-uptime-label { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-top: 4px; }
          .perf-page-container .mon-panel-uptime { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: center; }
          @media (max-width: 900px) {
            .perf-page-container .mon-layout { flex-direction: column !important; gap: 20px; }
            .perf-page-container .mon-panel { width: 100% !important; border-left: none !important; border-top: 1px solid var(--border-color) !important; margin-top: 10px; }
            .perf-page-container .mon-header { flex-direction: column; align-items: flex-start; gap: 16px; }
          }
          @media (max-width: 600px) {
            .perf-page-container .mon-toolbar { flex-direction: column; align-items: stretch; }
            .perf-page-container .mon-filter-tabs { width: 100%; justify-content: space-around; }
            .perf-page-container .mon-row { flex-direction: column; align-items: flex-start; gap: 12px; }
            .perf-page-container .mon-bar-wrap { width: 100%; align-self: stretch; }
            .perf-page-container .mon-bar-wrap > div { align-items: flex-start !important; }
          }
        `}</style>

        <div className="perf-bg-glow-1" />
        <div className="perf-bg-glow-2" />

        <ConfirmDialog />

        {pingIvTip && pingInterval && (() => {
            const ivLabel = pingInterval >= 60 ? `${pingInterval / 60} min` : `${pingInterval}s`;
            let body = null;
            if (userPlan === 'free_trial' || userPlan === 'bronze') {
                body = <>We recommend to use at least <strong style={{color:'#fff'}}>1-minute checks</strong> available in <strong style={{color:'#818cf8'}}>paid plans</strong> to spot incident 5x faster.</>;
            } else if (userPlan === 'silver') {
                body = <>Upgrade to <strong style={{color:'#fff'}}>Gold plan</strong> for <strong style={{color:'#818cf8'}}>30-second checks</strong> to spot incidents 2x faster.</>;
            } else {
                body = <><strong style={{color:'#4ade80'}}>✓ Fastest interval</strong> — you're on the Gold plan with 30-second checks.</>;
            }
            return (
                <div style={{ position:'fixed', top: pingIvTip.top, left: pingIvTip.left, transform:'translateX(-50%)', zIndex:99999, pointerEvents:'none' }}>
                    <div style={{ background:'#1e293b', borderRadius:10, padding:'12px 16px', width:260, boxShadow:'0 16px 40px rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ position:'absolute', top:-6, left:'50%', marginLeft:-5, width:10, height:10, background:'#1e293b', border:'1px solid rgba(255,255,255,0.08)', borderBottom:'none', borderRight:'none', transform:'rotate(45deg)' }} />
                        <div style={{ fontSize:13, fontWeight:700, color:'#f8fafc', marginBottom:6 }}>Checked every {ivLabel}</div>
                        <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>{body}</div>
                    </div>
                </div>
            );
        })()}

        <div className="mon-layout" style={{ padding: '0 4px' }}>
            <div className="mon-main">
                <div className="mon-header">
                    <div>
                        <h1 className="mon-title">UDP Monitoring <span className="mon-dot">.</span></h1>
                        <p className="mon-sub">Monitor UDP services on your server. Useful for DNS, SNMP and other services that accept and respond to UDP data.</p>
                    </div>
                    <button onClick={() => {
                        if (pingLimit !== null && targets.length >= pingLimit) {
                            setLimitError(`UDP target limit reached (${pingLimit}/${pingLimit}). Upgrade your plan to add more.`);
                            return;
                        }
                        setLimitError('');
                        setAddModal(true);
                    }} className="mon-btn-check">+ Add Target</button>
                </div>

                {limitError && (
                    <div style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:10, padding:'12px 18px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:18 }}>⚠️</span>
                            <span style={{ fontSize:14, fontWeight:600, color:'var(--danger)' }}>{limitError}</span>
                        </div>
                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                            <a href="/pay?plan=select" style={{ padding:'7px 18px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>
                                ⬆️ Upgrade Plan
                            </a>
                            <button onClick={() => setLimitError('')} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18 }}>✕</button>
                        </div>
                    </div>
                )}

                <div className="mon-toolbar">
                    <div className="mon-search-wrap">
                        <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search targets..." className="mon-search" />
                    </div>
                    <div className="mon-filter-tabs">
                        {[['all','All',targets.length],['up','Online',up],['down','Offline',down]].map(([v,l,c])=>(
                            <button key={v} className={`mon-filter-tab ${search===''&&v==='all'?'active-all':''}`}
                                onClick={()=>setSearch('')}>{l} <span className="mon-tab-count">{c}</span></button>
                        ))}
                    </div>
                </div>

                <div className="mon-list" style={{maxHeight:'calc(10 * 68px)', overflowY:'auto'}}>
                    {pageLoading ? (
                        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 0',gap:14}}>
                            <div style={{width:44,height:44,borderRadius:'50%',border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
                            <div style={{fontSize:13,color:'var(--text-muted)',fontWeight:500}}>Loading targets...</div>
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="mon-empty">
                            <div style={{width:64,height:64,borderRadius:16,background:'rgba(34,197,94,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                                    <path d="M10 10l-2 2 2 2M14 10l2 2-2 2" />
                                </svg>
                            </div>
                            <div style={{fontWeight:700,color:'var(--text-muted)'}}>No targets yet</div>
                            <div style={{fontSize:13,color:'var(--text-muted)',marginTop:4}}>Click + Add Target to start monitoring</div>
                        </div>
                    ) : filtered.map(t => (
                        <div key={t._id} className={`mon-row mon-row-${t.status}`} onClick={()=>setSelected(t)}>
                            <PulseDot status={t.active?t.status:'unknown'} size={12} />
                            <div className="mon-site-info">
                                <div className="mon-site-name">{t.name}</div>
                                <div className="mon-site-meta">
                                    <span className="mon-proto">UDP</span>
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
                            {pingInterval && (
                                <span
                                    ref={pingIvRef}
                                    onClick={e => e.stopPropagation()}
                                    onMouseEnter={e => { e.stopPropagation(); const r = pingIvRef.current?.getBoundingClientRect(); if (r) setPingIvTip({ top: r.bottom + 8, left: r.left + r.width / 2 }); }}
                                    onMouseLeave={() => setPingIvTip(null)}
                                    style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, color: isDark ? '#64748b' : '#94a3b8', fontWeight:500, flexShrink:0, minWidth:52, cursor:'default' }}
                                >
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.06-5.96"/></svg>
                                    {pingInterval >= 60 ? `${pingInterval / 60} min` : `${pingInterval}s`}
                                </span>
                            )}
                            <div className="mon-bar-wrap">
                                <UptimeBar history={t.history?.slice(-30)||[]} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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
                        <div style={{flex:1,background:'var(--bg-input)',borderRadius:10,padding:12,textAlign:'center',border:'1px solid var(--border-color)'}}>
                            <div className="mon-uptime-val" style={{color:avgResp<100?'#10b981':avgResp<300?'#f59e0b':'#ef4444'}}>{avgResp?`${avgResp}ms`:'—'}</div>
                            <div className="mon-uptime-label">Avg latency</div>
                        </div>
                    </div>
                </div>
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Breakdown</div>
                    {[{l:'Up',c:up,color:'#10b981'},{l:'Down',c:down,color:'#ef4444'}].map(item=>(
                        <div key={item.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                            <div style={{flex:1,height:6,background:'var(--bg-input)',borderRadius:4,overflow:'hidden'}}>
                                <div style={{width:`${targets.length?Math.round(item.c/targets.length*100):0}%`,height:'100%',background:item.color,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,color:item.color,fontWeight:700,minWidth:20,textAlign:'right'}}>{item.c}</span>
                            <span style={{fontSize:11,color:'var(--text-muted)',minWidth:36}}>{item.l}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

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
      </div>
    );
}
