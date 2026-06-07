import React, { useState, useEffect } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL, getServers, addRecipient, getRecipients } from '../api';


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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
            <div className="modal-card">
                <button onClick={onClose} className="modal-close">✕</button>

                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }} fill="#25d366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                    </div>
                    <h2 className="modal-title">Add <span style={{color:'#25d366'}}>WhatsApp</span> Recipient</h2>
                    <p className="modal-subtitle">You will receive WhatsApp alerts when your sites go down</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Name */}
                    <div>
                        <label className="modal-label">Full Name *</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="modal-input" />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="modal-label">WhatsApp Number *</label>
                        <div className="modal-phone-wrap">
                            <span className="modal-phone-country">🇮🇳 +91</span>
                            <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="98765 43210" maxLength={10} className="modal-phone-input" />
                        </div>
                    </div>

                    {/* Sites */}
                    <div>
                        <label className="modal-label" style={{ marginBottom:8 }}>Notify for sites</label>
                        <label className="modal-checkbox-row">
                            <input type="checkbox" checked={allSites} onChange={e=>{setAllSites(e.target.checked);setSelected([]);}} className="modal-checkbox" />
                            <span className="modal-checkbox-label">All sites (current + future)</span>
                        </label>
                        {!allSites && (
                            <div>
                                {/* Search */}
                                <div style={{ position:'relative', marginBottom:8 }}>
                                    <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                    <input value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="Search sites..." className="modal-input" style={{ paddingLeft:30 }} />
                                </div>
                                <div className="modal-site-selector-card">
                                    <div className="modal-site-list">
                                        {servers.filter(s => !siteSearch || s.name.toLowerCase().includes(siteSearch.toLowerCase())).map(s => (
                                            <div key={s._id} onClick={()=>toggle(s._id)} className="modal-site-row">
                                                <input type="checkbox" checked={selected.includes(s._id)} onChange={()=>{}} className="modal-checkbox" />
                                                <span className="modal-site-dot" style={{ background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b' }} />
                                                <span style={{ fontSize:13, color:'var(--text-main)' }}>{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className="modal-error">⚠️ {error}</div>}

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={onClose} className="modal-btn-cancel">Cancel</button>
                    <button onClick={save} disabled={saving} className="modal-btn-save">
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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
            <div className="modal-card">
                <button onClick={onClose} className="modal-close">✕</button>

                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }}>
                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                    </div>
                    <h2 className="modal-title">Add <span style={{color:'#EA4335'}}>Email</span> Recipient</h2>
                    <p className="modal-subtitle">You will receive email alerts when your sites go down</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <label className="modal-label">Full Name *</label>
                        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" className="modal-input" />
                    </div>
                    <div>
                        <label className="modal-label">Email Address *</label>
                        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" className="modal-input" />
                    </div>
                    <div>
                        <label className="modal-label" style={{ marginBottom:8 }}>Notify for sites</label>
                        <label className="modal-checkbox-row">
                            <input type="checkbox" checked={allSites} onChange={e=>{setAllSites(e.target.checked);setSelected([]);}} className="modal-checkbox" />
                            <span className="modal-checkbox-label">All sites (current + future)</span>
                        </label>
                        {!allSites && (
                            <div>
                                <div style={{ position:'relative', marginBottom:8 }}>
                                    <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)' }} width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                    <input value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} placeholder="Search sites..." className="modal-input" style={{ paddingLeft:30 }} />
                                </div>
                                <div className="modal-site-selector-card">
                                    <div className="modal-site-list">
                                        {servers.filter(s => !siteSearch || s.name.toLowerCase().includes(siteSearch.toLowerCase())).map(s => (
                                            <div key={s._id} onClick={()=>toggle(s._id)} className="modal-site-row">
                                                <input type="checkbox" checked={selected.includes(s._id)} onChange={()=>{}} className="modal-checkbox" />
                                                <span className="modal-site-dot" style={{ background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b' }} />
                                                <span style={{ fontSize:13, color:'var(--text-main)' }}>{s.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && <div className="modal-error">⚠️ {error}</div>}

                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <button onClick={onClose} className="modal-btn-cancel">Cancel</button>
                    <button onClick={save} disabled={saving} className="modal-btn-save">
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
export default function Integrations({ user, freeAccess = {}, bronzeAccess = {} }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const navigate = useNavigate();
    const [currentPlan, setCurrentPlan] = useState(user?.plan || 'free_trial');
    const isFree   = currentPlan === 'free_trial';
    const isBronze = currentPlan === 'bronze';
    const blocked  = (key) =>
        (isFree   && freeAccess[key]   === false) ||
        (isBronze && bronzeAccess[key] === false);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark'; // Keep dark mode ON by default
    });

    const isDark = localTheme === 'dark';

    // Synchronize theme cookie shifts
    useEffect(() => {
        const checkThemeCookie = () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const current = match ? match[1] : 'dark';
            if (current !== localTheme) {
                setLocalTheme(current);
            }
        };
        checkThemeCookie();
        const interval = setInterval(checkThemeCookie, 1000);
        return () => clearInterval(interval);
    }, [localTheme]);

    useEffect(() => {
        if (localTheme === 'dark') {
            document.body.classList.add('charts-dark-theme');
        } else {
            document.body.classList.remove('charts-dark-theme');
        }
        return () => {
            document.body.classList.remove('charts-dark-theme');
        };
    }, [localTheme]);

    const UpgradeBtn = () => (
        <button onClick={() => navigate('/pay?plan=select')}
            style={{ padding:'8px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
            ⬆️ Upgrade Plan
        </button>
    );
    const [servers,     setServers]     = useState([]);
    const [emailActive, setEmailActive] = useState(false);
    const [waModal,     setWaModal]     = useState(false);
    const [emailModal,  setEmailModal]  = useState(false);
    const [saved,       setSaved]       = useState({});
    const [toast,       setToast]       = useState('');

    const showToast = (m) => { setToast(m); setTimeout(()=>setToast(''), 3000); };

    useEffect(() => {
        // Fetch fresh user plan from API to avoid stale session issue
        axios.get(`${API_URL}/api/users/me`, { withCredentials: true })
            .then(r => { if (r.data?.plan) setCurrentPlan(r.data.plan); }).catch(()=>{});
        getServers().then(r => setServers(r.data)).catch(()=>{});
        axios.get(`${API_URL}/api/integrations`, { withCredentials: true })
            .then(r => {
                const m={};
                r.data.forEach(i => { m[i.type] = true; });
                setSaved(m);
            }).catch(()=>{});
        axios.get(`${API_URL}/api/email-config/status`, { withCredentials: true })
            .then(r => setEmailActive(r.data?.configured===true)).catch(()=>{});
    }, []);

    const [webhookModal,      setWebhookModal]      = useState(false);
    const [webhookForm,       setWebhookForm]       = useState({ url:'', secret:'', events:'all' });
    const [webhookSaving,     setWebhookSaving]     = useState(false);
    const [webhookTesting,    setWebhookTesting]    = useState(false);
    const [webhookAllSites,   setWebhookAllSites]   = useState(true);
    const [webhookSelected,   setWebhookSelected]   = useState([]);
    const [webhookSearch,     setWebhookSearch]     = useState('');

    const [rcModal,   setRcModal]   = useState(false);
    const [rcForm,      setRcForm]      = useState({ url:'', events:'all' });
    const [rcSaving,    setRcSaving]    = useState(false);
    const [rcTesting,   setRcTesting]   = useState(false);
    const [rcAllSites,  setRcAllSites]  = useState(true);
    const [rcSelected,  setRcSelected]  = useState([]);
    const [rcSearch,    setRcSearch]    = useState('');

    const [tgModal,    setTgModal]    = useState(false);
    const [tgForm,     setTgForm]     = useState({ botToken:'', chatId:'', events:'all' });
    const [tgSaving,   setTgSaving]   = useState(false);
    const [tgTesting,  setTgTesting]  = useState(false);
    const [tgAllSites, setTgAllSites] = useState(true);
    const [tgSelected, setTgSelected] = useState([]);
    const [tgSearch,   setTgSearch]   = useState('');

    const validateWebhookUrl = (url) => {
        if (!url) return '⚠️ Webhook URL required';
        try { new URL(url); } catch { return '⚠️ Invalid URL format'; }
        const blocked = ['docs.google.com','drive.google.com','google.com','youtube.com','facebook.com','instagram.com','twitter.com','linkedin.com'];
        const host = new URL(url).hostname;
        if (blocked.some(d => host.includes(d))) return `❌ "${host}" is not a webhook URL. Use a Rocket.Chat / Slack / Discord webhook URL.`;
        return null;
    };

    const deleteIntegration = async (type) => {
        if (!confirm(`Remove ${type} integration?`)) return;
        try {
            await axios.delete(`${API_URL}/api/integrations/${type}`, { withCredentials: true });
            setSaved(p => { const n={...p}; delete n[type]; return n; });
            showToast(`✅ ${type} integration removed`);
        } catch { showToast('❌ Failed to remove'); }
    };

    const openRcModal = async () => {
        try {
            const r = await axios.get(`${API_URL}/api/integrations`, { withCredentials: true });
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
        const err = validateWebhookUrl(rcForm.url);
        if (err) { showToast(err); return; }
        setRcSaving(true);
        try {
            await axios.post(`${API_URL}/api/integrations/rocketchat`, { config: { url: rcForm.url }, events: rcForm.events||'all', servers: rcAllSites ? [] : rcSelected }, { withCredentials: true });
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
            await axios.post(`${API_URL}/api/integrations/test-webhook`, { url: rcForm.url, body: { text: '🚨 *UptimeForge Test* — Rocket.Chat integration is working!' } }, { withCredentials: true });
            showToast('✅ Test message sent to Rocket.Chat!');
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Check URL'));
        }
        setRcTesting(false);
    };

    const openTgModal = async () => {
        try {
            const r = await axios.get(`${API_URL}/api/integrations`, { withCredentials: true });
            const tg = r.data.find(i => i.type === 'telegram');
            if (tg) {
                setTgForm({ botToken: tg.config?.botToken||'', chatId: tg.config?.chatId||'', events: tg.events||'all' });
                const srvs = tg.servers || [];
                setTgAllSites(srvs.length === 0);
                setTgSelected(srvs.map(s => s.toString()));
            }
        } catch {}
        setTgModal(true);
    };

    const saveTg = async () => {
        if (!tgForm.botToken || !tgForm.chatId) { showToast('⚠️ Bot Token and Chat ID required'); return; }
        setTgSaving(true);
        try {
            await axios.post(`${API_URL}/api/integrations/telegram`, { config: { botToken: tgForm.botToken, chatId: tgForm.chatId }, events: tgForm.events||'all', servers: tgAllSites ? [] : tgSelected }, { withCredentials: true });
            setSaved(p=>({...p, telegram:true}));
            showToast('✅ Telegram saved!');
            setTgModal(false);
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Could not save'));
        }
        setTgSaving(false);
    };

    const testTg = async () => {
        if (!tgForm.botToken || !tgForm.chatId) { showToast('⚠️ Enter Bot Token & Chat ID first'); return; }
        setTgTesting(true);
        try {
            await axios.post(`${API_URL}/api/integrations/test-telegram`, { botToken: tgForm.botToken, chatId: tgForm.chatId }, { withCredentials: true });
            showToast('✅ Test message sent to Telegram!');
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Check Bot Token & Chat ID'));
        }
        setTgTesting(false);
    };

    const openWebhookModal = async () => {
        try {
            const r = await axios.get(`${API_URL}/api/integrations`, { withCredentials: true });
            const wh = r.data.find(i => i.type === 'webhook');
            if (wh) {
                setWebhookForm({ url: wh.config?.url||'', secret: wh.config?.secret||'', events: wh.events||'all' });
                const srvs = wh.servers || [];
                setWebhookAllSites(srvs.length === 0);
                setWebhookSelected(srvs.map(s => s.toString()));
            }
        } catch {}
        setWebhookModal(true);
    };

    const saveWebhook = async () => {
        const err = validateWebhookUrl(webhookForm.url);
        if (err) { showToast(err); return; }
        setWebhookSaving(true);
        try {
            await axios.post(`${API_URL}/api/integrations/webhook`, { config: webhookForm, events: webhookForm.events||'all', servers: webhookAllSites ? [] : webhookSelected }, { withCredentials: true });
            setSaved(p=>({...p, webhook:true}));
            showToast('✅ Webhook saved!');
            setWebhookModal(false);
        } catch {}
        setWebhookSaving(false);
    };

    const testWebhook = async () => {
        const err = validateWebhookUrl(webhookForm.url);
        if (err) { showToast(err); return; }
        setWebhookTesting(true);
        try {
            const t = new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true});
            const payload = { text:'🔔 *UptimeForge Alert*', event:'test', site:'Test Message', url:'https://example.com', status:'TEST', time: new Date().toISOString(), attachments:[{ color:'#7c3aed', title:'🧪 Rocket.Chat · Slack · Discord · Zapier · n8n Multiple Webhook support is working!', title_link:'https://example.com', fields:[{title:'Type',value:'🧪 TEST',short:true},{title:'Time',value:t,short:true},{title:'Note',value:'This is a test — not a real alert',short:false}], footer:'UptimeForge Monitor' }] };
            await axios.post(`${API_URL}/api/integrations/test-webhook`, { url: webhookForm.url, body: payload }, { withCredentials: true });
            showToast('✅ Test payload sent! Check your webhook receiver.');
        } catch (e) {
            showToast('❌ Failed: ' + (e.response?.data?.error || e.message || 'Check URL'));
        }
        setWebhookTesting(false);
    };

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{`
                /* Global CSS Variables for scope */
                .perf-page-container {
                  --primary: #7c3aed;
                  --primary-hover: #6d28d9;
                  --primary-rgb: 124, 58, 237;
                  --success: #10b981;
                  --success-rgb: 16, 185, 129;
                  --danger: #f43f5e;
                  --danger-rgb: 244, 63, 94;
                  --warning: #f59e0b;
                  --warning-rgb: 245, 158, 11;
                  --info: #06b6d4;
                  
                  transition: background-color 0.3s ease;
                  min-height: 100vh;
                  position: relative;
                  z-index: 1;
                }

                /* Light Theme Scope */
                .perf-page-container.light {
                  --bg-primary: #f8fafc;
                  --bg-card: #ffffff;
                  --bg-input: #f1f5f9;
                  --border-color: rgba(226, 232, 240, 0.8);
                  --text-main: #0f172a;
                  --text-muted: #64748b;
                  --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
                  --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
                  --input-focus-shadow: rgba(124, 58, 237, 0.08);
                  --modal-bg: #ffffff;
                  --coming-soon-bg: #f8fafc;
                  --coming-soon-border: #f1f5f9;
                  --coming-soon-tag-bg: #f1f5f9;
                  --coming-soon-tag-color: #94a3b8;
                }

                /* Dark Theme Scope */
                .perf-page-container.dark {
                  --bg-primary: #0b0f19;
                  --bg-card: #131a26;
                  --bg-input: #1b2535;
                  --border-color: rgba(255, 255, 255, 0.07);
                  --text-main: #f8fafc;
                  --text-muted: #94a3b8;
                  --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
                  --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
                  --input-focus-shadow: rgba(139, 92, 246, 0.15);
                  --modal-bg: #131a26;
                  --coming-soon-bg: #0e131d;
                  --coming-soon-border: rgba(255, 255, 255, 0.03);
                  --coming-soon-tag-bg: #1b2535;
                  --coming-soon-tag-color: #cbd5e1;
                }

                /* Body background overrides */
                body.charts-dark-theme {
                  background-color: #0b0f19 !important;
                }
                body.charts-dark-theme .app-main,
                body.charts-dark-theme .content {
                  background-color: #0b0f19 !important;
                  transition: background-color 0.3s ease;
                }

                /* Decorative Glows */
                .perf-bg-glow-1 {
                  position: absolute;
                  top: -200px;
                  right: 10%;
                  width: 600px;
                  height: 600px;
                  background: radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0) 70%);
                  pointer-events: none;
                  z-index: 0;
                }
                .perf-page-container.dark .perf-bg-glow-1 {
                  background: radial-gradient(circle, rgba(139, 92, 246, 0.14) 0%, rgba(139, 92, 246, 0) 70%);
                }

                /* Page wrapper */
                .perf-page-container .pg-wrap {
                  background: transparent !important;
                  min-height: auto;
                  position: relative;
                  z-index: 10;
                  padding: 0 4px;
                }
                .perf-page-container .pg-header {
                  margin-bottom: 28px;
                }
                .perf-page-container .pg-title {
                  font-family: 'Outfit', sans-serif;
                  font-size: 28px;
                  font-weight: 800;
                  color: var(--text-main) !important;
                  letter-spacing: -0.8px;
                  margin: 0;
                }
                .perf-page-container .pg-sub {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 13px;
                  color: var(--text-muted);
                  margin-top: 6px;
                }

                /* Section Titles */
                .perf-page-container .section-title {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  color: var(--text-muted);
                  text-transform: uppercase;
                  letter-spacing: 0.6px;
                  margin-bottom: 10px;
                }

                /* Cards styling */
                .perf-page-container .integration-card {
                  background: var(--bg-card) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 16px;
                  padding: 16px 20px;
                  margin-bottom: 10px;
                  display: flex;
                  align-items: center;
                  gap: 14px;
                  box-shadow: var(--card-shadow);
                  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .perf-page-container .integration-card:hover {
                  transform: translateY(-1px);
                  box-shadow: var(--card-hover-shadow);
                  border-color: rgba(var(--primary-rgb), 0.15) !important;
                }

                .perf-page-container .integration-icon {
                  width: 46px;
                  height: 46px;
                  border-radius: 12px;
                  background: var(--bg-input) !important;
                  border: 1px solid var(--border-color) !important;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }
                
                .perf-page-container .integration-name {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                  font-size: 15px;
                  color: var(--text-main) !important;
                  margin-bottom: 2px;
                }
                .perf-page-container .integration-desc {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 13px;
                  color: var(--text-muted);
                }

                .perf-page-container .coming-soon-card {
                  background: var(--coming-soon-bg) !important;
                  border: 1.5px solid var(--coming-soon-border) !important;
                  border-radius: 16px;
                  padding: 16px 20px;
                  margin-bottom: 10px;
                  display: flex;
                  align-items: center;
                  gap: 14px;
                  opacity: 0.7;
                }
                .perf-page-container .coming-soon-icon {
                  width: 46px;
                  height: 46px;
                  border-radius: 12px;
                  background: var(--coming-soon-tag-bg) !important;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                }
                .perf-page-container .coming-soon-tag {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  background: var(--coming-soon-tag-bg) !important;
                  color: var(--coming-soon-tag-color) !important;
                  padding: 3px 10px;
                  border-radius: 20px;
                  white-space: nowrap;
                }

                /* Buttons & Badges */
                .perf-page-container .badge-active {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  background: rgba(16, 185, 129, 0.08) !important;
                  color: var(--success) !important;
                  border: 1px solid rgba(16, 185, 129, 0.25) !important;
                  padding: 3px 10px;
                  border-radius: 20px;
                }
                
                .perf-page-container .btn-delete {
                  padding: 8px 12px !important;
                  background: rgba(244, 63, 94, 0.08) !important;
                  color: var(--danger) !important;
                  border: 1.5px solid rgba(244, 63, 94, 0.25) !important;
                  border-radius: 9px !important;
                  font-size: 13px !important;
                  font-weight: 700 !important;
                  cursor: pointer !important;
                  transition: all 0.2s !important;
                }
                .perf-page-container .btn-delete:hover {
                  background: var(--danger) !important;
                  color: #fff !important;
                  border-color: transparent !important;
                }

                .perf-page-container .btn-add {
                  padding: 8px 18px !important;
                  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
                  color: #fff !important;
                  border: none !important;
                  border-radius: 9px !important;
                  font-size: 13px !important;
                  font-weight: 700 !important;
                  cursor: pointer !important;
                  transition: all 0.2s !important;
                  box-shadow: 0 4px 12px rgba(124,58,237,0.2) !important;
                }
                .perf-page-container .btn-add:hover {
                  transform: translateY(-1px) !important;
                  box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important;
                }

                /* Toast styling */
                .perf-page-container .toast-msg {
                  background: rgba(16, 185, 129, 0.08) !important;
                  border: 1px solid rgba(16, 185, 129, 0.25) !important;
                  color: var(--success) !important;
                  border-radius: 12px;
                  padding: 10px 16px;
                  margin-bottom: 16px;
                  font-weight: 600;
                  font-size: 14px;
                }

                /* Modal styling */
                .modal-overlay {
                  position: fixed;
                  inset: 0;
                  background: rgba(0, 0, 0, 0.6) !important;
                  backdrop-filter: blur(4px);
                  z-index: 9999;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
                }
                .modal-card {
                  background: var(--modal-bg) !important;
                  border: 1px solid var(--border-color) !important;
                  border-radius: 20px;
                  width: 100%;
                  max-width: 460px;
                  padding: 28px;
                  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
                  position: relative;
                }
                .modal-close {
                  position: absolute;
                  top: 14px;
                  right: 14px;
                  background: var(--bg-input) !important;
                  border: 1px solid var(--border-color) !important;
                  color: var(--text-main) !important;
                  width: 28px;
                  height: 28px;
                  border-radius: 7px;
                  cursor: pointer;
                  font-size: 14px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.2s;
                }
                .modal-close:hover {
                  background: var(--danger) !important;
                  color: #fff !important;
                  border-color: transparent !important;
                }
                
                .modal-title {
                  color: var(--text-main) !important;
                  margin: 0;
                  font-size: 18px;
                  font-weight: 800;
                  font-family: 'Outfit', sans-serif;
                }
                .modal-subtitle {
                  color: var(--text-muted) !important;
                  font-size: 12px;
                  margin: 6px 0 0;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                
                .modal-form-group {
                  margin-bottom: 14px;
                }
                .modal-label {
                  font-size: 12px;
                  font-weight: 700;
                  color: var(--text-main) !important;
                  display: block;
                  margin-bottom: 6px;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                
                .modal-input {
                  width: 100%;
                  padding: 10px 14px;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 9px;
                  font-size: 14px;
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                  outline: none;
                  box-sizing: border-box;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  transition: all 0.2s;
                }
                .modal-input:focus {
                  border-color: var(--primary) !important;
                  box-shadow: 0 0 0 3px var(--input-focus-shadow);
                }
                
                .modal-select {
                  width: 100%;
                  padding: 10px 14px;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 9px;
                  font-size: 14px;
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                  outline: none;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                
                .modal-phone-wrap {
                  display: flex;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 9px;
                  overflow: hidden;
                  background: var(--bg-input) !important;
                }
                .modal-phone-country {
                  padding: 0 12px;
                  color: var(--text-muted);
                  font-size: 13px;
                  display: flex;
                  align-items: center;
                  border-right: 1px solid var(--border-color);
                }
                .modal-phone-input {
                  flex: 1;
                  padding: 10px 12px;
                  border: none;
                  background: transparent;
                  color: var(--text-main) !important;
                  font-size: 14px;
                  outline: none;
                }

                .modal-checkbox-row {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  margin-bottom: 10px;
                  cursor: pointer;
                }
                .modal-checkbox {
                  width: 16px;
                  height: 16px;
                  accent-color: var(--primary);
                }
                .modal-checkbox-label {
                  color: var(--text-main);
                  font-size: 13px;
                  font-weight: 600;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }

                /* Site Selector Inside Modal */
                .modal-site-selector-card {
                  background: var(--bg-input) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 10px;
                  overflow: hidden;
                }
                .modal-site-selector-search {
                  padding: 8px 12px;
                  border-bottom: 1px solid var(--border-color);
                }
                .modal-site-selector-input {
                  width: 100%;
                  background: transparent;
                  border: none;
                  outline: none;
                  color: var(--text-main);
                  font-size: 13px;
                }
                .modal-site-list {
                  max-height: 160px;
                  overflow-y: auto;
                }
                .modal-site-row {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 9px 14px;
                  cursor: pointer;
                  border-bottom: 1px solid var(--border-color);
                  background: transparent;
                  transition: background-color 0.15s;
                }
                .modal-site-row:hover {
                  background: var(--bg-card);
                }
                .modal-site-row:last-child {
                  border-bottom: none;
                }
                .modal-site-dot {
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  flex-shrink: 0;
                }

                .modal-error {
                  background: rgba(244, 63, 94, 0.08) !important;
                  border: 1px solid rgba(244, 63, 94, 0.25) !important;
                  color: var(--danger) !important;
                  border-radius: 8px;
                  padding: 8px 12px;
                  font-size: 13px;
                  font-weight: 600;
                  margin-top: 12px;
                }

                .modal-btn-cancel {
                  padding: 11px;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 10px;
                  background: transparent !important;
                  color: var(--text-muted) !important;
                  font-size: 14px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                .modal-btn-cancel:hover {
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                }
                .modal-btn-test {
                  padding: 11px;
                  border: 1.5px solid rgba(16, 185, 129, 0.25) !important;
                  border-radius: 10px;
                  background: rgba(16, 185, 129, 0.08) !important;
                  color: var(--success) !important;
                  font-size: 13px;
                  font-weight: 700;
                  cursor: pointer;
                  transition: all 0.2s;
                }
                .modal-btn-test:hover:not(:disabled) {
                  background: var(--success) !important;
                  color: #fff !important;
                  border-color: transparent !important;
                }
                .modal-btn-test:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
                .modal-btn-save {
                  padding: 11px;
                  border: none !important;
                  border-radius: 10px;
                  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
                  color: #fff !important;
                  font-size: 14px;
                  font-weight: 700;
                  cursor: pointer;
                  transition: all 0.2s;
                  box-shadow: 0 4px 12px rgba(124,58,237,0.2);
                }
                .modal-btn-save:hover:not(:disabled) {
                  transform: translateY(-1px);
                  box-shadow: 0 6px 18px rgba(124,58,237,0.3);
                }
                .modal-btn-save:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
            `}</style>

            <ConfirmDialog />
            <div className="perf-bg-glow-1" />

            <div className="pg-wrap">
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">Integrations <span style={{color:'#7c3aed'}}>.</span></h1>
                        <p className="pg-sub">Connect UptimeForge with your tools to get alerts everywhere</p>
                    </div>
                </div>

                {toast && <div className="toast-msg">{toast}</div>}

                {/* Platform Alerts */}
                <div className="section-title">Platform Alerts</div>

                {[
                    { iconEl:<IcoWhatsApp/>, name:'WhatsApp', desc:'Receive WhatsApp alerts when your site goes down or recovers.', onAdd: blocked('whatsapp') ? null : ()=>setWaModal(true), badge: null, isBlocked: blocked('whatsapp') },
                    { iconEl:<IcoGmail/>,    name:'Email',    desc:'Receive email alerts when your site goes down or recovers.', onAdd:()=>setEmailModal(true), badge: null },
                ].map(intg => (
                    <div key={intg.name} className="integration-card">
                        <div className="integration-icon">
                            {intg.iconEl}
                        </div>
                        <div style={{ flex:1 }}>
                            <div className="integration-name">{intg.name}</div>
                            <div className="integration-desc">{intg.desc}</div>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            {intg.badge && <span className="badge-active">{intg.badge.label}</span>}
                            {intg.isBlocked
                                ? <UpgradeBtn />
                                : intg.onAdd && <button onClick={intg.onAdd} className="btn-add">+ Add</button>}
                        </div>
                    </div>
                ))}

                {/* Webhook */}
                <div className="section-title" style={{ marginTop:20 }}>Custom Webhook</div>
                <div className="integration-card">
                    <div className="integration-icon">
                        <IcoWebhook/>
                    </div>
                    <div style={{ flex:1 }}>
                        <div className="integration-name">Webhook</div>
                        <div className="integration-desc">POST to any URL when a monitor status changes.</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {saved.webhook && <span className="badge-active">✓ Active</span>}
                        {saved.webhook && <button onClick={()=>deleteIntegration('webhook')} className="btn-delete">🗑</button>}
                        {blocked('webhook')
                            ? <UpgradeBtn />
                            : <button onClick={openWebhookModal} className="btn-add" style={{ background: saved.webhook ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{saved.webhook ? '✏️ Edit' : '+ Add'}</button>
                        }
                    </div>
                </div>

                {/* Rocket.Chat */}
                <div className="integration-card">
                    <div className="integration-icon" style={{ background:isDark ? 'rgba(244, 63, 94, 0.08)' : '#fff0f1', borderColor: isDark ? 'rgba(244, 63, 94, 0.25)' : '#fecdd3' }}>
                        <IcoRocket/>
                    </div>
                    <div style={{ flex:1 }}>
                        <div className="integration-name">Rocket.Chat</div>
                        <div className="integration-desc">Send alerts to your Rocket.Chat workspace via incoming webhook.</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {saved.rocketchat && <span className="badge-active">✓ Active</span>}
                        {saved.rocketchat && <button onClick={()=>deleteIntegration('rocketchat')} className="btn-delete">🗑</button>}
                        {blocked('rocketChat')
                            ? <UpgradeBtn />
                            : <button onClick={openRcModal} className="btn-add" style={{ background: saved.rocketchat ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{saved.rocketchat ? '✏️ Edit' : '+ Add'}</button>
                        }
                    </div>
                </div>

                {/* Telegram */}
                <div className="integration-card">
                    <div className="integration-icon" style={{ background:isDark ? 'rgba(0, 136, 204, 0.08)' : '#e8f6ff', borderColor: isDark ? 'rgba(0, 136, 204, 0.25)' : '#bfe7ff' }}>
                        <IcoTelegram/>
                    </div>
                    <div style={{ flex:1 }}>
                        <div className="integration-name">Telegram</div>
                        <div className="integration-desc">Get instant alerts via your own Telegram bot.</div>
                    </div>
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {saved.telegram && <span className="badge-active">✓ Active</span>}
                        {saved.telegram && <button onClick={()=>deleteIntegration('telegram')} className="btn-delete">🗑</button>}
                        <button onClick={openTgModal} className="btn-add" style={{ background: saved.telegram ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>{saved.telegram ? '✏️ Edit' : '+ Add'}</button>
                    </div>
                </div>

                {/* Coming Soon */}
                <div className="section-title" style={{ marginTop:20 }}>Coming Soon</div>
                {[
                    { iconEl:<IcoSlack/>,    name:'Slack',    desc:'Send alerts to your Slack channel via incoming webhook.' },
                    { iconEl:<IcoDiscord/>,  name:'Discord',  desc:'Post status updates to your Discord server.' },
                ].map(intg => (
                    <div key={intg.name} className="coming-soon-card">
                        <div className="coming-soon-icon">{intg.iconEl}</div>
                        <div style={{ flex:1 }}>
                            <div className="integration-name">{intg.name}</div>
                            <div className="integration-desc">{intg.desc}</div>
                        </div>
                        <span className="coming-soon-tag">Coming Soon</span>
                    </div>
                ))}

                {/* WhatsApp Modal */}
                {waModal    && <WhatsAppModal servers={servers} onClose={()=>setWaModal(false)}    onSaved={()=>showToast('✅ WhatsApp recipient added!')} />}
                {emailModal && <EmailModal    servers={servers} onClose={()=>setEmailModal(false)} onSaved={()=>showToast('✅ Email recipient added!')} />}

                {/* Rocket.Chat Modal */}
                {rcModal && (
                    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setRcModal(false)}>
                        <div className="modal-card">
                            <button onClick={()=>setRcModal(false)} className="modal-close">✕</button>
                            <div style={{ textAlign:'center', marginBottom:20 }}>
                                <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}><IcoRocket/></div>
                                <h2 className="modal-title">Add <span style={{color:'#f5455c'}}>Rocket.Chat</span> Webhook</h2>
                                <p className="modal-subtitle">Admin → Integrations → Incoming WebHook → copy URL</p>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                                <div>
                                    <label className="modal-label">Webhook URL *</label>
                                    <input value={rcForm.url} onChange={e=>setRcForm({...rcForm,url:e.target.value})} placeholder="https://chat.yourserver.com/hooks/..." className="modal-input" />
                                </div>
                                <div>
                                    <label className="modal-label">Events</label>
                                    <select value={rcForm.events} onChange={e=>setRcForm({...rcForm,events:e.target.value})} className="modal-select">
                                        <option value="all">All events (Down, Up, SSL, Domain)</option>
                                        <option value="down">Down events only</option>
                                    </select>
                                </div>
                                {/* Site selector */}
                                <div>
                                    <label className="modal-label" style={{ marginBottom:8 }}>Notify for sites</label>
                                    <div onClick={()=>setRcAllSites(p=>!p)} className="modal-checkbox-row">
                                        <input type="checkbox" checked={rcAllSites} onChange={()=>{}} className="modal-checkbox" />
                                        <span className="modal-checkbox-label">All sites (current + future)</span>
                                    </div>
                                    {!rcAllSites && (
                                        <div className="modal-site-selector-card">
                                            <div className="modal-site-selector-search">
                                                <input value={rcSearch} onChange={e=>setRcSearch(e.target.value)} placeholder="Search sites..." className="modal-site-selector-input" />
                                            </div>
                                            <div className="modal-site-list">
                                                {servers.filter(s=>s.name.toLowerCase().includes(rcSearch.toLowerCase())).map(s => (
                                                    <div key={s._id} onClick={()=>setRcSelected(p=>p.includes(s._id)?p.filter(x=>x!==s._id):[...p,s._id])} className="modal-site-row">
                                                        <input type="checkbox" checked={rcSelected.includes(s._id)} onChange={()=>{}} className="modal-checkbox" />
                                                        <span className="modal-site-dot" style={{ background: s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b' }}/>
                                                        <span style={{ fontSize:13, color:'var(--text-main)' }}>{s.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:10, marginTop:20 }}>
                                <button onClick={()=>setRcModal(false)} className="modal-btn-cancel" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={testRc} disabled={rcTesting||!rcForm.url} className="modal-btn-test" style={{ flex: 1 }}>
                                    {rcTesting ? '...' : '📨 Test'}
                                </button>
                                <button onClick={saveRc} disabled={rcSaving||!rcForm.url} className="modal-btn-save" style={{ flex: 2 }}>
                                    {rcSaving ? 'Saving...' : '💾 Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Telegram Modal */}
                {tgModal && (
                    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setTgModal(false)}>
                        <div className="modal-card">
                            <button onClick={()=>setTgModal(false)} className="modal-close">✕</button>
                            <div style={{ textAlign:'center', marginBottom:20 }}>
                                <div style={{ marginBottom:10, display:'flex', justifyContent:'center' }}><IcoTelegram/></div>
                                <h2 className="modal-title">Add <span style={{color:'#0088cc'}}>Telegram</span> Bot</h2>
                                <p className="modal-subtitle">Get alerts straight to your phone via your own Telegram bot</p>
                            </div>
                            <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:10, padding:'12px 14px', marginBottom:14, fontSize:12.5, color:'var(--text-muted)', lineHeight:1.6 }}>
                                <b style={{ color:'var(--text-main)' }}>How to set up:</b><br/>
                                1. Open Telegram, search <b>@BotFather</b> → send <code>/newbot</code> → copy the <b>Bot Token</b><br/>
                                2. Search <b>@userinfobot</b> → send <code>/start</code> → copy your <b>Chat ID</b><br/>
                                <span style={{ opacity:0.8 }}>(For a group: add your bot to the group, send a message, then open <code>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> to find the group's chat id)</span>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                                <div>
                                    <label className="modal-label">Bot Token *</label>
                                    <input value={tgForm.botToken} onChange={e=>setTgForm({...tgForm,botToken:e.target.value})} placeholder="123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="modal-input" />
                                </div>
                                <div>
                                    <label className="modal-label">Chat ID *</label>
                                    <input value={tgForm.chatId} onChange={e=>setTgForm({...tgForm,chatId:e.target.value})} placeholder="e.g. 123456789 or -1001234567890" className="modal-input" />
                                </div>
                                <div>
                                    <label className="modal-label">Events</label>
                                    <select value={tgForm.events} onChange={e=>setTgForm({...tgForm,events:e.target.value})} className="modal-select">
                                        <option value="all">All events (Down, Up, SSL, Domain)</option>
                                        <option value="down">Down events only</option>
                                    </select>
                                </div>
                                {/* Site selector */}
                                <div>
                                    <label className="modal-label" style={{ marginBottom:8 }}>Notify for sites</label>
                                    <div onClick={()=>setTgAllSites(p=>!p)} className="modal-checkbox-row">
                                        <input type="checkbox" checked={tgAllSites} onChange={()=>{}} className="modal-checkbox" />
                                        <span className="modal-checkbox-label">All sites (current + future)</span>
                                    </div>
                                    {!tgAllSites && (
                                        <div className="modal-site-selector-card">
                                            <div className="modal-site-selector-search">
                                                <input value={tgSearch} onChange={e=>setTgSearch(e.target.value)} placeholder="Search sites..." className="modal-site-selector-input" />
                                            </div>
                                            <div className="modal-site-list">
                                                {servers.filter(s=>s.name.toLowerCase().includes(tgSearch.toLowerCase())).map(s => (
                                                    <div key={s._id} onClick={()=>setTgSelected(p=>p.includes(s._id)?p.filter(x=>x!==s._id):[...p,s._id])} className="modal-site-row">
                                                        <input type="checkbox" checked={tgSelected.includes(s._id)} onChange={()=>{}} className="modal-checkbox" />
                                                        <span className="modal-site-dot" style={{ background: s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b' }}/>
                                                        <span style={{ fontSize:13, color:'var(--text-main)' }}>{s.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:10, marginTop:20 }}>
                                <button onClick={()=>setTgModal(false)} className="modal-btn-cancel" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={testTg} disabled={tgTesting||!tgForm.botToken||!tgForm.chatId} className="modal-btn-test" style={{ flex: 1 }}>
                                    {tgTesting ? '...' : '📨 Test'}
                                </button>
                                <button onClick={saveTg} disabled={tgSaving||!tgForm.botToken||!tgForm.chatId} className="modal-btn-save" style={{ flex: 2 }}>
                                    {tgSaving ? 'Saving...' : '💾 Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Webhook Modal */}
                {webhookModal && (
                    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setWebhookModal(false)}>
                        <div className="modal-card">
                            <button onClick={()=>setWebhookModal(false)} className="modal-close">✕</button>
                            <div style={{ textAlign:'center', marginBottom:20 }}>
                                <div style={{ fontSize:36, marginBottom:8 }}>🔗</div>
                                <h2 className="modal-title">Add Webhook</h2>
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                                <div>
                                    <label className="modal-label">Webhook URL *</label>
                                    <input value={webhookForm.url} onChange={e=>setWebhookForm({...webhookForm,url:e.target.value})} placeholder="https://your-server.com/webhook" className="modal-input" />
                                </div>
                                <div>
                                    <label className="modal-label">Events</label>
                                    <select value={webhookForm.events} onChange={e=>setWebhookForm({...webhookForm,events:e.target.value})} className="modal-select">
                                        <option value="all">All events (Down, Up, SSL, Domain)</option>
                                        <option value="down">Down events only</option>
                                    </select>
                                </div>
                                {/* Site selector */}
                                <div>
                                    <label className="modal-label" style={{ marginBottom:8 }}>Notify for sites</label>
                                    <div onClick={()=>setWebhookAllSites(p=>!p)} className="modal-checkbox-row">
                                        <input type="checkbox" checked={webhookAllSites} onChange={()=>{}} className="modal-checkbox" />
                                        <span className="modal-checkbox-label">All sites (current + future)</span>
                                    </div>
                                    {!webhookAllSites && (
                                        <div className="modal-site-selector-card">
                                            <div className="modal-site-selector-search">
                                                <input value={webhookSearch} onChange={e=>setWebhookSearch(e.target.value)} placeholder="Search sites..." className="modal-site-selector-input" />
                                            </div>
                                            <div className="modal-site-list">
                                                {servers.filter(s=>s.name.toLowerCase().includes(webhookSearch.toLowerCase())).map(s => (
                                                    <div key={s._id} onClick={()=>setWebhookSelected(p=>p.includes(s._id)?p.filter(x=>x!==s._id):[...p,s._id])} className="modal-site-row">
                                                        <input type="checkbox" checked={webhookSelected.includes(s._id)} onChange={()=>{}} className="modal-checkbox" />
                                                        <span className="modal-site-dot" style={{ background: s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b' }}/>
                                                        <span style={{ fontSize:13, color:'var(--text-main)' }}>{s.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:10, marginTop:20 }}>
                                <button onClick={()=>setWebhookModal(false)} className="modal-btn-cancel" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={testWebhook} disabled={webhookTesting||!webhookForm.url} className="modal-btn-test" style={{ flex: 1 }}>
                                    {webhookTesting ? '...' : '📨 Test'}
                                </button>
                                <button onClick={saveWebhook} disabled={webhookSaving||!webhookForm.url} className="modal-btn-save" style={{ flex: 2 }}>
                                    {webhookSaving ? 'Saving...' : '💾 Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
