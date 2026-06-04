import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_COLORS = { free_trial:'#64748b', bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04' };
const PLAN_LABEL  = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };

const USERS_LIST_STYLES = `
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  .users-list-container {
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

  /* Light Theme */
  .users-list-container.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #ffffff;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --table-header-bg: #f8fafc;
    --hover-row-bg: #f9f7ff;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06);
    --badge-bg: #ede9fe;
    --badge-color: #7c3aed;
  }

  /* Dark Theme */
  .users-list-container.dark {
    --bg-primary: #0b0f19;
    --bg-card: #0d121f;
    --bg-input: rgba(255, 255, 255, 0.02);
    --border-color: rgba(255, 255, 255, 0.06);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --table-header-bg: #131a26;
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --badge-bg: rgba(167, 139, 250, 0.08);
    --badge-color: #a78bfa;
  }

  .users-search-input {
    flex: 1;
    min-width: 220px;
    padding: 10px 16px;
    background: var(--bg-card);
    border: 1.5px solid var(--border-color);
    color: var(--text-main);
    border-radius: 12px;
    font-size: 13.5px;
    outline: none;
    transition: all 0.2s ease;
  }
  .users-search-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }

  .users-filter-btn {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1.5px solid var(--border-color);
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    background: transparent;
    color: var(--text-muted);
    transition: all 0.2s ease;
  }
  .users-filter-btn:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
  .users-filter-btn.active {
    background: var(--primary);
    color: #ffffff !important;
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }

  .users-table-card {
    background: var(--bg-card);
    border-radius: 16px;
    border: 1px solid var(--border-color);
    overflow: hidden;
    box-shadow: var(--card-shadow);
  }

  .users-table th {
    padding: 14px 16px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border-color);
    background: var(--table-header-bg);
  }

  .users-table td {
    padding: 12px 16px;
    color: var(--text-main);
    border-bottom: 1px solid var(--border-color);
    transition: background 0.15s ease;
  }

  .users-table tbody tr {
    transition: background 0.15s ease;
  }
  .users-table tbody tr:hover {
    background: var(--hover-row-bg);
  }

  .users-status-badge {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 20px;
    font-weight: 700;
  }

  .users-status-active {
    background: rgba(16, 185, 129, 0.08);
    color: #10b981;
  }
  .users-status-blocked {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
  }
  .users-status-expired {
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }

  .users-table-wrapper {
    overflow-x: auto;
  }
  
  .users-table-wrapper::-webkit-scrollbar {
    height: 8px;
  }
  .users-table-wrapper::-webkit-scrollbar-track {
    background: transparent;
  }
  .users-table-wrapper::-webkit-scrollbar-thumb {
    background: rgba(124, 58, 237, 0.3);
    border-radius: 4px;
  }
  .users-table-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(124, 58, 237, 0.5);
  }
`;

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
  }, [localTheme]);

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
      <div style={{ width:36, height:36, borderRadius:'50%', border:'4px solid var(--border-color)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const isDark = localTheme === 'dark';

  return (
    <div className={`users-list-container ${localTheme}`}>
      <style>{USERS_LIST_STYLES}</style>
      <div className="pg-wrap">
        <div className="pg-header">
          <div>
            <h1 className="pg-title" style={{ color: 'var(--text-main)', fontFamily: 'Outfit, sans-serif', fontWeight: 900 }}>
              All Users <span style={{ color: 'var(--primary)' }}>.</span>
            </h1>
            <p className="pg-sub" style={{ color: 'var(--text-muted)' }}>{filtered.length} of {users.length} users registered</p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input 
              value={search} 
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, email, phone, account ID..."
              className="users-search-input" 
              style={{ paddingLeft: 38 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all','active','expired','blocked','paid'].map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`users-filter-btn ${filter === f ? 'active' : ''}`}
              >
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="users-table-card">
          <div className="users-table-wrapper">
            <table className="users-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr>
                  {COLS.map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} style={{ padding:48, textAlign:'center', color:'var(--text-muted)' }}>
                      No users found
                    </td>
                  </tr>
                ) : filtered.map((u, idx) => {
                  const planColor = PLAN_COLORS[u.plan] || '#64748b';
                  const planBadgeStyle = {
                    fontSize: 11,
                    background: isDark ? `${planColor}15` : `${planColor}12`,
                    color: planColor,
                    border: `1px solid ${planColor}22`,
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  };

                  return (
                    <tr key={u._id}>
                      <td style={{ color:'var(--text-muted)', fontWeight:600 }}>{idx+1}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Avatar name={u.name} size={32} />
                          <div>
                            <div style={{ fontWeight:700, color:'var(--text-main)', fontSize:13 }}>{u.name}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          fontFamily:'monospace', 
                          fontSize:11, 
                          background:'var(--badge-bg)', 
                          color:'var(--badge-color)', 
                          padding:'3px 8px', 
                          borderRadius:20, 
                          fontWeight:700, 
                          border:'1px solid var(--border-color)',
                          whiteSpace: 'nowrap'
                        }}>
                          {u.accountId}
                        </span>
                      </td>
                      <td>
                        <span style={planBadgeStyle}>{PLAN_LABEL[u.plan] || u.plan}</span>
                      </td>
                      <td style={{ color:'var(--text-main)' }}>{u.phone || '—'}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.city || '—'}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.state || '—'}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.country || '—'}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.gender ? u.gender.charAt(0).toUpperCase()+u.gender.slice(1) : '—'}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.purpose || '—'}</td>
                      <td style={{ color:'var(--text-main)', fontWeight:600 }}>{u.serverCount||0}/{u.siteLimit||2}</td>
                      <td style={{ color:'var(--text-main)' }}>{u.billing==='annually' ? 'Annual' : 'Monthly'}</td>
                      <td style={{ color:'var(--text-main)', whiteSpace:'nowrap' }}>{fmt(u.trialEndsAt||u.planEndsAt)}</td>
                      <td style={{ color:'var(--text-main)', whiteSpace:'nowrap' }}>{fmt(u.createdAt)}</td>
                      <td>
                        {u.isBlocked ? (
                          <span className="users-status-badge users-status-blocked">Blocked</span>
                        ) : u.isActive ? (
                          <span className="users-status-badge users-status-active">Active</span>
                        ) : (
                          <span className="users-status-badge users-status-expired">Expired</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
