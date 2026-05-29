import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, getServers, addRecipient, getRecipients } from '../api';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

// ── WhatsApp Add Modal ────────────────────────────────────────────────────────
function WhatsAppModal({ servers, onClose, onSaved }) {
    const [name,       setName]       = useState('');
    const [phone,      setPhone]      = useState('');
    const [selected,   setSelected]   = useState([]);
    const [allSites,   setAllSites]   = useState(true);
    const [siteSearch, setSiteSearch] = useState('');
    const [saving,   setSaving]   = useState(false);
    const [error,    setError]    = useState('');

    const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

    const save = async () => {
        if (!name.trim()) { setError('Name is required'); return; }
        if (phone.replace(/\D/g,'').length < 10) { setError('Enter valid 10-digit mobile number'); return; }
        setSaving(true);
        try {
            const phoneFormatted = '91' + phone.replace(/\D/g,'').slice(-10);
            await addRecipient({
                name: name.trim(),
                phone: phoneFormatted,
                servers: allSites ? [] : selected,
            });
            onSaved();
            onClose();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to add');
        }
        setSaving(false);
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:460, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.4)', position:'relative' }}>
                <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>

                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }} fill="#25d366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>Add <span style={{color:'#25d366'}}>WhatsApp</span> Recipient</h2>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'6px 0 0' }}>You will receive WhatsApp alerts when your sites go down</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Name */}
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Full Name *</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                    </div>

                    {/* Phone */}
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>WhatsApp Number *</label>
                        <div style={{ display:'flex', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, overflow:'hidden', background:'#2d2466' }}>
                            <span style={{ padding:'0 12px', color:'rgba(255,255,255,0.5)', fontSize:13, display:'flex', alignItems:'center', borderRight:'1px solid rgba(255,255,255,0.1)' }}>🇮🇳 +91</span>
                            <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="98765 43210" maxLength={10}
                                style={{ flex:1, padding:'10px 12px', border:'none', background:'transparent', color:'#e2e8f0', fontSize:14, outline:'none' }} />
                        </div>
                    </div>

                    {/* Sites */}
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:8 }}>Notify for sites</label>
                        <label style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, cursor:'pointer' }}>
                            <input type="checkbox" checked={allSites} onChange={e=>{setAllSites(e.target.checked);setSelected([]);}}
                                style={{ width:16, height:16, accentColor:'#7c3aed' }} />
                            <span style={{ color:'#e2e8f0', fontSize:13, fontWeight:600 }}>All sites (current + future)</span>
                        </label>
                        {!allSites && (
                            <div>
                            {/* Search */}
                            <div style={{ position:'relative', marginBottom:8 }}>
                                <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} width="13" height="13" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="Search sites..."
                                    style={{ width:'100%', padding:'8px 10px 8px 30px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:8, fontSize:13, background:'rgba(255,255,255,0.07)', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:160, overflowY:'auto' }}>
                                {servers.filter(s => !siteSearch || s.name.toLowerCase().includes(siteSearch.toLowerCase())).map(s => (
                                    <label key={s._id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)' }}>
                                        <input type="checkbox" checked={selected.includes(s._id)} onChange={()=>toggle(s._id)}
                                            style={{ width:15, height:15, accentColor:'#7c3aed' }} />
                                        <span style={{ width:8, height:8, borderRadius:'50%', background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b', flexShrink:0 }} />
                                        <span style={{ color:'#e2e8f0', fontSize:13 }}>{s.name}</span>
                                    </label>
                                ))}
                            </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div style={{ background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'8px 12px', fontSize:13, fontWeight:600, marginTop:12 }}>⚠️ {error}</div>}

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={onClose} style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={save} disabled={saving}
                        style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
                        {saving ? 'Saving...' : '✓ Save Recipient'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Email Add Modal ───────────────────────────────────────────────────────────
function EmailModal({ servers, onClose, onSaved }) {
    const [name,       setName]       = useState('');
    const [email,      setEmail]      = useState('');
    const [selected,   setSelected]   = useState([]);
    const [allSites,   setAllSites]   = useState(true);
    const [saving,     setSaving]     = useState(false);
    const [error,      setError]      = useState('');
    const [siteSearch, setSiteSearch] = useState('');

    const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);

    const save = async () => {
        if (!name.trim()) { setError('Name is required'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter valid email address'); return; }
        setSaving(true);
        try {
            await addRecipient({ name: name.trim(), email: email.trim(), servers: allSites ? [] : selected });
            onSaved();
            onClose();
        } catch (e) { setError(e.response?.data?.error || 'Failed to add'); }
        setSaving(false);
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:460, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.4)', position:'relative' }}>
                <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>

                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }}>
                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>Add <span style={{color:'#EA4335'}}>Email</span> Recipient</h2>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'6px 0 0' }}>You will receive email alerts when your sites go down</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Full Name *</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Email Address *</label>
                        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:8 }}>Notify for sites</label>
                        <label style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, cursor:'pointer' }}>
                            <input type="checkbox" checked={allSites} onChange={e=>{setAllSites(e.target.checked);setSelected([]);}} style={{ width:16, height:16, accentColor:'#7c3aed' }} />
                            <span style={{ color:'#e2e8f0', fontSize:13, fontWeight:600 }}>All sites (current + future)</span>
                        </label>
                        {!allSites && (
                            <div>
                                <div style={{ position:'relative', marginBottom:8 }}>
                                    <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} width="13" height="13" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                    <input value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="Search sites..."
                                        style={{ width:'100%', padding:'8px 10px 8px 30px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:8, fontSize:13, background:'rgba(255,255,255,0.07)', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                                </div>
                                <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:160, overflowY:'auto' }}>
                                    {servers.filter(s => !siteSearch || s.name.toLowerCase().includes(siteSearch.toLowerCase())).map(s => (
                                        <label key={s._id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'8px 12px', borderRadius:8, background:'rgba(255,255,255,0.05)' }}>
                                            <input type="checkbox" checked={selected.includes(s._id)} onChange={()=>toggle(s._id)} style={{ width:15, height:15, accentColor:'#7c3aed' }} />
                                            <span style={{ width:8, height:8, borderRadius:'50%', background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b', flexShrink:0 }} />
                                            <span style={{ color:'#e2e8f0', fontSize:13 }}>{s.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div style={{ background:'#fef2f2', color:'#dc2626', borderRadius:8, padding:'8px 12px', fontSize:13, fontWeight:600, marginTop:12 }}>⚠️ {error}</div>}

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={onClose} style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                    <button onClick={save} disabled={saving}
                        style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
                        {saving ? 'Saving...' : '✓ Save Recipient'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoWhatsApp = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>);
const IcoGmail    = () => (<svg width="26" height="26" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>);
const IcoWebhook  = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);
const IcoSlack    = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="#4a154b"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>);
const IcoTelegram = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>);
const IcoDiscord  = () => (<svg width="26" height="26" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>);
const IcoRocket   = () => (<svg width="26" height="26" viewBox="0 0 345 304" xmlns="http://www.w3.org/2000/svg"><g fillRule="nonzero" fill="none"><path d="M302.326 118.304l.005.007-.002-.003-.003-.004zM103.893 13.408c10.625 5.903 20.67 13.37 29.247 21.67 13.827-2.504 28.084-3.767 42.547-3.767 43.298 0 84.348 11.36 115.58 31.981 16.175 10.684 29.031 23.36 38.207 37.68 10.22 15.957 15.4 33.116 15.4 51.503 0 17.892-5.18 35.058-15.4 51.011-9.176 14.327-22.032 27-38.206 37.684-31.233 20.62-72.28 31.974-115.58 31.974-14.464 0-28.718-1.263-42.548-3.765-8.581 8.297-18.622 15.769-29.247 21.67-56.773 28.438-103.854.67-103.854.67s43.773-37.168 36.655-69.75c-19.586-20.077-30.197-44.291-30.197-69.982 0-25.207 10.615-49.42 30.197-69.5C43.811 49.913.054 12.752.039 12.74c.014-.009 47.09-27.768 103.854.668z" fill="#DB2323"/><path d="M69.964 208.766c-19.484-15.38-31.18-35.061-31.18-56.512 0-49.223 61.582-89.126 137.547-89.126s137.547 39.903 137.547 89.126c0 49.223-61.582 89.126-137.547 89.126-18.722 0-36.57-2.424-52.839-6.814l-11.894 11.49c-6.462 6.242-14.037 11.892-21.932 16.343-10.466 5.148-20.8 7.957-31.024 8.814.576-1.05 1.107-2.114 1.678-3.166 11.917-21.989 15.132-41.75 9.644-59.281z" fill="#FFF"/><path d="M110.528 172.151c-11.193 0-20.267-9.043-20.267-20.2 0-11.155 9.074-20.199 20.267-20.199s20.267 9.044 20.267 20.2c0 11.156-9.074 20.2-20.267 20.2v-.001zm65.25 0c-11.193 0-20.267-9.043-20.267-20.2 0-11.155 9.074-20.199 20.267-20.199s20.267 9.044 20.267 20.2c0 11.156-9.074 20.2-20.267 20.2v-.001zm65.25 0c-11.194 0-20.267-9.043-20.267-20.2 0-11.155 9.073-20.199 20.267-20.199 11.193 0 20.267 9.044 20.267 20.2 0 11.156-9.074 20.2-20.267 20.2v-.001z" fill="#DB2323"/></g></svg>);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Integrations() {
    const [servers,     setServers]     = useState([]);
    const [emailActive, setEmailActive] = useState(false);
    const [waModal,     setWaModal]     = useState(false);
    const [emailModal,  setEmailModal]  = useState(false);
    const [saved,       setSaved]       = useState({});
    const [toast,       setToast]       = useState('');

    const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000); };

    useEffect(() => {
        getServers().then(r => setServers(r.data)).catch(()=>{});
        axios.get(`${API_URL}/api/integrations`, { headers: authHeaders() })
            .then(r => {
                const m={};
                r.data.forEach(i => { m[i.type] = true; });
                setSaved(m);
            }).catch(()=>{});
        axios.get(`${API_URL}/api/email-config/status`, { headers: authHeaders() })
            .then(r => setEmailActive(r.data?.configured===true)).catch(()=>{});
    }, []);

    const handleWebhookSave = async (form) => {
        await axios.post(`${API_URL}/api/integrations/webhook`, { config: form, events: form.events||'all' }, { headers: authHeaders() });
        setSaved(p=>({...p, webhook:true}));
        showToast('✅ Webhook saved!');
    };

    const [webhookModal,   setWebhookModal]   = useState(false);
    const [webhookForm,    setWebhookForm]    = useState({ url:'', secret:'', events:'all' });
    const [webhookSaving,  setWebhookSaving]  = useState(false);
    const [webhookTesting, setWebhookTesting] = useState(false);

    const [rcModal,   setRcModal]   = useState(false);
    const [rcForm,      setRcForm]      = useState({ url:'', events:'all' });
    const [rcSaving,    setRcSaving]    = useState(false);
    const [rcTesting,   setRcTesting]   = useState(false);
    const [rcAllSites,  setRcAllSites]  = useState(true);
    const [rcSelected,  setRcSelected]  = useState([]);
    const [rcSearch,    setRcSearch]    = useState('');

    const openRcModal = async () => {
        try {
            const r = await axios.get(`${API_URL}/api/integrations`, { headers: authHeaders() });
            const rc = r.data.find(i => i.type === 'rocketchat');
            if (rc) {
                setRcForm({ url: rc.config?.url||'', events: rc.events||'all' });
                const srvs = rc.servers || [];
                setRcAllSites(srvs.length === 0);
                setRcSelected(srvs.map(s => s.toString()));
            }
        } catch {}
        setRcModal(true);
    };

    const saveRc = async () => {
        if (!rcForm.url) return;
        setRcSaving(true);
        try {
            await axios.post(`${API_URL}/api/integrations/rocketchat`, { config: { url: rcForm.url }, events: rcForm.events||'all', servers: rcAllSites ? [] : rcSelected }, { headers: authHeaders() });
            setSaved(p=>({...p, rocketchat:true}));
            showToast('✅ Rocket.Chat saved!');
            setRcModal(false);
        } catch {}
        setRcSaving(false);
    };

    const testRc = async () => {
        if (!rcForm.url) { showToast('⚠️ Enter webhook URL first'); return; }
        setRcTesting(true);
        try {
            await axios.post(`${API_URL}/api/integrations/test-webhook`, { url: rcForm.url, body: { text: '🚨 *Test* — Rocket.Chat integration is working!' } }, { headers: authHeaders() });
            showToast('✅ Test message sent to Rocket.Chat!');
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Check URL'));
        }
        setRcTesting(false);
    };

    const openWebhookModal = async () => {
        // Load saved webhook config if exists
        try {
            const r = await axios.get(`${API_URL}/api/integrations`, { headers: authHeaders() });
            const wh = r.data.find(i => i.type === 'webhook');
            if (wh) setWebhookForm({ url: wh.config?.url||'', secret: wh.config?.secret||'', events: wh.events||'all' });
        } catch {}
        setWebhookModal(true);
    };

    const saveWebhook = async () => {
        if (!webhookForm.url) return;
        setWebhookSaving(true);
        try { await handleWebhookSave(webhookForm); setWebhookModal(false); } catch{}
        setWebhookSaving(false);
    };

    const testWebhook = async () => {
        if (!webhookForm.url) { showToast('⚠️ Enter webhook URL first'); return; }
        setWebhookTesting(true);
        try {
            const payload = { event:'test', site:'Test', url:'https://example.com', status:'DOWN', time: new Date().toISOString() };
            await axios.post(`${API_URL}/api/integrations/test-webhook`, { url: webhookForm.url, body: payload }, { headers: authHeaders() });
            showToast('✅ Test payload sent! Check your webhook receiver.');
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Check URL'));
        }
        setWebhookTesting(false);
    };

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Integrations <span style={{color:'#7c3aed'}}>.</span></h1>
                    <p className="pg-sub">Connect UptimeForge with your tools to get alerts everywhere</p>
                </div>
            </div>

            {toast && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:10, padding:'10px 16px', marginBottom:16, fontWeight:600, fontSize:14 }}>{toast}</div>}

            {/* Platform Alerts */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, marginBottom:10 }}>Platform Alerts</div>

            {[
                { iconEl:<IcoWhatsApp/>, name:'WhatsApp', desc:'Receive WhatsApp alerts when your site goes down or recovers.', onAdd:()=>setWaModal(true), badge: null },
                { iconEl:<IcoGmail/>,    name:'Email',    desc:'Receive email alerts when your site goes down or recovers.', onAdd:()=>setEmailModal(true), badge: null },
            ].map(intg => (
                <div key={intg.name} style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {intg.iconEl}
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {intg.badge && <span style={{ fontSize:11, fontWeight:700, background:intg.badge.bg, color:intg.badge.color, padding:'3px 10px', borderRadius:20 }}>{intg.badge.label}</span>}
                        {intg.onAdd && <button onClick={intg.onAdd} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>+ Add</button>}
                    </div>
                </div>
            ))}

            {/* Webhook */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, margin:'20px 0 10px' }}>Custom Webhook</div>
            <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <IcoWebhook/>
                </div>
                <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>Webhook</div>
                    <div style={{ fontSize:13, color:'#64748b' }}>POST to any URL when a monitor status changes.</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    {saved.webhook && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                    <button onClick={openWebhookModal} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        {saved.webhook ? '✏️ Edit' : '+ Add'}
                    </button>
                </div>
            </div>

            {/* Rocket.Chat */}
            <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'#fff0f1', border:'1px solid #fecdd3', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <IcoRocket/>
                </div>
                <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>Rocket.Chat</div>
                    <div style={{ fontSize:13, color:'#64748b' }}>Send alerts to your Rocket.Chat workspace via incoming webhook.</div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                    {saved.rocketchat && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                    <button onClick={openRcModal} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                        {saved.rocketchat ? '✏️ Edit' : '+ Add'}
                    </button>
                </div>
            </div>

            {/* Coming Soon */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, margin:'20px 0 10px' }}>Coming Soon</div>
            {[
                { iconEl:<IcoSlack/>,    name:'Slack',    desc:'Send alerts to your Slack channel via incoming webhook.' },
                { iconEl:<IcoTelegram/>, name:'Telegram', desc:'Get instant alerts via Telegram bot messages.' },
                { iconEl:<IcoDiscord/>,  name:'Discord',  desc:'Post status updates to your Discord server.' },
            ].map(intg => (
                <div key={intg.name} style={{ background:'#f8fafc', border:'1.5px solid #f1f5f9', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14, opacity:0.7 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{intg.iconEl}</div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, background:'#f1f5f9', color:'#94a3b8', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>Coming Soon</span>
                </div>
            ))}

            {/* WhatsApp Modal */}
            {waModal    && <WhatsAppModal servers={servers} onClose={()=>setWaModal(false)}    onSaved={()=>showToast('✅ WhatsApp recipient added!')} />}
            {emailModal && <EmailModal    servers={servers} onClose={()=>setEmailModal(false)} onSaved={()=>showToast('✅ Email recipient added!')} />}

            {/* Rocket.Chat Modal */}
            {rcModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
                    onClick={e=>e.target===e.currentTarget&&setRcModal(false)}>
                    <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:440, padding:28, position:'relative' }}>
                        <button onClick={()=>setRcModal(false)} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer' }}>✕</button>
                        <div style={{ textAlign:'center', marginBottom:20 }}>
                            <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}><IcoRocket/></div>
                            <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>Add <span style={{color:'#f5455c'}}>Rocket.Chat</span> Webhook</h2>
                            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'6px 0 0' }}>Admin → Integrations → Incoming WebHook → copy URL</p>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Webhook URL *</label>
                                <input value={rcForm.url} onChange={e=>setRcForm({...rcForm,url:e.target.value})} placeholder="https://chat.yourserver.com/hooks/..."
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Events</label>
                                <select value={rcForm.events} onChange={e=>setRcForm({...rcForm,events:e.target.value})}
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none' }}>
                                    <option value="all">All events (Down, Up, SSL, Domain)</option>
                                    <option value="down">Down events only</option>
                                </select>
                            </div>
                            {/* Site selector */}
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:8 }}>Notify for sites</label>
                                <div onClick={()=>setRcAllSites(p=>!p)} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:10 }}>
                                    <div style={{ width:18, height:18, borderRadius:4, border:'2px solid rgba(255,255,255,0.3)', background: rcAllSites?'#f5455c':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                        {rcAllSites && <span style={{ color:'#fff', fontSize:11, fontWeight:900 }}>✓</span>}
                                    </div>
                                    <span style={{ fontSize:13, color:'#e2e8f0' }}>All sites (current + future)</span>
                                </div>
                                {!rcAllSites && (
                                    <div style={{ background:'#2d2466', borderRadius:10, border:'1.5px solid rgba(255,255,255,0.1)', overflow:'hidden' }}>
                                        <div style={{ padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                                            <input value={rcSearch} onChange={e=>setRcSearch(e.target.value)} placeholder="Search sites..."
                                                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#e2e8f0', fontSize:13 }} />
                                        </div>
                                        <div style={{ maxHeight:160, overflowY:'auto' }}>
                                            {servers.filter(s=>s.name.toLowerCase().includes(rcSearch.toLowerCase())).map(s => (
                                                <div key={s._id} onClick={()=>setRcSelected(p=>p.includes(s._id)?p.filter(x=>x!==s._id):[...p,s._id])}
                                                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ width:16, height:16, borderRadius:4, border:'2px solid rgba(255,255,255,0.25)', background:rcSelected.includes(s._id)?'#f5455c':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                        {rcSelected.includes(s._id) && <span style={{ color:'#fff', fontSize:10, fontWeight:900 }}>✓</span>}
                                                    </div>
                                                    <span style={{ width:8, height:8, borderRadius:'50%', background: s.status==='up'?'#22c55e':'#ef4444', flexShrink:0 }}/>
                                                    <span style={{ fontSize:13, color:'#e2e8f0' }}>{s.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button onClick={()=>setRcModal(false)} style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                            <button onClick={testRc} disabled={rcTesting||!rcForm.url}
                                style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:10, background:'rgba(245,69,92,0.15)', color:'#f5455c', fontSize:13, fontWeight:700, cursor:'pointer', opacity:(!rcForm.url||rcTesting)?0.6:1 }}>
                                {rcTesting ? '...' : '📨 Test'}
                            </button>
                            <button onClick={saveRc} disabled={rcSaving||!rcForm.url}
                                style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(!rcForm.url||rcSaving)?0.6:1 }}>
                                {rcSaving ? 'Saving...' : '💾 Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Webhook Modal */}
            {webhookModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
                    onClick={e=>e.target===e.currentTarget&&setWebhookModal(false)}>
                    <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:440, padding:28, position:'relative' }}>
                        <button onClick={()=>setWebhookModal(false)} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer' }}>✕</button>
                        <div style={{ textAlign:'center', marginBottom:20 }}>
                            <div style={{ fontSize:36, marginBottom:8 }}>🔗</div>
                            <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>Add Webhook</h2>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Webhook URL *</label>
                                <input value={webhookForm.url} onChange={e=>setWebhookForm({...webhookForm,url:e.target.value})} placeholder="https://your-server.com/webhook"
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>Events</label>
                                <select value={webhookForm.events} onChange={e=>setWebhookForm({...webhookForm,events:e.target.value})}
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none' }}>
                                    <option value="all">All events (Down, Up, SSL, Domain)</option>
                                    <option value="down">Down events only</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display:'flex', gap:10, marginTop:20 }}>
                            <button onClick={()=>setWebhookModal(false)} style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                            <button onClick={testWebhook} disabled={webhookTesting||!webhookForm.url}
                                style={{ flex:1, padding:'11px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:10, background:'rgba(16,185,129,0.15)', color:'#34d399', fontSize:13, fontWeight:700, cursor:'pointer', opacity:(!webhookForm.url||webhookTesting)?0.6:1 }}>
                                {webhookTesting ? '...' : '📨 Test'}
                            </button>
                            <button onClick={saveWebhook} disabled={webhookSaving||!webhookForm.url}
                                style={{ flex:2, padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:(!webhookForm.url||webhookSaving)?0.6:1 }}>
                                {webhookSaving ? 'Saving...' : '💾 Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
