import React, { useState, useEffect, useRef } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
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
function fmtDateTime(d) {
    return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ', ' +
           new Date(d).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});
}

const statusColor = { open:'#F59E0B', in_progress:'#3B82F6', resolved:'#10B981', closed:'#6B7280' };
const statusLabel = { open:'Pending', in_progress:'In Progress', resolved:'Solved', closed:'Closed' };

function ImgThumb({ urls }) {
    if(!urls?.length) return null;
    return <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
        {urls.map((u,i) => <a key={i} href={u.startsWith('http')?u:`${API_BASE}${u}`} target="_blank" rel="noreferrer">
            <img src={u.startsWith('http')?u:`${API_BASE}${u}`} alt="" style={{ width:72,height:54,objectFit:'cover',borderRadius:6,border:'1px solid var(--border-color)',cursor:'zoom-in' }}/>
        </a>)}
    </div>;
}

function AdminImageUpload({ sendReply, reply, sending }) {
    const [files,setFiles] = useState([]);
    const ref = useRef();
    return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 16px', borderTop:'1px solid var(--border-color)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>{ setFiles(p=>[...p,...Array.from(e.target.files)].slice(0,5)); e.target.value=''; }}/>
                <button type="button" onClick={()=>ref.current.click()} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Attach {files.length>0&&`(${files.length})`}
                </button>
                {files.map((f,i)=><div key={i} style={{ position:'relative' }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width:36,height:28,objectFit:'cover',borderRadius:4,border:'1px solid var(--border-color)' }}/>
                    <button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))} style={{ position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'none',fontSize:8,cursor:'pointer',fontWeight:900 }}>✕</button>
                </div>)}
            </div>
            <button onClick={()=>sendReply(files).then(()=>setFiles([]))} disabled={sending||!reply.trim()}
                className="btn-primary"
                style={{ padding:'8px 24px', opacity:(!reply.trim()||sending)?0.5:1 }}>
                {sending?'Sending...':'Reply'}
            </button>
        </div>
    );
}

const SUPPORT_TICKETS_STYLES = `
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
    --chat-item-admin-bg: #fafcfe;
    --chat-item-bg: #ffffff;
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
    --chat-item-admin-bg: rgba(16, 185, 129, 0.03);
    --chat-item-bg: #131a26;
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

  .perf-page-container .stat-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 20px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .perf-page-container .table-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
  }

  .perf-page-container .table-header-panel {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border-color) !important;
    background: var(--table-header-bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .perf-page-container .search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    min-width: 130px;
    flex: 1;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .perf-page-container .search-box:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  .perf-page-container .search-input {
    border: none;
    outline: none;
    font-size: 13px;
    color: var(--text-main);
    width: 100%;
    background: transparent;
    font-family: inherit;
  }

  .perf-page-container .table-th {
    padding: 11px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    border-bottom: 1px solid var(--border-color) !important;
  }

  .perf-page-container .table-row {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.15s ease;
  }
  .perf-page-container .table-row:last-child {
    border-bottom: none;
  }
  .perf-page-container .table-row:hover {
    background-color: var(--hover-row-bg) !important;
  }

  .perf-page-container .table-td {
    padding: 13px 16px;
    color: var(--text-main);
  }

  /* Chat list item specific */
  .perf-page-container .chat-item {
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
    background: var(--chat-item-bg);
  }
  .perf-page-container .chat-item.admin {
    background: var(--chat-item-admin-bg);
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
  }
  .perf-page-container .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }

  .perf-page-container .btn-secondary {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 16px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text-main);
    transition: all 0.2s ease;
  }
  .perf-page-container .btn-secondary:hover:not(:disabled) {
    background: var(--bg-input);
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

  .perf-page-container .ticket-action-row {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-top: 16px;
    padding: 14px 20px;
    background: var(--bg-card);
    border-radius: 10px;
    border: 1px solid var(--border-color);
  }

  .perf-page-container .ticket-detail-panel {
    background: var(--bg-card);
    border-radius: 12px;
    border: 1px solid var(--border-color);
    box-shadow: var(--card-shadow);
    padding: 20px;
  }

  .perf-page-container .ticket-menu-dropdown {
    position: absolute;
    right: 12px;
    top: 100%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: var(--card-shadow);
    z-index: 100;
    min-width: 130px;
    overflow: hidden;
  }
  .perf-page-container .ticket-menu-item {
    padding: 10px 16px;
    font-size: 13px;
    color: var(--text-main);
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .perf-page-container .ticket-menu-item:hover {
    background-color: var(--bg-input);
  }
  .perf-page-container .ticket-menu-item.danger {
    color: var(--danger);
  }
  .perf-page-container .ticket-menu-item.danger:hover {
    background-color: rgba(239, 68, 68, 0.08);
  }

  .perf-page-container .priority-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 20px;
    border-width: 1px;
    border-style: solid;
    white-space: nowrap;
  }

  .perf-page-container .priority-badge.high {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.15);
  }
  .perf-page-container .priority-badge.medium {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.15);
  }
  .perf-page-container .priority-badge.low {
    color: var(--text-muted);
    background: var(--bg-input);
    border-color: var(--border-color);
  }

  .perf-page-container .t-status-badge {
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .perf-page-container.light .t-status-badge.solved {
    background: #D1FAE5;
    color: #065F46;
  }
  .perf-page-container.dark .t-status-badge.solved {
    background: rgba(16, 185, 129, 0.08);
    color: #10B981;
  }
  .perf-page-container.light .t-status-badge.in_progress {
    background: #DBEAFE;
    color: #1E40AF;
  }
  .perf-page-container.dark .t-status-badge.in_progress {
    background: rgba(59, 130, 246, 0.08);
    color: #60a5fa;
  }
  .perf-page-container.light .t-status-badge.closed {
    background: #F3F4F6;
    color: #6B7280;
  }
  .perf-page-container.dark .t-status-badge.closed {
    background: rgba(255, 255, 255, 0.04);
    color: #94a3b8;
  }
  .perf-page-container.light .t-status-badge.open {
    background: #FEF3C7;
    color: #92400E;
  }
  .perf-page-container.dark .t-status-badge.open {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }
`;

export default function SupportTickets({ readOnly = false, adminOnly = false }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [tickets,  setTickets]   = useState([]);
    const [loading,  setLoading]   = useState(true);
    const [filter,   setFilter]    = useState('all');
    const [search,   setSearch]    = useState('');
    const [selected, setSelected]  = useState(null);
    const [view,     setView]      = useState('list'); // 'list' | 'reply'
    const [reply,    setReply]     = useState('');
    const [sending,  setSending]   = useState(false);
    const [notif,    setNotif]     = useState(null);
    const [menuOpen, setMenuOpen]  = useState(null); // ticket._id
    const prevUnread = useRef([]);
    const selectedRef = useRef(null);
    const chatBoxRef  = useRef(null);

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

    const scrollToBottom = () => { const el=chatBoxRef.current; if(el) el.scrollTop=el.scrollHeight; };
    useEffect(()=>{ selectedRef.current=selected; if(selected) setTimeout(scrollToBottom,100); },[selected]);

    const load = async (silent=false) => {
        if(!silent) setLoading(true);
        try {
            const r = await axios.get(`${API_URL}/api/admin/support-tickets`,{withCredentials:true});
            const fresh = r.data;
            const newUnread = fresh.filter(t=>t.adminUnread && !prevUnread.current.includes(t._id));
            const totalUnread = fresh.filter(t=>t.adminUnread).length;
            if(newUnread.length>0){
                setNotif({ id:newUnread[0]._id, name:newUnread[0].name, subject:newUnread[0].subject, count:totalUnread });
                setTimeout(()=>setNotif(null),6000);
            }
            prevUnread.current = fresh.filter(t=>t.adminUnread).map(t=>t._id);
            setTickets(fresh);
            if(selectedRef.current){ const u=fresh.find(t=>t._id===selectedRef.current._id); if(u) setSelected(u); }
        } catch{}
        if(!silent) setLoading(false);
    };

    useEffect(()=>{ load(); const t=setInterval(()=>load(true),10000); return()=>clearInterval(t); },[]);
    useEffect(()=>{ const h=()=>setMenuOpen(null); document.addEventListener('click',h); return()=>document.removeEventListener('click',h); },[]);

    const markRead = async(id)=>{ await axios.post(`${API_URL}/api/admin/support-tickets/${id}/mark-read`,{},{withCredentials:true}).catch(()=>{}); setTickets(p=>p.map(t=>t._id===id?{...t,adminUnread:false}:t)); };
    const openTicket = (t)=>{ setSelected(t); setView('reply'); if(t.adminUnread) markRead(t._id); };
    const update = async(id,data)=>{ await axios.put(`${API_URL}/api/admin/support-tickets/${id}`,data,{withCredentials:true}); load(true); if(selected?._id===id) setSelected(s=>({...s,...data})); };
    const del = async(id)=>{ if(!confirm('Delete this ticket?')) return; await axios.delete(`${API_URL}/api/admin/support-tickets/${id}`,{withCredentials:true}); setSelected(null); setView('list'); load(); };
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
        const matchFilter=filter==='all'
            ||(filter==='solved'&&t.status==='resolved')
            ||(filter==='pending'&&(t.status==='open'||t.status==='in_progress'))
            ||(filter==='closed'&&t.status==='closed')
            ||(filter==='high'&&t.priority==='high')
            ||(filter==='medium'&&t.priority==='medium')
            ||(filter==='low'&&t.priority==='low');
        return matchSearch&&matchFilter;
    });

    const isDark = localTheme === 'dark';

    // ── Ticket Reply View ────────────────────────────────────────────────────
    if(view==='reply' && selected) return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{SUPPORT_TICKETS_STYLES}</style>
            <div className="pg-wrap">
                <ConfirmDialog />
                {/* Header breadcrumb */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <button onClick={()=>setView('list')} className="btn-secondary" style={{ display:'flex', alignItems:'center', gap:6 }}>
                            ← Back to List
                        </button>
                        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text-main)', margin:0, fontFamily:'Outfit, sans-serif' }}>Ticket Reply</h1>
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                        <span style={{ cursor:'pointer', color:'var(--primary)' }} onClick={()=>setView('list')}>Home</span>
                        <span style={{ margin:'0 6px' }}>›</span>
                        <span>Ticket Reply</span>
                    </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:20, alignItems:'start' }} className="ticket-reply-grid">
                    {/* Left — full ticket thread */}
                    <div>
                        {/* Ticket header card */}
                        <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--border-color)', boxShadow:'var(--card-shadow)', marginBottom:0, overflow:'hidden' }}>
                            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                <div>
                                    <div style={{ fontWeight:700, fontSize:15, color:'var(--text-main)' }}>
                                        Ticket #{selected._id.slice(-6).toUpperCase()} — {selected.subject}
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
                                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                                            {new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})
                                        </span>
                                        <span className={`priority-badge ${selected.priority}`}>
                                            {selected.priority==='high'?'🔴 High':selected.priority==='medium'?'🟡 Medium':'🟢 Low'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                    <span style={{ fontSize:12, color:'var(--text-muted)' }}>{(selected.replies?.length||0)+1} of {tickets.length}</span>
                                    <button onClick={()=>{ const i=filtered.findIndex(t=>t._id===selected._id); if(i>0) setSelected(filtered[i-1]); }} className="btn-secondary" style={{ width:28,height:28,padding:0,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
                                    <button onClick={()=>{ const i=filtered.findIndex(t=>t._id===selected._id); if(i<filtered.length-1) setSelected(filtered[i+1]); }} className="btn-secondary" style={{ width:28,height:28,padding:0,display:'flex',alignItems:'center',justifyContent:'center' }}>›</button>
                                </div>
                            </div>

                            {/* Messages thread */}
                            <div ref={chatBoxRef} style={{ maxHeight:380, overflowY:'auto' }}>
                                {/* Original message */}
                                <div className="chat-item">
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                            <div style={{ width:40,height:40,borderRadius:'50%',background:isDark?'rgba(124, 58, 237, 0.08)':'#E0E7FF',color:isDark?'#a78bfa':'#4F46E5',fontWeight:800,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                                {(selected.name||'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight:700, fontSize:14, color:'var(--text-main)' }}>{selected.name}</div>
                                                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{selected.email}</div>
                                            </div>
                                        </div>
                                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                                            {new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})
                                        </span>
                                    </div>
                                    <div style={{ fontSize:14, color:'var(--text-main)', lineHeight:1.8, whiteSpace:'pre-wrap', paddingLeft:50 }}>
                                        {selected.message}
                                    </div>
                                    <div style={{ paddingLeft:50 }}><ImgThumb urls={selected.images}/></div>
                                </div>

                                {/* Replies */}
                                {selected.replies?.map((r,i)=>{
                                    const isAdmin=r.from==='admin';
                                    return (
                                        <div key={i} className={`chat-item ${isAdmin ? 'admin' : ''}`}>
                                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                                                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                                                    <div style={{ width:40,height:40,borderRadius:'50%',background:isAdmin?(isDark?'rgba(16,185,129,0.08)':'#D1FAE5'):(isDark?'rgba(124, 58, 237, 0.08)':'#E0E7FF'),color:isAdmin?'#10B981':'#4F46E5',fontWeight:800,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                                        {isAdmin?'S':(selected.name||'U')[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight:700, fontSize:14, color:'var(--text-main)' }}>{isAdmin?'Support Team':selected.name}</div>
                                                        <div style={{ fontSize:12, color:'var(--text-muted)' }}>{isAdmin ? `From - ${r.senderName || 'Support Team'}` : selected.email}</div>
                                                    </div>
                                                </div>
                                                <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                                                    {new Date(r.at).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(r.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(r.at)})
                                                </span>
                                            </div>
                                            <div style={{ fontSize:14, color:'var(--text-main)', lineHeight:1.8, whiteSpace:'pre-wrap', paddingLeft:50 }}>
                                                {r.message}
                                            </div>
                                            <div style={{ paddingLeft:50 }}><ImgThumb urls={r.images}/></div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply textarea */}
                            {readOnly ? (
                                <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border-color)', background: isDark?'rgba(245, 158, 11, 0.04)':'#fffbeb' }}>
                                    <span style={{ fontSize:12, fontWeight:700, color:isDark?'#f59e0b':'#92400e' }}>👁 Read Only — cannot reply</span>
                                </div>
                            ) : selected.status!=='closed' ? (
                                <div style={{ borderTop:'1px solid var(--border-color)' }}>
                                    <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4}
                                        placeholder="Type your reply here..."
                                        style={{ width:'100%', padding:'16px 20px', border:'none', outline:'none', resize:'none', fontSize:14, color:'var(--text-main)', background:'var(--bg-card)', lineHeight:1.6, boxSizing:'border-box', fontFamily:'inherit' }}/>
                                    <AdminImageUpload sendReply={sendReply} reply={reply} sending={sending}/>
                                </div>
                            ) : (
                                <div style={{ padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid var(--border-color)' }}>
                                    <span style={{ fontSize:13, color:'var(--text-muted)' }}>🔒 Ticket is closed</span>
                                    <button onClick={()=>update(selected._id,{status:'open'})} className="btn-primary">
                                        🔓 Reopen Ticket
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Status row — outside card like TailAdmin */}
                        {!readOnly && selected.status!=='closed' && (
                            <div className="ticket-action-row">
                                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>Status:</span>
                                {[
                                    ['in_progress','In-Progress','#7c3aed'],
                                    ['resolved','Solved','#10B981'],
                                    ['closed','Closed','#6B7280']
                                ].map(([v,l,c])=>(
                                    <label key={v} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:13 }}>
                                        <input type="radio" checked={selected.status===v} onChange={()=>update(selected._id,{status:v})}
                                            style={{ accentColor:c, width:16, height:16 }}/>
                                        <span style={{ color:selected.status===v?c:'var(--text-muted)', fontWeight:selected.status===v?700:500 }}>{l}</span>
                                    </label>
                                ))}
                                {!adminOnly && <div style={{ marginLeft:'auto' }}>
                                    <button onClick={()=>del(selected._id)} className="btn-secondary" style={{ color:'var(--danger)', borderColor:'rgba(239, 68, 68, 0.2)', padding:'5px 14px' }}>Delete</button>
                                </div>}
                            </div>
                        )}
                    </div>

                    {/* Right — ticket details */}
                    <div className="ticket-detail-panel">
                        <div style={{ fontWeight:700, fontSize:15, color:'var(--text-main)', marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border-color)', fontFamily:'Outfit, sans-serif' }}>Ticket Details</div>
                        {[
                            ['Customer',   selected.name],
                            ['Account ID', selected.accountId || '—'],
                            ['Email',      selected.email],
                            ['Ticket ID',  `#${selected._id.slice(-6).toUpperCase()}`],
                            ['Category',   selected.subject?.split(' ').slice(0,2).join(' ')+'...'],
                            ['Created',    fmtDate(selected.createdAt)],
                        ].map(([k,v])=>(
                            <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border-color)', fontSize:13 }}>
                                <span style={{ color:'var(--text-muted)' }}>{k}</span>
                                <span style={{ fontWeight:600, color:'var(--text-main)', textAlign:'right', maxWidth:160, wordBreak:'break-all' }}>{v}</span>
                            </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontSize:13 }}>
                            <span style={{ color:'var(--text-muted)' }}>Status</span>
                            <span className={`t-status-badge ${selected.status}`}>
                                {statusLabel[selected.status]||selected.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Ticket List View ─────────────────────────────────────────────────────
    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{SUPPORT_TICKETS_STYLES}</style>
            <div className="pg-wrap">
                <ConfirmDialog />
                {/* Notification popup */}
                {notif && (
                    <div onClick={()=>{ const t=tickets.find(x=>x._id===notif.id); if(t) openTicket(t); setNotif(null); }}
                        style={{ position:'fixed',bottom:24,right:24,zIndex:9999,background:'var(--primary)',color:'#fff',borderRadius:14,padding:'14px 18px',boxShadow:'0 8px 28px rgba(124,58,237,0.4)',cursor:'pointer',display:'flex',gap:12,alignItems:'center',maxWidth:320 }}>
                        {/* Count badge */}
                        <div style={{ position:'relative', flexShrink:0 }}>
                            <div style={{ width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>💬</div>
                            {notif.count>0 && (
                                <span style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,background:'#EF4444',color:'#fff',fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:`2px solid var(--primary)` }}>
                                    {notif.count}
                                </span>
                            )}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:800, fontSize:13, marginBottom:3 }}>
                                {notif.count>1 ? `${notif.count} new messages!` : 'New message!'}
                            </div>
                            <div style={{ fontSize:12, opacity:0.85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {notif.name}: {notif.subject}
                            </div>
                            <div style={{ fontSize:11, opacity:0.65, marginTop:2 }}>Click to view →</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();setNotif(null);}} style={{ background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:22,height:22,color:'#fff',cursor:'pointer',fontSize:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                    </div>
                )}

                {/* Page title */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Support Tickets <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">Manage customer support requests</p>
                    </div>
                </div>

                {/* Stats row — clickable filters */}
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12,marginBottom:20 }}>
                    {[
                        { label:'Total tickets',   value:tickets.length,                                                                       icon:'🎫', bg:isDark?'rgba(124, 58, 237, 0.08)':'#EEF2FF', color:'#7c3aed', f:'all' },
                        { label:'Pending tickets', value:tickets.filter(t=>t.status==='open'||t.status==='in_progress').length,                icon:'⏳', bg:isDark?'rgba(245, 158, 11, 0.08)':'#FFF7ED', color:'#EA580C', f:'pending' },
                        { label:'Solved tickets',  value:tickets.filter(t=>t.status==='resolved').length,                                     icon:'✅', bg:isDark?'rgba(16, 185, 129, 0.08)':'#F0FDF4', color:'#16A34A', f:'solved' },
                        { label:'Closed tickets',  value:tickets.filter(t=>t.status==='closed').length,                                       icon:'🔒', bg:isDark?'rgba(255,255,255,0.04)':'#F9FAFB', color:'var(--text-muted)', f:'closed' },
                    ].map(s=>{
                        const active=filter===s.f;
                        return (
                            <div key={s.label} onClick={()=>setFilter(active?'all':s.f)} className="stat-card" style={{ border:`1px solid ${active?s.color:'var(--border-color)'}`, boxShadow:active?`0 4px 12px ${s.color}25`:'' }}>
                                <div style={{ width:52,height:52,borderRadius:12,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0 }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize:28,fontWeight:800,color:active?s.color:'var(--text-main)',lineHeight:1 }}>{s.value}</div>
                                    <div style={{ fontSize:13,color:'var(--text-muted)',marginTop:4 }}>{s.label}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table card */}
                <div className="table-card">
                    {/* Table toolbar */}
                    <div className="table-header-panel">
                        <div>
                            <div style={{ fontWeight:700,fontSize:14,color:'var(--text-main)' }}>Support Tickets</div>
                            <div style={{ fontSize:12,color:'var(--text-muted)',marginTop:2 }}>Your most recent support tickets list</div>
                        </div>
                        <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                            {/* Filter pills */}
                            <div style={{ display:'flex',gap:3,background:'var(--bg-input)',borderRadius:8,padding:3 }}>
                                {[['all','All'],['solved','Solved'],['pending','Pending']].map(([v,l])=>(
                                    <button key={v} onClick={()=>setFilter(v)}
                                        style={{ padding:'5px 10px',borderRadius:6,border:'none',fontSize:12,fontWeight:600,cursor:'pointer',transition:'all 0.15s',background:filter===v?'var(--bg-card)':'transparent',color:filter===v?'var(--text-main)':'var(--text-muted)',boxShadow:filter===v?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                            {/* Search */}
                            <div className="search-box">
                                <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="search-input" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div style={{ padding:60,textAlign:'center',color:'var(--text-muted)' }}>Loading...</div>
                    ) : filtered.length===0 ? (
                        <div style={{ padding:60,textAlign:'center' }}>
                            <div style={{ fontSize:40,marginBottom:12 }}>🎫</div>
                            <div style={{ fontWeight:600,color:'var(--text-main)' }}>No tickets found</div>
                        </div>
                    ) : window.innerWidth < 768 ? (
                        /* ── Mobile card view ── */
                        <div>
                            {filtered.map(t=>(
                                <div key={t._id} onClick={()=>openTicket(t)}
                                    style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-color)', cursor:'pointer', background:t.adminUnread?(isDark?'rgba(124, 58, 237, 0.03)':'#FAFAF7'):'transparent' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                            <span style={{ fontFamily:'monospace',fontSize:12,color:'var(--primary)',fontWeight:700 }}>#{t._id.slice(-6).toUpperCase()}</span>
                                            {t.adminUnread && <span style={{ width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block' }}/>}
                                        </div>
                                        <span className={`t-status-badge ${t.status}`}>{statusLabel[t.status]||t.status}</span>
                                    </div>
                                    <div style={{ fontWeight:600,color:'var(--text-main)',fontSize:14,marginBottom:6 }}>{t.subject}</div>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                                            <span className={`priority-badge ${t.priority}`}>
                                                {t.priority==='high'?'🔴 High':t.priority==='medium'?'🟡 Medium':'🟢 Low'}
                                            </span>
                                            <span style={{ fontSize:11,color:'var(--text-muted)' }}>{t.name}</span>
                                        </div>
                                        <span style={{ fontSize:11,color:'var(--text-muted)' }}>{timeAgo(t.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* ── Desktop table view ── */
                        <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                            <thead>
                                <tr style={{ background:'var(--table-header-bg)',borderBottom:'1px solid var(--border-color)' }}>
                                    <th className="table-th">Ticket ID</th>
                                    <th className="table-th">Requested By</th>
                                    <th className="table-th">Subject</th>
                                    <th className="table-th">Priority</th>
                                    <th className="table-th">Create Date</th>
                                    <th className="table-th">Status</th>
                                    <th style={{ padding:'11px 16px',width:40,borderBottom:'1px solid var(--border-color)' }}/>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t,i)=>(
                                    <tr key={t._id} className="table-row" style={{ background:t.adminUnread?(isDark?'rgba(124, 58, 237, 0.03)':'#FAFAF7'):'' }}
                                        onClick={()=>openTicket(t)}>
                                        <td className="table-td">
                                            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                                                <span style={{ fontFamily:'monospace',fontSize:12,color:'var(--primary)',fontWeight:600 }}>#{t._id.slice(-6).toUpperCase()}</span>
                                                {t.adminUnread && <span style={{ width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block',flexShrink:0 }}/>}
                                            </div>
                                        </td>
                                        <td className="table-td">
                                            <div style={{ fontWeight:600,color:'var(--text-main)' }}>{t.name}</div>
                                            <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>{t.email}</div>
                                        </td>
                                        <td className="table-td" style={{ color:'var(--text-main)',maxWidth:280 }}>{t.subject}</td>
                                        <td className="table-td">
                                            <span className={`priority-badge ${t.priority}`}>
                                                {t.priority==='high'?'🔴 High':t.priority==='medium'?'🟡 Medium':'🟢 Low'}
                                            </span>
                                        </td>
                                        <td className="table-td" style={{ color:'var(--text-muted)',whiteSpace:'nowrap',fontSize:12 }}>
                                            <div>{fmtDate(t.createdAt)}</div>
                                            <div style={{ fontSize:11,color:'var(--text-muted)',marginTop:2 }}>{timeAgo(t.createdAt)}</div>
                                        </td>
                                        <td className="table-td">
                                            <span className={`t-status-badge ${t.status}`}>{statusLabel[t.status]||t.status}</span>
                                        </td>
                                        <td className="table-td" style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
                                            <button onClick={e=>{ e.stopPropagation(); setMenuOpen(menuOpen===t._id?null:t._id); }}
                                                className="btn-secondary" style={{ border:'none',background:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:18,padding:'2px 8px',borderRadius:6,lineHeight:1 }}>···</button>
                                            {menuOpen===t._id && (
                                                <div className="ticket-menu-dropdown">
                                                    <div onClick={()=>{ openTicket(t); setMenuOpen(null); }} className="ticket-menu-item">View More</div>
                                                    {!adminOnly && <div onClick={()=>{ setMenuOpen(null); del(t._id); }} className="ticket-menu-item danger">Delete</div>}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
