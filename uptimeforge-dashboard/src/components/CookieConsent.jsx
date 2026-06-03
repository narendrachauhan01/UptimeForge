import React, { useState, useEffect } from 'react';
import { setCookie, getCookie } from '../utils/cookies';

const CookieIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cookie-svg">
    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="16" cy="15.5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="11" cy="17" r="1" fill="currentColor" />
    <circle cx="7" cy="14" r="1" fill="currentColor" />
  </svg>
);

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookie('uf_consent')) setVisible(true);
  }, []);

  const accept = () => {
    setCookie('uf_consent', 'accepted', 365);
    setVisible(false);
  };

  const reject = () => {
    setCookie('uf_consent', 'rejected', 365);
    sessionStorage.removeItem('sm_intended_plan');
    sessionStorage.removeItem('uf_ref');
    setVisible(false);
    window.location.href = '/';
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes cookieSlideUp {
          from {
            transform: translateY(120%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .cookie-banner {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999999;
          max-width: 420px;
          background: rgba(15, 12, 41, 0.75);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: cookieSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .cookie-content-wrapper {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .cookie-icon {
          background: rgba(124, 58, 237, 0.15);
          border: 1px solid rgba(124, 58, 237, 0.3);
          padding: 10px;
          border-radius: 12px;
          color: #c084fc;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: cookieWobble 4s ease-in-out infinite alternate;
        }

        @keyframes cookieWobble {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
          100% { transform: rotate(-10deg); }
        }

        .cookie-text {
          margin: 0;
          font-size: 14px;
          color: #cbd5e1;
          line-height: 1.6;
          font-family: inherit;
        }

        .cookie-link {
          color: #a78bfa;
          font-weight: 500;
          text-decoration: none;
          border-bottom: 1px dashed rgba(167, 139, 250, 0.6);
          transition: all 0.2s;
        }

        .cookie-link:hover {
          color: #c084fc;
          border-bottom-style: solid;
        }

        .cookie-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cookie-btn-reject {
          padding: 10px 22px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          color: #94a3b8;
          font-size: 13px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .cookie-btn-reject:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          color: #f1f5f9;
          transform: translateY(-1px);
        }

        .cookie-btn-accept {
          padding: 10px 24px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff;
          font-size: 13px;
          cursor: pointer;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
          transition: all 0.2s ease;
        }

        .cookie-btn-accept:hover {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
          box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
          transform: translateY(-1px);
        }

        .cookie-btn-accept:active, .cookie-btn-reject:active {
          transform: translateY(0);
        }

        @media (max-width: 500px) {
          .cookie-banner {
            bottom: 16px;
            left: 16px;
            right: 16px;
            max-width: none;
            padding: 20px;
            gap: 16px;
          }
          .cookie-content-wrapper {
            gap: 12px;
          }
        }
      `}</style>
      <div className="cookie-banner">
        <div className="cookie-content-wrapper">
          <div className="cookie-icon">
            <CookieIcon />
          </div>
          <div>
            <p className="cookie-text">
              We use cookies to keep you logged in and improve your experience.
              By accepting, you agree to our use of essential cookies.{' '}
              <a href="/terms" className="cookie-link">Learn more about our cookie policy</a>
            </p>
          </div>
        </div>
        <div className="cookie-buttons">
          <button onClick={reject} className="cookie-btn-reject">
            Reject
          </button>
          <button onClick={accept} className="cookie-btn-accept">
            Accept All
          </button>
        </div>
      </div>
    </>
  );
}
