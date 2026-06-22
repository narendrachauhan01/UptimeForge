let _loaded_ApiMonitor = false;
import { useConfirm } from '../components/ConfirmDialog';
import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_URL } from '../api';
import axios from 'axios';

const latColor = ms => !ms ? '#94a3b8' : ms < 300 ? '#10b981' : ms < 1000 ? '#f59e0b' : '#ef4444';

const HTTP_METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD'];
const COMPARISON_OPTIONS = [
    { value: 'equals',       label: 'Equals' },
    { value: 'not_equals',   label: 'Not Equals' },
    { value: 'contains',     label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than',    label: 'Less Than' },
    { value: 'exists',       label: 'Exists' },
    { value: 'not_exists',   label: 'Not Exists' },
];
const IP_VERSION_OPTIONS = [
    { value: 'ipv4_priority', label: 'IPv4 / IPv6 (IPv4 Priority)', desc: "Default uses IPv4 first, then IPv6 only if IPv4 isn't available." },
    { value: 'ipv6_priority', label: 'IPv4 / IPv6 (IPv6 Priority)', desc: "Uses IPv6 first, then IPv4 only if IPv6 isn't available." },
    { value: 'ipv4_only',     label: 'IPv4 only',                  desc: 'Only connects over IPv4 — marked DOWN if no IPv4 address exists.' },
    { value: 'ipv6_only',     label: 'IPv6 only',                  desc: 'Only connects over IPv6 — marked DOWN if no IPv6 address exists.' },
];
const STATUS_CODE_CHIPS = ['2xx','3xx','4xx','5xx'];

// ── Small toggle switch ───────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
    return (
        <button type="button" onClick={() => onChange(!checked)}
            style={{ width:40, height:22, borderRadius:12, border:'none', cursor:'pointer', position:'relative', background: checked ? '#7c3aed' : 'var(--bg-input)', transition:'background 0.2s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:3, left: checked ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left 0.2s cubic-bezier(0.4,0,0.2,1)', boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }} />
        </button>
    );
}

// ── Custom dropdown (generic) ─────────────────────────────────────────────────
function Dropdown({ value, options, onChange, render, width }) {
    const [open, setOpen] = useState(false);
    const selected = options.find(o => (o.value ?? o) === value);
    return (
        <div style={{ position:'relative', width: width || '100%' }}>
            <button type="button" onClick={() => setOpen(p => !p)}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border-color)', borderRadius:9, fontSize:14, background:'var(--bg-input)', color:'var(--text-main)', outline:'none', boxSizing:'border-box', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                <span>{render ? render(selected) : (selected?.label ?? selected ?? '')}</span>
                <svg width="13" height="13" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'transform 0.15s', flexShrink:0 }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:19 }} />
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:9, boxShadow:'var(--card-shadow)', overflow:'hidden', zIndex:20, maxHeight:240, overflowY:'auto' }}>
                        {options.map(o => {
                            const v = o.value ?? o;
                            const isSel = v === value;
                            return (
                                <div key={v}
                                    onClick={() => { onChange(v); setOpen(false); }}
                                    style={{ padding:'10px 14px', fontSize:13, fontWeight: isSel ? 700 : 500, color: isSel ? 'var(--primary)' : 'var(--text-main)', background: isSel ? 'var(--primary-glow)' : 'transparent', cursor:'pointer', borderBottom:'1px solid var(--border-color)' }}
                                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-input)'; }}
                                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                                    {o.label ?? o}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

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

const DEFAULT_FORM = {
    name:'', url:'', httpMethod:'GET', requestHeaders:[], requestBody:'',
    assertions:[], assertionLogic:'AND',
    timeout:30, ipVersion:'ipv4_priority', followRedirects:true, upStatusCodes:['2xx','3xx'],
    slowResponseAlert:false, slowResponseThreshold:'',
};

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function TargetModal({ target, onClose, onSave }) {
    const [form,         setForm]         = useState(target ? { ...DEFAULT_FORM, ...target } : { ...DEFAULT_FORM });
    const [saving,       setSaving]       = useState(false);
    const [saveError,    setSaveError]    = useState('');
    const [recipients,   setRecipients]   = useState([]);
    const [selected,     setSelected]     = useState([]);
    const [rSearch,      setRSearch]      = useState('');
    const [loadingR,     setLoadingR]     = useState(true);
    const [integrations, setIntegrations] = useState([]);
    const [showRequestDetails, setShowRequestDetails] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

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
        if (!form.name.trim() || !form.url.trim()) return;
        setSaving(true);
        setSaveError('');
        try {
            const payload = {
                ...form,
                requestHeaders: form.requestHeaders.filter(h => h.key),
                assertions: form.assertions.filter(a => a.property),
                slowResponseThreshold: form.slowResponseAlert ? Number(form.slowResponseThreshold) || null : null,
                notifyRecipients: selected,
            };
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

    const addHeader = () => setForm(f => ({ ...f, requestHeaders: [...f.requestHeaders, { key:'', value:'' }] }));
    const updateHeader = (i, field, val) => setForm(f => ({ ...f, requestHeaders: f.requestHeaders.map((h,idx) => idx===i ? { ...h, [field]: val } : h) }));
    const removeHeader = (i) => setForm(f => ({ ...f, requestHeaders: f.requestHeaders.filter((_,idx) => idx!==i) }));

    const addAssertion = () => setForm(f => ({ ...f, assertions: [...f.assertions, { property:'', comparison:'equals', target:'' }] }));
    const updateAssertion = (i, field, val) => setForm(f => ({ ...f, assertions: f.assertions.map((a,idx) => idx===i ? { ...a, [field]: val } : a) }));
    const removeAssertion = (i) => setForm(f => ({ ...f, assertions: f.assertions.filter((_,idx) => idx!==i) }));

    const toggleStatusChip = (chip) => setForm(f => ({ ...f, upStatusCodes: f.upStatusCodes.includes(chip) ? f.upStatusCodes.filter(c=>c!==chip) : [...f.upStatusCodes, chip] }));

    const inputStyle = { width:'100%', padding:'10px 14px', border:'1.5px solid var(--border-color)', borderRadius:9, fontSize:14, background:'var(--bg-input)', color:'var(--text-main)', outline:'none', boxSizing:'border-box' };
    const labelStyle = { fontSize:12, fontWeight:700, color:'var(--text-main)', display:'block', marginBottom:6 };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <style>{`
                .api-modal-scroll::-webkit-scrollbar { width: 7px; }
                .api-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .api-modal-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 10px; }
                .api-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(124,58,237,0.55); }
            `}</style>
            <div className="api-modal-scroll" style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:20, width:'100%', maxWidth:680, padding:'32px 36px', boxShadow:'var(--card-shadow)', position:'relative', maxHeight:'92vh', overflowY:'auto' }}>
                <button onClick={onClose} style={{ position:'absolute', top:18, right:18, background:'var(--bg-input)', border:'1px solid var(--border-color)', color:'var(--text-main)', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:15 }}>✕</button>
                <h2 style={{ color:'var(--text-main)', margin:'0 0 24px', fontSize:20, fontWeight:800 }}>
                    {target ? '✏️ Edit Target' : '➕ Add API Monitoring Target'}
                </h2>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label style={labelStyle}>Name *</label>
                        <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="My API Health Check"
                            style={inputStyle} autoFocus />
                    </div>
                    <div>
                        <label style={labelStyle}>URL to monitor *</label>
                        <div style={{ display:'flex', gap:10 }}>
                            <Dropdown value={form.httpMethod} options={HTTP_METHODS} onChange={v=>setForm({...form, httpMethod:v})} width={110} />
                            <input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://api.example.com/health"
                                style={{ ...inputStyle, flex:1 }} />
                        </div>
                    </div>
                </div>

                {/* Request details (collapsible) */}
                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-color)' }}>
                    <button type="button" onClick={() => setShowRequestDetails(p => !p)}
                        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, fontWeight:800, color:'var(--text-main)' }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: showRequestDetails ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
                        Request details
                    </button>
                    {showRequestDetails && (
                        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:14 }}>
                            <div>
                                <label style={labelStyle}>Headers</label>
                                {form.requestHeaders.map((h, i) => (
                                    <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                                        <input value={h.key} onChange={e=>updateHeader(i,'key',e.target.value)} placeholder="Header name" style={{ ...inputStyle, flex:1 }} />
                                        <input value={h.value} onChange={e=>updateHeader(i,'value',e.target.value)} placeholder="Value" style={{ ...inputStyle, flex:1 }} />
                                        <button type="button" onClick={()=>removeHeader(i)} style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:9, color:'var(--danger)', width:38, cursor:'pointer', flexShrink:0 }}>✕</button>
                                    </div>
                                ))}
                                <button type="button" onClick={addHeader} style={{ fontSize:12, fontWeight:700, color:'var(--primary)', background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>+ Add header</button>
                            </div>
                            {['POST','PUT','PATCH'].includes(form.httpMethod) && (
                                <div>
                                    <label style={labelStyle}>Body</label>
                                    <textarea value={form.requestBody} onChange={e=>setForm({...form,requestBody:e.target.value})} placeholder='{"key": "value"}' rows={4}
                                        style={{ ...inputStyle, fontFamily:'monospace', resize:'vertical' }} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Assertions */}
                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-color)' }}>
                    <div style={{ fontSize:13, fontWeight:800, color:'var(--text-main)', marginBottom:4 }}>Assertions</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
                        Check JSON response body fields using JSONPath (e.g. $.data.status, $.items[0].id).
                    </div>
                    {form.assertions.map((a, i) => (
                        <div key={i} style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr 1fr auto', gap:8, marginBottom:8, alignItems:'start' }}>
                            <input value={a.property} onChange={e=>updateAssertion(i,'property',e.target.value)} placeholder="$.data.status" style={{ ...inputStyle, fontFamily:'monospace', fontSize:13 }} />
                            <Dropdown value={a.comparison} options={COMPARISON_OPTIONS} onChange={v=>updateAssertion(i,'comparison',v)} />
                            <input value={a.target} onChange={e=>updateAssertion(i,'target',e.target.value)} placeholder="up" style={inputStyle} disabled={['exists','not_exists'].includes(a.comparison)} />
                            <button type="button" onClick={()=>removeAssertion(i)} style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.15)', borderRadius:9, color:'var(--danger)', width:38, height:42, cursor:'pointer' }}>✕</button>
                        </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
                        <button type="button" onClick={addAssertion} style={{ fontSize:12, fontWeight:700, color:'var(--primary)', background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>+ Add assertion</button>
                        {form.assertions.length > 1 && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-muted)' }}>
                                Monitor is up if
                                <Dropdown value={form.assertionLogic} options={[{value:'AND',label:'ALL (AND)'},{value:'OR',label:'ANY (OR)'}]} onChange={v=>setForm({...form,assertionLogic:v})} width={130} />
                                pass
                            </div>
                        )}
                    </div>
                </div>

                {/* Advanced Settings (collapsible) */}
                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-color)' }}>
                    <button type="button" onClick={() => setShowAdvanced(p => !p)}
                        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, fontWeight:800, color:'var(--text-main)' }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition:'transform 0.15s' }}><polyline points="9 18 15 12 9 6"/></svg>
                        ⚙️ Advanced Settings
                    </button>
                    {showAdvanced && (
                        <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:14 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                                <div>
                                    <label style={labelStyle}>Request timeout (s)</label>
                                    <input type="number" min="1" max="120" value={form.timeout} onChange={e=>setForm({...form,timeout: e.target.value===''?'':Number(e.target.value)})} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Internet Protocol version</label>
                                    <Dropdown value={form.ipVersion} options={IP_VERSION_OPTIONS} onChange={v=>setForm({...form,ipVersion:v})} />
                                </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <div>
                                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-main)' }}>Follow redirections</div>
                                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>If disabled, we return redirection HTTP codes (3xx) as-is.</div>
                                </div>
                                <Toggle checked={form.followRedirects} onChange={v=>setForm({...form,followRedirects:v})} />
                            </div>
                            <div>
                                <label style={labelStyle}>Up HTTP status codes</label>
                                <div style={{ display:'flex', gap:8 }}>
                                    {STATUS_CODE_CHIPS.map(c => {
                                        const active = form.upStatusCodes.includes(c);
                                        return (
                                            <button key={c} type="button" onClick={()=>toggleStatusChip(c)}
                                                style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', border:`1px solid ${active?'rgba(16,185,129,0.3)':'var(--border-color)'}`, background: active ? 'rgba(16,185,129,0.1)' : 'var(--bg-input)', color: active ? 'var(--success)' : 'var(--text-muted)' }}>
                                                {c}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                                <div>
                                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text-main)' }}>Slow response time alert</div>
                                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Notify if response time exceeds your threshold.</div>
                                </div>
                                <Toggle checked={form.slowResponseAlert} onChange={v=>setForm({...form,slowResponseAlert:v})} />
                            </div>
                            {form.slowResponseAlert && (
                                <input type="number" min="1" value={form.slowResponseThreshold} onChange={e=>setForm({...form,slowResponseThreshold:e.target.value})} placeholder="Threshold in milliseconds" style={inputStyle} />
                            )}
                        </div>
                    )}
                </div>

                {/* Recipients */}
                <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--border-color)' }}>
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
                    <button onClick={save} disabled={saving || !form.name || !form.url}
                        style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(saving||!form.name||!form.url)?0.6:1, boxShadow:'0 2px 8px rgba(124,58,237,0.2)' }}>
                        {saving ? 'Saving...' : target ? 'Save Changes' : 'Add Target'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ target, onClose, onDelete, onToggle, onEdit }) {
    const [lines,    setLines]    = useState([]);
    const [testing,  setTesting]  = useState(false);
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

    const testNow = async () => {
        setTesting(true);
        addLine(`${target.httpMethod || 'GET'} ${target.url}`, '#60a5fa');
        addLine('─'.repeat(42), '#1e2d3d');
        try {
            const r = await axios.post(`${API_URL}/api/api-monitor/test`, {
                url: target.url, httpMethod: target.httpMethod, requestHeaders: target.requestHeaders, requestBody: target.requestBody,
                assertions: target.assertions, assertionLogic: target.assertionLogic, timeout: target.timeout,
                ipVersion: target.ipVersion, followRedirects: target.followRedirects, upStatusCodes: target.upStatusCodes,
            }, { withCredentials: true });
            addLine(`HTTP ${r.data.statusCode || 0}  time=${r.data.ms ?? '—'}ms`, r.data.alive ? '#4ade80' : '#f87171');
            (r.data.assertionResults || []).forEach(a => {
                addLine(`${a.pass ? '✓' : '✗'} ${a.property} ${a.comparison} ${a.target}`, a.pass ? '#4ade80' : '#f87171');
            });
            if (!r.data.assertionResults?.length && r.data.alive) addLine('No assertions configured — status code check passed', '#94a3b8');
        } catch { addLine(`Error requesting ${target.url}`, '#f87171'); }
        setTesting(false);
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
                            <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'monospace' }}>{target.httpMethod || 'GET'} {target.url}</div>
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
                            { l:'Status',    v: target.status==='up'?'Passing':target.status==='down'?'Failing':'Unknown', c:statColor },
                            { l:'HTTP Code', v: target.lastStatusCode || '—', c: target.lastStatusCode>=200 && target.lastStatusCode<400 ? '#10b981' : '#ef4444' },
                            { l:'Latency',   v: target.responseTime?`${target.responseTime}ms`:'—', c:latColor(target.responseTime) },
                            { l:'Uptime',    v: `${upPct}%`, c:'#10b981' },
                        ].map(s => (
                            <div key={s.l} style={{ background:'var(--bg-input)', borderRadius:12, padding:'12px 14px', border:'1px solid var(--border-color)', textAlign:'center' }}>
                                <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', marginBottom:4 }}>{s.l}</div>
                                <div style={{ fontSize:16, fontWeight:800, color:s.c }}>{s.v}</div>
                            </div>
                        ))}
                    </div>

                    {target.assertions?.length > 0 && (
                        <div style={{ background:'var(--bg-input)', borderRadius:14, border:'1px solid var(--border-color)', padding:'14px 16px' }}>
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Assertions ({target.assertionLogic || 'AND'})</div>
                            {target.assertions.map((a,i) => (
                                <div key={i} style={{ fontFamily:'monospace', fontSize:12, color:'var(--text-main)', padding:'4px 0' }}>{a.property} {a.comparison} {a.target}</div>
                            ))}
                        </div>
                    )}

                    <div style={{ background:'var(--bg-input)', borderRadius:14, border:'1px solid var(--border-color)', padding:'14px 16px' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:'var(--text-main)', marginBottom:10 }}>📈 Response Time — Last 48 checks</div>
                        {chartData.length > 1 ? (
                            <ResponsiveContainer width="100%" height={150}>
                                <AreaChart data={chartData} margin={{top:5,right:10,left:8,bottom:0}}>
                                    <defs><linearGradient id="apiGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2}/><stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'} vertical={false}/>
                                    <XAxis dataKey="time" tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} interval={Math.floor(chartData.length/5)||1} tickLine={false} axisLine={false}/>
                                    <YAxis type="number" domain={[0, 'auto']} allowDecimals={false} tickFormatter={(v)=>`${Math.round(v)}ms`} tick={{fontSize:10,fill: isDark ? '#94a3b8' : '#64748b', fontWeight: 600}} tickLine={false} axisLine={false} width={42}/>
                                    <Tooltip contentStyle={{borderRadius:12,fontSize:12,background: isDark ? '#1e293b' : '#ffffff', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)'}} formatter={v=>[`${v}ms`,'Latency']}/>
                                    <Area type="monotone" dataKey="ms" stroke="var(--primary)" strokeWidth={2.5} fill="url(#apiGrad)" dot={false}/>
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
                            <span style={{ flex:1, fontFamily:'monospace', fontSize:12, color:'#8b949e' }}>{target.httpMethod || 'GET'} {target.url}</span>
                            <div style={{ display:'flex', gap:6 }}>
                                <button onClick={() => setLines([])} style={{ padding:'3px 10px', background:'#21262d', border:'1px solid #30363d', borderRadius:6, color:'#8b949e', fontSize:11, cursor:'pointer' }}>Clear</button>
                                <button onClick={testNow} disabled={testing} style={{ padding:'3px 12px', background:'#238636', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', opacity:testing?0.6:1 }}>
                                    {testing ? '...' : '▶ Test Request'}
                                </button>
                            </div>
                        </div>
                        <div ref={termRef} style={{ height:180, overflowY:'auto', padding:'10px 14px', fontFamily:'monospace', fontSize:12, lineHeight:1.75 }}>
                            {lines.length===0 && <div style={{ color:'#4d5566' }}>Press ▶ Test Request to send a live request and check assertions...</div>}
                            {lines.map(l => <div key={l.id} style={{ color:l.color }}>{l.text}</div>)}
                        </div>
                    </div>

                    <div style={{ background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:12, padding:'12px 16px', fontSize:13, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:20 }}>🔔</span>
                        <div>
                            <strong style={{ color:'var(--primary)' }}>Alerts active</strong> — When this target fails (HTTP status or assertion) or recovers, selected recipients will be notified via Email &amp; WhatsApp. Webhooks also fire automatically.
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
export default function ApiMonitorPage() {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [targets,     setTargets]     = useState([]);
    const [search,      setSearch]      = useState('');
    const [selected,    setSelected]    = useState(null);
    const [addModal,    setAddModal]    = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);
    const [pageLoading, setPageLoading] = useState(!_loaded_ApiMonitor);
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
        axios.get(`${API_URL}/api/api-targets`, { withCredentials: true })
            .then(r=>{ setTargets(r.data); setPageLoading(false); _loaded_ApiMonitor = true; })
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
        await axios.post(`${API_URL}/api/api-targets`, form, { withCredentials: true });
        load();
    };
    const editTargetSave = async (form) => {
        const r = await axios.put(`${API_URL}/api/api-targets/${editTarget._id}`, form, { withCredentials: true });
        setEditTarget(null);
        load();
        return r;
    };
    const deleteTarget = async (id) => {
        const _ok1 = await confirm('Delete this target?', { title:'Delete Target', confirmText:'Delete', danger:true }); if (!_ok1) return;
        await axios.delete(`${API_URL}/api/api-targets/${id}`, { withCredentials: true });
        setSelected(null); load();
    };
    const toggleTarget = async (t) => {
        await axios.put(`${API_URL}/api/api-targets/${t._id}`, { active:!t.active }, { withCredentials: true });
        load();
    };

    const filtered = targets.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.url.includes(search));
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
                        <h1 className="mon-title">API Monitoring <span className="mon-dot">.</span></h1>
                        <p className="mon-sub">Validate API responses with JSON assertions.</p>
                    </div>
                    <button onClick={() => {
                        if (pingLimit !== null && targets.length >= pingLimit) {
                            setLimitError(`API target limit reached (${pingLimit}/${pingLimit}). Upgrade your plan to add more.`);
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
                        {[['all','All',targets.length],['up','Passing',up],['down','Failing',down]].map(([v,l,c])=>(
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
                                    <rect x="3" y="4" width="13" height="9" rx="2"/>
                                    <line x1="6" y1="7" x2="6" y2="7"/>
                                    <line x1="9" y1="7" x2="9" y2="7"/>
                                    <line x1="12" y1="7" x2="12" y2="7"/>
                                    <path d="M19 9a4 4 0 0 1 0 8h-1"/>
                                    <path d="M5 13v3a3 3 0 0 0 3 3h6"/>
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
                                    <span className="mon-proto">{t.httpMethod || 'GET'}</span>
                                    <span className="mon-sep">·</span>
                                    <span className={`mon-status-txt mon-status-${t.status}`}>
                                        {t.status==='up'?'Passing':t.status==='down'?'Failing':'Unknown'}
                                    </span>
                                    <span className="mon-sep">·</span>
                                    <span className="mon-time" style={{fontFamily:'monospace',fontSize:11,maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',display:'inline-block',whiteSpace:'nowrap'}}>{t.url}</span>
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
                        <div className="mon-count-item mon-count-down"><div className="mon-count-num">{down}</div><div className="mon-count-label">Failing</div></div>
                        <div className="mon-count-item mon-count-up"><div className="mon-count-num">{up}</div><div className="mon-count-label">Passing</div></div>
                        <div className="mon-count-item mon-count-unknown"><div className="mon-count-num">{targets.filter(t=>t.status==='unknown').length}</div><div className="mon-count-label">Unknown</div></div>
                    </div>
                    <div className="mon-panel-total">Monitoring {targets.length} targets</div>
                </div>
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Response</div>
                    <div className="mon-panel-uptime">
                        <div style={{flex:1,background:'var(--bg-input)',borderRadius:10,padding:12,textAlign:'center',border:'1px solid var(--border-color)'}}>
                            <div className="mon-uptime-val" style={{color:avgResp<300?'#10b981':avgResp<1000?'#f59e0b':'#ef4444'}}>{avgResp?`${avgResp}ms`:'—'}</div>
                            <div className="mon-uptime-label">Avg latency</div>
                        </div>
                    </div>
                </div>
                <div className="mon-panel-section">
                    <div className="mon-panel-title">Breakdown</div>
                    {[{l:'Passing',c:up,color:'#10b981'},{l:'Failing',c:down,color:'#ef4444'}].map(item=>(
                        <div key={item.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                            <div style={{flex:1,height:6,background:'var(--bg-input)',borderRadius:4,overflow:'hidden'}}>
                                <div style={{width:`${targets.length?Math.round(item.c/targets.length*100):0}%`,height:'100%',background:item.color,borderRadius:4}}/>
                            </div>
                            <span style={{fontSize:12,color:item.color,fontWeight:700,minWidth:20,textAlign:'right'}}>{item.c}</span>
                            <span style={{fontSize:11,color:'var(--text-muted)',minWidth:48}}>{item.l}</span>
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
