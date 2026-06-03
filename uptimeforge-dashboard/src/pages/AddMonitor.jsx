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
        <div className="am-page">
            <ConfirmDialog />
            <div className="am-topbar">
                <button className="am-back" onClick={() => navigate('/monitoring')}>← Monitoring</button>
            </div>

            <div className="am-wrap">
                <h1 className="am-title">{isEdit ? 'Edit monitor' : 'Add single monitor'} <span style={{color:'#7c3aed'}}>.</span></h1>

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
                            <div className="am-section-label" style={{marginBottom:0}}>How will we notify you?</div>
                            {recipientLimit && (
                                <span style={{fontSize:12, color: recipientLimit.count >= recipientLimit.limit ? '#ef4444' : '#7c3aed', fontWeight:700, background: recipientLimit.count >= recipientLimit.limit ? '#fee2e2' : '#f5f3ff', padding:'3px 10px', borderRadius:20}}>
                                    {recipientLimit.count} / {recipientLimit.limit} recipients used
                                </span>
                            )}
                        </div>
                        <div className="am-recip-box">
                            <div style={{padding:'10px 16px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{fontSize:14}}>✉️💬</span>
                                <span style={{fontSize:12, color:'#64748b'}}>
                                    <strong style={{color:'#1e1b4b'}}>Email & WhatsApp recipients</strong> — Add by name + email/phone below. Use <strong>🌐 Sites</strong> to assign specific sites.
                                </span>
                            </div>

                            {/* Individual recipients — scrollable */}
                            <div className="am-recip-list" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                {recipients.length === 0 && !showAddRecip ? (
                                    <div style={{fontSize:13,color:'#94a3b8',padding:'16px 18px',textAlign:'center'}}>
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
                                                <div style={{padding:'14px 16px', background:'#f8fafc', borderBottom:'1px solid #f1f5f9'}}>
                                                    <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
                                                        <input value={editRecipForm.name} onChange={e=>setEditRecipForm({...editRecipForm,name:e.target.value})} placeholder="Name *" style={{flex:'1 1 100px',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,outline:'none'}} />
                                                        <input value={editRecipForm.email} onChange={e=>setEditRecipForm({...editRecipForm,email:e.target.value})} placeholder="Email" style={{flex:'2 1 140px',padding:'8px 10px',border:'1.5px solid #e2e8f0',borderRadius:7,fontSize:13,outline:'none'}} />
                                                        <div style={{display:'flex',flex:'1 1 130px',alignItems:'center',border:'1.5px solid #e2e8f0',borderRadius:7,overflow:'hidden',background:'#fff'}}>
                                                            <span style={{padding:'0 8px',fontSize:12,color:'#64748b',background:'#f8fafc',borderRight:'1px solid #e2e8f0',height:'100%',display:'flex',alignItems:'center'}}>💬 +91</span>
                                                            <input value={(editRecipForm.phone||'').replace(/^91/,'')} onChange={e=>setEditRecipForm({...editRecipForm,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="WhatsApp" maxLength={10} style={{flex:1,padding:'8px 8px',border:'none',fontSize:13,outline:'none'}} />
                                                        </div>
                                                    </div>
                                                    <div style={{display:'flex',gap:8}}>
                                                        <button type="button" onClick={async()=>{
                                                            const phone = (editRecipForm.phone||'').length>=10 ? '91'+(editRecipForm.phone||'').replace(/^91/,'') : null;
                                                            await axios.put(`${API_URL}/api/recipients/${r._id}`,{name:editRecipForm.name,email:editRecipForm.email||null,phone}, { withCredentials: true });
                                                            setEditRecipId(null);
                                                            const res = await getRecipients();
                                                            setRecipients(res.data.recipients??res.data);
                                                        }} style={{padding:'7px 18px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:7,fontSize:13,fontWeight:700,cursor:'pointer'}}>Save</button>
                                                        <button type="button" onClick={()=>setEditRecipId(null)} style={{padding:'7px 14px',background:'#f1f5f9',border:'none',borderRadius:7,fontSize:13,cursor:'pointer',color:'#64748b'}}>Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="am-recip-item" style={{cursor:'default'}}>
                                                    <div className="am-recip-avatar" style={{background:avatarColor}}>{(r.name||'?')[0].toUpperCase()}</div>
                                                    <div style={{flex:1,minWidth:0}}>
                                                        <div style={{fontWeight:600,fontSize:13,color:'#1e1b4b'}}>{r.name}</div>
                                                        <div style={{fontSize:11,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.email||r.phone||'—'}</div>
                                                    </div>
                                                    <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0,flexWrap:'wrap'}}>
                                                        {r.email && <span style={{fontSize:12,background:'#f1f5f9',color:'#64748b',padding:'4px 8px',borderRadius:6,fontWeight:600}}>✉️ Email</span>}
                                                        {r.phone && <span style={{fontSize:12,background:'#f0fdf4',color:'#16a34a',padding:'4px 8px',borderRadius:6,fontWeight:600}}>💬 WA</span>}
                                                        <button type="button" title="Edit" onClick={()=>{setEditRecipId(r._id);setEditRecipForm({name:r.name,email:r.email||'',phone:r.phone||''});}}
                                                            style={{padding:'5px 10px',background:'#f5f3ff',border:'1.5px solid #ddd6fe',borderRadius:7,fontSize:12,color:'#7c3aed',cursor:'pointer',fontWeight:700}}>✏️ Edit</button>
                                                        <button type="button" title="Sites" onClick={()=>setExpandedSites(sitesExpanded?null:r._id)}
                                                            style={{padding:'5px 10px',background:'#f0f9ff',border:'1.5px solid #bae6fd',borderRadius:7,fontSize:12,color:'#0369a1',cursor:'pointer',fontWeight:700}}>
                                                            🌐 {recipSites.length===0?'All':recipSites.length} {sitesExpanded?'▲':'▼'}
                                                        </button>
                                                        <button type="button" title="Delete recipient"
                                                            onClick={async()=>{
                                                                const _ok = await confirm(`Delete ${r.name}?`, {title:'Delete Recipient',confirmText:'Delete',danger:true}); if(!_ok) return;
                                                                await axios.delete(`${API_URL}/api/recipients/${r._id}`, { withCredentials: true });
                                                                setRecipients(prev=>prev.filter(x=>x._id!==r._id));
                                                                setSelectedRecipients(prev=>prev.filter(x=>x!==r._id));
                                                            }}
                                                            style={{padding:'5px 8px',background:'#fef2f2',border:'1.5px solid #fecdd3',borderRadius:7,fontSize:13,color:'#dc2626',cursor:'pointer'}}>🗑</button>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Site selector for this recipient */}
                                            {sitesExpanded && (
                                                <div style={{padding:'10px 16px 12px',background:'#f8fafc',borderBottom:'1px solid #f1f5f9'}}>
                                                    <div style={{fontSize:11,color:'#64748b',marginBottom:8,fontWeight:600}}>Select sites for {r.name} (empty = all sites):</div>
                                                    <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                                                        {servers.map(s=>{
                                                            const sel = recipSites.includes(s._id);
                                                            return (
                                                                <button key={s._id} type="button"
                                                                    onClick={()=>setRecipSiteMap(prev=>({...prev,[r._id]:sel?recipSites.filter(x=>x!==s._id):[...recipSites,s._id]}))}
                                                                    style={{padding:'3px 10px',borderRadius:20,border:`1.5px solid ${sel?'#7c3aed':'#e2e8f0'}`,background:sel?'#f5f3ff':'#fff',color:sel?'#7c3aed':'#64748b',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                                                                    <span style={{width:6,height:6,borderRadius:'50%',background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b',flexShrink:0}} />
                                                                    {s.name} {sel&&'✓'}
                                                                </button>
                                                            );
                                                        })}
                                                        {recipSites.length>0 && <button type="button" onClick={()=>setRecipSiteMap(prev=>({...prev,[r._id]:[]}))} style={{padding:'3px 10px',borderRadius:20,border:'1px dashed #e2e8f0',background:'transparent',color:'#94a3b8',fontSize:11,cursor:'pointer'}}>✕ All sites</button>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add recipient inline */}
                                {showAddRecip ? (
                                    <div style={{padding:'16px',background:'#fafafa',borderTop:'1px solid #f1f5f9'}}>
                                        <div style={{fontSize:13,fontWeight:700,color:'#1e1b4b',marginBottom:12}}>➕ Add New Recipient</div>

                                        {/* Step 1: choose channel */}
                                        {!newRecip.channel ? (
                                            <div>
                                                <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>How would you like to receive alerts?</div>
                                                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                                    {[
                                                        {ch:'email',    icon:'✉️', label:'Email',             color:'#7c3aed', bg:'#f5f3ff', border:'#ddd6fe'},
                                                    ].map(o => (
                                                        <button key={o.ch} type="button"
                                                            onClick={()=>!o.disabled && setNewRecip({...newRecip,channel:o.ch})}
                                                            disabled={o.disabled}
                                                            style={{padding:'10px 18px',borderRadius:10,border:`1.5px solid ${o.border}`,background:o.bg,color:o.color,fontWeight:700,fontSize:13,cursor:o.disabled?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:7,opacity:o.disabled?0.6:1}}>
                                                            {o.icon} {o.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button type="button" onClick={()=>{setShowAddRecip(false);setNewRecip({name:'',email:'',phone:'',channel:''}); }} style={{marginTop:10,padding:'7px 18px',background:'#f1f5f9',border:'1.5px solid #e2e8f0',borderRadius:8,color:'#475569',fontSize:13,fontWeight:600,cursor:'pointer'}}>✕ Cancel</button>
                                            </div>
                                        ) : (
                                            /* Step 2: fill in details */
                                            <div>
                                                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                                                    <span style={{fontSize:12,color:'#64748b'}}>
                                                        {newRecip.channel==='email'?'✉️ Email':newRecip.channel==='whatsapp'?'💬 WhatsApp':'🔔 Email & WhatsApp'}
                                                    </span>
                                                    <button type="button" onClick={()=>setNewRecip({...newRecip,channel:''})} style={{fontSize:11,color:'#7c3aed',background:'none',border:'none',cursor:'pointer'}}>← Change</button>
                                                </div>
                                                <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                                                    <input value={newRecip.name} onChange={e=>setNewRecip({...newRecip,name:e.target.value})} placeholder="Full Name *" autoFocus
                                                        style={{flex:'2 1 120px',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none'}} />
                                                    {(newRecip.channel==='email'||newRecip.channel==='both') && (
                                                        <input value={newRecip.email} onChange={e=>setNewRecip({...newRecip,email:e.target.value})} placeholder="Email address *" type="email"
                                                            style={{flex:'3 1 160px',padding:'9px 12px',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,outline:'none'}} />
                                                    )}
                                                    {(newRecip.channel==='whatsapp'||newRecip.channel==='both') && (
                                                        <div style={{flex:'2 1 130px',display:'flex',alignItems:'center',border:'1.5px solid #e2e8f0',borderRadius:8,overflow:'hidden',background:'#fff'}}>
                                                            <span style={{padding:'0 10px',fontSize:12,color:'#64748b',background:'#f8fafc',borderRight:'1px solid #e2e8f0',height:'100%',display:'flex',alignItems:'center',whiteSpace:'nowrap'}}>💬 +91</span>
                                                            <input value={newRecip.phone} onChange={e=>setNewRecip({...newRecip,phone:e.target.value.replace(/\D/g,'').slice(0,10)})} placeholder="WhatsApp number *" maxLength={10}
                                                                style={{flex:1,padding:'9px 10px',border:'none',fontSize:13,outline:'none'}} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{display:'flex',gap:8}}>
                                                    <button type="button" onClick={async()=>{
                                                        if(!newRecip.name.trim()) return;
                                                        const phone = newRecip.phone.length===10 ? '91'+newRecip.phone : null;
                                                        const email = newRecip.email||null;
                                                        const res = await axios.post(`${API_URL}/api/recipients`,{name:newRecip.name.trim(),email,phone,servers:[]}, { withCredentials: true });
                                                        const rec = res.data;
                                                        setRecipients(prev=>[...prev,rec]);
                                                        setRecipSiteMap(prev=>({...prev,[rec._id]:[]}));
                                                        setNewRecip({name:'',email:'',phone:'',channel:''});
                                                        setShowAddRecip(false);
                                                    }} style={{padding:'8px 20px',background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer'}}>Add Recipient</button>
                                                    <button type="button" onClick={()=>{setShowAddRecip(false);setNewRecip({name:'',email:'',phone:'',channel:''}); }} style={{padding:'8px 18px',background:'#f1f5f9',border:'1.5px solid #e2e8f0',borderRadius:8,fontSize:13,cursor:'pointer',color:'#475569',fontWeight:600}}>✕ Cancel</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : recipientLimit && recipients.length >= recipientLimit.limit ? (
                                    <div style={{padding:'12px 16px', borderTop:'1px solid #f1f5f9', background:'#fef9ec', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                                        <div style={{display:'flex', alignItems:'center', gap:8}}>
                                            <span style={{fontSize:16}}>⚠️</span>
                                            <div>
                                                <div style={{fontSize:13, fontWeight:700, color:'#92400e'}}>Recipient limit reached ({recipientLimit.count}/{recipientLimit.limit})</div>
                                                <div style={{fontSize:12, color:'#b45309', marginTop:1}}>Upgrade your plan to add more recipients</div>
                                            </div>
                                        </div>
                                        <a href="/account" style={{padding:'6px 14px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap'}}>
                                            Upgrade →
                                        </a>
                                    </div>
                                ) : (
                                    <button type="button" onClick={()=>setShowAddRecip(true)}
                                        style={{width:'100%',padding:'10px',background:'transparent',border:'none',color:'#7c3aed',fontSize:13,fontWeight:600,cursor:'pointer',textAlign:'left',paddingLeft:18,borderTop:'1px solid #f1f5f9'}}>
                                        ➕ Add new recipient
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{fontSize:12,color:'#94a3b8',marginTop:6}}>
                            Use the <strong>🌐 Sites</strong> button per recipient to assign specific sites. Leave empty = all sites.
                        </div>

                        {/* Saved Integrations (Webhook etc.) */}
                        {savedIntegrations.length > 0 && (
                            <div style={{ marginTop:10 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:'#1e1b4b', marginBottom:6 }}>🔗 Active Integrations <span style={{fontWeight:400, color:'#94a3b8'}}>(from Integrations page)</span></div>
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
                                            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:10 }}>
                                                <span style={{ fontSize:16 }}>{icons[intg.type]||'🔗'}</span>
                                                <div style={{ flex:1 }}>
                                                    <div style={{ fontWeight:700, fontSize:13, color:'#1e1b4b', textTransform:'capitalize' }}>{intg.type}</div>
                                                    <div style={{ fontSize:11, color:'#94a3b8' }}>{intg.config?.url ? intg.config.url.slice(0,35)+'...' : 'Configured'}</div>
                                                </div>
                                                <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'2px 8px', borderRadius:20 }}>✓ Active</span>
                                                <button type="button" onClick={()=>setIntegSiteExpanded(isExpanded?null:intg._id)}
                                                    style={{ padding:'4px 10px', background:'#f0f9ff', border:'1.5px solid #bae6fd', borderRadius:7, fontSize:11, color:'#0369a1', cursor:'pointer', fontWeight:700 }}>
                                                    🌐 {siteSel.length===0?'All':siteSel.length} {isExpanded?'▲':'▼'}
                                                </button>
                                                <button type="button" onClick={async()=>{
                                                    const _ok2 = await confirm(`Remove ${intg.type}?`, {title:'Remove Integration',confirmText:'Remove',danger:true}); if(!_ok2) return;
                                                    await axios.delete(`${API_URL}/api/integrations/${intg.type}`, { withCredentials: true });
                                                    setSavedIntegrations(p=>p.filter(x=>x._id!==intg._id));
                                                }} style={{ padding:'4px 8px', background:'#fef2f2', border:'1px solid #fecdd3', borderRadius:6, color:'#dc2626', cursor:'pointer', fontSize:12 }}>🗑</button>
                                            </div>
                                            {isExpanded && (
                                                <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'0 0 10px 10px', padding:'10px 14px', marginTop:-4 }}>
                                                    <div style={{ fontSize:11, color:'#64748b', marginBottom:8 }}>Sites for {intg.type} (empty = all sites):</div>
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
                                                                    style={{ padding:'3px 10px', borderRadius:20, border:`1.5px solid ${sel?'#7c3aed':'#e2e8f0'}`, background:sel?'#f5f3ff':'#fff', color:sel?'#7c3aed':'#64748b', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                                                                    <span style={{ width:6, height:6, borderRadius:'50%', background:s.status==='up'?'#10b981':s.status==='down'?'#ef4444':'#f59e0b', flexShrink:0 }}/>
                                                                    {s.name} {sel&&'✓'}
                                                                </button>
                                                            );
                                                        })}
                                                        {siteSel.length>0 && <button type="button" onClick={async()=>{setIntegSiteMap(p=>({...p,[intg._id]:[]})); await saveIntgSites([]);}} style={{ padding:'3px 10px', borderRadius:20, border:'1px dashed #e2e8f0', background:'transparent', color:'#94a3b8', fontSize:11, cursor:'pointer' }}>✕ All sites</button>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Info note */}
                        <div style={{ marginTop:12, borderRadius:12, overflow:'hidden', border:'1px solid #e2e8f0' }}>
                            {/* Header */}
                            <div style={{ background:'#1e1b4b', padding:'10px 16px' }}>
                                <div style={{ fontSize:12, fontWeight:800, color:'#fff', letterSpacing:0.3 }}>📣 How alerts are sent</div>
                            </div>
                            {/* Row 1 — Email & WhatsApp */}
                            <div style={{ background:'#f0fdf4', padding:'10px 16px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'flex-start', gap:10 }}>
                                <div style={{ fontSize:18, marginTop:1 }}>✉️💬</div>
                                <div>
                                    <div style={{ fontSize:12, fontWeight:700, color:'#15803d', marginBottom:2 }}>Email & WhatsApp</div>
                                    <div style={{ fontSize:11, color:'#166534', lineHeight:1.6 }}>
                                        Add recipients <strong>above</strong> using <strong>➕ Add new recipient</strong>.<br/>
                                        Enter name + email / mobile number.
                                    </div>
                                </div>
                            </div>
                            {/* Row 2 — Webhook, RocketChat etc */}
                            <div style={{ background:'#fef9ec', padding:'10px 16px', display:'flex', alignItems:'flex-start', gap:10 }}>
                                <div style={{ fontSize:18, marginTop:1 }}>🔗</div>
                                <div style={{ flex:1 }}>
                                    <div style={{ fontSize:12, fontWeight:700, color:'#92400e', marginBottom:4 }}>Webhook · Rocket.Chat · Slack · Telegram · Discord</div>
                                    <div style={{ fontSize:11, color:'#78350f', lineHeight:1.6, marginBottom:6 }}>
                                        Ye channels <strong>Integrations page</strong> se add karo — phir yahan automatically dikhenge.
                                    </div>
                                    <a href="/integrations" style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', background:'linear-gradient(135deg,#f5455c,#e11d48)', color:'#fff', borderRadius:7, fontSize:11, fontWeight:700, textDecoration:'none' }}>
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
    );
}
