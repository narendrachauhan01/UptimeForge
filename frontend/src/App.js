import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Servers from './pages/Servers';
import Recipients from './pages/Recipients';
import WhatsAppPage from './pages/WhatsApp';
import Alerts from './pages/Alerts';
import DomainSSL from './pages/DomainSSL';
import Charts from './pages/Charts';
import EmailPage from './pages/Email';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { API_URL } from './api';
import Toast from './components/Toast';
import './App.css';

function Navbar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  React.useEffect(() => setOpen(false), [location]);

  const links = [
    { to: '/charts', label: 'Analytics' },
    { to: '/', label: 'Dashboard' },
    { to: '/servers', label: 'Servers' },
    { to: '/recipients', label: 'Recipients' },
    { to: '/alerts', label: 'Alerts' },
    { to: '/domain-ssl', label: 'Domain & SSL' },
    { to: '/email', label: 'Email' },
    { to: '/whatsapp', label: 'WhatsApp' },
  ];

  return (
    <nav className="navbar">
      <Link to="/charts" className="nav-brand"><div className="nav-logo">SM</div><span>Server Monitor</span></Link>
      <button className="nav-hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <div className={`nav-links ${open ? 'nav-open' : ''}`}>
        <div className="nav-mobile-header">
          <span className="nav-mobile-brand">SM Menu</span>
          <button className="nav-close-btn" onClick={() => setOpen(false)}>✕</button>
        </div>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setOpen(false)}>
            {l.label}
          </NavLink>
        ))}
        <button className="nav-logout" onClick={onLogout}>Logout</button>
      </div>
      {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}
    </nav>
  );
}

function AppInner() {
  const [authed, setAuthed] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const token = localStorage.getItem('sm_token');
    if (!token) { setAuthed(false); return; }
    axios.get(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setAuthed(true))
      .catch(() => { localStorage.removeItem('sm_token'); setAuthed(false); });
  }, []);

  const handleLogin = () => {
    setAuthed(true);
    navigate('/');
    showToast('Login successful! Welcome back.');
  };

  const handleLogout = () => {
    localStorage.removeItem('sm_token');
    setAuthed(false);
    showToast('Logged out successfully.');
  };

  // Auto logout after 15 min of inactivity
  useEffect(() => {
    if (!authed) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        handleLogout();
      }, 15 * 60 * 1000); // 15 minutes
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authed === null) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontSize: 32 }}>⏳</div>
    </div>
  );

  if (window.location.pathname === '/reset-password') return <ResetPassword />;

  if (!authed) return (
    <>
      <Login onLogin={handleLogin} />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );

  return (
    <div className="app">
      <Navbar onLogout={handleLogout} />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/recipients" element={<Recipients />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/domain-ssl" element={<DomainSSL />} />
          <Route path="/charts" element={<Charts />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/whatsapp" element={<WhatsAppPage />} />
        </Routes>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <footer className="app-footer">
        <div className="footer-bottom">
          <span>© 2026 All rights reserved — Built & managed by <strong>Narendra Singh</strong> — DevOps Engineer</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
