import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL, loginUser, googleAuth, forgotPassword } from '../api';
import Toast from '../components/Toast';
import UWLogo from '../components/UWLogo';

const EyeOpen = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>
  </svg>
);

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('user');
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [toast, setToast] = useState(null);
  const [gLoading, setGLoading] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = async (response) => {
    setGLoading(true);
    setError('');
    try {
      const res = await googleAuth({ credential: response.credential });
      localStorage.setItem('sm_token', res.data.token);
      localStorage.setItem('sm_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || 'Google Sign-In failed');
    }
    setGLoading(false);
  };

  const handleGoogleClick = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId.includes('your_google')) {
      setError('Google Sign-In not configured yet. Add VITE_GOOGLE_CLIENT_ID to .env');
      return;
    }
    if (!window.google) { setError('Google Sign-In script not loaded'); return; }
    setGLoading(true);
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleResponse, ux_mode: 'popup' });
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One Tap suppressed — fall back to renderButton popup
        setGLoading(false);
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard', theme: 'outline', size: 'large', width: googleBtnRef.current.offsetWidth,
          });
          googleBtnRef.current.querySelector('div[role=button]')?.click();
        }
      }
    });
  };

  const handleUserForgot = async () => {
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      await forgotPassword({ email: forgotEmail });
      setForgotSent(true);
    } catch (e) {
      setToast({ message: e.response?.data?.error || 'Failed to send reset email', type: 'error' });
    }
    setForgotLoading(false);
  };

  const handleForgot = async () => {
    setForgotLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`);
      setForgotSent(true);
      setToast({ message: 'Reset link sent to admin email!', type: 'success' });
    } catch (e) {
      setToast({ message: e.response?.data?.error || 'Failed to send reset email', type: 'error' });
    }
    setForgotLoading(false);
  };

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password required'); return; }
    setLoading(true);
    try {
      const res = await loginUser({ email: form.email, password: form.password });
      localStorage.setItem('sm_token', res.data.token);
      localStorage.setItem('sm_user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.password) { setError('Username and password required'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { username: form.username, password: form.password });
      localStorage.setItem('sm_token', res.data.token);
      localStorage.removeItem('sm_user');
      onLogin(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="login-split">

      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div className="login-left-orb login-orb-1" />
        <div className="login-left-orb login-orb-2" />
        <div className="login-left-content">
          <Link to="/" className="login-left-brand">
            <UWLogo size={42} />
            <span>UptimeForge</span>
          </Link>

          <div className="login-left-body">
            <h2 className="login-left-h2">Monitor your sites.<br />Sleep peacefully.</h2>
            <p className="login-left-p">
              24/7 uptime monitoring with instant alerts via WhatsApp and Email.
            </p>

            <div className="login-left-features">
              {[
                ['🔔', 'Instant down alerts — WhatsApp & Email'],
                ['🔒', 'SSL & Domain expiry warnings'],
                ['📊', 'Performance charts & history'],
                ['⚡', 'Checks every 60 seconds'],
              ].map(([icon, text]) => (
                <div key={text} className="login-left-feat">
                  <div className="login-left-feat-icon">{icon}</div>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="login-left-preview">
              <div className="login-preview-row up">
                <div className="login-preview-dot green" />
                <span>myshop.com</span>
                <span className="login-preview-ms">⚡ 234ms</span>
                <span className="login-preview-badge up">Online</span>
              </div>
              <div className="login-preview-row down">
                <div className="login-preview-dot red pulse" />
                <span>api.staging.com</span>
                <span className="login-preview-ms" style={{color:'#fca5a5'}}>Alert sent!</span>
                <span className="login-preview-badge down">Down</span>
              </div>
              <div className="login-preview-row up">
                <div className="login-preview-dot green" />
                <span>blog.example.com</span>
                <span className="login-preview-ms">⚡ 512ms</span>
                <span className="login-preview-badge up">Online</span>
              </div>
            </div>
          </div>

          <div className="login-left-footer">© 2026 UptimeForge</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right">
        <div className="login-form-wrap">

          {/* Back to home */}
          <Link to="/" className="login-back">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to home
          </Link>

          <div className="login-right-logo"><UWLogo size={48} /></div>
          <h1 className="login-right-h1">Welcome back</h1>
          <p className="login-right-sub">Sign in to your dashboard</p>

          {/* Tabs */}
          <div className="login-right-tabs">
            <button
              className={`login-right-tab ${tab === 'user' ? 'active' : ''}`}
              onClick={() => { setTab('user'); setError(''); }}
            >
              User Login
            </button>
            <button
              className={`login-right-tab ${tab === 'admin' ? 'active' : ''}`}
              onClick={() => { setTab('admin'); setError(''); }}
            >
              Admin
            </button>
          </div>

          {/* User Login Form */}
          {tab === 'user' && (
            <form onSubmit={handleUserLogin} className="login-right-form">
              <div className="login-field">
                <label className="login-label">Email address</label>
                <input
                  className="login-input"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-pass-wrap">
                  <input
                    className="login-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{paddingRight: 44}}
                  />
                  <button type="button" className="login-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>
              {error && <div className="login-error-box">{error}</div>}
              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="login-spinner" /> Signing in...</>
                ) : 'Sign In'}
              </button>
              <div className="login-switch-row">
                <span>Don't have an account?</span>
                <Link to="/register">Create one free</Link>
              </div>
              <div style={{textAlign:'center'}}>
                <button type="button" className="login-forgot" onClick={() => { setShowForgot(!showForgot); setForgotSent(false); setForgotEmail(''); }}>
                  Forgot password?
                </button>
              </div>
              {showForgot && !forgotSent && (
                <div className="login-forgot-form">
                  <input
                    className="login-input"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUserForgot()}
                    autoFocus
                  />
                  <button className="login-submit" type="button" onClick={handleUserForgot} disabled={forgotLoading} style={{marginTop:8}}>
                    {forgotLoading ? <><span className="login-spinner" /> Sending...</> : 'Send Reset Link'}
                  </button>
                </div>
              )}
              {forgotSent && (
                <div className="login-forgot-sent">✓ Reset link sent! Check your email.</div>
              )}

              <div className="login-divider"><span>or</span></div>
              <button type="button" className="google-signin-btn" onClick={handleGoogleClick} disabled={gLoading}>
                {gLoading ? (
                  <><span className="login-spinner" /> Signing in...</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    Continue with Google
                  </>
                )}
              </button>
              <div ref={googleBtnRef} style={{display:'none'}} />
            </form>
          )}

          {/* Admin Login Form */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="login-right-form">
              <div className="login-field">
                <label className="login-label">Admin Username</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Enter admin username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="login-field">
                <label className="login-label">Password</label>
                <div className="login-pass-wrap">
                  <input
                    className="login-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{paddingRight: 44}}
                  />
                  <button type="button" className="login-eye" onClick={() => setShowPass(!showPass)}>
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>
              {error && <div className="login-error-box">{error}</div>}
              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="login-spinner" /> Signing in...</>
                ) : 'Admin Sign In'}
              </button>
            </form>
          )}

        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
