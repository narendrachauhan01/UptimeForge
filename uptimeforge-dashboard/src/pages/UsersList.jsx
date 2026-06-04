import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_COLORS = { free_trial:'#64748b', bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04' };
const PLAN_LABEL  = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function Avatar({ name, size = 36 }) {
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
    if (filter === 'active') return matchSearch && u.isActive && !u.isBlocked;
    if (filter === 'expired') return matchSearch && !u.isActive && !u.isBlocked;
    if (filter === 'blocked') return matchSearch && u.isBlocked;
    if (filter === 'paid') return matchSearch && u.plan !== 'free_trial';
    return matchSearch;
  });

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
          <p className="pg-sub">Complete user database with all details · {users.length} total users</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search name, email, phone, account ID..."
          style={{ flex:1, minWidth:200, padding:'9px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none' }} />
        {['all','active','expired','blocked','paid'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'8px 16px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
              background: filter===f ? '#7c3aed' : '#fff',
              color: filter===f ? '#fff' : '#64748b',
              borderColor: filter===f ? '#7c3aed' : '#e2e8f0' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} {filter===f && `(${filtered.length})`}
          </button>
        ))}
      </div>

      {/* Users list */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'#94a3b8', fontSize:14 }}>No users found.</div>
        ) : filtered.map(u => (
          <div key={u._id} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', borderLeft:`4px solid ${u.isBlocked ? '#ef4444' : u.isActive ? PLAN_COLORS[u.plan] || '#7c3aed' : '#f59e0b'}` }}>
            {/* Top row */}
            <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:14 }}>
              <Avatar name={u.name} size={44} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:800, fontSize:15, color:'#1e293b' }}>{u.name}</span>
                  <span style={{ fontSize:11, fontFamily:'monospace', background:'#ede9fe', color:'#7c3aed', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{u.accountId}</span>
                  {u.isBlocked && <span style={{ fontSize:10, background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>🚫 Blocked</span>}
                  {!u.isActive && !u.isBlocked && <span style={{ fontSize:10, background:'#fef3c7', color:'#d97706', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>⚠️ Expired</span>}
                  {u.isActive && !u.isBlocked && <span style={{ fontSize:10, background:'#dcfce7', color:'#16a34a', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>✅ Active</span>}
                  <span style={{ fontSize:10, background:`${PLAN_COLORS[u.plan]}15`, color:PLAN_COLORS[u.plan], padding:'2px 10px', borderRadius:20, fontWeight:700 }}>{PLAN_LABEL[u.plan]}</span>
                </div>
                <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>{u.email}</div>
              </div>
            </div>
            {/* Details grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10 }}>
              {[
                { icon:'📱', label:'Phone', val: u.phone || '—' },
                { icon:'🏙️', label:'City', val: u.city || '—' },
                { icon:'📍', label:'State', val: u.state || '—' },
                { icon:'🌍', label:'Country', val: u.country || '—' },
                { icon:'👤', label:'Gender', val: u.gender ? u.gender.charAt(0).toUpperCase()+u.gender.slice(1) : '—' },
                { icon:'🎯', label:'Purpose', val: u.purpose || '—' },
                { icon:'🌐', label:'Sites Used', val: `${u.serverCount||0} / ${u.siteLimit||2}` },
                { icon:'💳', label:'Billing', val: u.billing==='annually' ? '📆 Annual' : '📅 Monthly' },
                { icon:'⏰', label:'Trial Ends', val: fmt(u.trialEndsAt) },
                { icon:'📅', label:'Plan Ends', val: fmt(u.planEndsAt) },
                { icon:'🗓️', label:'Registered', val: fmt(u.createdAt) },
                { icon:'🔗', label:'Google User', val: u.isGoogleUser ? '✅ Yes' : '❌ No' },
              ].map(({ icon, label, val }) => (
                <div key={label} style={{ background:'#f8fafc', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>{icon} {label}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
