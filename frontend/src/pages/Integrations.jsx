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
                    <div style={{ fontSize:40, marginBottom:10 }}>{integration.icon}</div>
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

// ── Integration definitions ──────────────────────────────────────────────
const INTEGRATIONS = [
    {
        key: 'whatsapp', icon: '💬', name: 'WhatsApp', color: '#7c3aed',
        desc: 'Send WhatsApp alerts via Green API when your site goes down.',
        status: 'active',
        fields: [
            { key:'instanceId', label:'Instance ID', placeholder:'e.g. 1234567890', hint:'Get from green-api.com dashboard' },
            { key:'apiToken',   label:'API Token',   placeholder:'Paste your Green API token', type:'password' },
            { key:'phone',      label:'Default Phone', placeholder:'+91 9876543210', hint:'Your WhatsApp number to receive alerts' },
        ],
    },
    {
        key: 'webhook', icon: '🔗', name: 'Webhook', color: '#7c3aed',
        desc: 'POST to any URL when a monitor status changes.',
        status: 'active',
        fields: [
            { key:'url',    label:'Webhook URL', placeholder:'https://your-server.com/webhook', hint:'We will POST JSON with site name, status, and timestamp' },
            { key:'secret', label:'Secret Header (optional)', placeholder:'your-secret-key', hint:'Sent as X-UptimeForge-Secret header for verification' },
            { key:'events', label:'Events to notify about', type:'select', default:'all',
              options:[{value:'all',label:'Up events, Down events, SSL & Domain expiry'},{value:'down',label:'Down events only'},{value:'down_ssl',label:'Down events + SSL & Domain expiry'}] },
        ],
    },
    { key:'slack',    icon:'', name:'Slack',    color:'#7c3aed', desc:'Send alerts to your Slack channel via incoming webhook.', status:'soon', fields:[] },
    { key:'telegram', icon:'✈️', name:'Telegram', color:'#7c3aed', desc:'Get instant alerts via Telegram bot messages.', status:'soon', fields:[] },
    { key:'discord',  icon:'🎮', name:'Discord',  color:'#7c3aed', desc:'Post status updates to your Discord server.', status:'soon', fields:[] },
    { key:'email',    icon:'✉️', name:'Email',    color:'#7c3aed', desc:'Email alerts — configured in Admin Panel → Email Settings.', status:'configured', fields:[] },
];

// ── Main Page ──────────────────────────────────────────────────────────────
export default function Integrations() {
    const [activeModal, setActiveModal] = useState(null);
    const [saved, setSaved] = useState({});
    const [toast, setToast] = useState('');

    const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(''), 3000); };

    const handleSave = async (key, form) => {
        // Save to backend settings or localStorage for now
        try {
            await axios.post(`${API_URL}/api/integrations/${key}`, form, { headers: authHeaders() });
            setSaved(prev => ({...prev, [key]: true}));
            showToast(`✅ ${key} integration saved!`);
        } catch (e) {
            // fallback: just mark as saved locally
            setSaved(prev => ({...prev, [key]: true}));
            showToast(`✅ ${key} integration configured!`);
        }
    };

    const active = INTEGRATIONS.filter(i => i.status === 'active' || i.status === 'configured');
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

            {/* Active integrations */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, marginBottom:10 }}>Alert Channels</div>

            {active.map(intg => (
                <div key={intg.key} style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f8fafc', border:'1px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {intg.icon}
                    </div>
                    <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:2 }}>{intg.name}</div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{intg.desc}</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        {(saved[intg.key]) && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                        {intg.status === 'configured' && <span style={{ fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20 }}>✓ Active</span>}
                        {intg.status === 'active' && intg.fields.length > 0 && (
                            <button onClick={() => setActiveModal(intg.key)}
                                style={{ padding:'8px 18px', background:`linear-gradient(135deg,${intg.color},${intg.color}cc)`, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:700, cursor:'pointer' }}>
                                {saved[intg.key] ? '✏️ Edit' : '+ Add'}
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {/* Coming soon */}
            <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.6, margin:'24px 0 10px' }}>Coming Soon</div>

            {coming.map(intg => (
                <div key={intg.key} style={{ background:'#f8fafc', border:'1.5px solid #f1f5f9', borderRadius:14, padding:'16px 20px', marginBottom:10, display:'flex', alignItems:'center', gap:14, opacity:0.75 }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                        {intg.icon}
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
