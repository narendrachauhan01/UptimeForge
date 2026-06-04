import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const API_BASE = (API_URL||'').replace('/api','');

const TOPICS = [
    { value:'Site monitoring not working',    icon:'📡' },
    { value:'Alert not received',             icon:'🔔' },
    { value:'SSL / Domain expiry issue',      icon:'🔒' },
    { value:'Plan upgrade / downgrade',       icon:'🚀' },
    { value:'Payment failed / not reflecting',icon:'💳' },
    { value:'Refund request',                 icon:'💰' },
    { value:'Account blocked / suspended',    icon:'🚫' },
    { value:'Billing & invoice query',        icon:'🧾' },
    { value:'WhatsApp / Email alerts setup',  icon:'📲' },
    { value:'Integrations (Webhook/Slack)',   icon:'🔗' },
    { value:'Performance & response time',    icon:'⚡' },
    { value:'Technical issue',               icon:'⚙️' },
    { value:'Other',                         icon:'💬' },
];

function timeAgo(d) {
    const s=Math.floor((Date.now()-new Date(d))/1000);
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
const prioBg    = p => p==='high'?'#FEF2F2':p==='medium'?'#FFFBEB':'#F0FDF4';
const prioColor = p => p==='high'?'#DC2626':p==='medium'?'#D97706':'#16A34A';
const prioLabel = p => p==='high'?'🔴 High':p==='medium'?'🟡 Medium':'🟢 Low';

const SUPPORT_STYLES = `
    /* Global CSS Variables for scope */
    .perf-page-container {
      --primary: #7c3aed;
      --primary-hover: #6d28d9;
      --primary-rgb: 124, 58, 237;
      --success: #10b981;
      --success-rgb: 16, 185, 129;
      --danger: #f43f5e;
      --danger-rgb: 244, 63, 94;
      --warning: #f59e0b;
      --warning-rgb: 245, 158, 11;
      --info: #06b6d4;
      
      transition: background-color 0.3s ease;
      min-height: 100vh;
      position: relative;
      z-index: 1;
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
      --input-focus-shadow: rgba(124, 58, 237, 0.08);
      --hover-row-bg: rgba(124, 58, 237, 0.04);
      --unread-row-bg: #fafaf7;
      --chat-admin-bg: #FAFFFE;
      --chat-user-bg: #ffffff;
      --chat-bubble-bg: #f1f5f9;
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
      --input-focus-shadow: rgba(139, 92, 246, 0.15);
      --hover-row-bg: rgba(124, 58, 237, 0.08);
      --unread-row-bg: rgba(124, 58, 237, 0.04);
      --chat-admin-bg: rgba(16, 185, 129, 0.03);
      --chat-user-bg: #131a26;
      --chat-bubble-bg: #1b2535;
    }

    /* Body background overrides */
    body.charts-dark-theme {
      background-color: #0b0f19 !important;
    }
    body.charts-dark-theme .app-main,
    body.charts-dark-theme .content {
      background-color: #0b0f19 !important;
      transition: background-color 0.3s ease;
    }

    /* Page wrapper */
    .perf-page-container .pg-wrap {
      background: transparent !important;
      min-height: auto;
      position: relative;
      z-index: 10;
      padding: 0 4px;
    }
    .perf-page-container .pg-header {
      margin-bottom: 24px;
    }
    .perf-page-container .pg-title {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: var(--text-main) !important;
      letter-spacing: -0.8px;
      margin: 0 0 6px;
    }
    .perf-page-container .pg-sub {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }

    /* Buttons & Badges */
    .perf-page-container .btn-primary {
      padding: 10px 20px !important;
      background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
      color: #fff !important;
      border: none !important;
      border-radius: 9px !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      box-shadow: 0 4px 12px rgba(124,58,237,0.2);
    }
    .perf-page-container .btn-primary:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important;
    }

    .perf-page-container .btn-outline {
      padding: 8px 16px !important;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 9px !important;
      background: var(--bg-card) !important;
      color: var(--text-main) !important;
      cursor: pointer !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      transition: all 0.2s !important;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .perf-page-container .btn-outline:hover {
      background: var(--bg-input) !important;
    }

    /* Container card */
    .perf-page-container .support-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 20px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
    }

    /* Toolbar header inside support-card */
    .perf-page-container .support-toolbar {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-color) !important;
    }
    
    /* Search */
    .perf-page-container .mon-search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .perf-page-container .mon-search-wrap svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted) !important;
      z-index: 10;
    }
    .perf-page-container .mon-search {
      width: 100%;
      padding: 9px 36px 9px 36px !important;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 12px !important;
      background: var(--bg-input) !important;
      color: var(--text-main) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      outline: none !important;
      box-sizing: border-box !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      transition: all 0.2s !important;
    }
    .perf-page-container .mon-search:focus {
      border-color: var(--primary) !important;
      background: var(--bg-card) !important;
      box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
    }
    .perf-page-container .search-clear {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none !important;
      border: none !important;
      color: var(--text-muted) !important;
      cursor: pointer !important;
      font-size: 14px !important;
      z-index: 10;
      padding: 0 !important;
      transition: all 0.2s !important;
    }
    .perf-page-container .search-clear:hover {
      color: var(--danger) !important;
    }

    /* Filter Pills */
    .perf-page-container .filter-pills {
      display: flex;
      gap: 4px;
      background: var(--bg-input) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 12px;
      padding: 4px;
    }
    
    .perf-page-container .filter-pill {
      padding: 6px 14px !important;
      border: none !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      background: transparent !important;
      color: var(--text-muted) !important;
      transition: all 0.2s !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    .perf-page-container .filter-pill:hover {
      color: var(--text-main) !important;
    }
    .perf-page-container .filter-pill.active {
      background: var(--bg-card) !important;
      color: var(--text-main) !important;
      box-shadow: var(--card-shadow) !important;
    }

    /* Ticket Rows / Tables */
    .perf-page-container .ticket-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      min-width: 550px;
    }
    
    .perf-page-container .ticket-th {
      padding: 11px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      border-bottom: 2px solid var(--border-color) !important;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    .perf-page-container .ticket-tr {
      border-bottom: 1px solid var(--border-color) !important;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .perf-page-container .ticket-tr:last-child {
      border-bottom: none !important;
    }
    .perf-page-container .ticket-td {
      padding: 14px 16px;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      transition: background-color 0.15s ease;
    }
    .perf-page-container .ticket-tr:hover td {
      background: var(--hover-row-bg) !important;
    }

    /* Form styling */
    .perf-page-container .form-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 20px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      max-width: 680px;
    }
    .perf-page-container .form-header {
      padding: 14px 20px;
      background: var(--bg-input) !important;
      border-bottom: 1px solid var(--border-color) !important;
    }
    .perf-page-container .form-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--text-main) !important;
    }
    .perf-page-container .form-subtitle {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .perf-page-container .form-group {
      margin-bottom: 16px;
    }
    .perf-page-container .form-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-main) !important;
      display: block;
      margin-bottom: 6px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .perf-page-container .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 9px;
      font-size: 14px;
      background: var(--bg-input) !important;
      color: var(--text-main) !important;
      outline: none;
      box-sizing: border-box;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: all 0.2s;
    }
    .perf-page-container .form-input:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px var(--input-focus-shadow);
    }
    
    .perf-page-container .form-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 9px;
      font-size: 14px;
      background: var(--bg-input) !important;
      color: var(--text-main) !important;
      outline: none;
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.6;
      font-family: 'Plus Jakarta Sans', sans-serif;
      transition: all 0.2s;
    }
    .perf-page-container .form-textarea:focus {
      border-color: var(--primary) !important;
      box-shadow: 0 0 0 3px var(--input-focus-shadow);
    }

    /* Dropdown custom topic selector */
    .perf-page-container .topic-select {
      padding: 9px 14px;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 9px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      background: var(--bg-input) !important;
      color: var(--text-main) !important;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .perf-page-container .topic-select-active {
      border-color: var(--primary) !important;
    }
    .perf-page-container .topic-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-card) !important;
      border: 1.5px solid var(--border-color) !important;
      border-radius: 10px;
      box-shadow: var(--card-hover-shadow);
      z-index: 100;
      margin-top: 4px;
      overflow: hidden;
    }
    .perf-page-container .topic-option {
      padding: 11px 16px;
      cursor: pointer;
      display: flex;
      gap: 10px;
      font-size: 14px;
      color: var(--text-main);
      border-bottom: 1px solid var(--border-color);
      background: transparent;
      transition: background-color 0.15s;
    }
    .perf-page-container .topic-option:hover {
      background: var(--bg-input) !important;
    }
    .perf-page-container .topic-option.selected {
      background: rgba(124, 58, 237, 0.08) !important;
    }
    .perf-page-container .topic-option:last-child {
      border-bottom: none;
    }

    /* Priority buttons */
    .perf-page-container .btn-prio {
      flex: 1;
      padding: 10px;
      border-radius: 9px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      background: var(--bg-card) !important;
      transition: all 0.2s !important;
      text-align: center;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    .perf-page-container .btn-prio.active {
      color: #fff !important;
      border-color: transparent !important;
    }

    /* Ticket details sidebar inside chat view */
    .perf-page-container .ticket-side-info {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 20px;
      box-shadow: var(--card-shadow);
      padding: 20px;
    }

    /* Reply container */
    .perf-page-container .reply-box {
      border-top: 1.5px solid var(--border-color) !important;
    }
    .perf-page-container .reply-textarea {
      width: 100%;
      padding: 16px 20px;
      border: none !important;
      outline: none !important;
      resize: none !important;
      font-size: 14px;
      color: var(--text-main) !important;
      background: var(--bg-card) !important;
      line-height: 1.6;
      box-sizing: border-box;
      font-family: 'Plus Jakarta Sans', sans-serif !important;
    }
    .perf-page-container .reply-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1.5px solid var(--border-color) !important;
      background: var(--bg-input) !important;
    }
`;

function ImgThumb({ urls }) {
    if(!urls?.length) return null;
    return <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
        {urls.map((u,i)=><a key={i} href={u.startsWith('http')?u:`${API_BASE}${u}`} target="_blank" rel="noreferrer">
            <img src={u.startsWith('http')?u:`${API_BASE}${u}`} alt="" style={{width:72,height:54,objectFit:'cover',borderRadius:6,border:'1px solid var(--border-color)',cursor:'zoom-in'}}/>
        </a>)}
    </div>;
}

function FileUploadBtn({ files, setFiles }) {
    const ref = useRef();
    return (
        <div>
            <input ref={ref} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>{ setFiles(p=>[...p,...Array.from(e.target.files)].slice(0,5)); e.target.value=''; }}/>
            <button type="button" onClick={()=>ref.current.click()} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',border:'1px solid var(--border-color)',borderRadius:6,background:'var(--bg-card)',color:'var(--text-muted)',fontSize:13,cursor:'pointer'}}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                Attach {files.length>0&&`(${files.length})`}
            </button>
            {files.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                {files.map((f,i)=><div key={i} style={{position:'relative'}}>
                    <img src={URL.createObjectURL(f)} alt="" style={{width:48,height:38,objectFit:'cover',borderRadius:5,border:'1px solid var(--border-color)'}}/>
                    <button type="button" onClick={()=>setFiles(files.filter((_,j)=>j!==i))} style={{position:'absolute',top:-4,right:-4,width:14,height:14,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'none',fontSize:8,cursor:'pointer',fontWeight:900}}>✕</button>
                </div>)}
            </div>}
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
    const [replyFiles,setReplyFiles]= useState([]);
    const [sending,   setSending]   = useState(false);
    const [topicOpen, setTopicOpen] = useState(false);
    const [form,      setForm]      = useState({ subject:'', message:'', priority:'medium' });
    const [formFiles, setFormFiles] = useState([]);
    const [error,     setError]     = useState('');
    const [notif,     setNotif]     = useState(null);
    const chatBoxRef  = useRef(null);
    const prevUnread  = useRef([]);
    const selectedRef = useRef(null);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark'; // Keep dark mode ON by default
    });

    const isDark = localTheme === 'dark';

    // Synchronize theme cookie shifts
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
            const r = await axios.get(`${API_URL}/api/users/support/my-tickets`,{withCredentials:true});
            const fresh=r.data;
            const newUnread=fresh.filter(t=>t.userUnread && !prevUnread.current.includes(t._id));
            if(newUnread.length>0){ setNotif({id:newUnread[0]._id,subject:newUnread[0].subject,count:fresh.filter(t=>t.userUnread).length}); setTimeout(()=>setNotif(null),6000); }
            prevUnread.current=fresh.filter(t=>t.userUnread).map(t=>t._id);
            setTickets(fresh);
            if(selectedRef.current){ const u=fresh.find(t=>t._id===selectedRef.current._id); if(u) setSelected(u); }
        } catch{}
        if(!silent) setLoading(false);
    };

    useEffect(()=>{ load(); const t=setInterval(()=>load(true),10000); return()=>clearInterval(t); },[]);

    const submit = async (e) => {
        e.preventDefault();
        if(!form.subject||!form.message){ setError('All fields required'); return; }
        setSending(true); setError('');
        try {
            const fd=new FormData();
            fd.append('name',user?.name||'User'); fd.append('email',user?.email||'');
            fd.append('subject',form.subject); fd.append('message',form.message); fd.append('priority',form.priority);
            formFiles.forEach(f=>fd.append('images',f));
            await axios.post(`${API_URL}/api/users/support`,fd,{withCredentials:true});
            setForm({subject:'',message:'',priority:'medium'}); setFormFiles([]);
            setView('list'); load();
        } catch(err){ setError(err.response?.data?.error||'Failed to submit'); }
        setSending(false);
    };

    const sendReply = async () => {
        if(!reply.trim()) return;
        setSending(true);
        try {
            const fd=new FormData(); fd.append('message',reply); replyFiles.forEach(f=>fd.append('images',f));
            const r=await axios.post(`${API_URL}/api/users/support/${selected._id}/reply`,fd,{withCredentials:true});
            setSelected(r.data); setReply(''); setReplyFiles([]); load(true); setTimeout(scrollToBottom,100);
        } catch(e){ alert('Failed: '+(e.response?.data?.error||e.message)); }
        setSending(false);
    };

    const openTicket = (t) => {
        setSelected(t); setView('reply');
        if(t.userUnread) axios.post(`${API_URL}/api/users/support/${t._id}/mark-read`,{},{withCredentials:true}).catch(()=>{});
    };

    const filtered = tickets.filter(t=>{
        const q=search.toLowerCase();
        const ms=!q||t.subject?.toLowerCase().includes(q)||t.name?.toLowerCase().includes(q);
        const mf=filter==='all'||(filter==='solved'&&t.status==='resolved')||(filter==='pending'&&(t.status==='open'||t.status==='in_progress'))||(filter==='closed'&&t.status==='closed');
        return ms&&mf;
    });

    // ── Ticket Reply ─────────────────────────────────────────────────────────
    if(view==='reply' && selected) return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{SUPPORT_STYLES}</style>
            <div className="pg-wrap" style={{ padding: '24px 20px' }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <button onClick={()=>setView('list')} className="btn-outline">← Back to List</button>
                        <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-main)',margin:0,fontFamily:'Outfit, sans-serif'}}>Ticket Reply</h1>
                    </div>
                    <div style={{fontSize:13,color:'var(--text-muted)',fontFamily:'Plus Jakarta Sans'}}>
                        <span style={{cursor:'pointer',color:'var(--primary)'}} onClick={()=>setView('list')}>Home</span>
                        <span style={{margin:'0 6px'}}>›</span><span>Ticket Reply</span>
                    </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 260px',gap:20,alignItems:'start'}} className="ticket-reply-grid">
                    <div>
                        <div className="support-card">
                            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-color)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                                <div>
                                    <div style={{fontWeight:700,fontSize:15,color:'var(--text-main)',fontFamily:'Plus Jakarta Sans'}}>Ticket #{selected._id.slice(-6).toUpperCase()} — {selected.subject}</div>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                                        <span style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})</span>
                                        <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,color:prioColor(selected.priority),background:prioBg(selected.priority),border:`1px solid ${prioColor(selected.priority)}30`}}>{prioLabel(selected.priority)}</span>
                                    </div>
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <span style={{fontSize:12,color:'var(--text-muted)'}}>{(selected.replies?.length||0)+1} of {tickets.length}</span>
                                    <button onClick={()=>{ const i=tickets.findIndex(t=>t._id===selected._id); if(i>0) setSelected(tickets[i-1]); }} className="btn-outline" style={{width:28,height:28,padding:0,justifyContent:'center'}}>‹</button>
                                    <button onClick={()=>{ const i=tickets.findIndex(t=>t._id===selected._id); if(i<tickets.length-1) setSelected(tickets[i+1]); }} className="btn-outline" style={{width:28,height:28,padding:0,justifyContent:'center'}}>›</button>
                                </div>
                            </div>

                            <div ref={chatBoxRef} style={{maxHeight:380,overflowY:'auto',background:'var(--bg-card)'}}>
                                <div style={{padding:'20px',borderBottom:'1px solid var(--border-color)',background:'var(--chat-user-bg)'}}>
                                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                                        <div style={{display:'flex',gap:10,alignItems:'center'}}>
                                            <div style={{width:40,height:40,borderRadius:'50%',background:'var(--bg-input)',color:'var(--primary)',fontWeight:800,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',border:'1.5px solid var(--border-color)',flexShrink:0}}>{(selected.name||'U')[0].toUpperCase()}</div>
                                            <div><div style={{fontWeight:700,fontSize:14,color:'var(--text-main)',fontFamily:'Plus Jakarta Sans'}}>{selected.name}</div><div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'Plus Jakarta Sans'}}>{selected.email}</div></div>
                                        </div>
                                        <span style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(selected.createdAt).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(selected.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(selected.createdAt)})</span>
                                    </div>
                                    <div style={{fontSize:14,color:'var(--text-main)',lineHeight:1.8,whiteSpace:'pre-wrap',paddingLeft:50,fontFamily:'Plus Jakarta Sans'}}>{selected.message}</div>
                                    <div style={{paddingLeft:50}}><ImgThumb urls={selected.images}/></div>
                                </div>
                                {selected.replies?.map((r,i)=>{
                                    const isAdmin=r.from==='admin';
                                    return (
                                        <div key={i} style={{padding:'20px',borderBottom:'1px solid var(--border-color)',background:isAdmin?'var(--chat-admin-bg)':'var(--chat-user-bg)'}}>
                                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                                                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                                                    <div style={{width:40,height:40,borderRadius:'50%',background:isAdmin?'rgba(16,185,129,0.08)':'var(--bg-input)',color:isAdmin?'var(--success)':'var(--primary)',fontWeight:800,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',border:isAdmin?'1.5px solid rgba(16,185,129,0.25)':'1.5px solid var(--border-color)',flexShrink:0}}>{isAdmin?'S':(selected.name||'U')[0].toUpperCase()}</div>
                                                    <div>
                                                        <div style={{fontWeight:700,fontSize:14,color:'var(--text-main)',fontFamily:'Plus Jakarta Sans'}}>{isAdmin?'Support Team':selected.name}</div>
                                                        <div style={{fontSize:12,color:'var(--text-muted)',fontFamily:'Plus Jakarta Sans'}}>{isAdmin ? `From - ${r.senderName || 'Support Team'}` : selected.email}</div>
                                                    </div>
                                                </div>
                                                <span style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(r.at).toLocaleDateString('en-US',{weekday:'short'})}, {new Date(r.at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})} ({timeAgo(r.at)})</span>
                                            </div>
                                            <div style={{fontSize:14,color:'var(--text-main)',lineHeight:1.8,whiteSpace:'pre-wrap',paddingLeft:50,fontFamily:'Plus Jakarta Sans'}}>{r.message}</div>
                                            <div style={{paddingLeft:50}}><ImgThumb urls={r.images}/></div>
                                        </div>
                                    );
                                })}
                            </div>

                            {selected.status!=='closed' ? (
                                <div className="reply-box">
                                    <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={4} placeholder="Type your reply here..." className="reply-textarea" />
                                    <div className="reply-toolbar">
                                        <FileUploadBtn files={replyFiles} setFiles={setReplyFiles}/>
                                        <button onClick={sendReply} disabled={sending||!reply.trim()} className="btn-primary" style={{padding:'8px 24px',fontSize:13}}>
                                            {sending?'Sending...':'Reply'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1.5px solid var(--border-color)',background:'var(--bg-card)'}}>
                                    <span style={{fontSize:13,color:'var(--text-muted)',fontFamily:'Plus Jakarta Sans'}}>🔒 Ticket is closed</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ticket Details sidebar */}
                    <div className="ticket-side-info">
                        <div style={{fontWeight:700,fontSize:15,color:'var(--text-main)',marginBottom:16,paddingBottom:12,borderBottom:'1px solid var(--border-color)',fontFamily:'Plus Jakarta Sans'}}>Ticket Details</div>
                        {[
                            ['Customer', selected.name],
                            ['Ticket ID', `#${selected._id.slice(-6).toUpperCase()}`],
                            ['Subject', selected.subject],
                            ['Created', fmtDate(selected.createdAt)],
                        ].map(([k,v])=>(
                            <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border-color)',fontSize:13,fontFamily:'Plus Jakarta Sans'}}>
                                <span style={{color:'var(--text-muted)'}}>{k}</span>
                                <span style={{fontWeight:600,color:'var(--text-main)',textAlign:'right',maxWidth:140,wordBreak:'break-word'}}>{v}</span>
                            </div>
                        ))}
                        <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border-color)',fontSize:13,fontFamily:'Plus Jakarta Sans'}}>
                            <span style={{color:'var(--text-muted)'}}>Priority</span>
                            <span style={{fontSize:12,fontWeight:700,color:prioColor(selected.priority),background:prioBg(selected.priority),padding:'2px 10px',borderRadius:20,border:`1px solid ${prioColor(selected.priority)}30`}}>{prioLabel(selected.priority)}</span>
                        </div>
                        <div style={{display:'flex',justifyContent:'space-between',padding:'9px 0',fontSize:13,fontFamily:'Plus Jakarta Sans'}}>
                            <span style={{color:'var(--text-muted)'}}>Status</span>
                            <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,
                                background:selected.status==='resolved'?'rgba(16, 185, 129, 0.08)':selected.status==='in_progress'?'rgba(59, 130, 246, 0.08)':selected.status==='closed'?'rgba(107, 114, 128, 0.08)':'rgba(245, 158, 11, 0.08)',
                                color:selected.status==='resolved'?'var(--success)':selected.status==='in_progress'?'#3B82F6':selected.status==='closed'?'var(--text-muted)':'var(--warning)',
                                border:`1px solid ${selected.status==='resolved'?'rgba(16, 185, 129, 0.25)':selected.status==='in_progress'?'rgba(59, 130, 246, 0.25)':selected.status==='closed'?'rgba(107, 114, 128, 0.25)':'rgba(245, 158, 11, 0.25)'}`}}>
                                {statusLabel[selected.status]||selected.status}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── New Ticket ────────────────────────────────────────────────────────────
    if(view==='new') return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{SUPPORT_STYLES}</style>
            <div className="pg-wrap" style={{ padding: '24px 20px' }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <button onClick={()=>setView('list')} className="btn-outline">← Back to List</button>
                        <h1 style={{fontSize:22,fontWeight:800,color:'var(--text-main)',margin:0,fontFamily:'Outfit, sans-serif'}}>New Ticket</h1>
                    </div>
                    <div style={{fontSize:13,color:'var(--text-muted)',fontFamily:'Plus Jakarta Sans'}}>
                        <span style={{cursor:'pointer',color:'var(--primary)'}} onClick={()=>setView('list')}>Home</span>
                        <span style={{margin:'0 6px'}}>›</span><span>New Ticket</span>
                    </div>
                </div>

                <div className="form-card">
                    <div className="form-header">
                        <div className="form-title">Create Support Ticket</div>
                        <div className="form-subtitle">Describe your issue and our team will respond shortly</div>
                    </div>
                    <div style={{padding:'24px'}}>
                        <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:16}}>
                            {/* Topic */}
                            <div style={{position:'relative'}}>
                                <label className="form-label">Subject *</label>
                                <div onClick={()=>setTopicOpen(o=>!o)} className={`topic-select ${topicOpen?'topic-select-active':''}`}>
                                    {form.subject?<span style={{color:'var(--text-main)'}}>{TOPICS.find(t=>t.value===form.subject)?.icon} {form.subject}</span>:<span style={{color:'var(--text-muted)'}}>Select a topic</span>}
                                    <span style={{color:'var(--text-muted)',fontSize:10,transform:topicOpen?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
                                </div>
                                {topicOpen&&(
                                    <div className="topic-dropdown">
                                        {TOPICS.map(t=>(
                                            <div key={t.value} onClick={()=>{setForm({...form,subject:t.value});setTopicOpen(false);}}
                                                className={`topic-option ${form.subject===t.value?'selected':''}`}>
                                                <span>{t.icon}</span><span>{t.value}</span>
                                                {form.subject===t.value&&<span style={{marginLeft:'auto',color:'var(--primary)',fontWeight:700}}>✓</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="form-label" style={{marginBottom:8}}>Priority</label>
                                <div style={{display:'flex',gap:8}}>
                                    {[
                                        {v:'low',l:'Low',c:'var(--success)',bg:'rgba(16, 185, 129, 0.08)',border:'rgba(16, 185, 129, 0.25)'},
                                        {v:'medium',l:'Medium',c:'var(--warning)',bg:'rgba(245, 158, 11, 0.08)',border:'rgba(245, 158, 11, 0.25)'},
                                        {v:'high',l:'High',c:'var(--danger)',bg:'rgba(244, 63, 94, 0.08)',border:'rgba(244, 63, 94, 0.25)'}
                                    ].map(p=>{
                                        const active=form.priority===p.v;
                                        return <button key={p.v} type="button" onClick={()=>setForm({...form,priority:p.v})} className="btn-prio"
                                            style={{
                                                border: `2px solid ${active ? p.c : 'var(--border-color)'}`,
                                                background: active ? p.c : 'var(--bg-card)',
                                                color: active ? '#fff' : p.c
                                            }}>
                                            {p.v==='low'?'🟢':p.v==='medium'?'🟡':'🔴'} {p.l}
                                        </button>;
                                    })}
                                </div>
                            </div>

                            {/* Message */}
                            <div className="form-group">
                                <label className="form-label">Description *</label>
                                <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={6}
                                    placeholder="Describe your issue in detail..." className="form-textarea" />
                            </div>

                            {/* Attachments */}
                            <div className="form-group">
                                <label className="form-label">Attachments <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
                                <FileUploadBtn files={formFiles} setFiles={setFormFiles}/>
                            </div>

                            {error&&<div className="modal-error">⚠️ {error}</div>}

                            <div style={{display:'flex',gap:10}}>
                                <button type="submit" disabled={sending} className="btn-primary" style={{padding:'10px 28px'}}>
                                    {sending?'Submitting...':'Submit Ticket'}
                                </button>
                                <button type="button" onClick={()=>setView('list')} className="btn-outline">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    // ── Ticket List ───────────────────────────────────────────────────────────
    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{SUPPORT_STYLES}</style>

            {/* Notification */}
            {notif&&(
                <div onClick={()=>{ const t=tickets.find(x=>x._id===notif.id); if(t) openTicket(t); setNotif(null); }}
                    style={{position:'fixed',bottom:24,right:24,zindex:9999,background:'var(--primary)',color:'#fff',borderRadius:14,padding:'14px 18px',boxShadow:'0 8px 28px rgba(79,70,229,0.4)',cursor:'pointer',display:'flex',gap:12,alignItems:'center',maxWidth:300}}>
                    <div style={{position:'relative',flexShrink:0}}>
                        <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🛡</div>
                        <span style={{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,background:'#EF4444',color:'#fff',fontSize:10,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',border:'2px solid var(--primary)'}}>{notif.count}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:13,marginBottom:3,fontFamily:'Plus Jakarta Sans'}}>Support team replied!</div>
                        <div style={{fontSize:12,opacity:0.85,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'Plus Jakarta Sans'}}>{notif.subject}</div>
                        <div style={{fontSize:11,opacity:0.65,marginTop:2,fontFamily:'Plus Jakarta Sans'}}>Click to view →</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();setNotif(null);}} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:22,height:22,color:'#fff',cursor:'pointer',fontSize:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                </div>
            )}

            <div className="pg-wrap" style={{ padding: '24px 20px' }}>
                {/* Header */}
                <div className="pg-header">
                    <h1 className="pg-title">Support Tickets</h1>
                    <p className="pg-sub">View and manage your support requests</p>
                </div>

                {/* Table */}
                <div className="support-card">
                    <div className="support-toolbar">
                        {/* Top row: title + New button */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:14}}>
                            <div>
                                <div style={{fontWeight:700,fontSize:14,color:'var(--text-main)',fontFamily:'Plus Jakarta Sans'}}>Support Tickets</div>
                                <div style={{fontSize:12,color:'var(--text-muted)',marginTop:2,fontFamily:'Plus Jakarta Sans'}}>Your most recent support tickets list</div>
                            </div>
                            <button onClick={()=>setView('new')} className="btn-primary" style={{fontSize:13,whiteSpace:'nowrap',flexShrink:0}}>+ New Ticket</button>
                        </div>
                        {/* Bottom row: filter + search */}
                        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                            <div className="filter-pills">
                                {[['all','All'],['solved','Solved'],['pending','Pending']].map(([v,l])=>(
                                    <button key={v} onClick={()=>setFilter(v)} className={`filter-pill ${filter===v?'active':''}`}>{l}</button>
                                ))}
                            </div>
                            <div className="mon-search-wrap">
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="mon-search" />
                                {search && <button onClick={()=>setSearch('')} className="search-clear">✕</button>}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:14 }}>
                            <div style={{ width:44, height:44, borderRadius:'50%', border: isDark ? '4px solid rgba(255,255,255,0.05)' : '4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
                            <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>Loading...</div>
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    ) : filtered.length===0 ? (
                        <div style={{padding:60,textAlign:'center'}}>
                            <div style={{fontSize:40,marginBottom:12}}>🎫</div>
                            <div style={{fontWeight:600,color:'var(--text-main)',marginBottom:12,fontFamily:'Plus Jakarta Sans'}}>No tickets found</div>
                            <button onClick={()=>setView('new')} className="btn-primary">+ New Ticket</button>
                        </div>
                    ) : (
                        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                            <table className="ticket-table">
                                <thead>
                                    <tr style={{background:'var(--bg-input)'}}>
                                        {['Ticket ID','Subject','Priority','Create Date','Status'].map(h=>(
                                            <th key={h} className="ticket-th">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(t=>(
                                        <tr key={t._id} className="ticket-tr" style={{ background: t.userUnread ? 'var(--unread-row-bg)' : 'transparent' }} onClick={()=>openTicket(t)}>
                                            <td className="ticket-td">
                                                <div style={{display:'flex',alignItems:'center',gap:6}}>
                                                    <span style={{fontFamily:'monospace',fontSize:12,color:'var(--primary)',fontWeight:600}}>#{t._id.slice(-6).toUpperCase()}</span>
                                                    {t.userUnread&&<span style={{width:8,height:8,borderRadius:'50%',background:'#EF4444',display:'inline-block',flexShrink:0}}/>}
                                                </div>
                                            </td>
                                            <td className="ticket-td" style={{color:'var(--text-main)',maxWidth:280,fontWeight:t.userUnread?700:500}}>{t.subject}</td>
                                            <td className="ticket-td">
                                                <span style={{fontSize:12,fontWeight:700,color:prioColor(t.priority),background:prioBg(t.priority),padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap',border:`1px solid ${prioColor(t.priority)}30`}}>
                                                    {prioLabel(t.priority)}
                                                </span>
                                            </td>
                                            <td className="ticket-td" style={{color:'var(--text-muted)',whiteSpace:'nowrap',fontSize:12}}>
                                                <div style={{fontWeight:600,color:'var(--text-main)'}}>{fmtDate(t.createdAt)}</div>
                                                <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{timeAgo(t.createdAt)}</div>
                                            </td>
                                            <td className="ticket-td">
                                                <span style={{fontSize:12,fontWeight:700,color:statusColor[t.status]||'var(--text-muted)',background:t.status==='resolved'?'rgba(16, 185, 129, 0.08)':t.status==='in_progress'?'rgba(59, 130, 246, 0.08)':t.status==='closed'?'rgba(107, 114, 128, 0.08)':'rgba(245, 158, 11, 0.08)',padding:'3px 10px',borderRadius:20,border:`1px solid ${(t.status==='resolved'?'rgba(16, 185, 129, 0.25)':t.status==='in_progress'?'rgba(59, 130, 246, 0.25)':t.status==='closed'?'rgba(107, 114, 128, 0.25)':'rgba(245, 158, 11, 0.25)')}`}}>
                                                    {statusLabel[t.status]||t.status}
                                                </span>
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
