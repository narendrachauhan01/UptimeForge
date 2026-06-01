import React, { useState, useEffect, lazy, Suspense } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { staffMe, staffLogout } from '../api';
import UWLogo from '../components/UWLogo';

// Lazy load admin pages reused for staff
const AdminPanel        = lazy(() => import('./AdminPanel'));
const PlanSettings      = lazy(() => import('./PlanSettings'));
const AnnualPlans       = lazy(() => import('./AnnualPlans'));
const FeatureAccess     = lazy(() => import('./FeatureAccess'));
const RedisCache        = lazy(() => import('./RedisCache'));
const IntegrationBackend= lazy(() => import('./IntegrationBackend'));
const SupportTickets    = lazy(() => import('./SupportTickets'));
const DeletedUsers      = lazy(() => import('./DeletedUsers'));
const PlanCanceling     = lazy(() => import('./PlanCanceling'));

const PERM_NAV = [
    { key: 'dashboard',          label: 'Admin Panel',           path: '/staff/dashboard',              icon: '🏠' },
    { key: 'planSettings',       label: 'Plan Settings',         path: '/staff/plan-settings',          icon: '⚙️' },
    { key: 'annualPlans',        label: 'Annual Plans',          path: '/staff/annual-plans',           icon: '📆' },
    { key: 'featureAccess',      label: 'Feature Access',        path: '/staff/feature-access',         icon: '🔒' },
    { key: 'integrationBackend', label: 'Integration Backend',   path: '/staff/integration-backend',    icon: '🔗' },
    { key: 'redisCache',         label: 'Redis Cache',           path: '/staff/redis-cache',            icon: '⚡' },
    { key: 'deletedUsers',       label: 'Deleted Users',         path: '/staff/deleted-users',          icon: '🗑️' },
    { key: 'supportTickets',     label: 'Support Tickets',       path: '/staff/support-tickets',        icon: '🎫' },
    { key: 'planCanceling',      label: 'Plan Canceling',        path: '/staff/plan-canceling',         icon: '❌' },
];

export default function StaffDashboard() {
    const [staff, setStaff]   = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        staffMe().then(r => { setStaff(r.data); setLoading(false); })
            .catch(() => { navigate('/staff-login'); });
    }, []);

    const logout = async () => {
        await staffLogout().catch(() => {});
        navigate('/staff-login');
    };

    if (loading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const perms = staff?.permissions || [];
    const navItems = PERM_NAV.filter(n => perms.includes(n.key));
    const firstPath = navItems[0]?.path || '/staff-login';

    return (
        <div style={{ display:'flex', height:'100vh', background:'#F9FAFB' }}>
            {/* Sidebar */}
            <aside style={{ width:220, background:'#1e1b4b', display:'flex', flexDirection:'column', flexShrink:0 }}>
                <div style={{ padding:'20px 16px', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <UWLogo size={30} />
                        <div>
                            <div style={{ color:'#fff', fontWeight:800, fontSize:14 }}>UptimeForge</div>
                            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>Staff Panel</div>
                        </div>
                    </div>
                </div>

                <nav style={{ flex:1, padding:'12px 8px', overflowY:'auto' }}>
                    {navItems.map(n => (
                        <NavLink key={n.key} to={n.path}
                            style={({ isActive }) => ({
                                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:2,
                                textDecoration:'none', fontSize:13, fontWeight:600,
                                background: isActive ? 'rgba(124,58,237,0.3)' : 'transparent',
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                            })}>
                            <span>{n.icon}</span>
                            <span>{n.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ color:'rgba(255,255,255,0.7)', fontSize:12, marginBottom:4, fontWeight:600 }}>{staff?.name}</div>
                    <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:12 }}>{staff?.email}</div>
                    <button onClick={logout} style={{ width:'100%', padding:'8px', background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{ flex:1, overflowY:'auto', padding:24 }}>
                <Suspense fallback={null}>
                    <Routes>
                        <Route path="/" element={<Navigate to={firstPath} replace />} />
                        {perms.includes('dashboard')          && <Route path="/dashboard"           element={<AdminPanel initialTab="overview" staffMode permissions={perms} />} />}
                        {perms.includes('planSettings')       && <Route path="/plan-settings"       element={<PlanSettings />} />}
                        {perms.includes('annualPlans')        && <Route path="/annual-plans"        element={<AnnualPlans />} />}
                        {perms.includes('featureAccess')      && <Route path="/feature-access"      element={<FeatureAccess />} />}
                        {perms.includes('integrationBackend') && <Route path="/integration-backend" element={<IntegrationBackend />} />}
                        {perms.includes('redisCache')         && <Route path="/redis-cache"         element={<RedisCache />} />}
                        {perms.includes('deletedUsers')       && <Route path="/deleted-users"       element={<DeletedUsers />} />}
                        {perms.includes('supportTickets')     && <Route path="/support-tickets"     element={<SupportTickets />} />}
                        {perms.includes('planCanceling')      && <Route path="/plan-canceling"      element={<PlanCanceling />} />}
                        <Route path="*" element={<Navigate to={firstPath} replace />} />
                    </Routes>
                </Suspense>
            </main>
        </div>
    );
}
