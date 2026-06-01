import React, { useState, useEffect, lazy, Suspense } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { staffMe, staffLogout } from '../api';
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
    {
        label: 'OPERATIONS',
        items: [
            { key: 'planCanceling', to: '/staff/plan-canceling', label: 'Plan Canceling', icon: '❌' },
        ],
    },
];

function hasAccess(permissions, key) {
    return permissions.some(p => p.startsWith(`${key}:`));
}

export default function StaffDashboard() {
    const [staff, setStaff]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate  = useNavigate();
    const location  = useLocation();

    useEffect(() => {
        staffMe().then(r => { setStaff(r.data); setLoading(false); })
            .catch(() => navigate('/staff-login'));
    }, []);

    const logout = async () => {
        await staffLogout().catch(() => {});
        navigate('/staff-login');
    };

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1e1b4b' }}>
            <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid rgba(255,255,255,0.2)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const perms = staff?.permissions || [];
    const allItems = NAV_GROUPS.flatMap(g => g.items);
    const firstItem = allItems.find(i => hasAccess(perms, i.key));
    const firstPath = firstItem?.to || '/staff-login';

    return (
        <div style={{ display:'flex', height:'100vh', background:'#F3F4F6', fontFamily:'Inter,sans-serif' }}>
            {/* Sidebar */}
            <aside style={{
                width: 220, background:'#1e1b4b', display:'flex', flexDirection:'column',
                flexShrink:0, position:'fixed', top:0, bottom:0, left:0, zIndex:100,
                overflowY:'auto',
            }}>
                {/* Logo */}
                <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <UWLogo size={30} />
                        <div>
                            <div style={{ color:'#fff', fontWeight:800, fontSize:15, fontFamily:'Outfit,sans-serif' }}>UptimeForge</div>
                            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, fontWeight:500 }}>Staff Panel</div>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex:1, padding:'10px 8px', overflowY:'auto' }}>
                    {NAV_GROUPS.map(group => {
                        const visibleItems = group.items.filter(i => hasAccess(perms, i.key));
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={group.label} style={{ marginBottom:4 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:1, padding:'8px 12px 4px' }}>
                                    {group.label}
                                </div>
                                {visibleItems.map(item => (
                                    <NavLink key={item.key} to={item.to}
                                        style={({ isActive }) => ({
                                            display:'flex', alignItems:'center', gap:10,
                                            padding:'9px 12px', borderRadius:8, marginBottom:1,
                                            textDecoration:'none', fontSize:13, fontWeight:600,
                                            background: isActive ? 'rgba(124,58,237,0.35)' : 'transparent',
                                            color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                                            transition:'all 0.15s',
                                        })}>
                                        <span style={{ fontSize:15 }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                {/* User footer */}
                <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:13, flexShrink:0 }}>
                            {staff?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ minWidth:0 }}>
                            <div style={{ color:'#fff', fontSize:12, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{staff?.name}</div>
                            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{staff?.email}</div>
                        </div>
                    </div>
                    <button onClick={logout} style={{ width:'100%', padding:'7px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <span>→</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{ flex:1, marginLeft:220, overflowY:'auto', minHeight:'100vh' }}>
                <Suspense fallback={
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                }>
                    <Routes>
                        <Route path="/" element={<Navigate to={firstPath} replace />} />
                        {hasAccess(perms,'dashboard')          && <Route path="/dashboard"           element={<AdminPanel staffMode permissions={perms} />} />}
                        {hasAccess(perms,'planSettings')       && <Route path="/plan-settings"       element={<PlanSettings />} />}
                        {hasAccess(perms,'annualPlans')        && <Route path="/annual-plans"        element={<AnnualPlans />} />}
                        {hasAccess(perms,'featureAccess')      && <Route path="/feature-access"      element={<FeatureAccess />} />}
                        {hasAccess(perms,'integrationBackend') && <Route path="/integration-backend" element={<IntegrationBackend />} />}
                        {hasAccess(perms,'redisCache')         && <Route path="/redis-cache"         element={<RedisCache />} />}
                        {hasAccess(perms,'deletedUsers')       && <Route path="/deleted-users"       element={<DeletedUsers />} />}
                        {hasAccess(perms,'supportTickets')     && <Route path="/support-tickets"     element={<SupportTickets />} />}
                        {hasAccess(perms,'planCanceling')      && <Route path="/plan-canceling"      element={<PlanCanceling />} />}
                        <Route path="*" element={<Navigate to={firstPath} replace />} />
                    </Routes>
                </Suspense>
            </main>
        </div>
    );
}
