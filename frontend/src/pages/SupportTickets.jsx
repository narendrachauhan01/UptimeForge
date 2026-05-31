import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const API_BASE = (API_URL||'').replace('/api','');

function timeAgo(d) {
    const s = Math.floor((Date.now()-new Date(d))/1000);
    if(s<60) return 'just now';
    if(s<3600) return `${Math.floor(s/60)}m ago`;
    if(s<86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}
function fmtDate(d) {
    return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}

const statusColor = { open:'#F59E0B', in_progress:'#3B82F6', resolved:'#10B981', closed:'#6B7280' };
const statusLabel = { open:'Pending', in_progress:'In Progress', resolved:'Solved', closed:'Closed' };

function ImgThumb({ urls }) {
    if(!urls?.length) return null;
    return <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        {urls.map((u,i) => <a key={i} href={u.startsWith('http')?u:`${API_BASE}${u}`} target="_blank" rel="noreferrer">
            <img src={u.startsWith('http')?u:`${API_BASE}${u}`} alt="" style={{ width:72,height:54,objectFit:'cover',borderRadius:6,border:'1px solid #E5E7EB',cursor:'zoom-in' }}/>
        </a>)}
    </div>;
}

function AdminImageUpload({ sendReply, reply, sending }) {
    const [files,setFiles] = React.useState([]);
    const ref = React.useRef();
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'1px solid #E5E7EB' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>{ setFiles(p=>[...p,...Array.from(e.target.files)].slice(0,5)); e.target.value=''; }}/>
                <button type="button" onClick={()=>ref.current.click()} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', border:'1px solid #E5E7EB', borderRadius:6, background:'#fff', color:'#6B7280', fontSize:13, cursor:'pointer' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Attach {files.length>0&&`(${files.length})`}
                </button>
                {files.map((f,i)=><div key={i} style={{ position:'relative' }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width:36,height:28,objectFit:'cover',borderRadius:4,border:'1px solid #E5E7EB' }}/>
                    <button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))} style={{ position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'none',fontSize:8,cursor:'pointer',fontWeight:900 }}>✕</button>
                </div>)}
            </div>
            <button onClick={()=>sendReply(files).then(()=>setFiles([]))} disabled={sending||!reply.trim()}
                style={{ padding:'8px 24px',background:'#4F46E5',color:'#fff',border:'none',borderRadius:8,fontWeight:600,fontSize:14,cursor:'pointer',opacity:(!reply.trim()||sending)?0.5:1 }}>
                {sending?'Sending...':'Reply'}
            </button>
        </div>
    );
}

export default function SupportTickets() {
    const [tickets,  setTickets]   = useState([]);
    const [loading,  setLoading]   = useState(true);
    const [filter,   setFilter]    = useState('all');
    const [search,   setSearch]    = useState('');
    const [selected, setSelected]  = useState(null);
    const [view,     setView]      = useState('list'); // 'list' | 'reply'
    const [reply,    setReply]     = useState('');
    const [sending,  setSending]   = useState(false);
    const [notif,    setNotif]     = useState(null);
    const prevUnread = useRef([]);
    const selectedRef = useRef(null);
    const chatBoxRef  = useRef(null);

    const scrollToBottom = () => { const el=chatBoxRef.current; if(el) el.scrollTop=el.scrollHeight; };
    useEffect(()=>{ selectedRef.current=selected; if(selected) setTimeout(scrollToBottom,100); },[selected]);

    const load = async (silent=false) => {
        if(!silent) setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/api/admin/support-tickets`,{withCredentials:true});
            const fresh = r.data;
            const newUnread = fresh.filter(t=>t.adminUnread && !prevUnread.current.includes(t._id));
            if(newUnread.length>0){ setNotif({id:newUnread[0]._id,name:newUnread[0].name,subject:newUnread[0].subject}); setTimeout(()=>setNotif(null),5000); }
            prevUnread.current = fresh.filter(t=>t.adminUnread).map(t=>t._id);
            setTickets(fresh);
            if(selectedRef.current){ const u=fresh.find(t=>t._id===selectedRef.current._id); if(u) setSelected(u); }
        } catch{}
        if(!silent) setLoading(false);
    };

    useEffect(()=>{ load(); const t=setInterval(()=>load(true),10000); return()=>clearInterval(t); },[]);

    const markRead = async(id)=>{ await axios.post(`${API_URL}/api/admin/support-tickets/${id}/mark-read`,{},{withCredentials:true}).catch(()=>{}); setTickets(p=>p.map(t=>t._id===id?{...t,adminUnread:false}:t)); };
    const openTicket = (t)=>{ setSelected(t); setView('reply'); if(t.adminUnread) markRead(t._id); };
    const update = async(id,data)=>{ await axios.put(`${API_URL}/api/admin/support-tickets/${id}`,data,{withCredentials:true}); load(true); if(selected?._id===id) setSelected(s=>({...s,...data})); };
    const del = async(id)=>{ if(!window.confirm('Delete this ticket?')) return; await axios.delete(`${API_URL}/api/admin/support-tickets/${id}`,{withCredentials:true}); setSelected(null); setView('list'); load(); };
    const sendReply = async(files=[])=>{
        if(!reply.trim()||!selected) return Promise.resolve();
        setSending(true);
        try {
            const fd=new FormData(); fd.append('message',reply); (files||[]).forEach(f=>fd.append('images',f));
            const r=await axios.post(`${API_URL}/api/admin/support-tickets/${selected._id}/reply`,fd,{withCredentials:true});
            setSelected(r.data); setReply(''); load(true); setTimeout(scrollToBottom,100);
        } catch{}
        setSending(false);
    };

    const sorted = [...tickets].sort((a,b)=>{ const p={high:0,medium:1,low:2}; return (p[a.priority]??1)-(p[b.priority]??1); });
    const filtered = sorted.filter(t=>{
        const q=search.toLowerCase();
        const matchSearch=!q||t.subject?.toLowerCase().includes(q)||t.name?.toLowerCase().includes(q)||t.email?.toLowerCase().includes(q);
        const matchFilter=filter==='all'||(filter==='solved'&&t.status==='resolved')||(filter==='pending'&&(t.status==='open'||t.status==='in_progress'));
        return matchSearch&&matchFilter;
    });

    // ── Ticket Reply View ────────────────────────────────────────────────────
    if(view==='reply' && selected) return (
        <div className="pg-wrap">
            {/* Header breadcrumb */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:0 }}>Ticket Reply</h1>
                <div style={{ fontSize:13, color:'#9CA3AF' }}>
                    <span style={{ cursor:'pointer', color:'#4F46E5' }} onClick={()=>setView('list')}>Home</span>
                    <span style={{ margin:'0 6px' }}>›</span>
                    <span>Ticket Reply</span>
                </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20, alignItems:'start' }}>
                {/* Left — full ticket thread */}
                <div>
                    {/* Ticket header card */}
                    <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', marginBottom:0, overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                            <div>
                                <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>
                                    Ticket #{selected._id.slice(-6).toUpperCase()} — {selected.subject}
                                </div>
                                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:3 }}>
                                    {new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})
                                </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:12, color:'#6B7280' }}>{(selected.replies?.length||0)+1} of {tickets.length}</span>
                                <button onClick={()=>{ const i=filtered.findIndex(t=>t._id===selected._id); if(i>0) setSelected(filtered[i-1]); }} style={{ width:28,height:28,border:'1px solid #E5E7EB',borderRadius:6,background:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
                                <button onClick={()=>{ const i=filtered.findIndex(t=>t._id===selected._id); if(i<filtered.length-1) setSelected(filtered[i+1]); }} style={{ width:28,height:28,border:'1px solid #E5E7EB',borderRadius:6,background:'#fff',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center' }}>›</button>
                            </div>
                        </div>

                        {/* Messages thread */}
                        <div ref={chatBoxRef} style={{ maxHeight:380, overflowY:'auto' }}>
                            {/* Original message */}
                            <div style={{ padding:'20px', borderBottom:'1px solid #F3F4F6' }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                        <div style={{ width:40,height:40,borderRadius:'50%',background:'#E0E7FF',color:'#4F46E5',fontWeight:800,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                            {(selected.name||'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{selected.name}</div>
                                            <div style={{ fontSize:12, color:'#9CA3AF' }}>{selected.email}</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize:12, color:'#9CA3AF' }}>
                                        {new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})
                                    </span>
                                </div>
                                <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, whiteSpace:'pre-wrap', paddingLeft:50 }}>
                                    {selected.message}
                                </div>
                                <div style={{ paddingLeft:50 }}><ImgThumb urls={selected.images}/></div>
                            </div>

                            {/* Replies */}
                            {selected.replies?.map((r,i)=>{
                                const isAdmin=r.from==='admin';
                                return (
                                    <div key={i} style={{ padding:'20px', borderBottom:'1px solid #F3F4F6', background: isAdmin?'#FAFFFE':'#fff' }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                                <div style={{ width:40,height:40,borderRadius:'50%',background:isAdmin?'#D1FAE5':'#E0E7FF',color:isAdmin?'#065F46':'#4F46E5',fontWeight:800,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                                    {isAdmin?'S':(selected.name||'U')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight:700, fontSize:14, color:'#111827' }}>{isAdmin?'Support Team':selected.name}</div>
                                                    <div style={{ fontSize:12, color:'#9CA3AF' }}>{isAdmin?'From - admin support team':selected.email}</div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize:12, color:'#9CA3AF' }}>
                                                {new Date(r.at).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(r.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(r.at)})
                                            </span>
                                        </div>
                                        <div style={{ fontSize:14, color:'#374151', lineHeight:1.8, whiteSpace:'pre-wrap', paddingLeft:50 }}>
                                            {r.message}
                                        </div>
                                        <div style={{ paddingLeft:50 }}><ImgThumb urls={r.images}/></div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Reply textarea */}
                        {selected.status!=='closed' ? (
                            <div style={{ borderTop:'1px solid #E5E7EB' }}>
                                <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4}
                                    placeholder="Type your reply here..."
                                    style={{ width:'100%', padding:'16px 20px', border:'none', outline:'none', resize:'none', fontSize:14, color:'#374151', lineHeight:1.6, boxSizing:'border-box', fontFamily:'inherit' }}/>
                                <AdminImageUpload sendReply={sendReply} reply={reply} sending={sending}/>
                            </div>
                        ) : (
                            <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #E5E7EB' }}>
                                <span style={{ fontSize:13, color:'#9CA3AF' }}>🔒 Ticket is closed</span>
                                <button onClick={()=>update(selected._id,{status:'open'})} style={{ padding:'7px 18px', background:'#4F46E5', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                                    🔓 Reopen Ticket
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Status row — outside card like TailAdmin */}
                    {selected.status!=='closed' && (
                        <div style={{ display:'flex', alignItems:'center', gap:24, marginTop:16, padding:'14px 20px', background:'#fff', borderRadius:10, border:'1px solid #E5E7EB' }}>
                            <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Status:</span>
                            {[['in_progress','In-Progress','#4F46E5'],['resolved','Solved','#10B981'],['closed','Closed','#6B7280']].map(([v,l,c])=>(
                                <label key={v} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13 }}>
                                    <input type="radio" checked={selected.status===v} onChange={()=>update(selected._id,{status:v})}
                                        style={{ accentColor:c, width:16, height:16 }}/>
                                    <span style={{ color:selected.status===v?c:'#6B7280', fontWeight:selected.status===v?700:500 }}>{l}</span>
                                </label>
                            ))}
                            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                                <select value={selected.priority} onChange={e=>update(selected._id,{priority:e.target.value})}
                                    style={{ padding:'5px 10px', border:'1px solid #E5E7EB', borderRadius:6, fontSize:12, color:'#374151', cursor:'pointer' }}>
                                    <option value="low">🟢 Low</option>
                                    <option value="medium">🟡 Medium</option>
                                    <option value="high">🔴 High</option>
                                </select>
                                <button onClick={()=>del(selected._id)} style={{ padding:'5px 14px', background:'#FEF2F2', border:'1px solid #FECDD3', borderRadius:6, color:'#EF4444', fontSize:12, cursor:'pointer', fontWeight:600 }}>Delete</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — ticket details */}
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'20px' }}>
                    <div style={{ fontWeight:700, fontSize:15, color:'#111827', marginBottom:16, paddingBottom:12, borderBottom:'1px solid #F3F4F6' }}>Ticket Details</div>
                    {[
                        ['Customer',  selected.name],
                        ['Email',     selected.email],
                        ['Ticket ID', `#${selected._id.slice(-6).toUpperCase()}`],
                        ['Category',  selected.subject?.split(' ').slice(0,2).join(' ')+'...'],
                        ['Created',   fmtDate(selected.createdAt)],
                    ].map(([k,v])=>(
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #F3F4F6', fontSize:13 }}>
                            <span style={{ color:'#6B7280' }}>{k}</span>
                            <span style={{ fontWeight:600, color:'#111827', textAlign:'right', maxWidth:160, wordBreak:'break-all' }}>{v}</span>
                        </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:13 }}>
                        <span style={{ color:'#6B7280' }}>Status</span>
                        <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                            background: selected.status==='resolved'?'#D1FAE5':selected.status==='in_progress'?'#DBEAFE':selected.status==='closed'?'#F3F4F6':'#FEF3C7',
                            color: selected.status==='resolved'?'#065F46':selected.status==='in_progress'?'#1E40AF':selected.status==='closed'?'#6B7280':'#92400E' }}>
                            {statusLabel[selected.status]||selected.status}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Ticket List View ─────────────────────────────────────────────────────
    return (
        <div className="pg-wrap">
            {/* Notification popup */}
            {notif && (
                <div onClick={()=>{ const t=tickets.find(x=>x._id===notif.id); if(t) openTicket(t); setNotif(null); }}
                    style={{ position:'fixed',bottom:24,right:24,zIndex:9999,background:'#4F46E5',color:'#fff',borderRadius:12,padding:'14px 18px',boxShadow:'0 8px 24px rgba(79,70,229,0.35)',cursor:'pointer',display:'flex',gap:10,alignItems:'center',maxWidth:300 }}>
                    <span style={{ fontSize:22 }}>💬</span>
                    <div><div style={{ fontWeight:700,fontSize:13 }}>New message!</div><div style={{ fontSize:12,opacity:0.8 }}>{notif.name}: {notif.subject}</div></div>
                    <button onClick={e=>{e.stopPropagation();setNotif(null);}} style={{ background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:20,height:20,color:'#fff',cursor:'pointer',fontSize:11,flexShrink:0 }}>✕</button>
                </div>
            )}

            {/* Page title */}
            <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:24,fontWeight:800,color:'#111827',margin:'0 0 4px' }}>Support Tickets</h1>
                <p style={{ fontSize:14,color:'#6B7280',margin:0 }}>Manage customer support requests</p>
            </div>

            {/* Stats row */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24 }}>
                {[
                    { label:'Total tickets',   value:tickets.length,                                          icon:'🎫', bg:'#EEF2FF', color:'#4F46E5' },
                    { label:'Pending tickets', value:tickets.filter(t=>t.status==='open'||t.status==='in_progress').length, icon:'⏳', bg:'#FFF7ED', color:'#EA580C' },
                    { label:'Solved tickets',  value:tickets.filter(t=>t.status==='resolved').length,         icon:'✅', bg:'#F0FDF4', color:'#16A34A' },
                ].map(s=>(
                    <div key={s.label} style={{ background:'#fff',borderRadius:12,border:'1px solid #E5E7EB',padding:'20px 24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',display:'flex',alignItems:'center',gap:16 }}>
                        <div style={{ width:52,height:52,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontSize:28,fontWeight:800,color:'#111827',lineHeight:1 }}>{s.value}</div>
                            <div style={{ fontSize:13,color:'#6B7280',marginTop:4 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table card */}
            <div style={{ background:'#fff',borderRadius:12,border:'1px solid #E5E7EB',boxShadow:'0 1px 3px rgba(0,0,0,0.06)',overflow:'hidden' }}>
                {/* Table toolbar */}
                <div style={{ padding:'16px 20px',borderBottom:'1px solid #F3F4F6',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
                    <div>
                        <div style={{ fontWeight:700,fontSize:14,color:'#111827' }}>Support Tickets</div>
                        <div style={{ fontSize:12,color:'#9CA3AF',marginTop:2 }}>Your most recent support tickets list</div>
                    </div>
                    <div style={{ display:'flex',gap:10,alignItems:'center' }}>
                        {/* Filter pills */}
                        <div style={{ display:'flex',gap:4,background:'#F3F4F6',borderRadius:8,padding:3 }}>
                            {[['all','All'],['solved','Solved'],['pending','Pending']].map(([v,l])=>(
                                <button key={v} onClick={()=>setFilter(v)}
                                    style={{ padding:'5px 14px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',background:filter===v?'#fff':'transparent',color:filter===v?'#111827':'#6B7280',boxShadow:filter===v?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'#F9FAFB',border:'1px solid #E5E7EB',borderRadius:8,width:200 }}>
                            <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                                style={{ border:'none',outline:'none',fontSize:13,color:'#374151',width:'100%',background:'transparent' }}/>
                        </div>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ padding:60,textAlign:'center',color:'#9CA3AF' }}>Loading...</div>
                ) : filtered.length===0 ? (
                    <div style={{ padding:60,textAlign:'center' }}>
                        <div style={{ fontSize:40,marginBottom:12 }}>🎫</div>
                        <div style={{ fontWeight:600,color:'#374151' }}>No tickets found</div>
                    </div>
                ) : (
                    <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                        <thead>
                            <tr style={{ background:'#F9FAFB',borderBottom:'1px solid #E5E7EB' }}>
                                <th style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>Ticket ID</th>
                                <th style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>Requested By</th>
                                <th style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>Subject</th>
                                <th style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>Create Date</th>
                                <th style={{ padding:'11px 16px',textAlign:'left',fontSize:11,fontWeight:700,color:'#6B7280',textTransform:'uppercase',letterSpacing:0.5 }}>Status</th>
                                <th style={{ padding:'11px 16px',width:40 }}/>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((t,i)=>(
                                <tr key={t._id} style={{ borderBottom:'1px solid #F3F4F6',cursor:'pointer',background:t.adminUnread?'#FAFAF7':'#fff' }}
                                    onMouseEnter={e=>e.currentTarget.style.background='#F9FAFB'}
                                    onMouseLeave={e=>e.currentTarget.style.background=t.adminUnread?'#FAFAF7':'#fff'}
                                    onClick={()=>openTicket(t)}>
                                    <td style={{ padding:'14px 16px' }}>
                                        <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                                            <span style={{ fontFamily:'monospace',fontSize:12,color:'#4F46E5',fontWeight:600 }}>#{t._id.slice(-6).toUpperCase()}</span>
                                            {t.adminUnread && <span style={{ width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block',flexShrink:0 }}/>}
                                        </div>
                                    </td>
                                    <td style={{ padding:'14px 16px' }}>
                                        <div style={{ fontWeight:600,color:'#111827' }}>{t.name}</div>
                                        <div style={{ fontSize:11,color:'#9CA3AF',marginTop:2 }}>{t.email}</div>
                                    </td>
                                    <td style={{ padding:'14px 16px',color:'#374151',maxWidth:300 }}>{t.subject}</td>
                                    <td style={{ padding:'14px 16px',color:'#6B7280',whiteSpace:'nowrap',fontSize:12 }}>{fmtDate(t.createdAt)}</td>
                                    <td style={{ padding:'14px 16px' }}>
                                        <span style={{ fontSize:12,fontWeight:600,color:statusColor[t.status]||'#6B7280' }}>
                                            {statusLabel[t.status]||t.status}
                                        </span>
                                    </td>
                                    <td style={{ padding:'14px 16px' }} onClick={e=>e.stopPropagation()}>
                                        <button onClick={()=>del(t._id)} style={{ background:'none',border:'none',color:'#9CA3AF',cursor:'pointer',fontSize:16,padding:'2px 6px' }}>···</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
