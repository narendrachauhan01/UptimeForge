import React, { useState, useEffect } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { addServer, getPlans, getRecipients, getServers, API_URL } from '../api';


export default function AddMonitor({ user }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const navigate = useNavigate();
    const location = useLocation();
    const editServer = location.state?.editServer || null;
    const isEdit = !!editServer;

    const [form, setForm] = useState(() => isEdit ? {
        name: editServer.name || '',
        url: editServer.url || 'https://',
        timeout: editServer.timeout || 10,
        followRedirects: editServer.followRedirects !== false,
        httpMethod: editServer.httpMethod || 'GET',
        upCodes: editServer.upCodes?.length ? editServer.upCodes : [200, 301, 302],
    } : { name: '', url: 'https://', timeout: 10, followRedirects: true, httpMethod: 'GET', upCodes: [200, 301, 302] });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [planInterval, setPlanInterval] = useState(null);
    const [plan, setPlan] = useState('');
    const [recipients, setRecipients] = useState([]);
    const [recipientLimit, setRecipientLimit] = useState(null);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [allRecipients,      setAllRecipients]      = useState(false);
    const [savedIntegrations,  setSavedIntegrations]  = useState([]);
    const [integSiteExpanded,  setIntegSiteExpanded]  = useState(null); // integration _id
    const [integSiteMap,       setIntegSiteMap]       = useState({}); // {intgId: [serverIds]}
    const [editRecipId, setEditRecipId] = useState(null);
    const [editRecipForm, setEditRecipForm] = useState({ name:'', email:'', phone:'' });
    const [showAddRecip, setShowAddRecip] = useState(false);
    const [newRecip, setNewRecip] = useState({ name:'', email:'', phone:'', channel:'' });
    const [expandedSites, setExpandedSites] = useState(null); // recipient id whose sites are expanded
    const [servers, setServers] = useState([]);
    const [recipSiteMap, setRecipSiteMap] = useState({}); // {recipId: [siteIds]}

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

    useEffect(() => {
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
            // Init site map from existing recipient server assignments
            const map = {};
            data.forEach(rec => { map[rec._id] = (rec.servers || []).map(s => s._id || s); });
            setRecipSiteMap(map);
        }).catch(() => {});
        getServers().then(r => setServers(r.data)).catch(() => {});
        // Fetch saved integrations (webhook etc.)
        axios.get(`${API_URL}/api/integrations`, { withCredentials: true })
            .then(r => {
                setSavedIntegrations(r.data);
                const map = {};
                r.data.forEach(i => { map[i._id] = (i.servers || []).map(s => s._id || s); });
                setIntegSiteMap(map);
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
            let serverId;
            if (isEdit) {
                await axios.put(`${API_URL}/api/servers/${editServer._id}`, form, { withCredentials: true });
                serverId = editServer._id;
            } else {
                const serverRes = await addServer(form);
                serverId = serverRes.data._id;
            }

            // Save site assignments — if recipient has specific sites selected, save them
            await Promise.all(recipients.map(rec => {
                const sites = recipSiteMap[rec._id] || [];
                if (sites.length > 0) {
                    return axios.put(`${API_URL}/api/recipients/${rec._id}`, { servers: sites }, { withCredentials: true });
                }
                return Promise.resolve();
            }));

            navigate(isEdit ? `/site/${serverId}` : '/monitoring');
        } catch (err) {
            setError(err.response?.data?.error || (isEdit ? 'Failed to update monitor' : 'Failed to add monitor'));
        }
        setSaving(false);
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
                  --text-muted-darker: #475569;
                  --primary-glow: rgba(124, 58, 237, 0.04);
                  --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
                  --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
                  --input-focus-shadow: rgba(124, 58, 237, 0.08);
                }

                /* Dark Theme Scope */
                .perf-page-container.dark {
                  --bg-primary: #0b0f19;
                  --bg-card: #131a26;
                  --bg-input: #1b2535;
                  --border-color: rgba(255, 255, 255, 0.07);
                  --text-main: #f8fafc;
                  --text-muted: #94a3b8;
                  --text-muted-darker: #cbd5e1;
                  --primary-glow: rgba(139, 92, 246, 0.1);
                  --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
                  --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
                  --input-focus-shadow: rgba(139, 92, 246, 0.15);
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

                /* Decorative glows */
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

                /* Page adaptive overrides */
                .perf-page-container .am-page {
                  background: transparent !important;
                  min-height: auto;
                  position: relative;
                  z-index: 10;
                  padding: 0 4px;
                }
                
                .perf-page-container .am-topbar {
                  background: var(--bg-card) !important;
                  border-bottom: 1px solid var(--border-color) !important;
                  border-radius: 16px;
                  padding: 16px 20px;
                  box-shadow: var(--card-shadow);
                  margin-bottom: 24px;
                }
                
                .perf-page-container .am-back {
                  color: var(--primary) !important;
                  font-weight: 700;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  background: transparent !important;
                  border: none !important;
                  cursor: pointer;
                }
                
                .perf-page-container .am-title {
                  font-family: 'Outfit', sans-serif;
                  font-size: 26px;
                  font-weight: 800;
                  color: var(--text-main) !important;
                  letter-spacing: -0.6px;
                  margin-bottom: 28px;
                }
                
                .perf-page-container .am-section-label {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  color: var(--text-muted) !important;
                  font-size: 11px;
                  font-weight: 700;
                  letter-spacing: 0.5px;
                  margin-bottom: 10px;
                }
                
                .perf-page-container .am-input {
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 12px;
                  padding: 12px 16px;
                  outline: none;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 600;
                  transition: all 0.2s;
                }
                .perf-page-container .am-input:focus {
                  border-color: var(--primary) !important;
                  box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
                  background: var(--bg-card) !important;
                }
                
                .perf-page-container .am-type-box,
                .perf-page-container .am-interval-box,
                .perf-page-container .am-recip-box,
                .perf-page-container .am-adv-body {
                  background: var(--bg-card) !important;
                  border: 1px solid var(--border-color) !important;
                  border-radius: 20px;
                  box-shadow: var(--card-shadow);
                  padding: 22px 20px;
                  transition: all 0.3s;
                }
                .perf-page-container .am-type-box:hover,
                .perf-page-container .am-interval-box:hover,
                .perf-page-container .am-recip-box:hover,
                .perf-page-container .am-adv-body:hover {
                  border-color: rgba(var(--primary-rgb), 0.15) !important;
                }
                
                .perf-page-container .am-type-name {
                  color: var(--text-main) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                }
                .perf-page-container .am-type-desc {
                  color: var(--text-muted) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                
                .perf-page-container .am-interval-val {
                  color: var(--primary) !important;
                  font-family: 'Outfit', sans-serif;
                  font-weight: 800;
                }
                .perf-page-container .am-interval-plan {
                  color: var(--text-muted) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                }
                .perf-page-container .am-interval-sub {
                  color: var(--text-muted) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                .perf-page-container .am-interval-labels {
                  color: var(--text-muted) !important;
                  font-weight: 700;
                }
                
                .perf-page-container .am-adv-toggle {
                  border: 1.5px solid var(--border-color) !important;
                  background: var(--bg-card) !important;
                  color: var(--text-main) !important;
                  border-radius: 12px !important;
                  font-weight: 700;
                  transition: all 0.2s;
                }
                .perf-page-container .am-adv-toggle:hover {
                  background: var(--bg-input) !important;
                  border-color: var(--text-muted) !important;
                }
                .perf-page-container .am-adv-label {
                  color: var(--text-main) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                }
                .perf-page-container .am-adv-sub {
                  color: var(--text-muted) !important;
                }
                .perf-page-container .am-adv-val-badge {
                  background: var(--primary) !important;
                  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
                }
                
                .perf-page-container .am-method-btn {
                  background: var(--bg-input) !important;
                  color: var(--text-muted) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 8px;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                  transition: all 0.2s;
                }
                .perf-page-container .am-method-btn:hover {
                  color: var(--text-main) !important;
                  background: var(--bg-card) !important;
                }
                .perf-page-container .am-method-btn.active {
                  background: var(--primary) !important;
                  color: #fff !important;
                  border-color: var(--primary) !important;
                  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
                }
                
                .perf-page-container .am-slider {
                  accent-color: var(--primary) !important;
                }
                .perf-page-container .am-slider-labels {
                  color: var(--text-muted) !important;
                  font-weight: 700;
                }
                
                .perf-page-container .am-toggle-slider {
                  background: var(--bg-input) !important;
                  border: 1px solid var(--border-color);
                }
                .perf-page-container .am-toggle input:checked + .am-toggle-slider {
                  background: var(--success) !important;
                  border-color: var(--success);
                }
                
                .perf-page-container .am-code-tag {
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                  border: 1px solid var(--border-color) !important;
                  font-weight: 700;
                }
                .perf-page-container .am-code-tag button {
                  color: var(--text-muted) !important;
                }
                .perf-page-container .am-code-tag button:hover {
                  color: var(--danger) !important;
                }
                .perf-page-container .am-code-input {
                  background: transparent !important;
                  color: var(--text-main) !important;
                }
                
                .perf-page-container .am-footer {
                  border-top: 1px solid var(--border-color) !important;
                }
                .perf-page-container .am-cancel {
                  background: var(--bg-card) !important;
                  border: 1.5px solid var(--border-color) !important;
                  color: var(--text-muted) !important;
                  font-weight: 700;
                  transition: all 0.2s;
                }
                .perf-page-container .am-cancel:hover {
                  background: var(--bg-input) !important;
                  color: var(--text-main) !important;
                }
                .perf-page-container .am-submit {
                  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
                  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2) !important;
                  font-weight: 700;
                  transition: all 0.2s;
                }
                .perf-page-container .am-submit:hover:not(:disabled) {
                  transform: translateY(-1px);
                  box-shadow: 0 6px 18px rgba(124, 58, 237, 0.3) !important;
                }
                
                .perf-page-container .am-recip-item {
                  background: transparent !important;
                  transition: background 0.2s;
                  border-bottom: 1px solid var(--border-color) !important;
                  padding: 12px 18px;
                }
                .perf-page-container .am-recip-item:hover {
                  background: var(--bg-input) !important;
                }
            `}</style>

            <div className="perf-bg-glow-1" />

            <div className="am-page">
                <ConfirmDialog />
                <div className="am-topbar">
                    <button className="am-back" onClick={() => navigate('/monitoring')}>← Monitoring</button>
                </div>

                <div className="am-wrap">
                    <h1 className="am-title">{isEdit ? 'Edit monitor' : 'Add single monitor'} <span style={{color:'var(--primary)'}}>.</span></h1>

                    <form onSubmit={handleSubmit}>

                        {/* Monitor type */}
                        <div className="am-section">
                            <div className="am-section-label">Monitor type</div>
                            <div className="am-type-box">
                                <span style={{background:'var(--success)',color:'#fff',padding:'5px 8px',borderRadius:5,fontSize:11,fontWeight:800,fontFamily:'monospace',flexShrink:0}}>HTTP</span>
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
                                <div className="am-section-label" style={{marginBottom:0}}>How will we notify you?</div>
                                {recipientLimit && (
                                    <span style={{fontSize:12, color: recipientLimit.count >= recipientLimit.limit ? 'var(--danger)' : 'var(--primary)', fontWeight:700, background: recipientLimit.count >= recipientLimit.limit ? 'rgba(244,63,94,0.1)' : 'var(--primary-glow)', padding:'3px 10px', borderRadius:20}}>
                                        {recipientLimit.count} / {recipientLimit.limit} recipients used
                                    </span>
                                )}
                            </div>
                            <div className="am-recip-box">
                                <div style={{padding:'10px 16px', background:'var(--bg-input)', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{fontSize:14}}>✉️💬</span>
                                    <span style={{fontSize:12, color:'var(--text-muted)'}}>
                                        <strong style={{color:'var(--text-main)'}}>Email recipients</strong> — Add by name + email below. Use <strong>🌐 Sites</strong> to assign specific sites.
                                    </span>
                                </div>

                                {/* Individual recipients — scrollable */}
                                <div className="am-recip-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                    {recipients.length === 0 && !showAddRecip ? (
                                        <div style={{fontSize:13,color:'var(--text-muted)',padding:'16px 18px',textAlign:'center'}}>
                                            No recipients yet
                                        </div>
                                    ) : recipients.map(r => {
                                        const avatarColor = `hsl(${(r.name||'').charCodeAt(0)*37 % 360},55%,48%)`;
                                        const isSelected = selectedRecipients.includes(r._id);
                                        const sitesExpanded = expandedSites === r._id;
                                        const recipSites = recipSiteMap[r._id] || [];
                                        return (
                                            <div key={r._id}>
                                                {/* Recipient row */}
                                                {editRecipId === r._id ? (
                                                    <div style={{padding:'14px 16px', background:'var(--bg-input)', borderBottom:'1px solid var(--border-color)'}}>
                                                        <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                                                            <input value={editRecipForm.name} onChange={e=>setEditRecipForm({...editRecipForm,name:e.target.value})} placeholder="Name *" style={{flex:'1 1 100px',padding:'8px 10px',border:'1.5px solid var(--border-color)',borderRadius:7,fontSize:13,outline:'none',background:'var(--bg-card)',color:'var(--text-main)'}} />
                                                            <input value={editRecipForm.email} onChange={e=>setEditRecipForm({...editRecipForm,email:e.target.value})} placeholder="Email" style={{flex:'2 1 140px',padding:'8px 10px',border:'1.5px solid var(--border-color)',borderRadius:7,fontSize:13,outline:'none',background:'var(--bg-card)',color:'var(--text-main)'}} />
                                                            <div style={{display:'flex',flex:'1 1 130px',alignItems:'center',border:'1.5px solid var(--border-color)',borderRadius:7,overflow:'hidden',background:'var(--bg-card)'}}>
                                                                <span style={{padding:'0 8px',fontSize:12,color:'var(--text-muted)',background:'var(--bg-input)',borderRight:'1px solid var(--border-color)',height:'100%',display:'flex',alignItems:'center'}}>💬 +91</span>
                                                                <input value={(editRecipForm.phone||'').replace(/^91/,'')} onChange={e=>setEditRecipForm({...editRecipForm,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="WhatsApp" maxLength={10} style={{flex:1,padding:'8px 8px',border:'none',fontSize:13,outline:'none',background:'transparent',color:'var(--text-main)'}} />
                                                            </div>
                                                        </div>
                                                        <div style={{display:'flex',gap:8}}>
                                                            <button type="button" onClick={async()=>{
                                                                const phone = (editRecipForm.phone||'').length>=10 ? '91'+(editRecipForm.phone||'').replace(/^91/,'') : null;
                                                                await axios.put(`${API_URL}/api/recipients/${r._id}`,{name:editRecipForm.name,email:editRecipForm.email||null,phone}, { withCredentials: true });
                                                                setEditRecipId(null);
                                                                const res = await getRecipients();
                                                                setRecipients(res.data.recipients??res.data);
                                                            }} style={{padding:'7px 18px',background:'var(--primary)',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>Save</button>
                                                            <button type="button" onClick={()=>setEditRecipId(null)} style={{padding:'7px 14px',background:'var(--bg-card)',border:'1.5px solid var(--border-color)',borderRadius:7,fontSize:13,cursor:'pointer',color:'var(--text-muted)'}}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="am-recip-item" style={{cursor:'default'}}>
                                                        <div className="am-recip-avatar" style={{background:avatarColor}}>{(r.name||'?')[0].toUpperCase()}</div>
                                                        <div style={{flex:1,minWidth:0}}>
                                                            <div style={{fontWeight:600,fontSize:13,color:'var(--text-main)'}}>{r.name}</div>
                                                            <div style={{fontSize:11,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.email||r.phone||'—'}</div>
                                                        </div>
                                                        <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
                                                            {r.email && <span style={{fontSize:12,background:'var(--bg-input)',color:'var(--text-muted)',padding:'4px 8px',borderRadius:6,fontWeight:600,border:'1px solid var(--border-color)'}}>✉️ Email</span>}
                                                            {r.phone && <span style={{fontSize:12,background:'rgba(16,185,129,0.08)',color:'var(--success)',padding:'4px 8px',borderRadius:6,fontWeight:600,border:'1px solid rgba(16,185,129,0.15)'}}>💬 WA</span>}
                                                            <button type="button" title="Edit" onClick={()=>{setEditRecipId(r._id);setEditRecipForm({name:r.name,email:r.email||'',phone:r.phone||''});}}
                                                                style={{padding:'5px 10px',background:'var(--primary-glow)',border:'1.5px solid var(--border-color)',borderRadius:7,fontSize:12,color:'var(--primary)',cursor:'pointer',fontWeight:700}}>✏️ Edit</button>
                                                            <button type="button" title="Sites" onClick={()=>setExpandedSites(sitesExpanded?null:r._id)}
                                                                style={{padding:'5px 10px',background:'rgba(3,105,161,0.08)',border:'1.5px solid var(--border-color)',borderRadius:7,fontSize:12,color:'#0369a1',cursor:'pointer',fontWeight:700}}>
                                                                🌐 {recipSites.length===0?'All':recipSites.length} {sitesExpanded?'▲':'▼'}
                                                            </button>
                                                            <button type="button" title="Delete recipient"
                                                                onClick={async()=>{
                                                                    const _ok = await confirm(`Delete ${r.name}?`, {title:'Delete Recipient',confirmText:'Delete',danger:true}); if(!_ok) return;
                                                                    await axios.delete(`${API_URL}/api/recipients/${r._id}`, { withCredentials: true });
                                                                    setRecipients(prev=>prev.filter(x=>x._id!==r._id));
                                                                    setSelectedRecipients(prev=>prev.filter(x=>x!==r._id));
                                                                }}
                                                                style={{padding:'5px 8px',background:'rgba(244,63,94,0.08)',border:'1.5px solid rgba(244,63,94,0.2)',borderRadius:7,fontSize:13,color:'var(--danger)',cursor:'pointer'}}>🗑</button>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Site selector for this recipient */}
                                                {sitesExpanded && (
                                                    <div style={{padding:'10px 16px 12px',background:'var(--bg-input)',borderBottom:'1px solid var(--border-color)'}}>
                                                        <div style={{fontSize:11,color:'var(--text-muted)',marginBottom:8,fontWeight:600}}>Select sites for {r.name} (empty = all sites):</div>
                                                        <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                                                            {servers.map(s=>{
                                                                const sel = recipSites.includes(s._id);
                                                                return (
                                                                    <button key={s._id} type="button"
                                                                        onClick={()=>setRecipSiteMap(prev=>({...prev,[r._id]:sel?recipSites.filter(x=>x!==s._id):[...recipSites,s._id]}))}
                                                                        style={{padding:'3px 10px',borderRadius:20,border:`1.5px solid ${sel?'var(--primary)':'var(--border-color)'}`,background:sel?'var(--primary-glow)':'var(--bg-card)',color:sel?'var(--primary)':'var(--text-muted)',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                                                                        <span style={{width:6,height:6,borderRadius:'50%',background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b',flexShrink:0}} />
                                                                        {s.name} {sel&&'✓'}
                                                                    </button>
                                                                );
                                                            })}
                                                            {recipSites.length>0 && <button type="button" onClick={()=>setRecipSiteMap(prev=>({...prev,[r._id]:[]}))} style={{padding:'3px 10px',borderRadius:20,border:'1px dashed var(--border-color)',background:'transparent',color:'var(--text-muted)',fontSize:11,cursor:'pointer'}}>✕ All sites</button>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Add recipient inline */}
                                    {showAddRecip ? (
                                        <div style={{padding:'16px',background:'var(--bg-input)',borderTop:'1px solid var(--border-color)'}}>
                                            <div style={{fontSize:13,fontWeight:700,color:'var(--text-main)',marginBottom:12}}>➕ Add New Recipient</div>

                                            {/* Step 1: choose channel */}
                                            {!newRecip.channel ? (
                                                <div>
                                                    <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:8}}>How would you like to receive alerts?</div>
                                                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                                        {[
                                                            {ch:'email',    icon:'✉️', label:'Email',             color:'var(--primary)', bg:'var(--primary-glow)', border:'var(--border-color)'},
                                                        ].map(o => (
                                                            <button key={o.ch} type="button"
                                                                onClick={()=>!o.disabled && setNewRecip({...newRecip,channel:o.ch})}
                                                                disabled={o.disabled}
                                                                style={{padding:'10px 18px',borderRadius:10,border:`1.5px solid ${o.border}`,background:o.bg,color:o.color,fontWeight:700,fontSize:13,cursor:o.disabled?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:7,opacity:o.disabled?0.6:1}}>
                                                                {o.icon} {o.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <button type="button" onClick={()=>{setShowAddRecip(false);setNewRecip({name:'',email:'',phone:'',channel:''}); }} style={{marginTop:10,padding:'7px 18px',background:'var(--bg-card)',border:'1.5px solid var(--border-color)',borderRadius:8,color:'var(--text-muted)',fontSize:13,fontWeight:600,cursor:'pointer'}}>✕ Cancel</button>
                                                </div>
                                            ) : (
                                                /* Step 2: fill in details */
                                                <div>
                                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                                                        <span style={{fontSize:12,color:'var(--text-muted)'}}>
                                                            {newRecip.channel==='email'?'✉️ Email':newRecip.channel==='whatsapp'?'💬 WhatsApp':'🔔 Email & WhatsApp'}
                                                        </span>
                                                        <button type="button" onClick={()=>setNewRecip({...newRecip,channel:''})} style={{fontSize:11,color:'var(--primary)',background:'none',border:'none',cursor:'pointer'}}>← Change</button>
                                                    </div>
                                                    <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                                                        <input value={newRecip.name} onChange={e=>setNewRecip({...newRecip,name:e.target.value})} placeholder="Full Name *" autoFocus
                                                            style={{flex:'2 1 120px',padding:'9px 12px',border:'1.5px solid var(--border-color)',borderRadius:8,fontSize:13,outline:'none',background:'var(--bg-card)',color:'var(--text-main)'}} />
                                                        {(newRecip.channel==='email'||newRecip.channel==='both') && (
                                                            <input value={newRecip.email} onChange={e=>setNewRecip({...newRecip,email:e.target.value})} placeholder="Email address *" type="email"
                                                                style={{flex:'3 1 160px',padding:'9px 12px',border:'1.5px solid var(--border-color)',borderRadius:8,fontSize:13,outline:'none',background:'var(--bg-card)',color:'var(--text-main)'}} />
                                                        )}
                                                        {(newRecip.channel==='whatsapp'||newRecip.channel==='both') && (
                                                            <div style={{flex:'2 1 130px',display:'flex',alignItems:'center',border:'1.5px solid var(--border-color)',borderRadius:8,overflow:'hidden',background:'var(--bg-card)'}}>
                                                                <span style={{padding:'0 10px',fontSize:12,color:'var(--text-muted)',background:'var(--bg-input)',borderRight:'1px solid var(--border-color)',height:'100%',display:'flex',alignItems:'center',whiteSpace:'nowrap'}}>💬 +91</span>
                                                                <input value={newRecip.phone} onChange={e=>setNewRecip({...newRecip,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="WhatsApp number *" maxLength={10}
                                                                    style={{flex:1,padding:'9px 10px',border:'none',fontSize:13,outline:'none',background:'transparent',color:'var(--text-main)'}} />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{display:'flex',gap:8}}>
                                                        <button type="button" onClick={async()=>{
                                                            if(!newRecip.name.trim()) return;
                                                            const phone = newRecip.phone.length===10 ? '91'+newRecip.phone : null;
                                                            const email = newRecip.email||null;
                                                            const res = await axios.post(`${API_URL}/api/recipients`,{name:newRecip.name.trim(),email,phone,servers:[]}, { withCredentials: true });
                                                            const recipObj = res.data;
                                                            setRecipients(prev=>[...prev,recipObj]);
                                                            setRecipSiteMap(prev=>({...prev,[recipObj._id]:[]}));
                                                            setNewRecip({name:'',email:'',phone:'',channel:''});
                                                            setShowAddRecip(false);
                                                        }} style={{padding:'8px 20px',background:'var(--primary)',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>Add Recipient</button>
                                                        <button type="button" onClick={()=>{setShowAddRecip(false);setNewRecip({name:'',email:'',phone:'',channel:''}); }} style={{padding:'8px 18px',background:'var(--bg-card)',border:'1.5px solid var(--border-color)',borderRadius:8,fontSize:13,cursor:'pointer',color:'var(--text-muted)',fontWeight:600}}>✕ Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : recipientLimit && recipients.length >= recipientLimit.limit ? (
                                        <div style={{padding:'12px 16px', borderTop:'1px solid var(--border-color)', background:'rgba(245,158,11,0.08)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderRadius:'0 0 20px 20px'}}>
                                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                                                <span style={{fontSize:16}}>⚠️</span>
                                                <div>
                                                    <div style={{fontSize:13, fontWeight:700, color:'var(--warning)'}}>Recipient limit reached ({recipientLimit.count}/{recipientLimit.limit})</div>
                                                    <div style={{fontSize:12, color:'var(--text-muted)', marginTop:1}}>Upgrade your plan to add more recipients</div>
                                                </div>
                                            </div>
                                            <a href="/account" style={{padding:'6px 14px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap'}}>
                                                Upgrade →
                                            </a>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={()=>setShowAddRecip(true)}
                                            style={{width:'100%',padding:'10px',background:'transparent',border:'none',color:'var(--primary)',fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'left',paddingLeft:18,borderTop:'1px solid var(--border-color)'}}>
                                            ➕ Add new recipient
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div style={{fontSize:12,color:'var(--text-muted)',marginTop:6}}>
                                Use the <strong>🌐 Sites</strong> button per recipient to assign specific sites. Leave empty = all sites.
                            </div>

                            {/* Saved Integrations (Webhook etc.) */}
                            {savedIntegrations.length > 0 && (
                                <div style={{ marginTop:10 }}>
                                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', marginBottom:6 }}>🔗 Active Integrations <span style={{fontWeight:400, color:'var(--text-muted)'}}>(from Integrations page)</span></div>
                                    {savedIntegrations.map(intg => {
                                        const icons = { webhook:'🔗', slack:'', discord:'🎮', telegram:'✈️' };
                                        const siteSel = integSiteMap[intg._id] || [];
                                        const isExpanded = integSiteExpanded === intg._id;
                                        const saveIntgSites = async (newSites) => {
                                            await axios.post(`${API_URL}/api/integrations/${intg.type}`,
                                                { config: intg.config, events: intg.events, servers: newSites },
                                                { withCredentials: true });
                                        };
                                        return (
                                            <div key={intg._id} style={{ marginBottom:6 }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'var(--primary-glow)', border:'1px solid var(--border-color)', borderRadius:10 }}>
                                                    <span style={{ fontSize:16 }}>{icons[intg.type]||'🔗'}</span>
                                                    <div style={{ flex:1 }}>
                                                        <div style={{ fontWeight:700, fontSize:13, color:'var(--text-main)', textTransform:'capitalize' }}>{intg.type}</div>
                                                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{intg.config?.url ? intg.config.url.slice(0,35)+'...' : 'Configured'}</div>
                                                    </div>
                                                    <span style={{ fontSize:11, fontWeight:700, background:'rgba(16,185,129,0.08)', color:'var(--success)', padding:'2px 8px', borderRadius:20, border:'1px solid rgba(16,185,129,0.15)' }}>✓ Active</span>
                                                    <button type="button" onClick={()=>setIntegSiteExpanded(isExpanded?null:intg._id)}
                                                        style={{ padding:'4px 10px', background:'rgba(3,105,161,0.08)', border:'1.5px solid var(--border-color)', borderRadius:7, fontSize:11, color:'#0369a1', cursor:'pointer', fontWeight:700 }}>
                                                        🌐 {siteSel.length===0?'All':siteSel.length} {isExpanded?'▲':'▼'}
                                                    </button>
                                                    <button type="button" onClick={async()=>{
                                                        const _ok2 = await confirm(`Remove ${intg.type}?`, {title:'Remove Integration',confirmText:'Remove',danger:true}); if(!_ok2) return;
                                                        await axios.delete(`${API_URL}/api/integrations/${intg.type}`, { withCredentials: true });
                                                        setSavedIntegrations(p=>p.filter(x=>x._id!==intg._id));
                                                    }} style={{ padding:'4px 8px', background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)', borderRadius:6, color:'var(--danger)', cursor:'pointer', fontSize:12 }}>🗑</button>
                                                </div>
                                                {isExpanded && (
                                                    <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:'0 0 10px 10px', padding:'10px 14px', marginTop:-4 }}>
                                                        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>Sites for {intg.type} (empty = all sites):</div>
                                                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                                                            {servers.map(s => {
                                                                const sel = siteSel.includes(s._id);
                                                                return (
                                                                    <button key={s._id} type="button"
                                                                        onClick={async()=>{
                                                                            const newSites = sel ? siteSel.filter(x=>x!==s._id) : [...siteSel, s._id];
                                                                            setIntegSiteMap(p=>({...p,[intg._id]:newSites}));
                                                                            await saveIntgSites(newSites);
                                                                        }}
                                                                        style={{ padding:'3px 10px', borderRadius:20, border:`1.5px solid ${sel?'var(--primary)':'var(--border-color)'}`, background:sel?'var(--primary-glow)':'var(--bg-card)', color:sel?'var(--primary)':'var(--text-muted)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                                                        <span style={{ width:6, height:6, borderRadius:'50%', background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b', flexShrink:0 }}/>
                                                                        {s.name} {sel&&'✓'}
                                                                    </button>
                                                                );
                                                            })}
                                                            {siteSel.length>0 && <button type="button" onClick={async()=>{setIntegSiteMap(p=>({...p,[intg._id]:[]})); await saveIntgSites([]);}} style={{ padding:'3px 10px', borderRadius:20, border:'1px dashed var(--border-color)', background:'transparent', color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>✕ All sites</button>}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Info note */}
                            <div style={{ marginTop:12, borderRadius:12, overflow:'hidden', border:'1px solid var(--border-color)', boxShadow:'var(--card-shadow)' }}>
                                {/* Header */}
                                <div style={{ background:'var(--primary)', padding:'10px 16px' }}>
                                    <div style={{ fontSize:12, fontWeight:800, color:'#fff', letterSpacing:0.3 }}>📣 How alerts are sent</div>
                                </div>
                                {/* Row 1 — Email & WhatsApp */}
                                <div style={{ background:'rgba(16, 185, 129, 0.04)', padding:'10px 16px', borderBottom:'1px solid var(--border-color)', display:'flex', alignItems:'flex-start', gap:10 }}>
                                    <div style={{ fontSize:18, marginTop:1 }}>✉️💬</div>
                                    <div>
                                        <div style={{ fontSize:12, fontWeight:700, color:'var(--success)', marginBottom:2 }}>Email & WhatsApp</div>
                                        <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6 }}>
                                            Add recipients <strong>above</strong> using <strong>➕ Add new recipient</strong>.<br/>
                                            Enter name + email / mobile number.
                                        </div>
                                    </div>
                                </div>
                                {/* Row 2 — Webhook, RocketChat etc */}
                                <div style={{ background:'rgba(245, 158, 11, 0.04)', padding:'10px 16px', display:'flex', alignItems:'flex-start', gap:10 }}>
                                    <div style={{ fontSize:18, marginTop:1 }}>🔗</div>
                                    <div style={{ flex:1 }}>
                                        <div style={{ fontSize:12, fontWeight:700, color:'var(--warning)', marginBottom:4 }}>Webhook · Rocket.Chat · Slack · Telegram · Discord</div>
                                        <div style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.6, marginBottom:6 }}>
                                            Ye channels <strong>Integrations page</strong> se add karo — phir yahan automatically dikhenge.
                                        </div>
                                        <a href="/integrations" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:7, fontSize:11, fontWeight:700, textDecoration:'none', boxShadow:'0 2px 8px rgba(124,58,237,0.2)' }}>
                                            Go to Integrations →
                                        </a>
                                    </div>
                                </div>
                            </div>
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
                            <button type="button" className="am-cancel" onClick={() => navigate('/monitoring')}>Cancel</button>
                            <button type="submit" className="am-submit" disabled={saving}>
                                {saving ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save changes →' : 'Create monitor →')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
