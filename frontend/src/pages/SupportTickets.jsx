import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const API_BASE = (API_URL||'').replace('/api','');
const prioColor = p => p==='high'?'#ef4444':p==='medium'?'#f59e0b':'#22c55e';
const prioBg    = p => p==='high'?'#fef2f2':p==='medium'?'#fffbeb':'#f0fdf4';
const prioLabel = p => p==='high'?'🔴 High':p==='medium'?'🟡 Medium':'🟢 Low';
const statusColor = s => s==='open'?'#3b82f6':s==='in_progress'?'#f59e0b':s==='resolved'?'#16a34a':'#94a3b8';
const statusLabel = s => s==='open'?'Open':s==='in_progress'?'In Progress':s==='resolved'?'Resolved':'Closed';

function fmtDate(d) {
    return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
}
function timeAgo(d) {
    const s = Math.floor((Date.now()-new Date(d))/1000);
    if (s<60) return 'just now';
    if (s<3600) return `${Math.floor(s/60)}m ago`;
    if (s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}
function ImgThumb({ urls }) {
    if (!urls?.length) return null;
    return <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        {urls.map((u,i) => <a key={i} href={u.startsWith('http')?u:`${API_BASE}${u}`} target="_blank" rel="noreferrer">
            <img src={u.startsWith('http')?u:`${API_BASE}${u}`} alt="" style={{ width:80, height:60, objectFit:'cover', borderRadius:6, border:'1px solid #e2e8f0', cursor:'zoom-in' }}/>
        </a>)}
    </div>;
}

function AdminImageUpload({ sendReply, reply, sending }) {
    const [files, setFiles] = React.useState([]);
    const ref = React.useRef();
    return (
        <div>
            <div style={{ display:'flex', gap:6, marginBottom:6, flexWrap:'wrap' }}>
                {files.map((f,i) => (
                    <div key={i} style={{ position:'relative' }}>
                        <img src={URL.createObjectURL(f)} alt="" style={{ width:50, height:40, objectFit:'cover', borderRadius:5, border:'1px solid #e2e8f0' }}/>
                        <button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))}
                            style={{ position:'absolute', top:-3, right:-3, width:14, height:14, borderRadius:'50%', background:'#ef4444', color:'#fff', border:'none', fontSize:8, cursor:'pointer', fontWeight:900 }}>✕</button>
                    </div>
                ))}
            </div>
            <div style={{ display:'flex', gap:6 }}>
                <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>{ setFiles(p=>[...p,...Array.from(e.target.files)].slice(0,5)); e.target.value=''; }}/>
                <button type="button" onClick={()=>ref.current.click()} style={{ padding:'7px 12px', border:'1.5px dashed #e2e8f0', borderRadius:8, background:'#f8fafc', color:'#64748b', fontSize:12, cursor:'pointer' }}>
                    📎 {files.length>0?`${files.length} image${files.length>1?'s':''}` : 'Attach'}
                </button>
                <button onClick={()=>sendReply(files).then(()=>setFiles([]))} disabled={sending||!reply.trim()}
                    style={{ flex:1, padding:'7px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', opacity:(!reply.trim()||sending)?0.5:1, fontSize:13 }}>
                    {sending?'Sending...':'🛡 Send Reply'}
                </button>
            </div>
        </div>
    );
}

export default function SupportTickets() {
    const [tickets,  setTickets]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [filter,   setFilter]   = useState('all');
    const [selected, setSelected] = useState(null);
    const [reply,    setReply]    = useState('');
    const [sending,  setSending]  = useState(false);
    const [notif,    setNotif]    = useState(null); // { id, name, subject }
    const prevUnread = React.useRef([]);

    const load = async (silent=false) => {
        if (!silent) setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/api/admin/support-tickets`, { withCredentials: true });
            const fresh = r.data;
            // Detect newly unread tickets
            const newUnread = fresh.filter(t => t.adminUnread && !prevUnread.current.includes(t._id));
            if (newUnread.length > 0) {
                setNotif({ id: newUnread[0]._id, name: newUnread[0].name, subject: newUnread[0].subject });
                setTimeout(() => setNotif(null), 5000);
            }
            prevUnread.current = fresh.filter(t=>t.adminUnread).map(t=>t._id);
            setTickets(fresh);
            // Update detail view if open
            if (selectedRef.current) {
                const updated = fresh.find(t => t._id === selectedRef.current._id);
                if (updated) setSelected(updated);
            }
        } catch {}
        if (!silent) setLoading(false);
    };

    const selectedRef  = React.useRef(null);
    const chatBoxRef   = React.useRef(null);
    const scrollToBottom = () => {
        const el = chatBoxRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    };
    useEffect(() => {
        selectedRef.current = selected;
        if (selected) setTimeout(scrollToBottom, 100);
    }, [selected]);

    useEffect(() => {
        load();
        const t = setInterval(() => load(true), 10000); // poll every 10s
        return () => clearInterval(t);
    }, []);

    const markRead = async (id) => {
        await axios.post(`${API_URL}/api/admin/support-tickets/${id}/mark-read`, {}, { withCredentials: true });
        setTickets(p => p.map(t => t._id===id ? {...t, adminUnread:false} : t));
    };

    const openTicket = (t) => {
        setSelected(t);
        if (t.adminUnread) markRead(t._id);
    };

    const update = async (id, data) => {
        await axios.put(`${API_URL}/api/admin/support-tickets/${id}`, data, { withCredentials: true });
        load(true);
        if (selected?._id === id) setSelected(t => ({ ...t, ...data }));
    };

    const sendReply = async (files=[]) => {
        if (!reply.trim() || !selected) return Promise.resolve();
        setSending(true);
        try {
            const fd = new FormData();
            fd.append('message', reply);
            (files||[]).forEach(f => fd.append('images', f));
            const r = await axios.post(`${API_URL}/api/admin/support-tickets/${selected._id}/reply`, fd, { withCredentials: true });
            setSelected(r.data);
            setReply('');
            load(true);
            setTimeout(scrollToBottom, 100);
        } catch {}
        setSending(false);
    };

    const del = async (id) => {
        if (!window.confirm('Delete this ticket?')) return;
        await axios.delete(`${API_URL}/api/admin/support-tickets/${id}`, { withCredentials: true });
        if (selected?._id === id) setSelected(null);
        load();
    };

    const sorted = [...tickets].sort((a,b) => {
        const p = { high:0, medium:1, low:2 };
        return (p[a.priority]??1) - (p[b.priority]??1);
    });
    const filtered = filter === 'all' ? sorted : sorted.filter(t => t.status === filter || t.priority === filter);

    return (
        <div className="pg-wrap">
            {/* New message notification popup */}
            {notif && (
                <div onClick={()=>{ const t=tickets.find(x=>x._id===notif.id); if(t) openTicket(t); setNotif(null); }}
                    style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:'#7c3aed', color:'#fff', borderRadius:16, padding:'16px 20px', boxShadow:'0 8px 32px rgba(124,58,237,0.4)', cursor:'pointer', maxWidth:320, display:'flex', gap:12, alignItems:'center', animation:'slideIn 0.3s ease' }}>
                    <div style={{ fontSize:28 }}>💬</div>
                    <div>
                        <div style={{ fontWeight:800, fontSize:14 }}>New message!</div>
                        <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}><strong>{notif.name}</strong>: {notif.subject}</div>
                        <div style={{ fontSize:11, opacity:0.7, marginTop:4 }}>Click to view thread →</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setNotif(null);}} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:'50%', width:22, height:22, color:'#fff', cursor:'pointer', fontSize:12, flexShrink:0 }}>✕</button>
                </div>
            )}
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Support Tickets <span style={{color:'#7c3aed'}}>.</span></h1>
                    <p className="pg-sub">Manage customer support requests</p>
                </div>
                <button onClick={load} style={{ padding:'9px 18px', background:'#f1f5f9', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' }}>🔄 Refresh</button>
            </div>

            {/* Summary — clickable filters */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:20 }}>
                {[
                    ['Total',    'all',      tickets.length,                                                  '#7c3aed','#f5f3ff','#ddd6fe'],
                    ['🔴 High',  'high',     tickets.filter(t=>t.priority==='high'&&t.status!=='closed').length, '#dc2626','#fef2f2','#fecdd3'],
                    ['🟡 Medium','medium',   tickets.filter(t=>t.priority==='medium'&&t.status!=='closed').length,'#b45309','#fffbeb','#fde68a'],
                    ['🟢 Low',   'low',      tickets.filter(t=>t.priority==='low'&&t.status!=='closed').length,  '#15803d','#f0fdf4','#bbf7d0'],
                    ['✓ Closed', 'closed',   tickets.filter(t=>t.status==='closed').length,                     '#64748b','#f8fafc','#e2e8f0'],
                ].map(([l,f,v,c,bg,br]) => {
                    const active = filter === f;
                    return (
                        <div key={l} onClick={()=>setFilter(active?'all':f)}
                            style={{ background: active?c:bg, border:`2px solid ${active?c:br}`, borderRadius:12, padding:'12px', textAlign:'center', cursor:'pointer', transition:'all 0.15s', transform: active?'translateY(-2px)':'none', boxShadow: active?`0 4px 12px ${c}40`:'none' }}>
                            <div style={{ fontSize:20, fontWeight:800, color: active?'#fff':c }}>{v}</div>
                            <div style={{ fontSize:11, color: active?'rgba(255,255,255,0.85)':c, fontWeight:600 }}>{l}</div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display:'grid', gridTemplateColumns: selected?'1fr 1.4fr':'1fr', gap:16, alignItems:'start' }}>

                {/* Ticket list */}
                <div>
                    {/* Filter */}
                    <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                        {[['all','All'],['open','Open'],['in_progress','In Progress'],['resolved','Resolved'],['high','🔴'],['medium','🟡'],['low','🟢']].map(([v,l]) => (
                            <button key={v} onClick={()=>setFilter(v)}
                                style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid #e2e8f0', fontSize:11, fontWeight:700, cursor:'pointer', background:filter===v?'#7c3aed':'#fff', color:filter===v?'#fff':'#64748b' }}>
                                {l}
                            </button>
                        ))}
                    </div>

                    {loading ? <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>
                    : filtered.length === 0 ? (
                        <div style={{ background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0', padding:40, textAlign:'center', color:'#94a3b8' }}>
                            <div style={{ fontSize:36, marginBottom:8 }}>🎧</div>No tickets
                        </div>
                    ) : filtered.map(t => (
                        <div key={t._id} onClick={()=>openTicket(t)}
                            style={{ background: t.adminUnread?'#faf5ff':'#fff', borderRadius:12, border:`1.5px solid ${selected?._id===t._id?'#7c3aed':t.adminUnread?'#c4b5fd':'#e2e8f0'}`, padding:'14px 16px', marginBottom:8, cursor:'pointer', borderLeft:`4px solid ${prioColor(t.priority)}`, transition:'all 0.15s', position:'relative' }}>
                            {t.adminUnread && (
                                <div style={{ position:'absolute', top:10, right:10, minWidth:18, height:18, borderRadius:9, background:'#ef4444', color:'#fff', fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 5px', boxShadow:'0 0 0 3px rgba(239,68,68,0.2)' }}>1</div>
                            )}
                            <div style={{ fontWeight: t.adminUnread?800:700, fontSize:13, color:'#1e1b4b', marginBottom:4, paddingRight:16 }}>{t.subject}</div>
                            <div style={{ fontSize:11, color:'#94a3b8', marginBottom:6 }}>
                                {t.name} · {new Date(t.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}
                                {t.replies?.length>0 && <span style={{ marginLeft:6 }}>· {t.replies.length} replies</span>}
                                {t.adminUnread && <span style={{ marginLeft:6, color:'#ef4444', fontWeight:700 }}>· New message!</span>}
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:prioBg(t.priority), color:prioColor(t.priority) }}>{prioLabel(t.priority)}</span>
                                <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:`${statusColor(t.status)}15`, color:statusColor(t.status) }}>{statusLabel(t.status)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Ticket detail */}
                {selected && (
                    <div style={{ background:'#fff', borderRadius:20, border:'1.5px solid #e2e8f0', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', position:'sticky', top:20 }}>

                        {/* Chat header */}
                        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#3730a3)', padding:'14px 16px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontWeight:800, color:'#fff', fontSize:14, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selected.subject}</div>
                                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.65)' }}>{selected.name} · {selected.email}</div>
                                </div>
                                <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:6, width:24, height:24, cursor:'pointer', color:'#fff', fontSize:12, flexShrink:0, marginLeft:8 }}>✕</button>
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                                <select value={selected.status} onChange={e=>update(selected._id,{status:e.target.value})}
                                    style={{ flex:1, padding:'5px 8px', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.15)', color:'#fff' }}>
                                    <option value="open" style={{color:'#000'}}>Open</option>
                                    <option value="in_progress" style={{color:'#000'}}>In Progress</option>
                                    <option value="resolved" style={{color:'#000'}}>Resolved</option>
                                    <option value="closed" style={{color:'#000'}}>Closed</option>
                                </select>
                                <select value={selected.priority} onChange={e=>update(selected._id,{priority:e.target.value})}
                                    style={{ flex:1, padding:'5px 8px', border:'none', borderRadius:6, fontSize:11, fontWeight:700, cursor:'pointer', background:'rgba(255,255,255,0.15)', color:'#fff' }}>
                                    <option value="low" style={{color:'#000'}}>🟢 Low</option>
                                    <option value="medium" style={{color:'#000'}}>🟡 Medium</option>
                                    <option value="high" style={{color:'#000'}}>🔴 High</option>
                                </select>
                                <button onClick={()=>del(selected._id)} style={{ padding:'5px 10px', background:'rgba(239,68,68,0.3)', border:'none', borderRadius:6, color:'#fca5a5', fontSize:11, cursor:'pointer', fontWeight:700 }}>🗑</button>
                            </div>
                        </div>

                        {/* Chat bubbles */}
                        <div ref={chatBoxRef} style={{ padding:'16px 12px', minHeight:300, maxHeight:420, overflowY:'auto', display:'flex', flexDirection:'column', gap:14, background:'#f8fafc' }}>
                            {/* Original */}
                            <div style={{ display:'flex', justifyContent:'flex-start', gap:6 }}>
                                <div style={{ width:28, height:28, borderRadius:'50%', background:'#6366f1', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0, alignSelf:'flex-end' }}>
                                    {(selected.name||'U')[0].toUpperCase()}
                                </div>
                                <div style={{ maxWidth:'80%' }}>
                                    <div style={{ background:'#fff', borderRadius:'12px 12px 12px 4px', padding:'10px 14px', fontSize:13, color:'#1e1b4b', lineHeight:1.6, whiteSpace:'pre-wrap', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                                        {selected.message}
                                    </div>
                                    <ImgThumb urls={selected.images} />
                                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, marginLeft:4 }}>{fmtDate(selected.createdAt)} · {timeAgo(selected.createdAt)}</div>
                                </div>
                            </div>

                            {/* Replies */}
                            {selected.replies?.map((r,i) => {
                                const isAdmin = r.from === 'admin';
                                return (
                                    <div key={i} style={{ display:'flex', justifyContent: isAdmin?'flex-end':'flex-start', gap:6 }}>
                                        {!isAdmin && <div style={{ width:28, height:28, borderRadius:'50%', background:'#6366f1', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0, alignSelf:'flex-end' }}>{(selected.name||'U')[0].toUpperCase()}</div>}
                                        <div style={{ maxWidth:'80%', display:'flex', flexDirection:'column', alignItems: isAdmin?'flex-end':'flex-start' }}>
                                            <div style={{ background: isAdmin?'#4f46e5':'#fff', color: isAdmin?'#fff':'#1e1b4b', borderRadius: isAdmin?'12px 12px 4px 12px':'12px 12px 12px 4px', padding:'10px 14px', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap', border: isAdmin?'none':'1px solid #e2e8f0', boxShadow: isAdmin?'0 3px 10px rgba(79,70,229,0.25)':'0 1px 4px rgba(0,0,0,0.05)' }}>
                                                {r.message}
                                            </div>
                                            <ImgThumb urls={r.images} />
                                            <div style={{ fontSize:10, color:'#94a3b8', marginTop:3, [isAdmin?'marginRight':'marginLeft']:4 }}>
                                                {fmtDate(r.at)} · {timeAgo(r.at)} · {isAdmin?'You (Admin)':selected.name}
                                            </div>
                                        </div>
                                        {isAdmin && <div style={{ width:28, height:28, borderRadius:'50%', background:'#10b981', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, alignSelf:'flex-end' }}>🛡</div>}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply bar */}
                        {selected.status !== 'closed' ? (
                            <div style={{ borderTop:'1px solid #e2e8f0', padding:'12px', background:'#fff' }}>
                                <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={2}
                                    placeholder="Type your reply..." style={{ width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none', resize:'none', boxSizing:'border-box', marginBottom:8, background:'#f8fafc' }} />
                                <AdminImageUpload sendReply={sendReply} reply={reply} sending={sending} />
                            </div>
                        ) : (
                            <div style={{ padding:12, textAlign:'center', color:'#94a3b8', fontSize:12, borderTop:'1px solid #e2e8f0' }}>🔒 Ticket closed</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
