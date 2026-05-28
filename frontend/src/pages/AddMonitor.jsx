import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { addServer, getPlans, getRecipients, API_URL } from '../api';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

export default function AddMonitor() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', url: 'https://', timeout: 10, followRedirects: true, httpMethod: 'GET', upCodes: [200, 301, 302] });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [planInterval, setPlanInterval] = useState(null);
    const [plan, setPlan] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [recipientLimit, setRecipientLimit] = useState(null);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [allRecipients, setAllRecipients] = useState(false); // default: no pre-selection

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('sm_user') || '{}');
        const p = user?.plan || 'free_trial';
        setPlan(p);
        getPlans().then(r => {
            const s = r.data;
            const iv = p === 'free_trial' ? (s.freeTrialInterval || 300) : (s.plans?.[p]?.interval || 60);
            setPlanInterval(iv);
        }).catch(() => {});
        getRecipients().then(r => {
            const data = r.data.recipients ?? r.data;
            if (r.data.limit !== undefined) setRecipientLimit({ limit: r.data.limit, count: r.data.count });
            setRecipients(data);
        }).catch(() => {});
    }, []);

    const intervalLabel = planInterval
        ? planInterval >= 60 ? `${planInterval / 60} minute${planInterval / 60 > 1 ? 's' : ''}` : `${planInterval} seconds`
        : '...';

    const toggleRecipient = (id) => {
        setSelectedRecipients(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) { setError('Site name is required'); return; }
        if (!form.url.trim() || form.url === 'https://') { setError('URL is required'); return; }
        setSaving(true);
        try {
            const serverRes = await addServer(form);
            const serverId = serverRes.data._id;

            // If specific recipients selected, assign this server to them
            if (!allRecipients && selectedRecipients.length > 0) {
                await Promise.all(selectedRecipients.map(rid => {
                    const rec = recipients.find(r => r._id === rid);
                    if (!rec) return Promise.resolve();
                    const servers = [...(rec.servers?.map(s => s._id || s) || []), serverId];
                    return axios.put(`${API_URL}/api/recipients/${rid}`, { servers }, { headers: authHeaders() });
                }));
            }

            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add monitor');
        }
        setSaving(false);
    };

    return (
        <div className="am-page">
            <div className="am-topbar">
                <button className="am-back" onClick={() => navigate('/dashboard')}>← Monitoring</button>
            </div>

            <div className="am-wrap">
                <h1 className="am-title">Add single monitor <span style={{color:'#7c3aed'}}>.</span></h1>

                <form onSubmit={handleSubmit}>

                    {/* Monitor type */}
                    <div className="am-section">
                        <div className="am-section-label">Monitor type</div>
                        <div className="am-type-box">
                            <span style={{background:'#10b981',color:'#fff',padding:'5px 8px',borderRadius:5,fontSize:11,fontWeight:800,fontFamily:'monospace',flexShrink:0}}>HTTP</span>
                            <div>
                                <div className="am-type-name">HTTP / website monitoring</div>
                                <div className="am-type-desc">Monitor your website, API endpoint, or anything running on HTTP(S).</div>
                            </div>
                        </div>
                    </div>

                    {/* Friendly name */}
                    <div className="am-section">
                        <div className="am-section-label">Friendly name</div>
                        <input className="am-input" type="text" placeholder="e.g. My Website"
                            value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
                    </div>

                    {/* URL */}
                    <div className="am-section">
                        <div className="am-section-label">URL to monitor</div>
                        <input className="am-input" type="url" placeholder="https://yoursite.com"
                            value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
                    </div>

                    {/* Recipients */}
                    <div className="am-section">
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                            <div className="am-section-label" style={{marginBottom:0}}>Who will we notify?</div>
                            {recipientLimit && (
                                <span style={{fontSize:12, color: recipientLimit.count >= recipientLimit.limit ? '#ef4444' : '#7c3aed', fontWeight:700, background: recipientLimit.count >= recipientLimit.limit ? '#fee2e2' : '#f5f3ff', padding:'3px 10px', borderRadius:20}}>
                                    {recipientLimit.count} / {recipientLimit.limit} recipients used
                                </span>
                            )}
                        </div>
                        <div className="am-recip-box">
                            {/* All toggle */}
                            <label className="am-recip-all">
                                <input type="checkbox" checked={allRecipients} onChange={e => { setAllRecipients(e.target.checked); if(e.target.checked) setSelectedRecipients([]); }} />
                                <div>
                                    <div style={{fontWeight:700,fontSize:14,color:'#1e1b4b'}}>All recipients</div>
                                    <div style={{fontSize:12,color:'#64748b',marginTop:2}}>Every active recipient will get alerts for this monitor</div>
                                </div>
                            </label>

                            {/* Individual recipients — always visible */}
                            <div className="am-recip-list" style={{opacity: allRecipients ? 0.4 : 1, pointerEvents: allRecipients ? 'none' : 'auto'}}>
                                {recipients.length === 0 ? (
                                    <div style={{fontSize:13,color:'#94a3b8',padding:'12px 18px'}}>
                                        No recipients yet — <a href="/recipients" style={{color:'#7c3aed'}}>add recipients</a>
                                    </div>
                                ) : recipients.map(r => (
                                    <label key={r._id} className="am-recip-item">
                                        <input type="checkbox"
                                            checked={selectedRecipients.includes(r._id)}
                                            onChange={() => toggleRecipient(r._id)} />
                                        <div className="am-recip-avatar">{(r.name||'?')[0].toUpperCase()}</div>
                                        <div style={{flex:1}}>
                                            <div style={{fontWeight:600,fontSize:14,color:'#1e1b4b'}}>{r.name}</div>
                                            <div style={{fontSize:12,color:'#94a3b8'}}>
                                                {[r.email, r.phone].filter(Boolean).join(' · ') || '—'}
                                            </div>
                                        </div>
                                        <div style={{fontSize:11, color:'#94a3b8', display:'flex', gap:4}}>
                                            {r.email && <span style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:4}}>✉️ Email</span>}
                                            {r.phone && <span style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:4}}>💬 WA</span>}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {!allRecipients && selectedRecipients.length === 0 && recipients.length > 0 && (
                            <div style={{fontSize:12,color:'#f59e0b',marginTop:6}}>⚠️ No recipient selected — tick "All recipients" or select at least one</div>
                        )}
                    </div>

                    {/* Monitor interval */}
                    <div className="am-section">
                        <div className="am-section-label">Monitor interval</div>
                        <div className="am-interval-box">
                            <div className="am-interval-info">
                                <span className="am-interval-val">Every {intervalLabel}</span>
                                <span className="am-interval-plan">
                                    {plan === 'free_trial' ? '(Free Trial)' : plan === 'bronze' ? '(Bronze)' : plan === 'silver' ? '(Silver)' : '(Gold)'}
                                </span>
                            </div>
                            <div className="am-interval-sub">Interval is set by your plan and managed by admin.</div>
                            <div className="am-interval-track">
                                <div className="am-interval-bar" style={{ width: planInterval ? `${Math.min(100, Math.max(5, (1 - planInterval/1440)*100))}%` : '30%' }} />
                                <div className="am-interval-labels">
                                    {['30s','1m','5m','30m','1h','12h','24h'].map(l => <span key={l}>{l}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced settings */}
                    <div className="am-section">
                        <button type="button" className="am-adv-toggle" onClick={() => setShowAdvanced(s=>!s)}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{transform: showAdvanced?'rotate(90deg)':'none', transition:'0.2s'}}><polyline points="9 18 15 12 9 6"/></svg>
                            Advanced settings
                        </button>

                        {showAdvanced && (
                            <div className="am-adv-body">
                                {/* Request timeout */}
                                <div className="am-adv-row">
                                    <div className="am-adv-label">
                                        <span>Request timeout</span>
                                        <span className="am-adv-val-badge">{form.timeout}s</span>
                                    </div>
                                    <div className="am-adv-sub">Mark site as down if no response within {form.timeout} seconds.</div>
                                    <input type="range" min="5" max="60" step="5" value={form.timeout}
                                        onChange={e => setForm({...form, timeout: Number(e.target.value)})}
                                        className="am-slider" />
                                    <div className="am-slider-labels">
                                        {['5s','10s','15s','20s','30s','45s','60s'].map(l=><span key={l}>{l}</span>)}
                                    </div>
                                </div>

                                {/* Follow redirects */}
                                <div className="am-adv-row">
                                    <div className="am-adv-label">
                                        <span>Follow redirections</span>
                                        <label className="am-toggle">
                                            <input type="checkbox" checked={form.followRedirects} onChange={e=>setForm({...form, followRedirects: e.target.checked})} />
                                            <span className="am-toggle-slider" />
                                        </label>
                                    </div>
                                    <div className="am-adv-sub">
                                        {form.followRedirects ? 'Automatically follows HTTP 3xx redirects.' : 'Returns redirect HTTP codes (3xx) as-is.'}
                                    </div>
                                </div>

                                {/* HTTP method */}
                                <div className="am-adv-row">
                                    <div className="am-adv-label"><span>HTTP method</span></div>
                                    <div className="am-adv-sub">Method used when checking your site.</div>
                                    <div className="am-method-row">
                                        {['GET','HEAD','POST','PUT','PATCH','DELETE'].map(m => (
                                            <button key={m} type="button"
                                                className={`am-method-btn ${form.httpMethod===m?'active':''}`}
                                                onClick={() => setForm({...form, httpMethod: m})}>
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Up HTTP status codes */}
                                <div className="am-adv-row">
                                    <div className="am-adv-label"><span>Up HTTP status codes</span></div>
                                    <div className="am-adv-sub">Site marked as UP when response matches these codes.</div>
                                    <div className="am-codes-wrap">
                                        {form.upCodes.map(c => (
                                            <span key={c} className="am-code-tag">
                                                {c}
                                                <button type="button" onClick={() => setForm({...form, upCodes: form.upCodes.filter(x=>x!==c)})}>×</button>
                                            </span>
                                        ))}
                                        <input type="number" placeholder="Add code..." value={codeInput}
                                            onChange={e => setCodeInput(e.target.value)}
                                            onKeyDown={e => {
                                                if ((e.key==='Enter'||e.key===',') && codeInput) {
                                                    e.preventDefault();
                                                    const code = parseInt(codeInput);
                                                    if (code >= 100 && code < 600 && !form.upCodes.includes(code))
                                                        setForm({...form, upCodes:[...form.upCodes, code]});
                                                    setCodeInput('');
                                                }
                                            }}
                                            className="am-code-input" />
                                    </div>
                                    <div className="am-adv-hint">Press Enter to add a code</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {error && <div className="am-error">⚠️ {error}</div>}

                    <div className="am-footer">
                        <button type="button" className="am-cancel" onClick={() => navigate('/dashboard')}>Cancel</button>
                        <button type="submit" className="am-submit" disabled={saving}>
                            {saving ? 'Creating...' : 'Create monitor →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
