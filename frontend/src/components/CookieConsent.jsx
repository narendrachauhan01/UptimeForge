import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('uf_cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('uf_cookie_consent', 'accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem('uf_cookie_consent', 'rejected');
    // Clear non-essential storage on reject
    localStorage.removeItem('sm_token');
    localStorage.removeItem('sm_user');
    localStorage.removeItem('sm_intended_plan');
    setVisible(false);
    window.location.href = '/';
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1e1b4b', borderTop: '1px solid rgba(124,58,237,0.3)',
      padding: '16px 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>
          We use cookies to keep you logged in and improve your experience.
          By accepting, you agree to our use of essential cookies.{' '}
          <a href="/terms" style={{ color: '#a78bfa', textDecoration: 'underline' }}>Learn more</a>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={reject} style={{
          padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: '#94a3b8', fontSize: 13,
          cursor: 'pointer', fontWeight: 600,
        }}>
          Reject
        </button>
        <button onClick={accept} style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff',
          fontSize: 13, cursor: 'pointer', fontWeight: 700,
          boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
        }}>
          Accept All
        </button>
      </div>
    </div>
  );
}
