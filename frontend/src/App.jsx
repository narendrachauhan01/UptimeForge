import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import UWLogo from './components/UWLogo';
import CookieConsent from './components/CookieConsent';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Recipients from './pages/Recipients';
import WhatsAppPage from './pages/WhatsApp';
import Alerts from './pages/Alerts';
import DomainSSL from './pages/DomainSSL';
import Charts from './pages/Charts';
import EmailPage from './pages/Email';
import Resources from './pages/Resources';
import PlanSettings from './pages/PlanSettings';
import FeatureAccess from './pages/FeatureAccess';
import PingMonitor from './pages/PingMonitor';
import SiteDetail from './pages/SiteDetail';
import AddMonitor from './pages/AddMonitor';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import Landing from './pages/Landing';
import Account from './pages/Account';
import AdminPanel from './pages/AdminPanel';
import VerifyAccount from './pages/VerifyAccount';
import PaymentPage from './pages/PaymentPage';
import CompleteProfile from './pages/CompleteProfile';
import TermsOfService from './pages/TermsOfService';
import { API_URL, getNotifications, markNotificationsRead, getPlans } from './api';
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
const IcoIncident = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoMenu    = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;

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

function Sidebar({ onLogout, user, isAdmin, open, setOpen, onBell, unreadCount }) {
  const location = useLocation();
  useEffect(() => setOpen(false), [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const links = isAdmin ? [
    { to: '/admin-profile',        label: 'My Profile',    icon: <IcoProfile /> },
    { to: '/admin',                label: 'Admin Panel',   icon: <IcoAdmin /> },
    { to: '/plan-settings',         label: 'Plan Settings',    icon: <IcoSettings /> },
    { to: '/feature-access',        label: 'Feature Access',   icon: <IcoToggle /> },
    { to: '/server-resources',     label: 'Infra',         icon: <IcoServer /> },
    { to: '/email',                label: 'Email',         icon: <IcoMail /> },
    { to: '/whatsapp',             label: 'WhatsApp',      icon: <IcoWa /> },
  ] : [
    { to: '/dashboard',  label: 'Monitoring',   icon: <IcoDash /> },
    { to: '/charts',     label: 'Performance',  icon: <IcoChart /> },
    { to: '/domain-ssl', label: 'Domain & SSL', icon: <IcoLock /> },
    { to: '/ping',       label: 'Ping Monitor', icon: <IcoPing /> },
    { to: '/account',    label: 'My Plan',      icon: <IcoPlan /> },
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
        </div>

        {/* Nav links */}
        <nav className="sb-nav">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/dashboard'}
              className={({ isActive }) => `sb-link${isActive ? ' sb-active' : ''}`}
            >
              {l.icon}
              <span>{l.label}</span>
            </NavLink>
          ))}
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
          {isAdmin && <div className="sb-user"><div className="sb-avatar sb-avatar-admin">A</div><div className="sb-user-info"><div className="sb-user-name">Admin</div><div className="sb-user-email">Full access</div></div></div>}
          <button className="sb-logout" onClick={onLogout}>
            <IcoLogout /> Logout
          </button>
        </div>

      </aside>
    </>
  );
}

function TrialBanner({ user }) {
  if (!user || user.plan !== 'free_trial') return null;
  const days = user.trialDaysLeft ?? 0;
  if (!user.isActive) {
    return (
      <div className="trial-banner trial-expired">
        Your free trial has expired.{' '}
        <Link to="/account" className="trial-banner-link">Upgrade now to continue</Link>
      </div>
    );
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

function UpgradeGate({ user, feature, children }) {
  if (!user || user.plan !== 'free_trial') return children;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:320, padding:40, textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h2 style={{ fontSize:20, fontWeight:800, color:'#1e1b4b', margin:'0 0 8px' }}>{feature} — Paid Plans Only</h2>
      <p style={{ fontSize:14, color:'#64748b', maxWidth:360, lineHeight:1.7, margin:'0 0 24px' }}>
        This feature is not available on the Free Trial. Upgrade to Bronze, Silver, or Gold to unlock it.
      </p>
      <Link to="/account" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', padding:'12px 28px', borderRadius:12, fontWeight:700, fontSize:14, textDecoration:'none' }}>
        Upgrade Plan →
      </Link>
    </div>
  );
}

function AppInner() {
  const [authed, setAuthed] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [freeAccess, setFreeAccess] = useState({ domainSsl: true, charts: true, pingMonitor: true });
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
    getPlans().then(r => { if (r.data.freeTrialAccess) setFreeAccess(r.data.freeTrialAccess); }).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!token) { setAuthed(false); return; }

    const savedUser = localStorage.getItem('sm_user');
    if (savedUser) {
      try {
        JSON.parse(savedUser);
        axios.get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => {
            setUser(r.data);
            localStorage.setItem('sm_user', JSON.stringify(r.data));
            setIsAdmin(false);
            setAuthed(true);
          })
          .catch(() => { localStorage.removeItem('sm_token'); localStorage.removeItem('sm_user'); setAuthed(false); });
        return;
      } catch (_) {}
    }

    axios.get(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => { setIsAdmin(true); setAuthed(true); })
      .catch(() => { localStorage.removeItem('sm_token'); setAuthed(false); });
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
      navigate('/complete-profile');
      showToast('Welcome to UptimeForge! Complete your profile to get started.');
    } else {
      navigate('/dashboard');
      showToast('Login successful! Welcome back.');
    }
  };

  const handleRegister = (userData, planKey) => {
    setUser(userData);
    setIsAdmin(false);
    setAuthed(true);
    if (planKey && ['bronze', 'silver', 'gold'].includes(planKey)) {
      localStorage.setItem('sm_intended_plan', planKey);
      navigate(`/pay?plan=${planKey}`);
    } else {
      navigate('/pay?plan=verification');
    }
  };

  const handleUserUpdate = (userData) => {
    setUser(userData);
    localStorage.setItem('sm_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
    setAuthed(false); setUser(null); setIsAdmin(false);
    showToast('Logged out successfully.');
    navigate('/');
  };

  useEffect(() => {
    if (!authed) return;
    let timer;
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleLogout, 15 * 60 * 1000); };
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleRegister} />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  if (authed && isPublicPath && location.pathname !== '/' && location.pathname !== '/terms') {
    navigate(isAdmin ? '/admin' : '/dashboard');
    return null;
  }

  if (authed && location.pathname === '/terms') {
    return <TermsOfService />;
  }

  if (authed && location.pathname === '/') {
    return (
      <>
        <Landing />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  if (!authed) {
    return (
      <>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onRegister={handleRegister} />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login onLogin={handleLogin} />} />
        </Routes>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Profile completion gate for all users without state/phone ──
  const needsProfile = authed && !isAdmin && user && !user.state;
  if (needsProfile && location.pathname !== '/complete-profile') {
    navigate('/complete-profile');
    return null;
  }
  if (authed && location.pathname === '/complete-profile') {
    return (
      <>
        <CompleteProfile user={user} onUserUpdate={handleUserUpdate} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Full-screen payment page (no sidebar) ──
  if (authed && location.pathname === '/pay') {
    const payPlan = new URLSearchParams(location.search).get('plan');
    // Already verified → skip verification page, go to dashboard
    if (payPlan === 'verification' && user && (user.trialVerified || user.plan !== 'free_trial')) {
      navigate('/dashboard');
      return null;
    }
    return (
      <>
        <PaymentPage user={user} onUserUpdate={handleUserUpdate} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  // ── Verification gate for unverified free-trial users ──
  const needsVerification = authed && !isAdmin && user && user.plan === 'free_trial' && user.trialVerified === false;
  if (needsVerification && location.pathname !== '/pay') {
    const intendedPlan = localStorage.getItem('sm_intended_plan');
    if (intendedPlan && ['bronze', 'silver', 'gold'].includes(intendedPlan)) {
      navigate(`/pay?plan=${intendedPlan}`);
    } else {
      navigate('/pay?plan=verification');
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
      />

      <div className="app-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <UWLogo size={30} />
            <span>UptimeForge</span>
          </div>
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <IcoMenu />
          </button>
        </div>

        <TrialBanner user={user} />

        <main className="content">
          <Routes>
            <Route path="/verify-account" element={<VerifyAccount user={user} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/servers" element={<Servers user={user} isAdmin={isAdmin} onNotify={loadNotifications} />} />
            <Route path="/recipients" element={<Recipients />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/server-resources" element={isAdmin ? <Resources /> : <Dashboard />} />
            <Route path="/domain-ssl" element={!user || user.plan !== 'free_trial' || freeAccess.domainSsl ? <DomainSSL /> : <UpgradeGate user={user} feature="Domain & SSL Monitoring"><DomainSSL /></UpgradeGate>} />
            <Route path="/charts"     element={!user || user.plan !== 'free_trial' || freeAccess.charts    ? <Charts />   : <UpgradeGate user={user} feature="Performance Charts"><Charts /></UpgradeGate>} />
            <Route path="/email" element={isAdmin ? <EmailPage /> : <Dashboard />} />
            <Route path="/whatsapp" element={isAdmin ? <WhatsAppPage /> : <Dashboard />} />
            <Route path="/account" element={<Account user={user} onUserUpdate={handleUserUpdate} />} />
            {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
            {isAdmin && <Route path="/admin-profile" element={<AdminPanel initialTab="profile" />} />}
            {isAdmin && <Route path="/plan-settings" element={<PlanSettings />} />}
            {isAdmin && <Route path="/feature-access" element={<FeatureAccess />} />}
            <Route path="/site/:id" element={<SiteDetail />} />
            <Route path="/add-monitor" element={<AddMonitor />} />
            <Route path="/ping" element={!user || user.plan !== 'free_trial' || freeAccess.pingMonitor ? <PingMonitor /> : <UpgradeGate user={user} feature="Ping Monitor"><PingMonitor /></UpgradeGate>} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="footer-bottom">
            <span>© 2026 All rights reserved — Built & managed by <strong>Narendra Singh</strong> — DevOps Engineer</span>
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
      <AppInner />
      <CookieConsent />
    </BrowserRouter>
  );
}
