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
                className="btn-secondary"
                style={{ width:'100%', padding:'8px 14px', fontSize:12, justifyContent:'flex-start' }}>
                <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--primary)', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>i</span>
                How to configure? {open ? '▲' : '▼'}
            </button>
            {open && (
                <div className="info-panel" style={{ marginTop:8 }}>
                    {steps.map((s, i) => (
                        <div key={i} className="info-step" style={{ marginBottom: i<steps.length-1?10:0 }}>
                            <div className="info-step-num">{i+1}</div>
                            <div className="info-step-text" dangerouslySetInnerHTML={{__html: s}} />
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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
            <div className="modal-content">
                <button onClick={onClose} className="modal-close">✕</button>
                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" style={{ display:'block', margin:'0 auto' }}>
                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'var(--text-main)', margin:0, fontSize:18, fontWeight:800 }}>Email <span style={{color:'#EA4335'}}>SMTP</span> Configuration</h2>
                    <p style={{ color:'var(--text-muted)', fontSize:12, margin:'6px 0 0' }}>Configure Gmail SMTP to send alert emails</p>
                </div>
                {msg && <div style={{ background:msg.startsWith('✅')?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', borderRadius:8, padding:'8px 12px', fontSize:13, color:msg.startsWith('✅')?'#10b981':'#ef4444', marginBottom:14 }}>{msg}</div>}

                {/* Current email display */}
                <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', marginBottom:6 }}>Configured Email</div>
                    <div style={{ fontSize:15, color:'var(--text-main)', fontWeight:700 }}>
                        {status?.mailUser || <span style={{color:'var(--text-muted)'}}>Not configured</span>}
                    </div>
                    <div style={{ marginTop:6, display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700,
                        color: status?.configured ? '#10b981' : '#ef4444' }}>
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
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>SEND TEST EMAIL</div>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="test@example.com" type="email"
                            className="custom-input" style={{ flex:1 }} />
                        <button onClick={test} disabled={testing} className="btn-success">
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
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
            <div className="modal-content" style={{ maxWidth:500 }}>
                <button onClick={onClose} className="modal-close">✕</button>
                <div style={{ textAlign:'center', marginBottom:20 }}>
                    <div style={{ marginBottom:10 }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="#25d366" style={{ display:'block', margin:'0 auto' }}>
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                        </svg>
                    </div>
                    <h2 style={{ color:'var(--text-main)', margin:0, fontSize:18, fontWeight:800 }}>WhatsApp <span style={{color:'#25d366'}}>Configuration</span></h2>
                    {connected !== null && <div style={{ marginTop:8, fontSize:12, fontWeight:700, color:connected?'#10b981':'#ef4444' }}>{connected?'✅ Connected':'❌ Disconnected'}</div>}
                </div>

                {msg && <div style={{ background:msg.startsWith('✅')?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', borderRadius:8, padding:'8px 12px', fontSize:13, color:msg.startsWith('✅')?'#10b981':'#ef4444', marginBottom:14 }}>{msg}</div>}

                {/* Provider tabs */}
                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                    {PROVIDERS.map(p => {
                        const active = provider === p.key;
                        const colors = { greenapi:['#25d366','#128c7e'], twilio:['#f22f46','#c0392b'], aisensy:['#6c47ff','#5235cc'] };
                        const [c1, c2] = colors[p.key] || ['#7c3aed','#6d28d9'];
                        return (
                            <button key={p.key} type="button" onClick={()=>setProvider(p.key)}
                                style={{ flex:1, padding:'10px 8px', border:`2px solid ${active ? c1 : 'var(--border-color)'}`,
                                    borderRadius:10, fontSize:12, fontWeight:800, cursor:'pointer', transition:'all 0.2s',
                                    background: active ? `linear-gradient(135deg,${c1},${c2})` : 'var(--bg-input)',
                                    color: active ? '#fff' : 'var(--text-muted)',
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
                            <label style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', display:'block', marginBottom:6 }}>{field.label} *</label>
                            <input type={field.type||'text'} value={form[field.key]||''} onChange={e=>setForm({...form,[field.key]:e.target.value})}
                                placeholder={field.placeholder}
                                className="custom-input" />
                        </div>
                    ))}
                    <button type="submit" disabled={saving} className="btn-primary" style={{ width:'100%', marginTop:4 }}>
                        {saving ? 'Saving...' : '💾 Save Credentials'}
                    </button>
                </form>

                {/* Test */}
                <div style={{ marginTop:16, paddingTop:16, borderTop:'1px solid var(--border-color)' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8 }}>TEST</div>
                    <div style={{ display:'flex', gap:8 }}>
                        <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder="919876543210"
                            className="custom-input" style={{ flex:1 }} />
                        <button onClick={test} disabled={testing} className="btn-success">
                            {testing ? '...' : '📨 Send'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const INTEGRATION_BACKEND_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
    transition: background-color 0.3s ease, color 0.3s ease;
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
    --hover-row-bg: rgba(124, 58, 237, 0.04);
    --table-header-bg: #f8fafc;
    --modal-bg: #ffffff;
    --modal-overlay: rgba(15, 23, 42, 0.3);
    
    --allowed-bg: #eef2ff;
    --allowed-border: #c7d2fe;
    --allowed-text: #4f46e5;
    
    --blocked-bg: #fee2e2;
    --blocked-border: #fecdd3;
    --blocked-text: #991b1b;
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
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    --table-header-bg: #101622;
    --modal-bg: #131a26;
    --modal-overlay: rgba(0, 0, 0, 0.6);
    
    --allowed-bg: rgba(16, 185, 129, 0.08);
    --allowed-border: rgba(16, 185, 129, 0.2);
    --allowed-text: #10b981;
    
    --blocked-bg: rgba(239, 68, 68, 0.08);
    --blocked-border: rgba(239, 68, 68, 0.2);
    --blocked-text: #ef4444;
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  /* Layout and elements */
  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }

  .perf-page-container .pg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .perf-page-container .pg-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
  }
  
  .perf-page-container .pg-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  .perf-page-container .overview-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    padding: 20px 22px;
    box-shadow: var(--card-shadow);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .perf-page-container .service-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .perf-page-container .service-card-body {
    padding: 20px 22px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .perf-page-container .service-card-footer {
    padding: 14px 22px;
    background: var(--table-header-bg);
    border-top: 1px solid var(--border-color) !important;
    display: flex;
    gap: 8px;
  }

  .perf-page-container .status-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    border-width: 1px;
    border-style: solid;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .perf-page-container .status-badge.active {
    background: var(--allowed-bg);
    border-color: var(--allowed-border);
    color: var(--allowed-text);
  }
  .perf-page-container .status-badge.inactive {
    background: var(--blocked-bg);
    border-color: var(--blocked-border);
    color: var(--blocked-text);
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .perf-page-container .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }

  .perf-page-container .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .perf-page-container .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
  }

  .perf-page-container .btn-secondary {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text-main);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .perf-page-container .btn-secondary:hover:not(:disabled) {
    background: var(--bg-input);
  }

  .perf-page-container .btn-success {
    background: #10b981;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .perf-page-container .btn-success:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
  }

  .perf-page-container .custom-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color) !important;
    border-radius: 8px;
    font-size: 13.5px;
    color: var(--text-main) !important;
    background: var(--bg-input) !important;
    box-sizing: border-box;
    outline: none;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .perf-page-container .custom-input:focus {
    border-color: var(--primary) !important;
    background: var(--bg-card) !important;
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15) !important;
  }

  .perf-page-container .toast-box {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    color: #fff;
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 700;
    font-size: 14px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    transition: all 0.2s ease;
  }

  /* Modal Styles */
  .perf-page-container .modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--modal-overlay);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    backdrop-filter: blur(4px);
    transition: all 0.3s ease;
  }

  .perf-page-container .modal-content {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    width: 100%;
    max-width: 480px;
    padding: 28px;
    box-shadow: var(--card-shadow);
    position: relative;
    max-height: 90vh;
    overflow-y: auto;
  }

  .perf-page-container .modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    background: var(--bg-input);
    border: none;
    color: var(--text-main);
    width: 28px;
    height: 28px;
    border-radius: 7px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  .perf-page-container .modal-close:hover {
    background: var(--border-color);
  }

  .perf-page-container .info-panel {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }
  .perf-page-container .info-step {
    display: flex;
    gap: 10px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text-main);
  }
  .perf-page-container .info-step-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 11px;
    flex-shrink: 0;
  }
  .perf-page-container .info-step-text {
    font-size: 12.5px;
    color: var(--text-muted);
    line-height: 1.6;
  }
`;

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

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

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

    const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

    const loadStatus = () => {
        axios.get(`${API_URL}/api/email-config/status`, { withCredentials: true })
            .then(r => { setEmailOk(r.data.configured); setEmailUser(r.data.mailUser || ''); }).catch(()=>{});
        getWaStatus().then(r => { setWaOk(r.data.connected); setWaProvider(r.data.provider || ''); }).catch(()=>{});
    };

    useEffect(() => { loadStatus(); }, [emailOpen, waOpen]);

    const deleteEmail = async (e) => {
        e.stopPropagation();
        const ok = await confirm('Remove Email SMTP configuration?', { title: 'Remove Email', confirmText: 'Remove', danger: true });
        if (!ok) return;
        try {
            await axios.delete(`${API_URL}/api/email-config/reset`, { withCredentials: true });
            setEmailOk(false); setEmailUser('');
            showToast('✅ Email config removed');
        } catch { showToast('❌ Failed'); }
    };

    const deleteWa = async (e) => {
        e.stopPropagation();
        const ok = await confirm('Remove WhatsApp configuration?', { title: 'Remove WhatsApp', confirmText: 'Remove', danger: true });
        if (!ok) return;
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
        <div className={`perf-page-container ${localTheme}`}>
            <style>{INTEGRATION_BACKEND_STYLES}</style>
            <div className="pg-wrap">
                <ConfirmDialog />
                {toast && (
                    <div className="toast-box" style={{ background: toast.startsWith('✅')?'#10b981':'#ef4444' }}>
                        {toast}
                    </div>
                )}

                {/* Page header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">Integration Backend <span style={{ color: 'var(--primary)' }}>.</span></h1>
                        <p className="pg-sub">Configure and manage notification services</p>
                    </div>
                </div>

                {/* Status Overview Row */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:28 }}>
                    {statCards.map(s => (
                        <div key={s.label} className="overview-card">
                            <div style={{ width:48, height:48, borderRadius:12, background:`${s.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                                {s.icon}
                            </div>
                            <div>
                                <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
                                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                    <span style={{ width:8, height:8, borderRadius:'50%', background: s.status?'#10b981':'#ef4444', display:'inline-block', flexShrink:0 }}/>
                                    <span style={{ fontSize:14, fontWeight:700, color: s.status?'#10b981':'#ef4444' }}>
                                        {s.status===null ? 'Checking...' : s.status ? s.connected : s.disconnected}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Services Section */}
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12 }}>Notification Services</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', gap:16, marginBottom:28 }}>

                    {/* Email */}
                    <div className="service-card">
                        <div className="service-card-body">
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                    <div style={{ width:42, height:42, borderRadius:10, background:'rgba(234, 67, 53, 0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:15, color:'var(--text-main)' }}>Email SMTP</div>
                                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>Gmail SMTP alerts</div>
                                    </div>
                                </div>
                                <span className={`status-badge ${emailOk ? 'active' : 'inactive'}`}>
                                    {emailOk===null?'—':emailOk?'Active':'Inactive'}
                                </span>
                            </div>
                            {emailOk && emailUser && (
                                <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--text-main)', display:'flex', alignItems:'center', gap:6, marginTop:'auto' }}>
                                    <span style={{ color:'var(--text-muted)' }}>Connected as:</span>
                                    <span style={{ fontWeight:600 }}>{emailUser}</span>
                                </div>
                            )}
                        </div>
                        {!readOnly && <div className="service-card-footer">
                            <button onClick={() => setEmailOpen(true)} className="btn-primary" style={{ flex:1 }}>
                                {emailOk ? '⚙️ Edit Config' : '+ Setup Email'}
                            </button>
                        </div>}
                    </div>

                    {/* WhatsApp */}
                    <div className="service-card">
                        <div className="service-card-body">
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                    <div style={{ width:42, height:42, borderRadius:10, background:'rgba(37, 211, 102, 0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight:700, fontSize:15, color:'var(--text-main)' }}>WhatsApp</div>
                                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{waProvider?`via ${waProvider==='greenapi'?'Green API':waProvider==='twilio'?'Twilio':'AiSensy'}`:'Not configured'}</div>
                                    </div>
                                </div>
                                <span className={`status-badge ${waOk ? 'active' : 'inactive'}`}>
                                    {waOk===null?'—':waOk?'Active':'Inactive'}
                                </span>
                            </div>
                            {waProvider && (
                                <div style={{ background:'var(--bg-input)', border:'1px solid var(--border-color)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'var(--text-main)', display:'flex', alignItems:'center', gap:6, marginTop:'auto' }}>
                                    <span style={{ color:'var(--text-muted)' }}>Provider:</span>
                                    <span style={{ fontWeight:600 }}>{waProvider === 'greenapi' ? 'Green API' : waProvider === 'twilio' ? 'Twilio' : 'AiSensy'}</span>
                                </div>
                            )}
                        </div>
                        {!readOnly && <div className="service-card-footer">
                            <button onClick={() => setWaOpen(true)} className="btn-success" style={{ flex:1 }}>
                                {waOk ? '⚙️ Edit Config' : '+ Setup WhatsApp'}
                            </button>
                            {waProvider && (
                                <button onClick={deleteWa} className="btn-secondary" style={{ color:'#ef4444', borderColor:'rgba(239,68,68,0.2)' }}>
                                    Delete
                                </button>
                            )}
                        </div>}
                    </div>
                </div>
            </div>

            {emailOpen && <EmailModal onClose={() => setEmailOpen(false)} />}
            {waOpen    && <WhatsAppModal onClose={() => setWaOpen(false)} />}
        </div>
    );
}
