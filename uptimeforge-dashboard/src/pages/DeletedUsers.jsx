import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_LABEL = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

const getPlanBadgeStyle = (plan, isDark) => {
    const maps = {
        free_trial: isDark 
            ? { bg: 'rgba(59, 130, 246, 0.08)', color: '#60a5fa' }
            : { bg: '#EFF6FF', color: '#2563EB' },
        bronze: isDark
            ? { bg: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }
            : { bg: '#fef3c7', color: '#92400e' },
        silver: isDark
            ? { bg: 'rgba(148, 163, 184, 0.08)', color: '#cbd5e1' }
            : { bg: '#f1f5f9', color: '#475569' },
        gold: isDark
            ? { bg: 'rgba(202, 138, 4, 0.08)', color: '#fbbf24' }
            : { bg: '#fef9c3', color: '#b45309' },
    };
    return maps[plan] || (isDark ? { bg: 'rgba(255,255,255,0.04)', color: '#cbd5e1' } : { bg: '#f1f5f9', color: '#475569' });
};

const DELETED_USERS_STYLES = `
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
    padding: 18px 20px;
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
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-color) !important;
    background: var(--table-header-bg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .perf-page-container .search-box {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    width: 220px;
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
`;

export default function DeletedUsers() {
    const [users,   setUsers]   = useState([]);
    const [loading, setLoading] = useState(true);
    const [search,  setSearch]  = useState('');

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

    useEffect(() => {
        axios.get(`${API_URL}/api/admin/deleted-users`, { withCredentials: true })
            .then(r => { setUsers(r.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.accountId?.toLowerCase().includes(q);
    });

    const isDark = localTheme === 'dark';

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{DELETED_USERS_STYLES}</style>
            <div className="pg-wrap">
                {/* Header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Deleted Users <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">Archive of deleted accounts — data preserved for records</p>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
                    {[
                        { label:'Total Deleted', value: users.length,                                   color:'#EF4444' },
                        { label:'This Month',    value: users.filter(u=>new Date(u.deletedAt)>new Date(Date.now()-30*86400000)).length, color:'#F59E0B' },
                        { label:'Sites Lost',    value: users.reduce((s,u)=>s+(u.siteCount||0),0),      color: isDark ? '#a78bfa' : '#7c3aed' },
                    ].map(c => (
                        <div key={c.label} className="stat-card" style={{ borderTop:`3px solid ${c.color}` }}>
                            <div style={{ fontSize:26, fontWeight:800, color:c.color, lineHeight:1, marginBottom:5 }}>{c.value}</div>
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.6 }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="table-card">
                    {/* Table header */}
                    <div className="table-header-panel">
                        <div style={{ fontWeight:700, color:'var(--text-main)', fontSize:14 }}>
                            Deleted Users <span style={{ color:'var(--text-muted)', fontWeight:500 }}>({filtered.length})</span>
                        </div>
                        <div className="search-box">
                            <svg width="14" height="14" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, ID..."
                                className="search-input" />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding:60, textAlign:'center', color:'var(--text-muted)' }}>Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding:60, textAlign:'center' }}>
                            <div style={{ fontSize:48, marginBottom:12 }}>🗑</div>
                            <div style={{ fontWeight:700, fontSize:16, color:'var(--text-main)', marginBottom:6 }}>No deleted users</div>
                            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Deleted accounts will appear here</div>
                        </div>
                    ) : (
                        <div style={{ overflowX:'auto' }}>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                <thead>
                                    <tr style={{ background:'var(--table-header-bg)', borderBottom:'1px solid var(--border-color)' }}>
                                        {['Account ID','Name','Email','Phone','Plan','Sites','Joined','Deleted On','By'].map(h => (
                                            <th key={h} className="table-th">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u,i) => {
                                        const badgeStyle = getPlanBadgeStyle(u.plan, isDark);
                                        return (
                                            <tr key={u._id} className="table-row">
                                                <td className="table-td">
                                                    <span style={{
                                                        fontFamily:'monospace',
                                                        fontSize:12,
                                                        fontWeight:700,
                                                        color: isDark ? '#a78bfa' : '#4F46E5',
                                                        background: isDark ? 'rgba(124, 58, 237, 0.08)' : '#EEF2FF',
                                                        padding:'2px 8px',
                                                        borderRadius:6
                                                    }}>
                                                        {u.accountId || '—'}
                                                    </span>
                                                </td>
                                                <td className="table-td">
                                                    <div style={{ fontWeight:600, color:'var(--text-main)' }}>{u.name || '—'}</div>
                                                </td>
                                                <td className="table-td" style={{ color:'var(--text-muted)' }}>{u.email || '—'}</td>
                                                <td className="table-td" style={{ color:'var(--text-muted)', fontFamily:'monospace', fontSize:12 }}>{u.phone || '—'}</td>
                                                <td className="table-td">
                                                    <span style={{
                                                        padding:'2px 10px',
                                                        borderRadius:20,
                                                        fontSize:11,
                                                        fontWeight:700,
                                                        background: badgeStyle.bg,
                                                        color: badgeStyle.color
                                                    }}>
                                                        {PLAN_LABEL[u.plan] || u.plan || '—'}
                                                    </span>
                                                </td>
                                                <td className="table-td" style={{ color:'var(--text-muted)', textAlign:'center' }}>{u.siteCount || 0}</td>
                                                <td className="table-td" style={{ color:'var(--text-muted)', whiteSpace:'nowrap', fontSize:12 }}>{fmt(u.createdAt)}</td>
                                                <td className="table-td" style={{ whiteSpace:'nowrap' }}>
                                                    <span style={{
                                                        fontSize:12,
                                                        fontWeight:600,
                                                        color: isDark ? '#ef4444' : '#DC2626',
                                                        background: isDark ? 'rgba(239, 68, 68, 0.08)' : '#FFF5F5',
                                                        border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#FECDD3'}`,
                                                        padding:'3px 10px',
                                                        borderRadius:20
                                                    }}>
                                                        {fmt(u.deletedAt)}
                                                    </span>
                                                </td>
                                                <td className="table-td">
                                                    <span style={{
                                                        fontSize:11,
                                                        fontWeight:600,
                                                        padding:'2px 8px',
                                                        borderRadius:20,
                                                        background: u.deletedBy === 'user'
                                                            ? (isDark ? 'rgba(245, 158, 11, 0.08)' : '#fef3c7')
                                                            : (isDark ? 'rgba(124, 58, 237, 0.08)' : '#ede9fe'),
                                                        color: u.deletedBy === 'user'
                                                            ? (isDark ? '#f59e0b' : '#b45309')
                                                            : (isDark ? '#a78bfa' : '#7c3aed')
                                                    }}>
                                                        {u.deletedBy === 'user' ? '👤 Self' : '🔧 Admin'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
