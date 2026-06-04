import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_COLORS = { free_trial:'#64748b', bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04' };
const PLAN_LABEL  = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function Avatar({ name, size = 32 }) {
  const initials = (name||'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const colors = ['#7c3aed','#10B981','#F59E0B','#EF4444','#06b6d4','#3B82F6'];
  const idx = (name||'').charCodeAt(0) % colors.length;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:colors[idx], color:'#fff',
      display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:size*0.38, flexShrink:0 }}>
      {initials}
    </div>
  );
}

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    axios.get(`${API_URL}/api/admin/users`, { withCredentials: true })
      .then(r => { setUsers(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.accountId?.toLowerCase().includes(q);
    if (filter === 'active')  return matchSearch && u.isActive && !u.isBlocked;
    if (filter === 'expired') return matchSearch && !u.isActive && !u.isBlocked;
    if (filter === 'blocked') return matchSearch && u.isBlocked;
    if (filter === 'paid')    return matchSearch && u.plan !== 'free_trial';
    return matchSearch;
  });

  const COLS = ['#','User','Account ID','Plan','Phone','City','State','Country','Gender','Purpose','Sites','Billing','Trial Ends','Registered','Status'];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">All Users</h1>
          <p className="pg-sub">{filtered.length} of {users.length} users</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, email, phone, account ID..."
          style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none' }} />
        {['all','active','expired','blocked','paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'7px 14px', borderRadius:20, border:'1.5px solid', fontSize:12, fontWeight:700, cursor:'pointer',
              background: filter===f ? '#7c3aed' : 'transparent',
              color: filter===f ? '#fff' : '#64748b',
              borderColor: filter===f ? '#7c3aed' : '#e2e8f0' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {COLS.map(h => (
                  <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={COLS.length} style={{ padding:48, textAlign:'center', color:'#94a3b8' }}>No users found</td></tr>
              ) : filtered.map((u, idx) => (
                <tr key={u._id} style={{ borderBottom:'1px solid #f1f5f9' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#f9f7ff'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 14px', color:'#94a3b8', fontWeight:600 }}>{idx+1}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={u.name} size={32} />
                      <div>
                        <div style={{ fontWeight:700, color:'#1e293b', fontSize:13 }}>{u.name}</div>
                        <div style={{ fontSize:11, color:'#64748b' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}><span style={{ fontFamily:'monospace', fontSize:11, background:'#ede9fe', color:'#7c3aed', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{u.accountId}</span></td>
                  <td style={{ padding:'12px 14px' }}><span style={{ fontSize:11, background:`${PLAN_COLORS[u.plan]}15`, color:PLAN_COLORS[u.plan], padding:'3px 10px', borderRadius:20, fontWeight:700 }}>{PLAN_LABEL[u.plan]}</span></td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.phone || '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.city || '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.state || '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.country || '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.gender ? u.gender.charAt(0).toUpperCase()+u.gender.slice(1) : '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.purpose || '—'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151', fontWeight:600 }}>{u.serverCount||0}/{u.siteLimit||2}</td>
                  <td style={{ padding:'12px 14px', color:'#374151' }}>{u.billing==='annually' ? 'Annual' : 'Monthly'}</td>
                  <td style={{ padding:'12px 14px', color:'#374151', whiteSpace:'nowrap' }}>{fmt(u.trialEndsAt||u.planEndsAt)}</td>
                  <td style={{ padding:'12px 14px', color:'#374151', whiteSpace:'nowrap' }}>{fmt(u.createdAt)}</td>
                  <td style={{ padding:'12px 14px' }}>
                    {u.isBlocked
                      ? <span style={{ fontSize:11, background:'#fee2e2', color:'#dc2626', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>Blocked</span>
                      : u.isActive
                        ? <span style={{ fontSize:11, background:'#dcfce7', color:'#16a34a', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>Active</span>
                        : <span style={{ fontSize:11, background:'#fef3c7', color:'#d97706', padding:'3px 10px', borderRadius:20, fontWeight:700 }}>Expired</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
