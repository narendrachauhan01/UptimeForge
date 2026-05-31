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

const API_BASE = (API_URL || '').replace('/api','');

function ImagePreview({ urls }) {
    if (!urls?.length) return null;
    return (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
            {urls.map((u,i) => (
                <a key={i} href={u.startsWith('http')?u:`${API_BASE}${u}`} target="_blank" rel="noreferrer">
                    <img src={u.startsWith('http')?u:`${API_BASE}${u}`} alt={`attachment-${i}`}
                        style={{ width:90, height:70, objectFit:'cover', borderRadius:8, border:'1px solid #e2e8f0', cursor:'zoom-in' }} />
                </a>
            ))}
        </div>
    );
}

function FileUploadBtn({ files, setFiles, max=5 }) {
    const ref = React.useRef();
    return (
        <div>
            <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }}
                onChange={e=>{ const arr=[...files,...Array.from(e.target.files)].slice(0,max); setFiles(arr); e.target.value=''; }} />
            <button type="button" onClick={()=>ref.current.click()}
                style={{ padding:'6px 14px', border:'1.5px dashed #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#64748b', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                📎 Attach image {files.length>0?`(${files.length})`:''}
            </button>
            {files.length>0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    {files.map((f,i)=>(
                        <div key={i} style={{ position:'relative' }}>
                            <img src={URL.createObjectURL(f)} alt="" style={{ width:60, height:50, objectFit:'cover', borderRadius:6, border:'1px solid #e2e8f0' }}/>
                            <button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))}
                                style={{ position:'absolute', top:-4, right:-4, width:16, height:16, borderRadius:'50%', background:'#ef4444', color:'#fff', border:'none', fontSize:9, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

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
    const [formFiles, setFormFiles] = useState([]);
    const [replyFiles,setReplyFiles]= useState([]);
    const [error,     setError]     = useState('');

    const [notif,      setNotif]      = useState(null);
    const prevUnread = React.useRef([]);

    const selectedRef  = React.useRef(null);
    const chatBoxRef   = React.useRef(null);
    const scrollToBottom = () => {
        const el = chatBoxRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };

    const load = async (silent=false) => {
        if (!silent) setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/api/users/support/my-tickets`, { withCredentials: true });
            const fresh = r.data;
            // Detect newly unread tickets (admin replied)
            const newUnread = fresh.filter(t => t.userUnread && !prevUnread.current.includes(t._id));
            if (newUnread.length > 0) {
                setNotif({ id: newUnread[0]._id, subject: newUnread[0].subject });
                setTimeout(() => setNotif(null), 6000);
            }
            prevUnread.current = fresh.filter(t=>t.userUnread).map(t=>t._id);
            setTickets(fresh);
            // Also update detail view if open
            if (selectedRef.current) {
                const updated = fresh.find(t => t._id === selectedRef.current._id);
                if (updated) setSelected(updated);
            }
        } catch {}
        if (!silent) setLoading(false);
    };

    // Keep selectedRef in sync + scroll to bottom when ticket opens or new message arrives
    useEffect(() => {
        selectedRef.current = selected;
        if (selected) setTimeout(scrollToBottom, 100);
    }, [selected]);

    useEffect(() => {
        load();
        const t = setInterval(() => load(true), 10000); // poll every 10s
        return () => clearInterval(t);
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (!form.subject || !form.message) { setError('All fields required'); return; }
        setSending(true); setError('');
        try {
            const fd = new FormData();
            fd.append('name', user?.name || 'User');
            fd.append('email', user?.email || '');
            fd.append('subject', form.subject);
            fd.append('message', form.message);
            fd.append('priority', form.priority);
            formFiles.forEach(f => fd.append('images', f));
            await axios.post(`${API_URL}/api/users/support`, fd, { withCredentials: true });
            setForm({ subject:'', message:'', priority:'medium' });
            setFormFiles([]);
            setView('list'); load();
        } catch (err) { setError(err.response?.data?.error || 'Failed to submit'); }
        setSending(false);
    };

    const sendReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('message', reply);
            replyFiles.forEach(f => fd.append('images', f));
            const r = await axios.post(`${API_URL}/api/users/support/${selected._id}/reply`, fd, { withCredentials: true });
            setSelected(r.data); setReply(''); setReplyFiles([]); load();
            setTimeout(scrollToBottom, 100);
        } catch (e) {
            alert('Failed to send reply: ' + (e.response?.data?.error || e.message));
        }
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 220px', gap:20, alignItems:'start' }}>
                {/* Chat window */}
                <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.06)' }}>

                    {/* Chat header */}
                    <div style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🎧</div>
                        <div>
                            <div style={{ fontWeight:800, color:'#fff', fontSize:15 }}>{selected.subject}</div>
                            <div style={{ fontSize:12, color:'rgba(255,255,255,0.7)', display:'flex', gap:8, marginTop:2 }}>
                                <span>#{selected._id.slice(-6).toUpperCase()}</span>
                                <span>·</span>
                                <span style={{ color: selected.status==='in_progress'?'#fde68a':selected.status==='resolved'?'#86efac':'rgba(255,255,255,0.7)' }}>
                                    {statusStyle(selected.status).label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Chat bubbles */}
                    <div ref={chatBoxRef} style={{ padding:'20px 16px', minHeight:350, maxHeight:480, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, background:'#f8fafc' }}>

                        {/* Original message — YOU (right) */}
                        <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', maxWidth:'72%' }}>
                                <div style={{ background:'#7c3aed', color:'#fff', borderRadius:'18px 18px 4px 18px', padding:'12px 16px', fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap', boxShadow:'0 4px 12px rgba(124,58,237,0.25)' }}>
                                    {selected.message}
                                </div>
                                <ImagePreview urls={selected.images} />
                                <span style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                                    {new Date(selected.createdAt).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} · You
                                </span>
                            </div>
                            <div style={{ width:32, height:32, borderRadius:'50%', background:'#7c3aed', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0, alignSelf:'flex-end' }}>
                                {(selected.name||'U')[0].toUpperCase()}
                            </div>
                        </div>

                        {/* Replies */}
                        {selected.replies?.map((r,i) => {
                            const isUser = r.from === 'user';
                            return (
                                <div key={i} style={{ display:'flex', justifyContent: isUser?'flex-end':'flex-start', gap:8 }}>
                                    {!isUser && (
                                        <div style={{ width:32, height:32, borderRadius:'50%', background:'#10b981', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, alignSelf:'flex-end' }}>🛡</div>
                                    )}
                                    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser?'flex-end':'flex-start', maxWidth:'72%' }}>
                                        <div style={{ background: isUser?'#7c3aed':'#fff', color: isUser?'#fff':'#1e1b4b', borderRadius: isUser?'18px 18px 4px 18px':'18px 18px 18px 4px', padding:'12px 16px', fontSize:14, lineHeight:1.6, whiteSpace:'pre-wrap', boxShadow: isUser?'0 4px 12px rgba(124,58,237,0.25)':'0 2px 8px rgba(0,0,0,0.06)', border: isUser?'none':'1px solid #e2e8f0' }}>
                                            {r.message}
                                        </div>
                                        <ImagePreview urls={r.images} />
                                        <span style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                                            {new Date(r.at).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} · {isUser?'You':'Support Team'}
                                        </span>
                                    </div>
                                    {isUser && (
                                        <div style={{ width:32, height:32, borderRadius:'50%', background:'#7c3aed', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, flexShrink:0, alignSelf:'flex-end' }}>
                                            {(selected.name||'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Reply input bar */}
                    {selected.status !== 'closed' ? (
                        <div style={{ borderTop:'1.5px solid #e2e8f0', padding:'12px 16px', background:'#fff' }}>
                            <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                                <div style={{ flex:1 }}>
                                    <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2}
                                        placeholder="Type a message..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:12, fontSize:14, outline:'none', resize:'none', boxSizing:'border-box', lineHeight:1.5, background:'#f8fafc' }} />
                                    <div style={{ marginTop:6 }}>
                                        <FileUploadBtn files={replyFiles} setFiles={setReplyFiles} />
                                    </div>
                                </div>
                                <button onClick={sendReply} disabled={sending||!reply.trim()}
                                    style={{ padding:'12px 20px', background:'#7c3aed', color:'#fff', border:'none', borderRadius:12, fontWeight:700, cursor:'pointer', fontSize:14, opacity:(!reply.trim()||sending)?0.4:1, flexShrink:0, display:'flex', alignItems:'center', gap:6 }}>
                                    {sending?'⏳':'➤'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign:'center', padding:16, borderTop:'1px solid #e2e8f0', color:'#94a3b8', fontSize:13 }}>
                            🔒 This ticket is closed
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:16, padding:20, boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.8, marginBottom:14 }}>Ticket Info</div>
                    {[
                        ['Ticket ID', `#${selected._id.slice(-6).toUpperCase()}`],
                        ['Status', statusStyle(selected.status).label],
                        ['Priority', PRIO_LABEL[selected.priority]],
                        ['Created', new Date(selected.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})],
                        ['Replies', selected.replies?.length || 0],
                    ].map(([k,v]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f1f5f9', fontSize:13 }}>
                            <span style={{ color:'#64748b' }}>{k}</span>
                            <span style={{ fontWeight:700, color:'#1e1b4b' }}>{v}</span>
                        </div>
                    ))}
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
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:10 }}>Priority</label>
                        <div style={{ display:'flex', gap:10 }}>
                            {[
                                { v:'low',    l:'Low',    icon:'🟢', desc:'Not urgent',     c:'#16a34a', bg:'#f0fdf4', border:'#86efac', activeBg:'#16a34a' },
                                { v:'medium', l:'Medium', icon:'🟡', desc:'Moderate',        c:'#d97706', bg:'#fffbeb', border:'#fde68a', activeBg:'#f59e0b' },
                                { v:'high',   l:'High',   icon:'🔴', desc:'Urgent issue',    c:'#dc2626', bg:'#fef2f2', border:'#fca5a5', activeBg:'#ef4444' },
                            ].map(p => {
                                const active = form.priority === p.v;
                                return (
                                    <button key={p.v} type="button" onClick={()=>setForm({...form,priority:p.v})}
                                        style={{ flex:1, padding:'14px 10px', border:`2px solid ${active?p.activeBg:p.border}`, borderRadius:12, cursor:'pointer', background: active?p.activeBg:p.bg, transition:'all 0.18s', textAlign:'center', boxShadow: active?`0 4px 12px ${p.activeBg}55`:'none', transform: active?'translateY(-2px)':'none' }}>
                                        <div style={{ fontSize:22, marginBottom:4 }}>{p.icon}</div>
                                        <div style={{ fontSize:13, fontWeight:800, color: active?'#fff':p.c }}>{p.l}</div>
                                        <div style={{ fontSize:11, color: active?'rgba(255,255,255,0.75)':p.c, opacity: active?1:0.7, marginTop:2 }}>{p.desc}</div>
                                        {active && <div style={{ marginTop:6, fontSize:12, color:'#fff', fontWeight:700 }}>✓ Selected</div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Description *</label>
                        <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={7}
                            placeholder="Describe your issue in detail..." style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6, color:'#374151' }} />
                    </div>

                    <div>
                        <label style={{ fontSize:13, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Attachments <span style={{color:'#94a3b8',fontWeight:400}}>(optional, max 5 images)</span></label>
                        <FileUploadBtn files={formFiles} setFiles={setFormFiles} />
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
            {/* New reply notification popup */}
            {notif && (
                <div onClick={()=>{ const t=tickets.find(x=>x._id===notif.id); if(t){ setSelected(t); setView('detail'); if(t.userUnread){ axios.post(`${API_URL}/api/users/support/${t._id}/mark-read`,{},{withCredentials:true}).catch(()=>{}); setTickets(p=>p.map(x=>x._id===t._id?{...x,userUnread:false}:x)); }} setNotif(null); }}
                    style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#7c3aed', color:'#fff', borderRadius:16, padding:'16px 20px', boxShadow:'0 8px 32px rgba(124,58,237,0.4)', cursor:'pointer', maxWidth:320, display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ fontSize:28 }}>🛡</div>
                    <div>
                        <div style={{ fontWeight:800, fontSize:14 }}>Support team replied!</div>
                        <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>{notif.subject}</div>
                        <div style={{ fontSize:11, opacity:0.7, marginTop:4 }}>Click to view reply →</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setNotif(null);}} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:22, height:22, color:'#fff', cursor:'pointer', fontSize:12, flexShrink:0 }}>✕</button>
                </div>
            )}
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
                    <div key={t._id} onClick={()=>{
                        setSelected(t); setView('detail');
                        if (t.userUnread) {
                            axios.post(`${API_URL}/api/users/support/${t._id}/mark-read`, {}, { withCredentials: true }).catch(()=>{});
                            setTickets(p => p.map(x => x._id===t._id ? {...x, userUnread:false} : x));
                        }
                    }}
                        style={{ display:'grid', gridTemplateColumns:'80px 100px 1fr 120px 100px', padding:'14px 20px', borderBottom: i<displayed.length-1?'1px solid #f1f5f9':'none', cursor:'pointer', transition:'background 0.1s', background: t.userUnread?'#faf5ff':'#fff' }}
                        onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
                        onMouseLeave={e=>e.currentTarget.style.background=t.userUnread?'#faf5ff':'#fff'}>
                        <div style={{ fontSize:13, color:'#94a3b8', fontFamily:'monospace' }}>#{t._id.slice(-6).toUpperCase()}</div>
                        <div style={{ fontSize:13, fontWeight:600, color: PRIO_COLOR[t.priority] }}>{PRIO_LABEL[t.priority]}</div>
                        <div>
                            <div style={{ fontSize:14, color:'#1d4ed8', fontWeight: t.userUnread?800:500, display:'flex', alignItems:'center', gap:8 }}>
                                {t.subject}
                                {t.userUnread && <span style={{ minWidth:18, height:18, borderRadius:9, background:'#ef4444', color:'#fff', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px', flexShrink:0 }}>1</span>}
                            </div>
                            {t.userUnread
                                ? <div style={{ fontSize:11, color:'#7c3aed', fontWeight:700, marginTop:2 }}>🛡 Support team replied!</div>
                                : t.replies?.length > 0 && <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{t.replies.length} repl{t.replies.length===1?'y':'ies'}</div>
                            }
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
