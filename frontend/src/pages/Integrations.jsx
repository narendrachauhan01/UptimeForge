import React, { useState, useEffect } from 'react';
import { API_URL } from '../api';
import axios from 'axios';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

// ── Modal ──────────────────────────────────────────────────────────────────
function IntegrationModal({ integration, onClose, onSave }) {
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);

    if (!integration) return null;

    const handleSave = async () => {
        setSaving(true);
        try { await onSave(integration.key, form); onClose(); }
        catch { }
        setSaving(false);
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:480, padding:32, boxShadow:'0 24px 80px rgba(0,0,0,0.5)', position:'relative' }}>
                {/* Close */}
                <button onClick={onClose} style={{ position:'absolute', top:16, right:16, background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', width:30, height:30, borderRadius:8, cursor:'pointer', fontSize:16 }}>✕</button>

                {/* Header */}
                <div style={{ textAlign:'center', marginBottom:24 }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>{integration.iconEl||integration.icon}</div>
                    <h2 style={{ color:'#fff', margin:0, fontSize:20, fontWeight:800 }}>
                        Add <span style={{ color: integration.color }}>{integration.name}</span> integration
                    </h2>
                </div>

                {/* Fields */}
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {integration.fields.map(field => (
                        <div key={field.key}>
                            <label style={{ fontSize:13, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>{field.label}</label>
                            {field.hint && <div style={{ fontSize:12, color:'#94a3b8', marginBottom:8 }}>{field.hint}</div>}
                            {field.type === 'select' ? (
                                <select value={form[field.key]||field.default||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none' }}>
                                    {field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : (
                                <input type={field.type||'text'} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}
                                    placeholder={field.placeholder}
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Buttons */}
                <div style={{ display:'flex', gap:12, marginTop:24 }}>
                    <button onClick={onClose} style={{ flex:1, padding:'12px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:10, background:'transparent', color:'#94a3b8', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        style={{ flex:2, padding:'12px', border:'none', borderRadius:10, background:`linear-gradient(135deg,${integration.color},${integration.color}cc)`, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', opacity:saving?0.7:1 }}>
                        {saving ? 'Saving...' : 'Create integration'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── SVG Icons ──────────────────────────────────────────────────────────────
const IcoWhatsApp = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
);
const IcoGmail = () => (
    <svg width="26" height="26" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
);
const IcoWebhook = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);
const IcoSlack = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#4a154b"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
);
const IcoTelegram = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#0088cc"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.820 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);
const IcoDiscord = () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
);

// ── Integration definitions ──────────────────────────────────────────────
const INTEGRATIONS = [
    {
        key: 'whatsapp', iconEl: <IcoWhatsApp />, name: 'WhatsApp', color: '#7c3aed',
        desc: 'WhatsApp alerts via Green API — configured by admin. Add your phone number as a recipient to receive alerts.',
        status: 'platform', fields: [],
    },
    {
        key: 'webhook', iconEl: <IcoWebhook />, name: 'Webhook', color: '#7c3aed',
        desc: 'POST to any URL when a monitor status changes.',
        status: 'active',
        fields: [
            { key:'url',    label:'Webhook URL', placeholder:'https://your-server.com/webhook', hint:'We will POST JSON with site name, status, and timestamp' },
            { key:'secret', label:'Secret Header (optional)', placeholder:'your-secret-key', hint:'Sent as X-UptimeForge-Secret header for verification' },
            { key:'events', label:'Events to notify about', type:'select', default:'all',
              options:[{value:'all',label:'Up events, Down events, SSL & Domain expiry'},{value:'down',label:'Down events only'},{value:'down_ssl',label:'Down events + SSL & Domain expiry'}] },
        ],
    },
    { key:'slack',    iconEl:<IcoSlack />,    name:'Slack',    color:'#7c3aed', desc:'Send alerts to your Slack channel via incoming webhook.', status:'active',
      fields:[{key:'url', label:'Slack Webhook URL', placeholder:'https://hooks.slack.com/services/...', hint:'Create from Slack → Apps → Incoming Webhooks'},
              {key:'events',label:'Events',type:'select',default:'all',options:[{value:'all',label:'All events'},{value:'down',label:'Down only'}]}]},
    { key:'telegram', iconEl:<IcoTelegram />, name:'Telegram', color:'#7c3aed', desc:'Get instant alerts via Telegram bot messages.', status:'active',
      fields:[{key:'botToken',label:'Bot Token',placeholder:'1234567890:ABCdef...',hint:'Create bot via @BotFather on Telegram'},
              {key:'chatId', label:'Chat ID',  placeholder:'-1001234567890', hint:'Your chat or group ID'},
              {key:'events',label:'Events',type:'select',default:'all',options:[{value:'all',label:'All events'},{value:'down',label:'Down only'}]}]},
    { key:'discord',  iconEl:<IcoDiscord />,  name:'Discord',  color:'#7c3aed', desc:'Post status updates to your Discord server.', status:'active',
      fields:[{key:'url',label:'Discord Webhook URL',placeholder:'https://discord.com/api/webhooks/...',hint:'Create from Discord Channel → Edit → Integrations → Webhooks'},
              {key:'events',label:'Events',type:'select',default:'all',options:[{value:'all',label:'All events'},{value:'down',label:'Down only'}]}]},
    { key:'email',    iconEl:<IcoGmail />,    name:'Email',    color:'#7c3aed', desc:'Email alerts are sent automatically. Configure SMTP in Admin Panel.', status:'email', fields:[] },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Integrations() {
    const [activeModal, setActiveModal] = useState(null);
    const [saved, setSaved] = useState({});
    const [emailActive, setEmailActive] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

    useEffect(() => {
        // Load user integrations
        axios.get(`${API_URL}/api/integrations`, { headers: authHeaders() })
            .then(r => {
                const map = {};
                r.data.forEach(i => { map[i.type] = true; });
                setSaved(map);
            }).catch(() => {});
        // Check if email SMTP is configured
        axios.get(`${API_URL}/api/email-config/status`, { headers: authHeaders() })
            .then(r => setEmailActive(r.data?.configured === true))
            .catch(() => {});
    }, []);

    const handleSave = async (key, form) => {
        await axios.post(`${API_URL}/api/integrations/${key}`, { config: form, events: form.events || 'all' }, { headers: authHeaders() });
        setSaved(prev => ({...prev, [key]: true}));
        showToast(`✅ ${key.charAt(0).toUpperCase()+key.slice(1)} integration saved!`);
    };

    const handleDelete = async (key) => {
        if (!window.confirm(`Remove ${key} integration?`)) return;
        await axios.delete(`${API_URL}/api/integrations/${key}`, { headers: authHeaders() });
        setSaved(prev => ({...prev, [key]: false}));
        showToast(`${key} integration removed`);
    };

    const platform = INTEGRATIONS.filter(i => i.status === 'platform' || i.status === 'email');
    const active   = INTEGRATIONS.filter(i => i.status === 'active');
    const coming = INTEGRATIONS.filter(i => i.status === 'soon');
    const modal  = INTEGRATIONS.find(i => i.key === activeModal);

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Integrations <span style={{color:'#7c3aed'}}>.</span></h1>
                    <p className="pg-sub">Connect UptimeForge with your tools to get alerts everywhere</p>
                </div>
            </div>

            {toast && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:10, padding:'10px 16px', marginBottom:16, fontWeight:600, fontSize:14 }}>{toast}</div>}

            {/* Platform-managed (admin configures) */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, marginBottom:10 }}>Platform Alerts (Admin Managed)</div>
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 16px', marginBottom:16, fontSize:12, color:'#64748b' }}>
                ℹ️ These are configured by the admin. Users receive alerts automatically when they add their email/phone as a recipient.
            </div>
            {platform.map(intg => (
                <div key={intg.key} style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {intg.iconEl||intg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {intg.status === 'email' && emailActive && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                        {intg.status === 'email' && !emailActive && <span style={{ fontSize:11, fontWeight:700, background:'#fef3c7', color:'#d97706', padding:'3px 10px', borderRadius:20 }}>⚠ Not configured</span>}
                        {intg.status === 'platform' && <span style={{ fontSize:11, fontWeight:700, background:'#f5f3ff', color:'#7c3aed', padding:'3px 10px', borderRadius:20 }}>Admin managed</span>}
                    </div>
                </div>
            ))}

            {/* User integrations */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, margin:'20px 0 10px' }}>Your Integrations (You Configure)</div>
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'10px 16px', marginBottom:16, fontSize:12, color:'#64748b' }}>
                🔗 Add your own Slack, Discord, Telegram or Webhook to receive alerts on your channels.
            </div>

            {active.map(intg => (
                <div key={intg.key} style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {intg.iconEl||intg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {saved[intg.key] && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                        {intg.status === 'email' && emailActive && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                        {intg.status === 'email' && !emailActive && <span style={{ fontSize:11, fontWeight:700, background:'#f1f5f9', color:'#94a3b8', padding:'3px 10px', borderRadius:20 }}>Not configured</span>}
                        {intg.status === 'active' && intg.fields.length > 0 && (
                            <button onClick={() => setActiveModal(intg.key)}
                                style={{ padding:'8px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                                {saved[intg.key] ? '✏️ Edit' : '+ Add'}
                            </button>
                        )}
                        {saved[intg.key] && intg.status === 'active' && (
                            <button onClick={() => handleDelete(intg.key)}
                                style={{ padding:'8px 10px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:9, fontSize:13, color:'#dc2626', cursor:'pointer' }}>🗑</button>
                        )}
                    </div>
                </div>
            ))}

            {/* Coming soon */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, margin:'24px 0 10px' }}>Coming Soon</div>

            {coming.map(intg => (
                <div key={intg.key} style={{ background:'#f8fafc', border:'1.5px solid #f1f5f9', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14, opacity:0.75 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {intg.iconEl||intg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, background:'#f1f5f9', color:'#94a3b8', padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>Coming Soon</span>
                </div>
            ))}

            {/* Modal */}
            {activeModal && modal && (
                <IntegrationModal integration={modal} onClose={() => setActiveModal(null)} onSave={handleSave} />
            )}
        </div>
    );
}
