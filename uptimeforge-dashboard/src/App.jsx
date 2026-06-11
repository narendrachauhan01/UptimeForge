import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import UWLogo from './components/UWLogo';
import CookieConsent from './components/CookieConsent';
import { setCookie, getCookie, removeCookie } from './utils/cookies';
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const WhatsAppPage      = lazy(() => import('./pages/WhatsApp'));
const Alerts            = lazy(() => import('./pages/Alerts'));
const DomainSSL         = lazy(() => import('./pages/DomainSSL'));
const Charts            = lazy(() => import('./pages/Charts'));
const EmailPage         = lazy(() => import('./pages/Email'));
const Resources         = lazy(() => import('./pages/Resources'));
const PlanSettings      = lazy(() => import('./pages/PlanSettings'));
const FeatureAccess     = lazy(() => import('./pages/FeatureAccess'));
const PingMonitor       = lazy(() => import('./pages/PingMonitor'));
const SiteDetail        = lazy(() => import('./pages/SiteDetail'));
const Reports           = lazy(() => import('./pages/Reports'));
const AddMonitor        = lazy(() => import('./pages/AddMonitor'));
const Login             = lazy(() => import('./pages/Login'));
const ResetPassword     = lazy(() => import('./pages/ResetPassword'));
const Register          = lazy(() => import('./pages/Register'));
const Pricing           = lazy(() => import('./pages/Pricing'));
const Account           = lazy(() => import('./pages/Account'));
const AdminPanel        = lazy(() => import('./pages/AdminPanel'));
const VerifyAccount     = lazy(() => import('./pages/VerifyAccount'));
const PaymentPage       = lazy(() => import('./pages/PaymentPage'));
const CompleteProfile   = lazy(() => import('./pages/CompleteProfile'));
const Integrations      = lazy(() => import('./pages/Integrations'));
const IntegrationBackend= lazy(() => import('./pages/IntegrationBackend'));
const RedisCache        = lazy(() => import('./pages/RedisCache'));
const PlanCanceling     = lazy(() => import('./pages/PlanCanceling'));
const AnnualPlans       = lazy(() => import('./pages/AnnualPlans'));
const DeletedUsers      = lazy(() => import('./pages/DeletedUsers'));
const UsersList         = lazy(() => import('./pages/UsersList'));
const ContactSupport    = lazy(() => import('./pages/ContactSupport'));
const SupportTickets    = lazy(() => import('./pages/SupportTickets'));
const Servers           = lazy(() => import('./pages/Servers'));
const TermsOfService    = lazy(() => import('./pages/TermsOfService'));
const StaffManagement   = lazy(() => import('./pages/StaffManagement'));
const StaffLogin        = lazy(() => import('./pages/StaffLogin'));
const StaffDashboard    = lazy(() => import('./pages/StaffDashboard'));
const AdminLogin        = lazy(() => import('./pages/AdminLogin'));
const AccountSuspended  = lazy(() => import('./pages/AccountSuspended'));
const ConfirmDelete     = lazy(() => import('./pages/ConfirmDelete'));
import { API_URL, getNotifications, markNotificationsRead, getPlans, clearNotifications } from './api';
import Toast from './components/Toast';
import NotificationPanel from './components/NotificationPanel';
import './App.css';

const PLAN_COLORS = { free_trial: '#64748b', bronze: '#b45309', silver: '#475569', gold: '#ca8a04', admin: '#7c3aed' };

/* ── SVG Icons ── */
const IcoDash    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
const IcoChart   = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcoServer  = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1" fill="currentColor"/><circle cx="6" cy="18" r="1" fill="currentColor"/></svg>;
const IcoGlobe   = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IcoUsers   = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoBell    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IcoLock    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoMail    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const IcoWa      = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IcoAdmin   = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 0-14.14 0"/><path d="M4.93 19.07a10 10 0 0 0 14.14 0"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>;
const IcoPlan    = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoLogout  = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IcoProfile  = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
const IcoSettings = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IcoToggle  = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="6" width="22" height="12" rx="6"/><circle cx="16" cy="12" r="3" fill="currentColor" stroke="none"/></svg>;
const IcoPing     = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="10"/></svg>;
const IcoReport   = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const IcoIncident = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoMenu    = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcoDatabase = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>;
const IcoHeadset  = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>;
const IcoLink     = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;

function PlanBadge({ user }) {
  if (!user) return null;
  const plan = user.plan || 'free_trial';
  const color = PLAN_COLORS[plan] || '#64748b';
  const label = plan === 'free_trial'
    ? `Trial · ${user.trialDaysLeft ?? 0}d left`
    : plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan';
  return (
    <Link to="/account" className="sb-plan-badge" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
      <IcoPlan />
      {label}
    </Link>
  );
}

/* ── Admin sidebar nav groups ── */
const ADMIN_NAV_GROUPS = [
  {
    label: 'MENU',
    items: [
      { to: '/admin',            label: 'Payment Admin Panel', icon: <IcoAdmin /> },
    ],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { to: '/plan-settings',    label: 'Plan Settings',       icon: <IcoSettings /> },
      { to: '/annual-plans',     label: 'Annual Plans',        icon: <IcoSettings /> },
      { to: '/feature-access',   label: 'Feature Access',      icon: <IcoToggle /> },
      { to: '/server-resources', label: 'Infra',               icon: <IcoServer /> },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { to: '/integration-backend', label: 'Integration Backend', icon: <IcoLink /> },
      { to: '/redis-cache',         label: 'Redis Cache',         icon: <IcoDatabase /> },
    ],
  },
  {
    label: 'RECORDS',
    items: [
      { to: '/users-list',    label: 'All Users',     icon: <IcoUsers /> },
      { to: '/deleted-users', label: 'Deleted Users', icon: <IcoUsers /> },
    ],
  },
  {
    label: 'SUPPORT',
    items: [
      { to: '/support-tickets', label: 'Support Tickets', icon: <IcoHeadset /> },
    ],
  },
  {
    label: 'TEAM',
    items: [
      { to: '/staff-management', label: 'Staff Management', icon: <IcoUsers /> },
    ],
  },
];

function AdminNotifBell() {
  const [count,    setCount]    = React.useState(0);
  const [tickets,  setTickets]  = React.useState([]);
  const [open,     setOpen]     = React.useState(false);
  const navigate = useNavigate();
  const ref = React.useRef();

  const load = async () => {
    try {
      const r = await axios.get(`${API_URL}/api/admin/support-tickets/unread`, { withCredentials: true });
      setCount(r.data.count); setTickets(r.data.tickets);
    } catch {}
  };

  React.useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position:'relative', marginLeft:'auto' }}>
      <button onClick={() => setOpen(o => !o)} style={{ position:'relative', background:'rgba(255,255,255,0.08)', border:'none', borderRadius:8, width:34, height:34, cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <IcoBell />
        {count > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:8, background:'#EF4444', color:'#fff', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', border:'2px solid #1C2434' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position:'fixed', top:60, left:250, width:300, background:'#fff', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.15)', border:'1px solid #E5E7EB', zIndex:9999, overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:700, fontSize:13, color:'#111827' }}>Support Messages</span>
            {count > 0 && <span style={{ fontSize:11, fontWeight:700, background:'#EEF2FF', color:'#4F46E5', padding:'2px 8px', borderRadius:20 }}>{count} new</span>}
          </div>
          {tickets.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'#9CA3AF', fontSize:13 }}>No new messages</div>
          ) : tickets.map(t => (
            <div key={t._id} onClick={() => { navigate('/support-tickets'); setOpen(false); }}
              style={{ padding:'12px 16px', borderBottom:'1px solid #F9FAFB', cursor:'pointer', display:'flex', gap:10, alignItems:'flex-start' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'#EEF2FF', color:'#4F46E5', fontWeight:800, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {(t.name||'U')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</div>
                <div style={{ fontSize:12, color:'#6B7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.subject}</div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{t.priority==='high'?'🔴':t.priority==='medium'?'🟡':'🟢'} {t.priority}</div>
              </div>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444', flexShrink:0, marginTop:4 }}/>
            </div>
          ))}
          <div onClick={() => { navigate('/support-tickets'); setOpen(false); }}
            style={{ padding:'10px 16px', textAlign:'center', fontSize:12, fontWeight:600, color:'#4F46E5', cursor:'pointer', borderTop:'1px solid #F3F4F6' }}>
            View all tickets →
          </div>
        </div>
      )}
    </div>
  );
}


function Sidebar({ onLogout, user, isAdmin, open, setOpen, onBell, unreadCount }) {
  const location = useLocation();
  useEffect(() => setOpen(false), [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const userLinks = [
    { to: '/performance',  label: 'Performance',  icon: <IcoChart /> },
    { to: '/monitoring',   label: 'Monitoring',   icon: <IcoDash /> },
    { to: '/ping',         label: 'Ping Monitor', icon: <IcoPing /> },
    { to: '/domain-ssl',   label: 'Domain & SSL', icon: <IcoLock /> },
    { to: '/incidents',    label: 'Incidents',    icon: <IcoIncident /> },
    { to: '/integrations', label: 'Integrations', icon: <IcoToggle /> },
    { to: '/reports',      label: 'Reports',      icon: <IcoReport /> },
    { to: '/account',      label: 'My Account',   icon: <IcoPlan /> },
    { to: '/support',      label: 'Support',      icon: <IcoHeadset /> },
  ];

  return (
    <>
      {open && <div className="sb-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>

        {/* Brand */}
        <div className="sb-brand">
          <UWLogo size={34} />
          <span className="sb-title">UptimeForge</span>
          {!isAdmin && (
            <button className="sb-bell" onClick={onBell} aria-label="Notifications">
              <IcoBell />
              {unreadCount > 0 && <span className="sb-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
          )}
          {isAdmin && <AdminNotifBell />}
        </div>

        {/* Nav links */}
        <nav className="sb-nav">
          {isAdmin ? (
            ADMIN_NAV_GROUPS.map(group => (
              <div key={group.label} className="sb-nav-group">
                <div className="sb-nav-group-label">{group.label}</div>
                {group.items.map(l => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    className={({ isActive }) => `sb-link${isActive ? ' sb-active' : ''}`}
                  >
                    {l.icon}
                    <span>{l.label}</span>
                  </NavLink>
                ))}
              </div>
            ))
          ) : (
            userLinks.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/monitoring'}
                className={({ isActive }) => `sb-link${isActive ? ' sb-active' : ''}`}
              >
                {l.icon}
                <span>{l.label}</span>
              </NavLink>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          {!isAdmin && <PlanBadge user={user} />}
          {user && (
            <div className="sb-user">
              <div className="sb-avatar">{(user.name || 'U')[0].toUpperCase()}</div>
              <div className="sb-user-info">
                <div className="sb-user-name">{user.name}</div>
                <div className="sb-user-email">{user.email}</div>
              </div>
            </div>
          )}
          {isAdmin && (
            <NavLink to="/admin-profile" style={{ textDecoration:'none' }}>
              <div className="sb-user" style={{ cursor:'pointer', transition:'background 0.2s', borderRadius:10 }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div className="sb-avatar sb-avatar-admin">A</div>
                <div className="sb-user-info">
                  <div className="sb-user-name">Admin</div>
                  <div className="sb-user-email">Full access</div>
                </div>
              </div>
            </NavLink>
          )}
          <button className="sb-logout" onClick={onLogout}>
            <IcoLogout /> Logout
          </button>
        </div>

      </aside>
    </>
  );
}

function TrialBanner({ user }) {
  if (!user) return null;
  const status = user.accountStatus || 'active';
  const days   = user.trialDaysLeft ?? 0;

  // Grace period banner (all plan types)
  if (status === 'grace') {
    return (
      <div style={{ background:'linear-gradient(90deg,#92400e 0%,#b45309 50%,#d97706 100%)', color:'#fff', padding:'10px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', boxShadow:'0 2px 12px rgba(180,83,9,0.35)', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>🔔</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, letterSpacing:'0.2px' }}>Subscription Expired — Grace Period Active</div>
            <div style={{ fontSize:12, opacity:0.85, marginTop:2 }}>All monitoring services paused · Read-only mode · Renew within 10 days to avoid suspension</div>
          </div>
        </div>
        <Link to="/pay?plan=select"
          style={{ padding:'9px 22px', background:'#fff', color:'#b45309', borderRadius:10, fontSize:13, fontWeight:800, textDecoration:'none', whiteSpace:'nowrap', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', letterSpacing:'0.2px', transition:'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.background='#fef3c7'; e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.25)'; e.currentTarget.style.transform='translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'; e.currentTarget.style.transform='translateY(0)'; }}>
          Renew Plan →
        </Link>
      </div>
    );
  }

  if (!user || user.plan !== 'free_trial') return null;
  if (!user.isActive && user.trialVerified) {
    return null; // handled by grace/suspended above
  }
  if (days <= 3) {
    return (
      <div className="trial-banner trial-warn">
        Free trial expires in <strong>{days} day{days !== 1 ? 's' : ''}</strong>.{' '}
        <Link to="/account" className="trial-banner-link">Upgrade your plan</Link>
      </div>
    );
  }
  return null;
}

function UpgradeGate({ user, feature }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, padding:40, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 className="upgrade-gate-title" style={{ fontSize:20, fontWeight:800, margin:'0 0 8px' }}>{feature} — Not Available</h2>
      <p className="upgrade-gate-desc" style={{ fontSize:14, maxWidth:360, lineHeight:1.7, margin:'0 0 24px' }}>
        This feature is not available on your current plan. Contact support or upgrade your plan to unlock it.
      </p>
      <Link to="/account" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', padding:'12px 28px', borderRadius:12, fontWeight:700, fontSize:14, textDecoration:'none' }}>
        Upgrade Plan →
      </Link>
    </div>
  );
}

function AppInner() {
  const [theme, setTheme] = useState(() => {
    const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
    return match ? match[1] : 'dark';
  });

  useEffect(() => {
    const check = () => {
      const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
      const currentTheme = match ? match[1] : 'dark';
      if (currentTheme !== theme) setTheme(currentTheme);
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [theme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('charts-dark-theme');
    } else {
      document.body.classList.remove('charts-dark-theme');
    }
  }, [theme]);
  const [authed, setAuthed] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [freeAccess, setFreeAccess] = useState({ domainSsl: false, charts: false, pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false });
  const [bronzeAccess, setBronzeAccess] = useState({ pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false });
  const [silverAccess, setSilverAccess] = useState({ pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false });
  const [goldAccess,   setGoldAccess]   = useState({ pingMonitor: false, whatsapp: false, telegram: false, webhook: false, rocketChat: false, slack: false, reports: false });
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter(n => !n.read).length;

  const loadNotifications = () => {
    getNotifications().then(r => setNotifications(r.data)).catch(() => {});
  };

  const handleBell = () => {
    setNotifOpen(o => !o);
    setSidebarOpen(false);
    if (unreadCount > 0) {
      markNotificationsRead().then(loadNotifications).catch(() => {});
    }
  };

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    getPlans().then(r => {
      if (r.data.freeTrialAccess) setFreeAccess(prev => ({ ...prev, ...r.data.freeTrialAccess }));
      if (r.data.bronzeAccess)    setBronzeAccess(prev => ({ ...prev, ...r.data.bronzeAccess }));
      if (r.data.silverAccess)    setSilverAccess(prev => ({ ...prev, ...r.data.silverAccess }));
      if (r.data.goldAccess)      setGoldAccess(prev => ({ ...prev, ...r.data.goldAccess }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Check admin cookie first
    axios.get(`${API_URL}/api/auth/verify`, { withCredentials: true })
      .then(() => { setIsAdmin(true); setAuthed(true); })
      .catch(() => {
        // Not admin — check user cookie
        axios.get(`${API_URL}/api/users/me`, { withCredentials: true })
          .then(r => { setUser(r.data); setIsAdmin(false); setAuthed(true); })
          .catch(() => { setAuthed(false); });
      });
  }, []);

  const handleLogin = (userData, isNewUser = false) => {
    const adminLogin = !userData;
    if (userData) { setUser(userData); setIsAdmin(false); }
    else { setIsAdmin(true); setUser(null); }
    setAuthed(true);
    if (adminLogin) {
      navigate('/admin');
      showToast('Welcome back, Admin!');
    } else if (isNewUser) {
      // New user — check if profile complete, then show plan selection
      if (!userData?.city || !userData?.gender || !userData?.phone) {
        navigate('/complete-profile');
        showToast('Welcome to UptimeForge! Complete your profile to get started.');
      } else {
        navigate('/pay?plan=select');
        showToast('Welcome! Choose a plan to get started.');
      }
    } else {
      navigate('/performance');
      showToast('Login successful! Welcome back.');
    }
  };

  const handleRegister = (userData, planKey) => {
    setUser(userData);
    setIsAdmin(false);
    setAuthed(true);
    // If profile incomplete (Google signup — no city/gender), go to complete profile first
    if (!userData?.city || !userData?.gender || !userData?.phone) {
      if (planKey && ['bronze', 'silver', 'gold'].includes(planKey)) {
        sessionStorage.setItem('sm_intended_plan', planKey);
      }
      navigate('/complete-profile');
      return;
    }
    if (planKey && ['bronze', 'silver', 'gold'].includes(planKey)) {
      sessionStorage.setItem('sm_intended_plan', planKey);
      navigate(`/pay?plan=${planKey}`);
    } else {
      navigate('/pay?plan=select');
    }
  };

  const handleUserUpdate = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      if (isAdmin) await axios.post(`${API_URL}/api/auth/logout`, {}, { withCredentials: true });
      else await axios.post(`${API_URL}/api/users/logout`, {}, { withCredentials: true });
    } catch (_) {}
    setAuthed(false); setUser(null); setIsAdmin(false);
    showToast('Logged out successfully.');
    navigate(isAdmin ? '/admin-login' : '/login');
  };

  // Auto-refresh user data every 5 min to keep plan/status up to date
  useEffect(() => {
    if (!authed || isAdmin) return;
    const interval = setInterval(() => {
      axios.get(`${API_URL}/api/users/me`, { withCredentials: true })
        .then(r => { setUser(r.data); })
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authed, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authed) return;
    let timer;
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleLogout, 5 * 60 * 1000); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load + poll notifications for users
  useEffect(() => {
    if (!authed || isAdmin) return;
    loadNotifications();
    const t = setInterval(loadNotifications, 30000);
    return () => clearInterval(t);
  }, [authed, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const publicPaths = ['/', '/login', '/register', '/pricing', '/reset-password', '/terms'];
  const isPublicPath = publicPaths.includes(location.pathname);

  if (authed === null && !isPublicPath) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontSize: 32 }}>⏳</div>
    </div>
  );

  if (isPublicPath && !authed) {
    return (
      <>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleRegister} />} />
            <Route path="/pricing" element={<Pricing user={user} authed={authed} />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/support" element={<ContactSupport user={user} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
        </Suspense>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  if (authed && isPublicPath && location.pathname !== '/' && location.pathname !== '/terms') {
    return <Navigate to={isAdmin ? '/admin' : '/performance'} replace />;
  }

  if (authed && location.pathname === '/terms') {
    return <TermsOfService />;
  }

  if (authed && location.pathname === '/') {
    return <Navigate to={isAdmin ? '/admin' : '/performance'} replace />;
  }

  if (!authed) {
    return (
      <>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onRegister={handleRegister} />} />
            <Route path="/pricing" element={<Pricing user={user} authed={authed} />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/support" element={<ContactSupport user={user} />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
        </Suspense>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Profile completion gate for all users without state/phone ──
  // Note: /pay is NOT skipped so new Google users always go through complete-profile first
  const skipProfileGate = ['/complete-profile', '/support', '/account'].includes(location.pathname);
  const needsProfile = authed && !isAdmin && user && (!user.city || !user.gender || !user.phone) && !skipProfileGate;
  if (needsProfile) {
    return <Navigate to="/complete-profile" replace />;
  }
  if (authed && location.pathname === '/complete-profile') {
    return (
      <>
        <CompleteProfile user={user} onUserUpdate={handleUserUpdate} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Admin profile (no sidebar, full screen) ──
  if (authed && isAdmin && location.pathname === '/admin-profile') {
    return (
      <>
        <AdminPanel initialTab="profile" />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Full-screen payment page (no sidebar) ──
  if (authed && location.pathname === '/pay') {
    const payPlan = new URLSearchParams(location.search).get('plan');
    // Already verified → skip verification page, go to dashboard
    if (payPlan === 'verification' && user && (user.trialVerified || user.plan !== 'free_trial')) {
      return <Navigate to="/performance" replace />;
    }
    return (
<>
        <PaymentPage user={user} onUserUpdate={handleUserUpdate} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Account status based on 3-state model ──
  const accountStatus = user?.accountStatus || 'active'; // 'active' | 'grace' | 'suspended'
  const planExpired   = authed && !isAdmin && user && accountStatus !== 'active';
  // ── Suspended: show full suspension page ──
  if (authed && !isAdmin && user && accountStatus === 'suspended') {
    // Allow support and pay pages even when suspended
    if (location.pathname === '/support' || location.pathname.startsWith('/pay')) {
      // fall through to render normally
    } else {
      return (
        <Suspense fallback={null}>
          <AccountSuspended user={user} onLogout={async () => { await axios.post(`${API_URL}/api/users/logout`, {}, { withCredentials: true }); window.location.href = '/login'; }} />
        </Suspense>
      );
    }
  }

  // ── Verification gate for unverified free-trial users ──
  const needsVerification = authed && !isAdmin && user && user.plan === 'free_trial' && user.trialVerified === false;
  if (needsVerification && location.pathname !== '/pay' && location.pathname !== '/complete-profile') {
    const intendedPlan = sessionStorage.getItem('sm_intended_plan');
    if (intendedPlan && ['bronze', 'silver', 'gold'].includes(intendedPlan)) {
      navigate(`/pay?plan=${intendedPlan}`);
    } else {
      navigate('/pay?plan=select');
    }
    return null;
  }

  // Authenticated — sidebar layout
  return (
    <div className="app-layout">
      <Sidebar
        onLogout={handleLogout}
        user={user}
        isAdmin={isAdmin}
        open={sidebarOpen}
        setOpen={setSidebarOpen}
        onBell={handleBell}
        unreadCount={unreadCount}
      />
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onClear={async () => { await clearNotifications(); setNotifications([]); }}
      />

      <div className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <UWLogo size={30} />
            <span>UptimeForge</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!isAdmin && (
              <button className="sb-bell" onClick={handleBell} aria-label="Notifications" style={{ position:'relative' }}>
                <IcoBell />
                {unreadCount > 0 && <span className="sb-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
            )}
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <IcoMenu />
            </button>
          </div>
        </div>

<TrialBanner user={user} />

        <main className="content">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/verify-account" element={<VerifyAccount user={user} />} />
              <Route path="/complete-profile" element={<CompleteProfile user={user} onComplete={handleUserUpdate} />} />
              <Route path="/monitoring" element={<Dashboard readOnly={planExpired} />} />
              <Route path="/dashboard" element={<Navigate to="/monitoring" replace />} />
              <Route path="/alerts" element={<Navigate to="/incidents" replace />} />
              <Route path="/charts" element={<Navigate to="/performance" replace />} />
              <Route path="/servers" element={<Servers user={user} isAdmin={isAdmin} onNotify={loadNotifications} readOnly={planExpired} />} />
              <Route path="/incidents" element={<Alerts />} />
              <Route path="/server-resources" element={isAdmin ? <Resources /> : <Dashboard />} />
              <Route path="/domain-ssl" element={!user || user.plan !== 'free_trial' || freeAccess.domainSsl ? <DomainSSL /> : <UpgradeGate user={user} feature="Domain & SSL Monitoring" />} />
              <Route path="/performance"     element={!user || user.plan !== 'free_trial' || freeAccess.charts    ? <Charts theme={theme} user={user} />   : <UpgradeGate user={user} feature="Performance Charts" />} />
              <Route path="/email" element={isAdmin ? <EmailPage /> : <Dashboard />} />
              <Route path="/whatsapp" element={isAdmin ? <WhatsAppPage /> : <Dashboard />} />
              <Route path="/account" element={<Account user={user} onUserUpdate={handleUserUpdate} />} />
              {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
              {isAdmin && <Route path="/admin-profile" element={<AdminPanel initialTab="profile" />} />}
              {isAdmin && <Route path="/plan-settings" element={<PlanSettings />} />}
              {isAdmin && <Route path="/annual-plans" element={<AnnualPlans />} />}
              {isAdmin && <Route path="/feature-access" element={<FeatureAccess />} />}
              {isAdmin && <Route path="/integration-backend" element={<IntegrationBackend />} />}
              {isAdmin && <Route path="/redis-cache" element={<RedisCache />} />}
              {isAdmin && <Route path="/plan-canceling" element={<PlanCanceling />} />}
              {isAdmin && <Route path="/support-tickets" element={<SupportTickets />} />}
              {isAdmin && <Route path="/users-list"    element={<UsersList />} />}
              {isAdmin && <Route path="/deleted-users" element={<DeletedUsers />} />}
              {isAdmin && <Route path="/staff-management" element={<StaffManagement />} />}
              <Route path="/site/:id" element={<SiteDetail />} />
              <Route path="/add-monitor" element={<AddMonitor user={user} />} />
              <Route path="/integrations" element={<Integrations user={user} freeAccess={freeAccess} bronzeAccess={bronzeAccess} silverAccess={silverAccess} goldAccess={goldAccess} />} />
              <Route path="/reports" element={(() => {
                  const planAcc = { free_trial: freeAccess, bronze: bronzeAccess, silver: silverAccess, gold: goldAccess };
                  const acc = user?.plan ? planAcc[user.plan] : null;
                  return acc && acc.reports === false ? <UpgradeGate user={user} feature="Weekly / Monthly Reports" /> : <Reports />;
              })()} />
              <Route path="/ping" element={(() => {
                  const planAcc = { free_trial: freeAccess, bronze: bronzeAccess, silver: silverAccess, gold: goldAccess };
                  const acc = user?.plan ? planAcc[user.plan] : null;
                  const blocked = acc && acc.pingMonitor === false;
                  return blocked ? <UpgradeGate user={user} feature="Ping Monitor" /> : <PingMonitor />;
              })()} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/support" element={<ContactSupport user={user} />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </main>

        <footer className="app-footer">
          <div className="footer-container">
            <div className="footer-left">
              <div className="status-indicator">
                <span className="status-dot"></span>
                <span className="status-text">All systems operational</span>
              </div>
              <span className="footer-copyright">
                © {new Date().getFullYear()} UptimeForge.in – <Link to="/terms">Privacy Policy</Link> | <Link to="/terms">Terms &amp; Conditions</Link>
              </span>
            </div>
            <div className="footer-right">
              <span className="footer-version">v1.0.0</span>
              <span className="footer-divider">•</span>
              <span className="footer-region">Asia-South1 (Mumbai)</span>
            </div>
          </div>
        </footer>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/staff-login" element={<StaffLogin />} />
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/confirm-delete" element={<ConfirmDelete />} />
          <Route path="/staff/*" element={<StaffDashboard />} />
          <Route path="/*" element={<><AppInner /><CookieConsent /></>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
