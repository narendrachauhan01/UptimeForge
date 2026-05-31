import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const TOPICS = [
    { value:'Account blocked / refund issue', icon:'🔒' },
    { value:'Payment issue',                  icon:'💳' },
    { value:'Plan upgrade help',              icon:'🚀' },
    { value:'Technical issue',               icon:'⚙️' },
    { value:'Billing question',              icon:'🧾' },
    { value:'Other',                         icon:'💬' },
];

const PRIO_COLOR = { high:'#e53e3e', medium:'#d97706', low:'#6b7280', urgent:'#c53030' };
const PRIO_LABEL = { high:'High', medium:'Normal', low:'Low', urgent:'Urgent' };

function timeAgo(d) {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    if (s < 2592000) return `${Math.floor(s/86400)} days ago`;
    return `${Math.floor(s/2592000)} month${Math.floor(s/2592000)>1?'s':''} ago`;
}

const statusStyle = s => ({
    open:        { bg:'#ebf5fb', color:'#1a6fa3', label:'Open' },
    in_progress: { bg:'#fef9e7', color:'#d68910', label:'In Progress' },
    resolved:    { bg:'#eafaf1', color:'#1e8449', label:'Resolved' },
    closed:      { bg:'#f2f3f4', color:'#717d7e', label:'Closed' },
})[s] || { bg:'#f2f3f4', color:'#717d7e', label: s };

export default function ContactSupport({ user }) {
    const [view,      setView]      = useState('list');
    const [tickets,   setTickets]   = useState([]);
    const [selected,  setSelected]  = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [search,    setSearch]    = useState('');
    const [filter,    setFilter]    = useState('all');
    const [reply,     setReply]     = useState('');
    const [sending,   setSending]   = useState(false);
    const [topicOpen, setTopicOpen] = useState(false);
    const [form,      setForm]      = useState({ subject:'', message:'', priority:'medium' });
    const [error,     setError]     = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/api/users/support/my-tickets`, { withCredentials: true });
            setTickets(r.data);
        } catch {}
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.message) { setError('All fields required'); return; }
        setSending(true); setError('');
        try {
            await axios.post(`${API_URL}/api/users/support`, {
                name: user?.name || 'User', email: user?.email || '',
                subject: form.subject, message: form.message, priority: form.priority,
            }, { withCredentials: true });
            setForm({ subject:'', message:'', priority:'medium' });
            setView('list'); load();
        } catch (err) { setError(err.response?.data?.error || 'Failed to submit'); }
        setSending(false);
    };

    const sendReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            const r = await axios.post(`${API_URL}/api/users/support/${selected._id}/reply`, { message: reply }, { withCredentials: true });
            setSelected(r.data); setReply(''); load();
        } catch {}
        setSending(false);
    };

    const displayed = tickets.filter(t => {
        const q = search.toLowerCase();
        const matchSearch = !q || t.subject.toLowerCase().includes(q) || t.message.toLowerCase().includes(q);
        const matchFilter = filter === 'all' || t.status === filter;
        return matchSearch && matchFilter;
    });

    // ── Ticket detail view ───────────────────────────────────────────────────
    if (view === 'detail' && selected) return (
        <div className="pg-wrap">
            <div style={{ marginBottom:20 }}>
                <button onClick={()=>{ setSelected(null); setView('list'); }}
                    style={{ background:'none', border:'none', color:'#7c3aed', fontWeight:700, cursor:'pointer', fontSize:14, padding:0 }}>
                    ← Back to tickets
                </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:24, alignItems:'start' }}>
                {/* Thread */}
                <div>
                    <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:800, color:'#1e1b4b' }}>{selected.subject}</h2>
                    <div style={{ display:'flex', gap:8, marginBottom:20, alignItems:'center' }}>
                        <span style={{ fontSize:13, color:'#94a3b8' }}>#{selected._id.slice(-6).toUpperCase()}</span>
                        <span style={{ fontSize:13, fontWeight:700, color: PRIO_COLOR[selected.priority] }}>{PRIO_LABEL[selected.priority]}</span>
                        <span style={{ padding:'2px 10px', borderRadius:4, fontSize:12, fontWeight:600, background:statusStyle(selected.status).bg, color:statusStyle(selected.status).color }}>
                            {statusStyle(selected.status).label}
                        </span>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {/* Original */}
                        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
                            <div style={{ background:'#f8fafc', padding:'10px 16px', display:'flex', justifyContent:'space-between', borderBottom:'1px solid #e2e8f0' }}>
                                <span style={{ fontWeight:700, fontSize:13, color:'#374151' }}>{selected.name}</span>
                                <span style={{ fontSize:12, color:'#94a3b8' }}>{new Date(selected.createdAt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                            </div>
                            <div style={{ padding:'14px 16px', fontSize:14, color:'#374151', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{selected.message}</div>
                        </div>

                        {/* Replies */}
                        {selected.replies?.map((r,i) => (
                            <div key={i} style={{ background:'#fff', border:`1px solid ${r.from==='admin'?'#bbf7d0':'#e2e8f0'}`, borderRadius:12, overflow:'hidden' }}>
                                <div style={{ background: r.from==='admin'?'#f0fdf4':'#f8fafc', padding:'10px 16px', display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${r.from==='admin'?'#bbf7d0':'#e2e8f0'}` }}>
                                    <span style={{ fontWeight:700, fontSize:13, color: r.from==='admin'?'#15803d':'#374151' }}>
                                        {r.from==='admin'?'🛡 Support Team':'👤 '+selected.name}
                                    </span>
                                    <span style={{ fontSize:12, color:'#94a3b8' }}>{new Date(r.at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                                </div>
                                <div style={{ padding:'14px 16px', fontSize:14, color:'#374151', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{r.message}</div>
                            </div>
                        ))}
                    </div>

                    {/* Reply box */}
                    {selected.status !== 'closed' && (
                        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:20, marginTop:16 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'#374151', marginBottom:10 }}>Add Reply</div>
                            <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4}
                                placeholder="Write your reply..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:10 }} />
                            <button onClick={sendReply} disabled={sending||!reply.trim()}
                                style={{ padding:'9px 22px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', opacity:(!reply.trim()||sending)?0.5:1 }}>
                                {sending?'Sending...':'Submit'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar info */}
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:18 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>Ticket Info</div>
                        {[
                            ['Status', statusStyle(selected.status).label],
                            ['Priority', PRIO_LABEL[selected.priority]],
                            ['Created', new Date(selected.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})],
                            ['Replies', selected.replies?.length || 0],
                        ].map(([k,v]) => (
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                                <span style={{ color:'#64748b' }}>{k}</span>
                                <span style={{ fontWeight:600, color:'#1e1b4b' }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // ── New ticket form ──────────────────────────────────────────────────────
    if (view === 'new') return (
        <div className="pg-wrap">
            <div style={{ marginBottom:20 }}>
                <button onClick={()=>setView('list')} style={{ background:'none', border:'none', color:'#7c3aed', fontWeight:700, cursor:'pointer', fontSize:14, padding:0 }}>
                    ← Back to tickets
                </button>
            </div>
            <h2 style={{ margin:'0 0 24px', fontSize:20, fontWeight:800, color:'#1e1b4b' }}>New Support Ticket</h2>
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:32, maxWidth:640 }}>
                <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                    {/* Topic */}
                    <div style={{ position:'relative' }}>
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Subject *</label>
                        <div onClick={()=>setTopicOpen(o=>!o)} style={{ padding:'10px 14px', border:`1.5px solid ${topicOpen?'#7c3aed':'#e2e8f0'}`, borderRadius:8, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, background:'#fff' }}>
                            {form.subject ? <span style={{ color:'#1e1b4b' }}>{TOPICS.find(t=>t.value===form.subject)?.icon} {form.subject}</span> : <span style={{ color:'#9ca3af' }}>Select a topic</span>}
                            <span style={{ color:'#94a3b8', fontSize:12 }}>▼</span>
                        </div>
                        {topicOpen && (
                            <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:100, marginTop:4, overflow:'hidden' }}>
                                {TOPICS.map(t => (
                                    <div key={t.value} onClick={()=>{ setForm({...form,subject:t.value}); setTopicOpen(false); }}
                                        style={{ padding:'11px 16px', cursor:'pointer', display:'flex', gap:10, fontSize:14, color:'#374151', background:form.subject===t.value?'#f5f3ff':'#fff', borderBottom:'1px solid #f1f5f9' }}>
                                        <span>{t.icon}</span><span>{t.value}</span>
                                        {form.subject===t.value && <span style={{ marginLeft:'auto', color:'#7c3aed', fontWeight:700 }}>✓</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Priority */}
                    <div>
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:8 }}>Priority</label>
                        <div style={{ display:'flex', gap:8 }}>
                            {[{v:'low',l:'Low',c:'#6b7280'},{v:'medium',l:'Normal',c:'#d97706'},{v:'high',l:'High',c:'#e53e3e'}].map(p => (
                                <button key={p.v} type="button" onClick={()=>setForm({...form,priority:p.v})}
                                    style={{ flex:1, padding:'9px', border:`2px solid ${form.priority===p.v?p.c:'#e2e8f0'}`, borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', background:form.priority===p.v?p.c:'#fff', color:form.priority===p.v?'#fff':p.c, transition:'all 0.15s' }}>
                                    {p.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Description *</label>
                        <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={7}
                            placeholder="Describe your issue in detail..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6, color:'#374151' }} />
                    </div>

                    {error && <div style={{ background:'#fef2f2', border:'1px solid #fecdd3', color:'#dc2626', borderRadius:8, padding:'10px 14px', fontSize:13, fontWeight:600 }}>⚠️ {error}</div>}

                    <div style={{ display:'flex', gap:10 }}>
                        <button type="submit" disabled={sending} style={{ padding:'10px 28px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:'pointer', opacity:sending?0.7:1 }}>
                            {sending?'Submitting...':'Submit ticket'}
                        </button>
                        <button type="button" onClick={()=>setView('list')} style={{ padding:'10px 20px', background:'#fff', color:'#64748b', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // ── Ticket list ──────────────────────────────────────────────────────────
    return (
        <div className="pg-wrap">
            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:'#1e1b4b' }}>Support tickets</h1>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    {/* Search */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, width:200 }}>
                        <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" style={{ border:'none', outline:'none', fontSize:13, color:'#374151', width:'100%', background:'transparent' }} />
                    </div>
                    {/* Filter */}
                    <select value={filter} onChange={e=>setFilter(e.target.value)} style={{ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontWeight:600, color:'#374151', background:'#fff', cursor:'pointer' }}>
                        <option value="all">All</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button onClick={()=>setView('new')} style={{ padding:'9px 20px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                        + New ticket
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
                {/* Table header */}
                <div style={{ display:'grid', gridTemplateColumns:'80px 100px 1fr 120px 100px', padding:'10px 20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                    {['#','Priority','Subject','Updated','Status'].map(h => (
                        <div key={h} style={{ fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding:60, textAlign:'center', color:'#94a3b8' }}>Loading...</div>
                ) : displayed.length === 0 ? (
                    <div style={{ padding:60, textAlign:'center' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>🎧</div>
                        <div style={{ fontWeight:700, color:'#1e1b4b', fontSize:16, marginBottom:8 }}>No tickets yet</div>
                        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:20 }}>Need help? Raise a support ticket.</div>
                        <button onClick={()=>setView('new')} style={{ padding:'9px 22px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer' }}>+ New ticket</button>
                    </div>
                ) : displayed.map((t,i) => (
                    <div key={t._id} onClick={()=>{ setSelected(t); setView('detail'); }}
                        style={{ display:'grid', gridTemplateColumns:'80px 100px 1fr 120px 100px', padding:'14px 20px', borderBottom: i<displayed.length-1?'1px solid #f1f5f9':'none', cursor:'pointer', transition:'background 0.1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                        <div style={{ fontSize:13, color:'#94a3b8', fontFamily:'monospace' }}>#{t._id.slice(-6).toUpperCase()}</div>
                        <div style={{ fontSize:13, fontWeight:600, color: PRIO_COLOR[t.priority] }}>{PRIO_LABEL[t.priority]}</div>
                        <div>
                            <div style={{ fontSize:14, color:'#1d4ed8', fontWeight:500 }}>{t.subject}</div>
                            {t.replies?.length > 0 && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{t.replies.length} repl{t.replies.length===1?'y':'ies'}</div>}
                        </div>
                        <div style={{ fontSize:13, color:'#64748b' }}>{timeAgo(t.updatedAt||t.createdAt)}</div>
                        <div>
                            <span style={{ padding:'3px 10px', borderRadius:4, fontSize:12, fontWeight:600, background:statusStyle(t.status).bg, color:statusStyle(t.status).color }}>
                                {statusStyle(t.status).label}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
