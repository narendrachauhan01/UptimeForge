import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api';
import UWLogo from '../components/UWLogo';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';

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

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    if (newPassword !== confirm) return setError('Passwords do not match');
    setLoading(true);
    try {
      await resetPassword({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (e) {
      setError(e.response?.data?.error || 'Reset failed. Link may have expired.');
    }
    setLoading(false);
  };

  return (
    <div className="reset-page">
      <div className="reset-wrap">
        <a href={LANDING_URL} className="reset-brand">
          <UWLogo size={36} />
          <span>UptimeForge</span>
        </a>

        <div className="reset-card">
          {done ? (
            <div className="reset-done">
              <div className="reset-done-icon">✓</div>
              <h2>Password Reset!</h2>
              <p>Your password has been updated. Redirecting to login...</p>
            </div>
          ) : !token ? (
            <div className="reset-done">
              <div style={{fontSize:40,marginBottom:12}}>⚠️</div>
              <h2>Invalid Link</h2>
              <p>This reset link is invalid or has expired.</p>
              <Link to="/login" className="login-submit" style={{display:'inline-flex',marginTop:16,textDecoration:'none',justifyContent:'center'}}>Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="reset-lock">🔐</div>
              <h2 className="reset-h2">Set New Password</h2>
              <p className="reset-sub">Enter a new password for your account.</p>
              <form onSubmit={handleSubmit} className="reset-form">
                <div className="login-field">
                  <label className="login-label">New Password</label>
                  <div className="login-pass-wrap">
                    <input
                      className="login-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoFocus
                      style={{paddingRight:44}}
                    />
                    <button type="button" className="login-eye" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeClosed /> : <EyeOpen />}
                    </button>
                  </div>
                </div>
                <div className="login-field">
                  <label className="login-label">Confirm Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                  />
                </div>
                {error && <div className="login-error-box">{error}</div>}
                <button className="login-submit" type="submit" disabled={loading}>
                  {loading ? <><span className="login-spinner" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
              <div style={{textAlign:'center',marginTop:16}}>
                <Link to="/login" className="login-forgot">Back to Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
