import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_LABEL = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };
const PLAN_COLOR = { free_trial:'#2563EB', bronze:'#92400e', silver:'#475569', gold:'#b45309' };
const PLAN_BG    = { free_trial:'#EFF6FF', bronze:'#fef3c7', silver:'#f1f5f9', gold:'#fef9c3' };

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

export default function DeletedUsers() {
    const [users,   setUsers]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState('');

    useEffect(() => {
        axios.get(`${API_URL}/api/admin/deleted-users`, { withCredentials: true })
            .then(r => { setUsers(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.accountId?.toLowerCase().includes(q);
    });

    return (
        <div className="pg-wrap">
            {/* Header */}
            <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:24, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>Deleted Users</h1>
                <p style={{ fontSize:14, color:'#6B7280', margin:0 }}>Archive of deleted accounts — data preserved for records</p>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
                {[
                    { label:'Total Deleted', value: users.length,                                   color:'#EF4444', bg:'#FFF5F5' },
                    { label:'This Month',    value: users.filter(u=>new Date(u.deletedAt)>new Date(Date.now()-30*86400000)).length, color:'#F59E0B', bg:'#FFFBEB' },
                    { label:'Sites Lost',    value: users.reduce((s,u)=>s+(u.siteCount||0),0),      color:'#6B7280', bg:'#F9FAFB' },
                ].map(c => (
                    <div key={c.label} style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', borderTop:`3px solid ${c.color}`, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ fontSize:26, fontWeight:800, color:c.color, lineHeight:1, marginBottom:5 }}>{c.value}</div>
                        <div style={{ fontSize:11, color:'#6B7280', fontWeight:600, textTransform:'uppercase', letterSpacing:0.6 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                {/* Table header */}
                <div style={{ padding:'14px 20px', borderBottom:'1px solid #F3F4F6', background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ fontWeight:700, color:'#111827', fontSize:14 }}>
                        Deleted Users <span style={{ color:'#6B7280', fontWeight:500 }}>({filtered.length})</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, width:220 }}>
                        <svg width="14" height="14" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, ID..."
                            style={{ border:'none', outline:'none', fontSize:13, color:'#374151', width:'100%', background:'transparent' }} />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding:60, textAlign:'center', color:'#9CA3AF' }}>Loading...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding:60, textAlign:'center' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>🗑</div>
                        <div style={{ fontWeight:700, fontSize:16, color:'#374151', marginBottom:6 }}>No deleted users</div>
                        <div style={{ fontSize:13, color:'#9CA3AF' }}>Deleted accounts will appear here</div>
                    </div>
                ) : (
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                            <thead>
                                <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                                    {['Account ID','Name','Email','Phone','Plan','Sites','Joined','Deleted On','By'].map(h => (
                                        <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u,i) => (
                                    <tr key={u._id} style={{ borderBottom:'1px solid #F3F4F6' }}
                                        onMouseEnter={e=>e.currentTarget.style.background='#FFF5F5'}
                                        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                        <td style={{ padding:'13px 16px' }}>
                                            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#4F46E5', background:'#EEF2FF', padding:'2px 8px', borderRadius:6 }}>
                                                {u.accountId || '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding:'13px 16px' }}>
                                            <div style={{ fontWeight:600, color:'#111827' }}>{u.name || '—'}</div>
                                        </td>
                                        <td style={{ padding:'13px 16px', color:'#6B7280' }}>{u.email || '—'}</td>
                                        <td style={{ padding:'13px 16px', color:'#6B7280', fontFamily:'monospace', fontSize:12 }}>{u.phone || '—'}</td>
                                        <td style={{ padding:'13px 16px' }}>
                                            <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background: PLAN_BG[u.plan]||'#f1f5f9', color: PLAN_COLOR[u.plan]||'#475569' }}>
                                                {PLAN_LABEL[u.plan] || u.plan || '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding:'13px 16px', color:'#6B7280', textAlign:'center' }}>{u.siteCount || 0}</td>
                                        <td style={{ padding:'13px 16px', color:'#6B7280', whiteSpace:'nowrap', fontSize:12 }}>{fmt(u.createdAt)}</td>
                                        <td style={{ padding:'13px 16px', whiteSpace:'nowrap' }}>
                                            <span style={{ fontSize:12, fontWeight:600, color:'#EF4444', background:'#FFF5F5', padding:'3px 10px', borderRadius:20, border:'1px solid #FECDD3' }}>
                                                {fmt(u.deletedAt)}
                                            </span>
                                        </td>
                                        <td style={{ padding:'13px 16px' }}>
                                            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20,
                                                background: u.deletedBy==='user' ? '#fef3c7' : '#ede9fe',
                                                color: u.deletedBy==='user' ? '#b45309' : '#7c3aed' }}>
                                                {u.deletedBy === 'user' ? '👤 Self' : '🔧 Admin'}
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
    );
}
