import React, { useState, useEffect, lazy, Suspense } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { staffMe, staffLogout } from '../api';
import axios from 'axios';
import { API_URL } from '../api';
import UWLogo from '../components/UWLogo';

const AdminPanel         = lazy(() => import('./AdminPanel'));
const PlanSettings       = lazy(() => import('./PlanSettings'));
const AnnualPlans        = lazy(() => import('./AnnualPlans'));
const FeatureAccess      = lazy(() => import('./FeatureAccess'));
const RedisCache         = lazy(() => import('./RedisCache'));
const IntegrationBackend = lazy(() => import('./IntegrationBackend'));
const SupportTickets     = lazy(() => import('./SupportTickets'));
const DeletedUsers       = lazy(() => import('./DeletedUsers'));
const PlanCanceling      = lazy(() => import('./PlanCanceling'));

// Same nav structure as admin sidebar
const NAV_GROUPS = [
    {
        label: 'MENU',
        items: [
            { key: 'dashboard', to: '/staff/dashboard', label: 'Payment Admin Panel', icon: '💳' },
        ],
    },
    {
        label: 'MANAGEMENT',
        items: [
            { key: 'planSettings',  to: '/staff/plan-settings',  label: 'Plan Settings',  icon: '⚙️' },
            { key: 'annualPlans',   to: '/staff/annual-plans',   label: 'Annual Plans',   icon: '📆' },
            { key: 'featureAccess', to: '/staff/feature-access', label: 'Feature Access', icon: '🔒' },
        ],
    },
    {
        label: 'SETTINGS',
        items: [
            { key: 'integrationBackend', to: '/staff/integration-backend', label: 'Integration Backend', icon: '🔗' },
            { key: 'redisCache',         to: '/staff/redis-cache',         label: 'Redis Cache',         icon: '⚡' },
        ],
    },
    {
        label: 'RECORDS',
        items: [
            { key: 'deletedUsers', to: '/staff/deleted-users', label: 'Deleted Users', icon: '🗑️' },
        ],
    },
    {
        label: 'SUPPORT',
        items: [
            { key: 'supportTickets', to: '/staff/support-tickets', label: 'Support Tickets', icon: '🎫' },
        ],
    },
];

function hasAccess(permissions, key) {
    return permissions.some(p => p === key || p.startsWith(`${key}:`));
}

const STAFF_DASHBOARD_STYLES = `
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
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  .perf-page-container .staff-sidebar {
    width: 220px;
    background: #0d121f !important;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    zIndex: 100;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    overflow-y: auto;
    transition: transform 0.25s ease;
  }

  .perf-page-container .sb-title {
    font-family: 'Outfit', sans-serif !important;
    font-size: 15px;
    font-weight: 900;
    color: #fff;
    letter-spacing: -0.3px;
    line-height: 1;
    background: linear-gradient(120deg, #ffffff, #c084fc);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .perf-page-container .sb-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    margin-bottom: 2px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.55) !important;
    transition: all 0.15s ease;
  }
  .perf-page-container .sb-link:hover {
    color: #fff !important;
    background: rgba(255, 255, 255, 0.04);
  }
  .perf-page-container .sb-link.sb-active {
    color: #fff !important;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(124, 58, 237, 0.04) 100%);
    border-left: 3px solid #7c3aed;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    box-shadow: 0 4px 20px rgba(124, 58, 237, 0.08);
  }

  .perf-page-container .sb-user {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
    transition: border-color 0.2s ease;
  }
  .perf-page-container .sb-user:hover {
    border-color: rgba(124, 58, 237, 0.3);
  }

  .perf-page-container .sb-logout {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .perf-page-container .sb-logout:hover {
    background: rgba(239, 68, 68, 0.22);
    color: #fff;
    border-color: #ef4444;
  }

  .perf-page-container .topbar {
    background: var(--bg-card) !important;
    border-bottom: 1px solid var(--border-color) !important;
    padding: 14px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    color: var(--text-main);
  }

  .perf-page-container .staff-main {
    margin-left: 220px;
    width: calc(100vw - 220px);
    overflow-y: auto;
    min-height: 100vh;
    background-color: var(--bg-primary);
    box-sizing: border-box;
    transition: background-color 0.3s ease;
  }

  @media(min-width: 769px) {
    .perf-page-container .staff-sidebar { transform: none !important; }
  }
  @media(max-width: 768px) {
    .perf-page-container .staff-sidebar { transform: translateX(-100%); }
    .perf-page-container .staff-sidebar.open { transform: translateX(0); }
    .perf-page-container .staff-main { margin-left: 0 !important; width: 100% !important; }
    .perf-page-container .staff-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 90; }
    .perf-page-container .staff-toggle-btn { display: block !important; }
  }
`;

export default function StaffDashboard() {
    const [staff, setStaff]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate  = useNavigate();
    const location  = useLocation();

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
        staffMe().then(r => { setStaff(r.data); setLoading(false); })
            .catch(() => navigate('/staff-login'));
    }, []);

    // Poll unread support tickets every 30s
    useEffect(() => {
        const fetchUnread = () => {
            axios.get(`${API_URL}/api/admin/support-tickets/unread`, { withCredentials: true })
                .then(r => setUnreadCount(r.data?.count || 0)).catch(() => {});
        };
        fetchUnread();
        const t = setInterval(fetchUnread, 30000);
        return () => clearInterval(t);
    }, []);

    const logout = async () => {
        await staffLogout().catch(() => {});
        navigate('/staff-login');
    };

    const isDark = localTheme === 'dark';

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background: isDark ? '#0b0f19' : '#f1f5f9' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid var(--border-color)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const perms = staff?.permissions || [];
    const canWrite = (key) => perms.some(p => p === key || p === `${key}:write`);
    const allItems = NAV_GROUPS.flatMap(g => g.items);
    const firstItem = allItems.find(i => hasAccess(perms, i.key));
    const firstPath = firstItem?.to || '/staff-login';

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{STAFF_DASHBOARD_STYLES}</style>
            <div style={{ display:'flex', height:'100vh', overflow:'hidden', background: 'transparent' }}>
                {/* Sidebar Overlay */}
                {sidebarOpen && <div className="staff-overlay" onClick={() => setSidebarOpen(false)} />}

                {/* Sidebar */}
                <aside className={`staff-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    {/* Logo */}
                    <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                <UWLogo size={30} />
                                <div>
                                    <div className="sb-title">UptimeForge</div>
                                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:700, letterSpacing:0.5, marginTop:2 }}>STAFF PANEL</div>
                                </div>
                            </div>
                            <button onClick={() => setSidebarOpen(false)} className="staff-toggle-btn" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'none', fontSize:16, padding:4 }}>✕</button>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto' }}>
                        {NAV_GROUPS.map(group => {
                            const visibleItems = group.items.filter(i => hasAccess(perms, i.key));
                            if (visibleItems.length === 0) return null;
                            return (
                                <div key={group.label} style={{ marginBottom:12 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1.2, padding:'8px 12px 4px' }}>
                                        {visibleItems.length > 0 && group.label}
                                    </div>
                                    {visibleItems.map(item => (
                                        <NavLink key={item.key} to={item.to} onClick={() => setSidebarOpen(false)}
                                            className={({ isActive }) => `sb-link${isActive ? ' sb-active' : ''}`}>
                                            <span style={{ fontSize:15 }}>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            );
                        })}
                    </nav>

                    {/* User footer */}
                    <div style={{ padding:'14px 12px', borderTop:'1px solid rgba(255,255,255,0.05)', background: 'rgba(12, 16, 27, 0.4)', display:'flex', flexDirection:'column', gap:10 }}>
                        <div className="sb-user">
                            <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:14, flexShrink:0 }}>
                                {staff?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div style={{ minWidth:0, flex:1 }}>
                                <div style={{ color:'#fff', fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{staff?.name}</div>
                                <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{staff?.email}</div>
                            </div>
                        </div>
                        <button onClick={logout} className="sb-logout">
                            <span>→</span> Logout
                        </button>
                    </div>
                </aside>

                {/* Main content */}
                <main className="staff-main">
                    {/* Topbar */}
                    <div className="topbar">
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <button onClick={() => setSidebarOpen(true)} className="staff-toggle-btn" style={{ background:'none', border:'none', cursor:'pointer', display:'none', fontSize:20, padding:'4px 8px', color:'var(--text-main)' }}>☰</button>
                            <span style={{ fontSize:12, fontWeight:700, color:'#7c3aed', background: isDark ? 'rgba(124, 58, 237, 0.08)' : '#ede9fe', border: isDark ? '1px solid rgba(124, 58, 237, 0.15)' : '1px solid #d8b4fe', padding:'4px 14px', borderRadius:20 }}>🔐 Staff Panel</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>
                                Welcome, <strong style={{ color:'var(--text-main)' }}>{staff?.name}</strong>
                            </div>
                            {/* Bell icon for support tickets */}
                            <NavLink to="/staff/support-tickets" style={{ position:'relative', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36, borderRadius:10, background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0', cursor:'pointer' }}>
                                <svg width="18" height="18" fill="none" stroke={unreadCount > 0 ? '#7c3aed' : 'currentColor'} strokeWidth="1.8" viewBox="0 0 24 24" style={{ color:'var(--text-muted)' }}>
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                                {unreadCount > 0 && (
                                    <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:800, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg-primary)' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </NavLink>
                        </div>
                    </div>
                    <div style={{ padding:'24px' }}>
                    <Suspense fallback={
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
                            <div style={{ width:36, height:36, borderRadius:'50%', border:'4px solid var(--border-color)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    }>
                        <Routes>
                            <Route path="/" element={<Navigate to={firstPath} replace />} />
                            {hasAccess(perms,'dashboard')          && <Route path="/dashboard"           element={<AdminPanel staffMode readOnly={!canWrite('dashboard')} permissions={perms} />} />}
                            {hasAccess(perms,'planSettings')       && <Route path="/plan-settings"       element={<PlanSettings       readOnly={!canWrite('planSettings')} />} />}
                            {hasAccess(perms,'annualPlans')        && <Route path="/annual-plans"        element={<AnnualPlans        readOnly={!canWrite('annualPlans')} />} />}
                            {hasAccess(perms,'featureAccess')      && <Route path="/feature-access"      element={<FeatureAccess      readOnly={!canWrite('featureAccess')} />} />}
                            {hasAccess(perms,'integrationBackend') && <Route path="/integration-backend" element={<IntegrationBackend readOnly={!canWrite('integrationBackend')} />} />}
                            {hasAccess(perms,'redisCache')         && <Route path="/redis-cache"         element={<RedisCache         readOnly={!canWrite('redisCache')} />} />}
                            {hasAccess(perms,'deletedUsers')       && <Route path="/deleted-users"       element={<DeletedUsers       readOnly={!canWrite('deletedUsers')} />} />}
                            {hasAccess(perms,'supportTickets')     && <Route path="/support-tickets"     element={<SupportTickets     readOnly={!canWrite('supportTickets')} adminOnly={true} />} />}
                            {hasAccess(perms,'planCanceling')      && <Route path="/plan-canceling"      element={<PlanCanceling />} />}
                            <Route path="*" element={<Navigate to={firstPath} replace />} />
                        </Routes>
                    </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}
