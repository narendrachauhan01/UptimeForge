import React, { useState, useEffect } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import axios from 'axios';
import { getWaStatus, API_URL } from '../api';


// ── Email Modal ───────────────────────────────────────────────────────────────
const InfoBox = ({ steps }) => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ marginBottom:14 }}>
            <button type="button" onClick={()=>setOpen(o=>!o)}
                style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:8, padding:'7px 14px', color:'#a5b4fc', fontSize:12, fontWeight:600, cursor:'pointer', width:'100%' }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background:'#6d28d9', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>i</span>
                How to configure? {open ? '▲' : '▼'}
            </button>
            {open && (
                <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'14px 16px', marginTop:8 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ display:'flex', gap:10, marginBottom: i<steps.length-1?10:0 }}>
                            <div style={{ width:22, height:22, borderRadius:'50%', background:'#7c3aed', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:11, flexShrink:0 }}>{i+1}</div>
                            <div style={{ fontSize:12, color:'rgba(255,255,255,0.75)', lineHeight:1.6 }} dangerouslySetInnerHTML={{__html: s}} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function EmailModal({ onClose }) {
    const [testing, setTesting] = useState(false);
    const [msg,     setMsg]     = useState('');
    const [status,  setStatus]  = useState(null);
    const [testTo,  setTestTo]  = useState('');

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

    useEffect(() => {
        axios.get(`${API_URL}/api/email-config/status`, { withCredentials: true })
            .then(r => { setStatus(r.data); setTestTo(r.data.mailUser || ''); })
            .catch(() => {});
    }, []);

    const test = async () => {
        setTesting(true);
        try {
            await axios.post(`${API_URL}/api/email-config/test`, { to: testTo || status?.mailUser }, { withCredentials: true });
            showMsg('✅ Test email sent to ' + (testTo || status?.mailUser));
        } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Test failed')); }
        setTesting(false);
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:480, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.4)', position:'relative' }}>
                <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }}>
                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>Email <span style={{color:'#EA4335'}}>SMTP</span> Configuration</h2>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, margin:'6px 0 0' }}>Configure Gmail SMTP to send alert emails</p>
                </div>
                {msg && <div style={{ background:msg.startsWith('✅')?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', borderRadius:8, padding:'8px 12px', fontSize:13, color:msg.startsWith('✅')?'#34d399':'#f87171', marginBottom:14 }}>{msg}</div>}

                {/* Current email display */}
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', marginBottom:6 }}>Configured Email</div>
                    <div style={{ fontSize:15, color:'#e2e8f0', fontWeight:700 }}>
                        {status?.mailUser || <span style={{color:'#64748b'}}>Not configured</span>}
                    </div>
                    <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700,
                        color: status?.configured ? '#34d399' : '#f87171' }}>
                        {status?.configured ? '✅ SMTP Active' : '❌ Not configured'}
                    </div>
                </div>

                <InfoBox steps={[
                    'SSH into your server → edit <strong>backend/.env</strong> file',
                    'Set <strong>MAIL_USER=your@gmail.com</strong>',
                    'Set <strong>MAIL_PASS=xxxx xxxx xxxx xxxx</strong> (Gmail App Password)',
                    'Set <strong>MAIL_FROM=UptimeForge &lt;your@gmail.com&gt;</strong>',
                    'Restart server → <strong>pm2 restart uptimeforge</strong>',
                    'To get App Password: myaccount.google.com → Security → App Passwords',
                ]} />

                {/* Test */}
                <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', marginBottom:8 }}>SEND TEST EMAIL</div>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="test@example.com" type="email"
                            style={{ flex:1, padding:'10px 12px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:13, background:'#2d2466', color:'#e2e8f0', outline:'none' }} />
                        <button onClick={test} disabled={testing}
                            style={{ padding:'10px 18px', background:'#10b981', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:testing?0.7:1 }}>
                            {testing ? '...' : '📨 Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── WhatsApp Modal ────────────────────────────────────────────────────────────
const PROVIDERS = [
    { key:'greenapi', name:'Green API', fields:[{key:'instanceId',label:'Instance ID',placeholder:'7107635794'},{key:'apiToken',label:'API Token',placeholder:'••••••••',type:'password'}] },
    { key:'twilio',   name:'Twilio',    fields:[{key:'accountSid',label:'Account SID',placeholder:'ACxxxxxxxx'},{key:'authToken',label:'Auth Token',placeholder:'••••••••',type:'password'},{key:'fromNumber',label:'From Number',placeholder:'+14155238886'}] },
    { key:'aisensy',  name:'AiSensy',   fields:[{key:'apiKey',label:'API Key',placeholder:'Your API key',type:'password'}] },
];

function WhatsAppModal({ onClose }) {
    const [provider, setProvider] = useState('greenapi');
    const [form,     setForm]     = useState({});
    const [saving,   setSaving]   = useState(false);
    const [testing,  setTesting]  = useState(false);
    const [testPhone,setTestPhone]= useState('');
    const [msg,      setMsg]      = useState('');
    const [connected,setConnected]= useState(null);

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

    useEffect(() => {
        getWaStatus().then(r => { if (r.data.provider) setProvider(r.data.provider); setConnected(r.data.connected); }).catch(() => {});
    }, []);

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const r = await axios.post(`${API_URL}/api/whatsapp/config`, { provider, ...form }, { withCredentials: true });
            setConnected(r.data.connected);
            showMsg(r.data.connected ? `✅ Connected! ${r.data.reason}` : `⚠️ Saved — ${r.data.reason}`);
        } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Failed')); }
        setSaving(false);
    };

    const test = async () => {
        if (!testPhone) return;
        setTesting(true);
        try {
            await axios.post(`${API_URL}/api/whatsapp/test`, { phone: testPhone.replace(/\D/g,'') }, { withCredentials: true });
            showMsg('✅ Test message sent!');
        } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Test failed')); }
        setTesting(false);
    };

    const cur = PROVIDERS.find(p => p.key === provider);

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#1e1b4b', borderRadius:20, width:'100%', maxWidth:500, padding:28, boxShadow:'0 24px 80px rgba(0,0,0,0.4)', position:'relative', maxHeight:'90vh', overflowY:'auto' }}>
                <button onClick={onClose} style={{ position:'absolute', top:14, right:14, background:'rgba(255,255,255,0.12)', border:'none', color:'#fff', width:28, height:28, borderRadius:7, cursor:'pointer', fontSize:14 }}>✕</button>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="#25d366" style={{ display:'block', margin:'0 auto' }}>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'#fff', margin:0, fontSize:18, fontWeight:800 }}>WhatsApp <span style={{color:'#25d366'}}>Configuration</span></h2>
                    {connected !== null && <div style={{ marginTop:8, fontSize:12, fontWeight:700, color:connected?'#34d399':'#f87171' }}>{connected?'✅ Connected':'❌ Disconnected'}</div>}
                </div>

                {msg && <div style={{ background:msg.startsWith('✅')?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', borderRadius:8, padding:'8px 12px', fontSize:13, color:msg.startsWith('✅')?'#34d399':'#f87171', marginBottom:14 }}>{msg}</div>}

                {/* Provider tabs */}
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                    {PROVIDERS.map(p => {
                        const active = provider === p.key;
                        const colors = { greenapi:['#25d366','#128c7e'], twilio:['#f22f46','#c0392b'], aisensy:['#6c47ff','#5235cc'] };
                        const [c1, c2] = colors[p.key] || ['#7c3aed','#6d28d9'];
                        return (
                            <button key={p.key} type="button" onClick={()=>setProvider(p.key)}
                                style={{ flex:1, padding:'10px 8px', border:`2px solid ${active ? c1 : 'rgba(255,255,255,0.12)'}`,
                                    borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                                    background: active ? `linear-gradient(135deg,${c1},${c2})` : 'rgba(255,255,255,0.05)',
                                    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                                    boxShadow: active ? `0 4px 12px ${c1}55` : 'none',
                                    transform: active ? 'translateY(-1px)' : 'none' }}>
                                {p.name}
                            </button>
                        );
                    })}
                </div>

                {provider === 'greenapi' && <InfoBox steps={[
                    'Go to <strong>green-api.com</strong> → Sign up free (200 msg/month)',
                    'Dashboard → <strong>Create Instance</strong> → Select Free plan',
                    'Scan the QR code using <strong>WhatsApp Business</strong> app on your phone',
                    'Copy <strong>idInstance</strong> and <strong>apiTokenInstance</strong> from the instance page',
                    'Paste both below and click Save. Status will show Connected if correct.',
                ]} />}
                {provider === 'twilio' && <InfoBox steps={[
                    'Go to <strong>twilio.com</strong> → Sign up / Login',
                    'From Console Dashboard, copy <strong>Account SID</strong> and <strong>Auth Token</strong>',
                    'Go to <strong>Messaging → Senders → WhatsApp Senders</strong> → Get a number',
                    'For sandbox: use <strong>+14155238886</strong> as From Number',
                    'Paste SID, Token and From Number below → Save',
                ]} />}
                {provider === 'aisensy' && <InfoBox steps={[
                    'Go to <strong>aisensy.com</strong> → Sign up / Login',
                    'Dashboard → Settings → <strong>API</strong> section → Copy your API Key',
                    'Paste the API Key below → Save',
                    'Make sure your WhatsApp Business number is connected in AiSensy',
                ]} />}
                <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {cur?.fields.map(field => (
                        <div key={field.key}>
                            <label style={{ fontSize:12, fontWeight:700, color:'#e2e8f0', display:'block', marginBottom:6 }}>{field.label} *</label>
                            <input type={field.type||'text'} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}
                                placeholder={field.placeholder}
                                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:14, background:'#2d2466', color:'#e2e8f0', outline:'none', boxSizing:'border-box' }} />
                        </div>
                    ))}
                    <button type="submit" disabled={saving}
                        style={{ padding:'11px', border:'none', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', marginTop:4, opacity:saving?0.7:1 }}>
                        {saving ? 'Saving...' : '💾 Save Credentials'}
                    </button>
                </form>

                {/* Test */}
                <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', marginBottom:8 }}>TEST</div>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder="919876543210"
                            style={{ flex:1, padding:'9px 12px', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:9, fontSize:13, background:'#2d2466', color:'#e2e8f0', outline:'none' }} />
                        <button onClick={test} disabled={testing}
                            style={{ padding:'9px 18px', background:'#10b981', border:'none', borderRadius:9, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', opacity:testing?0.7:1 }}>
                            {testing ? '...' : '📨 Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Cards Page ───────────────────────────────────────────────────────────
export default function IntegrationBackend({ readOnly = false }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [emailOpen,  setEmailOpen]  = useState(false);
    const [waOpen,     setWaOpen]     = useState(false);
    const [emailOk,    setEmailOk]    = useState(null);
    const [emailUser,  setEmailUser]  = useState('');
    const [waOk,       setWaOk]       = useState(null);
    const [waProvider, setWaProvider] = useState('');
    const [toast,      setToast]      = useState('');

    const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

    const loadStatus = () => {
        axios.get(`${API_URL}/api/email-config/status`, { withCredentials: true })
            .then(r => { setEmailOk(r.data.configured); setEmailUser(r.data.mailUser || ''); }).catch(()=>{});
        getWaStatus().then(r => { setWaOk(r.data.connected); setWaProvider(r.data.provider || ''); }).catch(()=>{});
    };

    useEffect(() => { loadStatus(); }, [emailOpen, waOpen]);

    const deleteEmail = async (e) => {
        e.stopPropagation();
        if (!confirm('Remove Email SMTP configuration?')) return;
        try {
            await axios.delete(`${API_URL}/api/email-config/reset`, { withCredentials: true });
            setEmailOk(false); setEmailUser('');
            showToast('✅ Email config removed');
        } catch { showToast('❌ Failed'); }
    };

    const deleteWa = async (e) => {
        e.stopPropagation();
        if (!confirm('Remove WhatsApp configuration?')) return;
        try {
            await axios.delete(`${API_URL}/api/whatsapp/reset`, { withCredentials: true });
            setWaOk(false); setWaProvider('');
            showToast('✅ WhatsApp config removed');
        } catch { showToast('❌ Failed'); }
    };

    const statCards = [
        { label:'Email SMTP', status: emailOk, connected:'Connected', disconnected:'Not Configured', icon:'📧', color:'#ea4335' },
        { label:'WhatsApp',   status: waOk,    connected:'Connected', disconnected:'Disconnected',   icon:'💬', color:'#25d366' },
    ];

    return (
        <div className="pg-wrap">
      <ConfirmDialog />
            {toast && (
                <div style={{ position:'fixed', top:20, right:20, zIndex:9999, background: toast.startsWith('✅')?'#16a34a':'#dc2626', color:'#fff', borderRadius:12, padding:'12px 20px', fontWeight:700, fontSize:14, boxShadow:'0 8px 24px rgba(0,0,0,0.15)' }}>
                    {toast}
                </div>
            )}

            {/* Page header */}
            <div style={{ marginBottom:28 }}>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>Integration Backend</h1>
                <p style={{ fontSize:14, color:'#6b7280', margin:0 }}>Configure and manage notification services</p>
            </div>

            {/* Status Overview Row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                {statCards.map(s => (
                    <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'20px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.08)', border:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:16 }}>
                        <div style={{ width:48, height:48, borderRadius:12, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize:12, color:'#9ca3af', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ width:8, height:8, borderRadius:'50%', background: s.status?'#10b981':'#f87171', display:'inline-block', flexShrink:0 }}/>
                                <span style={{ fontSize:14, fontWeight:700, color: s.status?'#065f46':'#991b1b' }}>
                                    {s.status===null ? 'Checking...' : s.status ? s.connected : s.disconnected}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Services Section */}
            <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Notification Services</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16, marginBottom:28 }}>

                {/* Email */}
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ padding:'20px 22px', borderBottom:'1px solid #f9fafb' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:42, height:42, borderRadius:10, background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Email SMTP</div>
                                    <div style={{ fontSize:12, color:'#6b7280' }}>Gmail SMTP alerts</div>
                                </div>
                            </div>
                            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: emailOk?'#d1fae5':'#fee2e2', color: emailOk?'#065f46':'#991b1b' }}>
                                {emailOk===null?'—':emailOk?'Active':'Inactive'}
                            </span>
                        </div>
                        {emailOk && emailUser && (
                            <div style={{ background:'#f9fafb', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ color:'#9ca3af' }}>Connected as:</span>
                                <span style={{ fontWeight:600 }}>{emailUser}</span>
                            </div>
                        )}
                    </div>
                    {!readOnly && <div style={{ padding:'14px 22px', background:'#fafafa', display:'flex', gap:8 }}>
                        <button onClick={() => setEmailOpen(true)} style={{ flex:1, padding:'8px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                            {emailOk ? '⚙️ Edit Config' : '+ Setup Email'}
                        </button>
                    </div>}
                </div>

                {/* WhatsApp */}
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #f3f4f6', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                    <div style={{ padding:'20px 22px', borderBottom:'1px solid #f9fafb' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:42, height:42, borderRadius:10, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>WhatsApp</div>
                                    <div style={{ fontSize:12, color:'#6b7280' }}>{waProvider?`via ${waProvider==='greenapi'?'Green API':waProvider==='twilio'?'Twilio':'AiSensy'}`:'Not configured'}</div>
                                </div>
                            </div>
                            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: waOk?'#d1fae5':'#fee2e2', color: waOk?'#065f46':'#991b1b' }}>
                                {waOk===null?'—':waOk?'Active':'Inactive'}
                            </span>
                        </div>
                        {waProvider && (
                            <div style={{ background:'#f9fafb', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#374151', display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ color:'#9ca3af' }}>Provider:</span>
                                <span style={{ fontWeight:600 }}>{waProvider === 'greenapi' ? 'Green API' : waProvider === 'twilio' ? 'Twilio' : 'AiSensy'}</span>
                            </div>
                        )}
                    </div>
                    {!readOnly && <div style={{ padding:'14px 22px', background:'#fafafa', display:'flex', gap:8 }}>
                        <button onClick={() => setWaOpen(true)} style={{ flex:1, padding:'8px', background:'#16a34a', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                            {waOk ? '⚙️ Edit Config' : '+ Setup WhatsApp'}
                        </button>
                        {waProvider && (
                            <button onClick={deleteWa} style={{ padding:'8px 14px', background:'#fff', border:'1px solid #fecdd3', borderRadius:8, color:'#dc2626', fontSize:13, cursor:'pointer', fontWeight:600 }}>
                                Delete
                            </button>
                        )}
                    </div>}
                </div>
            </div>

            {emailOpen && <EmailModal onClose={() => setEmailOpen(false)} />}
            {waOpen    && <WhatsAppModal onClose={() => setWaOpen(false)} />}
        </div>
    );
}
