import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function ContactSupport({ user }) {
    const [form,    setForm]    = useState({ name: user?.name||'', email: user?.email||'', subject: '', message: '' });
    const [sending, setSending] = useState(false);
    const [done,    setDone]    = useState(false);
    const [error,   setError]   = useState('');

    const send = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.subject || !form.message) { setError('All fields required'); return; }
        setSending(true); setError('');
        try {
            await axios.post(`${API_URL}/api/users/support`, form, { withCredentials: true });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send. Please email us directly.');
        }
        setSending(false);
    };

    return (
        <div style={{ minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
            <div style={{ width:'100%', maxWidth:520 }}>

                {/* Header */}
                <div style={{ textAlign:'center', marginBottom:32 }}>
                    <div style={{ fontSize:52, marginBottom:12 }}>🎧</div>
                    <h1 style={{ fontSize:26, fontWeight:800, color:'#1e1b4b', margin:'0 0 8px' }}>Contact Support</h1>
                    <p style={{ fontSize:14, color:'#64748b', margin:0 }}>We'll get back to you within 24 hours</p>
                </div>

                {done ? (
                    <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:20, padding:40, textAlign:'center' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                        <h2 style={{ color:'#16a34a', margin:'0 0 8px' }}>Message Sent!</h2>
                        <p style={{ color:'#15803d', fontSize:14 }}>We've received your message and will respond to <strong>{form.email}</strong> within 24 hours.</p>
                        <button onClick={()=>setDone(false)} style={{ marginTop:20, padding:'10px 24px', background:'#16a34a', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' }}>
                            Send Another
                        </button>
                    </div>
                ) : (
                    <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e2e8f0', padding:32, boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>

                        {/* Quick contacts */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
                            {[
                                { icon:'📧', label:'Email', value:'chauhan.narendrasingh.01@gmail.com', href:'mailto:chauhan.narendrasingh.01@gmail.com' },
                                { icon:'⚡', label:'Response', value:'Within 24 hours', href:null },
                            ].map(c => (
                                <div key={c.label} style={{ background:'#f8fafc', borderRadius:12, padding:'12px 14px', border:'1px solid #e2e8f0' }}>
                                    <div style={{ fontSize:18, marginBottom:4 }}>{c.icon}</div>
                                    <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{c.label}</div>
                                    {c.href
                                        ? <a href={c.href} style={{ fontSize:12, color:'#7c3aed', fontWeight:600, wordBreak:'break-all' }}>{c.value}</a>
                                        : <div style={{ fontSize:12, color:'#475569', fontWeight:600 }}>{c.value}</div>
                                    }
                                </div>
                            ))}
                        </div>

                        <form onSubmit={send} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div>
                                    <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Name *</label>
                                    <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Email *</label>
                                    <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" type="email"
                                        style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box' }} />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Subject *</label>
                                <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}
                                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', background:'#fff' }}>
                                    <option value="">Select a topic</option>
                                    <option value="Account blocked / refund issue">Account blocked / refund issue</option>
                                    <option value="Payment issue">Payment issue</option>
                                    <option value="Plan upgrade help">Plan upgrade help</option>
                                    <option value="Technical issue">Technical issue</option>
                                    <option value="Billing question">Billing question</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Message *</label>
                                <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})}
                                    placeholder="Describe your issue in detail..." rows={5}
                                    style={{ width:'100%', padding:'10px 12px', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box' }} />
                            </div>

                            {error && <div style={{ background:'#fef2f2', border:'1px solid #fecdd3', color:'#dc2626', borderRadius:8, padding:'10px 14px', fontSize:13, fontWeight:600 }}>{error}</div>}

                            <button type="submit" disabled={sending}
                                style={{ padding:'13px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', opacity:sending?0.7:1 }}>
                                {sending ? '⏳ Sending...' : '📨 Send Message'}
                            </button>
                        </form>
                    </div>
                )}

                <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#94a3b8' }}>
                    Or email directly: <a href="mailto:chauhan.narendrasingh.01@gmail.com" style={{ color:'#7c3aed', fontWeight:600 }}>chauhan.narendrasingh.01@gmail.com</a>
                </p>
            </div>
        </div>
    );
}
