import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';
import { sendRegisterOtp, verifyRegisterOtp, googleAuth } from '../api';
import { getGoogleClientId } from '../googleConfig';
import UWLogo from '../components/UWLogo';

let gsiReady = false;

const EyeOpen = () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const EyeClosed = () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/></svg>;

function OtpInput({ value, onChange }) {
  const inputs = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');
  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = (value + '      ').slice(0, 6).split('');
    arr[i] = val;
    onChange(arr.join('').trimEnd());
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i]?.trim() && i > 0) inputs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  };
  return (
    <div className="otp-boxes">
      {digits.map((d, i) => (
        <input key={i} ref={el => inputs.current[i] = el}
          className="otp-box" type="text" inputMode="numeric" maxLength={1}
          value={d.trim()} onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)} onPaste={handlePaste} autoFocus={i === 0} />
      ))}
    </div>
  );
}

function Countdown({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onDone]);
  return <span className="otp-countdown">{left}s</span>;
}

export default function Register({ onRegister }) {
  const location = useLocation();
  // Capture referral code from URL ?ref=UF-2026-XXXXX
  const refCode = new URLSearchParams(location.search).get('ref') || localStorage.getItem('uf_ref') || '';
  if (refCode) localStorage.setItem('uf_ref', refCode);
  const storedPlan = localStorage.getItem('sm_intended_plan');
  const defaultPlan = location.state?.intendedPlan || storedPlan || 'free_trial';

  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', state: '', country: 'India' });
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const googleBtnRef = useRef(null);
  const selectedPlanRef = useRef(selectedPlan);
  useEffect(() => { selectedPlanRef.current = selectedPlan; }, [selectedPlan]);

  const handleGoogleResponse = async (response) => {
    setError('');
    try {
      const res = await googleAuth({ credential: response.credential });
      // token now in httpOnly cookie;
      localStorage.setItem('sm_user', JSON.stringify(res.data.user));
      onRegister(res.data.user, selectedPlanRef.current);
    } catch (e) { setError(e.response?.data?.error || 'Google Sign-In failed'); }
  };

  useEffect(() => {
    (async () => {
      const clientId = await getGoogleClientId();
      if (!clientId || !window.google || !googleBtnRef.current) return;
      if (!gsiReady) {
        gsiReady = true;
        window.google.accounts.id.initialize({ client_id: clientId, callback: handleGoogleResponse });
      }
      const w = googleBtnRef.current.offsetWidth || 480;
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard', theme: 'outline', size: 'large', width: w,
      });
    })();
  }, []);

  const sendOtp = async (e) => {
    e?.preventDefault(); setError('');
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.phone || form.phone.replace(/\D/g,'').length < 10) { setError('Enter valid 10-digit mobile number'); return; }
    if (!form.state) { setError('State is required'); return; }
    setLoading(true);
    try {
      const phoneFormatted = '91' + form.phone.replace(/\D/g,'').slice(-10);
      await sendRegisterOtp({ ...form, phone: phoneFormatted, referredBy: refCode || undefined });
      setStep(2); setCanResend(false);
    } catch (err) { setError(err.response?.data?.error || 'Failed to send OTP'); }
    setLoading(false);
  };

  const resendOtp = async () => {
    setResending(true); setError('');
    try { await sendRegisterOtp({ ...form }); setOtp(''); setCanResend(false); }
    catch (err) { setError(err.response?.data?.error || 'Failed to resend OTP'); }
    setResending(false);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    if (otp.trim().length < 6) { setError('Enter the 6-digit OTP'); return; }
    setError(''); setLoading(true);
    try {
      const res = await verifyRegisterOtp({ email: form.email, otp: otp.trim() });
      // token now in httpOnly cookie;
      localStorage.setItem('sm_user', JSON.stringify(res.data.user));
      localStorage.removeItem('uf_ref'); // clear referral after use
      onRegister(res.data.user, selectedPlan);
    } catch (err) { setError(err.response?.data?.error || 'Verification failed'); }
    setLoading(false);
  };

  return (
    <div className="reg-page">

      {/* ── LEFT PANEL ── */}
      <div className="reg-left">
        <div className="reg-left-orb reg-orb-1" />
        <div className="reg-left-orb reg-orb-2" />
        <div className="reg-left-inner">
          <a href={LANDING_URL} className="reg-brand">
            <UWLogo size={38} />
            <span>UptimeForge</span>
          </a>

          <div className="reg-left-body">
            <div className="reg-left-badge">Free 5-day trial</div>
            <h2 className="reg-left-h2">Monitor every site.<br/>Get alerted instantly.</h2>
            <p className="reg-left-p">Set up in under a minute. No credit card needed.</p>

            <div className="reg-features">
              {[
                { icon: '⚡', text: 'Checks every 30s – 5min (plan-based)' },
                { icon: '🔔', text: 'WhatsApp & Email alerts' },
                { icon: '🔒', text: 'SSL & Domain expiry tracking' },
                { icon: '📊', text: 'Performance charts & history' },
                { icon: '🌐', text: 'Multi-site monitoring' },
              ].map(f => (
                <div key={f.text} className="reg-feat-row">
                  <div className="reg-feat-icon">{f.icon}</div>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>

            <div className="reg-plan-preview">
              {[
                { name: 'Bronze', price: '₹499', sites: '5 sites', color: '#b45309' },
                { name: 'Silver', price: '₹999', sites: '15 sites', color: '#7c3aed', hot: true },
                { name: 'Gold',   price: '₹1499', sites: '30 sites', color: '#ca8a04' },
              ].map(p => (
                <div key={p.name} className={`reg-pp-card${p.hot ? ' reg-pp-hot' : ''}`} style={{ borderColor: p.hot ? p.color : undefined }}>
                  {p.hot && <div className="reg-pp-badge">Popular</div>}
                  <div className="reg-pp-name" style={{ color: p.color }}>{p.name}</div>
                  <div className="reg-pp-price">{p.price}<span>/mo</span></div>
                  <div className="reg-pp-sites">{p.sites}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="reg-left-footer">© 2026 UptimeForge</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="reg-right">
        <div className="reg-form-wrap">

          <a href={LANDING_URL} className="login-back">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back to home
          </a>

          {/* Step indicator */}
          <div className="reg-steps">
            <div className={`reg-step ${step >= 1 ? 'reg-step-done' : ''}`}>
              <div className="reg-step-dot">{step > 1 ? '✓' : '1'}</div>
              <span>Your Info</span>
            </div>
            <div className="reg-step-line" />
            <div className={`reg-step ${step >= 2 ? 'reg-step-done' : ''}`}>
              <div className="reg-step-dot">2</div>
              <span>Verify Email</span>
            </div>
          </div>

          {step === 1 ? (
            <>
              <h1 className="reg-title">Create your account</h1>

              {/* Google button */}
              <div className="reg-google-wrap">
                <div ref={googleBtnRef} />
              </div>

              <div className="login-divider"><span>or sign up with email</span></div>

              <form onSubmit={sendOtp} className="reg-form">

                {/* Referral banner */}
                {refCode && (
                  <div style={{ background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18 }}>🎁</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>Referral code applied!</div>
                      <div style={{ fontSize:11, color:'#166534' }}>Get <strong>10 extra days FREE</strong> when you purchase any paid plan.</div>
                    </div>
                  </div>
                )}

                {/* Full Name */}
                <div className="reg-field">
                  <label className="reg-label">Full Name <span className="reg-req">*</span></label>
                  <input className="reg-input" type="text" placeholder="Your full name"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
                </div>

                {/* Email */}
                <div className="reg-field">
                  <label className="reg-label">Email Address <span className="reg-req">*</span></label>
                  <input className="reg-input" type="email" placeholder="you@example.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>

                {/* Password */}
                <div className="reg-field">
                  <label className="reg-label">Password <span className="reg-req">*</span></label>
                  <div className="reg-pass-wrap">
                    <input className="reg-input" type={showPass ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                      style={{ paddingRight: 40 }} />
                    <button type="button" className="login-eye" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                </div>

                <div className="reg-field">
                  <label className="reg-label">Mobile Number <span className="reg-req">*</span></label>
                  <input className="reg-input" type="tel" placeholder="10-digit mobile number"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g,'').slice(0,10) })}
                    maxLength={10} />
                </div>

                <div className="reg-field">
                  <label className="reg-label">State / Province <span className="reg-req">*</span></label>
                  <input className="reg-input" type="text" placeholder="e.g. Gujarat, Maharashtra"
                    value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>

                {error && <div className="login-error-box">{error}</div>}

                <button className="reg-submit" type="submit" disabled={loading}>
                  {loading ? <><span className="login-spinner" /> Sending OTP...</> : 'Send OTP →'}
                </button>

                <p className="reg-signin-row">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="reg-otp-icon">📧</div>
              <h1 className="reg-title">Check your email</h1>
              <p className="reg-otp-sub">We sent a 6-digit code to</p>
              <div className="reg-otp-email">{form.email}</div>

              <form onSubmit={verifyOtp} className="reg-form" style={{ marginTop: 24 }}>
                <label className="reg-label" style={{ textAlign: 'center', display: 'block', marginBottom: 12 }}>
                  Enter 6-digit OTP
                </label>
                <OtpInput value={otp} onChange={setOtp} />

                {error && <div className="login-error-box" style={{ marginTop: 12 }}>{error}</div>}

                <button className="reg-submit" type="submit" disabled={loading || otp.trim().length < 6} style={{ marginTop: 20 }}>
                  {loading ? <><span className="login-spinner" /> Verifying...</> : 'Verify & Create Account ✓'}
                </button>

                <div className="otp-resend-row" style={{ marginTop: 16 }}>
                  {canResend ? (
                    <button type="button" className="otp-resend-btn" onClick={resendOtp} disabled={resending}>
                      {resending ? 'Sending...' : '↺ Resend OTP'}
                    </button>
                  ) : (
                    <span className="otp-resend-text">Resend in <Countdown seconds={60} onDone={() => setCanResend(true)} /></span>
                  )}
                  <button type="button" className="otp-back-btn" onClick={() => { setStep(1); setError(''); setOtp(''); }}>
                    ← Change email
                  </button>
                </div>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
