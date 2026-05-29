import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getWaStatus, API_URL } from '../api';

const authHeaders = () => {
    const t = localStorage.getItem('sm_token') || localStorage.getItem('sm_admin_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
};

const GreenAPILogo = () => (
    <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="18" fill="#25d366"/>
        <text x="18" y="24" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="900" fontFamily="Arial">G</text>
    </svg>
);
const TwilioLogo = () => (
    <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="18" fill="#F22F46"/>
        <circle cx="12" cy="12" r="3.5" fill="#fff"/>
        <circle cx="24" cy="12" r="3.5" fill="#fff"/>
        <circle cx="12" cy="24" r="3.5" fill="#fff"/>
        <circle cx="24" cy="24" r="3.5" fill="#fff"/>
    </svg>
);
const AiSensyLogo = () => (
    <svg width="36" height="36" viewBox="0 0 36 36">
        <rect width="36" height="36" rx="8" fill="#4F46E5"/>
        <text x="18" y="25" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900" fontFamily="Arial">AI</text>
    </svg>
);

const PROVIDERS = [
    {
        key: 'greenapi',
        name: 'Green API',
        logo: <GreenAPILogo />,
        desc: 'Free 200 msg/month. Good for testing.',
        docs: 'https://green-api.com',
        fields: [
            { key:'instanceId', label:'Instance ID',   placeholder:'e.g. 7107635794',       hint:'From green-api.com → My Instances' },
            { key:'apiToken',   label:'API Token',      placeholder:'Paste your API token',  type:'password', hint:'Found next to Instance ID' },
        ],
    },
    {
        key: 'twilio',
        name: 'Twilio WhatsApp',
        logo: <TwilioLogo />,
        desc: 'Official API. ~$0.005/msg. Reliable.',
        docs: 'https://twilio.com/whatsapp',
        fields: [
            { key:'accountSid', label:'Account SID',   placeholder:'ACxxxxxxxxxxxxxxxx',    hint:'From Twilio Console → Dashboard' },
            { key:'authToken',  label:'Auth Token',    placeholder:'Your auth token',       type:'password', hint:'From Twilio Console → Dashboard' },
            { key:'fromNumber', label:'From Number',   placeholder:'+14155238886',          hint:'Twilio WhatsApp sandbox or approved number' },
        ],
    },
    {
        key: 'aisensy',
        name: 'AiSensy',
        logo: <AiSensyLogo />,
        desc: 'Indian BSP. Affordable. Official API.',
        docs: 'https://aisensy.com',
        fields: [
            { key:'apiKey',  label:'API Key',    placeholder:'Your AiSensy API key',  hint:'From AiSensy Dashboard → Settings → API' },
            { key:'apiUrl',  label:'API URL (optional)', placeholder:'https://backend.aisensy.com/campaign/t1/api/v2', hint:'Leave blank for default' },
        ],
    },
];

export default function WhatsAppPage() {
    const [info,     setInfo]     = useState(null);
    const [loading,  setLoading]  = useState(true);
    const [provider, setProvider] = useState('greenapi');
    const [form,     setForm]     = useState({});
    const [saving,   setSaving]   = useState(false);
    const [testPhone,setTestPhone]= useState('');
    const [testing,  setTesting]  = useState(false);
    const [msg,      setMsg]      = useState('');

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

    const load = () => {
        getWaStatus().then(r => {
            setInfo(r.data);
            if (r.data.provider) setProvider(r.data.provider);
        }).catch(() => setInfo({ status: 'not_configured' }))
        .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const currentProvider = PROVIDERS.find(p => p.key === provider) || PROVIDERS[0];
    const isConnected = info?.status === 'ready' && (provider !== 'greenapi' || info?.instanceState === 'authorized');

    const saveConfig = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await axios.post(`${API_URL}/api/whatsapp/config`, { provider, ...form }, { headers: authHeaders() });
            showMsg('✅ Credentials saved!');
            load();
        } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Save failed')); }
        setSaving(false);
    };

    const sendTest = async () => {
        if (!testPhone) return;
        setTesting(true);
        try {
            await axios.post(`${API_URL}/api/whatsapp/test`, { phone: testPhone.replace(/\D/g,'') }, { headers: authHeaders() });
            showMsg('✅ Test message sent!');
        } catch (err) { showMsg('❌ ' + (err.response?.data?.error || 'Test failed')); }
        setTesting(false);
    };

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">WhatsApp Alerts</h1>
                    <p className="pg-sub">Configure provider so users receive WhatsApp alerts</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', borderRadius:10,
                    background: isConnected ? '#dcfce7' : loading ? '#f1f5f9' : '#fef3c7',
                    color: isConnected ? '#16a34a' : loading ? '#94a3b8' : '#d97706', fontWeight:700, fontSize:13 }}>
                    {loading ? '⏳ Checking...' : isConnected ? '✅ Connected' : '⚠️ Not configured'}
                </div>
            </div>

            {msg && (
                <div style={{ background:msg.startsWith('✅')?'#f0fdf4':'#fef2f2', border:`1px solid ${msg.startsWith('✅')?'#bbf7d0':'#fecdd3'}`,
                    color:msg.startsWith('✅')?'#16a34a':'#dc2626', borderRadius:10, padding:'10px 16px', marginBottom:20, fontWeight:600, fontSize:14 }}>{msg}</div>
            )}

            {/* Provider selector */}
            <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #e2e8f0', padding:24, marginBottom:20 }}>
                <div style={{ fontWeight:800, fontSize:16, color:'#1e1b4b', marginBottom:4 }}>Select Provider</div>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>Choose your WhatsApp messaging provider</div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
                    {PROVIDERS.map(p => (
                        <div key={p.key} onClick={()=>setProvider(p.key)}
                            style={{ border:`2px solid ${provider===p.key?'#7c3aed':'#e2e8f0'}`, borderRadius:12, padding:'14px 16px', cursor:'pointer',
                                background:provider===p.key?'#f5f3ff':'#fff', transition:'all 0.15s', position:'relative' }}>
                            {provider===p.key && <div style={{ position:'absolute', top:8, right:8, width:16, height:16, borderRadius:'50%', background:'#7c3aed', display:'flex', alignItems:'center', justifyContent:'center' }}><svg width="10" height="10" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>}
                            <div style={{ marginBottom:8 }}>{p.logo}</div>
                            <div style={{ fontWeight:700, fontSize:14, color:'#1e1b4b' }}>{p.name}</div>
                            <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{p.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Credential fields */}
                <form onSubmit={saveConfig}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16, marginBottom:16 }}>
                        {currentProvider.fields.map(field => (
                            <div key={field.key}>
                                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>
                                    {field.label} <span style={{color:'#ef4444'}}>*</span>
                                </label>
                                <input type={field.type||'text'} value={form[field.key]||''}
                                    onChange={e=>setForm({...form,[field.key]:e.target.value})}
                                    placeholder={field.placeholder}
                                    style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                                {field.hint && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{field.hint}</div>}
                            </div>
                        ))}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <button type="submit" disabled={saving}
                            style={{ padding:'10px 28px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', opacity:saving?0.7:1 }}>
                            {saving ? 'Saving...' : '💾 Save Credentials'}
                        </button>
                        <a href={currentProvider.docs} target="_blank" rel="noreferrer"
                            style={{ fontSize:13, color:'#7c3aed', textDecoration:'none' }}>
                            📖 {currentProvider.name} Setup Guide →
                        </a>
                    </div>
                </form>
            </div>

            {/* Test */}
            <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #e2e8f0', padding:24, marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:12 }}>🧪 Test WhatsApp Alert</div>
                <div style={{ display:'flex', gap:12, alignItems:'flex-end', flexWrap:'wrap' }}>
                    <div style={{ flex:1, minWidth:200 }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Phone (with country code)</label>
                        <input value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder="919876543210"
                            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <button onClick={sendTest} disabled={testing}
                        style={{ padding:'10px 24px', background:'#10b981', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', whiteSpace:'nowrap', opacity:testing?0.7:1 }}>
                        {testing ? 'Sending...' : '📨 Send Test'}
                    </button>
                </div>
            </div>

            {/* How it works */}
            <div style={{ background:'#f8fafc', borderRadius:16, border:'1px solid #e2e8f0', padding:24 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1e1b4b', marginBottom:16 }}>⚙️ How It Works</div>
                {[
                    { n:'1', t:'Admin selects provider & saves credentials', d:'One-time setup. Credentials stored securely in server.' },
                    { n:'2', t:'Users add their WhatsApp number', d:'On Integrations page → WhatsApp → + Add → enter name & number.' },
                    { n:'3', t:'Alerts fire automatically', d:'Site DOWN/UP/SSL expiry/Domain expiry → message sent to user\'s number.' },
                ].map(s => (
                    <div key={s.n} style={{ display:'flex', gap:14, alignItems:'flex-start', marginBottom:14 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'#7c3aed', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, flexShrink:0 }}>{s.n}</div>
                        <div>
                            <div style={{ fontWeight:700, fontSize:14, color:'#1e1b4b' }}>{s.t}</div>
                            <div style={{ fontSize:13, color:'#64748b', marginTop:2 }}>{s.d}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
