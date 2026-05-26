import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UWLogo from '../components/UWLogo';
import { getPlans } from '../api';

const PLAN_META = {
  free_trial: { name: 'Free Trial', period: 'one-time', gradient: 'linear-gradient(135deg,#64748b,#475569)', cta: 'Start Free Trial', popular: false },
  bronze:     { name: 'Bronze',     period: '/month',   gradient: 'linear-gradient(135deg,#b45309,#d97706)', cta: 'Get Bronze',       popular: false },
  silver:     { name: 'Silver',     period: '/month',   gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)', cta: 'Get Silver',       popular: true  },
  gold:       { name: 'Gold',       period: '/month',   gradient: 'linear-gradient(135deg,#b45309,#ca8a04)', cta: 'Get Gold',         popular: false },
};

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [planData, setPlanData] = useState(null);

  useEffect(() => {
    getPlans().then(r => setPlanData(r.data)).catch(() => {});
  }, []);

  const plans = [
    {
      key: 'free_trial', ...PLAN_META.free_trial,
      price: `₹${planData?.verificationFee ?? 2}`,
      note: '5-day trial · one-time verification',
      features: planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures
        : ['2 sites monitored', 'WhatsApp & Email alerts', 'SSL & Domain expiry tracking', '60s uptime checks'],
    },
    {
      key: 'bronze', ...PLAN_META.bronze,
      price: `₹${planData?.plans?.bronze?.price ?? 499}`,
      note: `${planData?.plans?.bronze?.sites ?? 5} sites monitored`,
      features: planData?.plans?.bronze?.features?.length ? planData.plans.bronze.features
        : ['5 sites monitored', 'WhatsApp & Email alerts', 'SSL & Domain tracking', 'Performance charts'],
    },
    {
      key: 'silver', ...PLAN_META.silver,
      price: `₹${planData?.plans?.silver?.price ?? 999}`,
      note: `${planData?.plans?.silver?.sites ?? 15} sites monitored`,
      features: planData?.plans?.silver?.features?.length ? planData.plans.silver.features
        : ['15 sites monitored', 'WhatsApp & Email alerts', 'SSL & Domain tracking', 'Full analytics', 'Server monitoring'],
    },
    {
      key: 'gold', ...PLAN_META.gold,
      price: `₹${planData?.plans?.gold?.price ?? 1499}`,
      note: `${planData?.plans?.gold?.sites ?? 30} sites monitored`,
      features: planData?.plans?.gold?.features?.length ? planData.plans.gold.features
        : ['30 sites monitored', 'WhatsApp & Email alerts', 'SSL & Domain tracking', 'Advanced analytics', 'Priority support'],
    },
  ];

  const handlePlan = (key) => {
    if (key !== 'free_trial') localStorage.setItem('sm_intended_plan', key);
    else localStorage.removeItem('sm_intended_plan');
    navigate('/register');
  };

  return (
    <div className="lp">

      {/* ── NAVBAR ── */}
      <nav className="lp-nav">
        <div className="lp-nav-wrap">
          <Link to="/" className="lp-brand">
            <UWLogo size={34} />
            <span className="lp-brand-text">UptimeWatch</span>
          </Link>
          <div className="lp-nav-center">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-right">
            <Link to="/login" className="lp-nav-login">Login</Link>
            <Link to="/register" className="lp-nav-cta">Start Free →</Link>
          </div>
          <button className={`lp-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu">
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="lp-nav-cta" onClick={() => setMenuOpen(false)} style={{ textAlign: 'center' }}>Start Free Trial</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb lp-orb-1" />
          <div className="lp-hero-orb lp-orb-2" />
          <div className="lp-hero-orb lp-orb-3" />
        </div>
        <div className="lp-hero-wrap">
          <div className="lp-hero-left">
            <div className="lp-hero-tag">
              <span className="lp-tag-dot" />
              Live · 24/7 Uptime Monitoring
            </div>
            <h1 className="lp-hero-h1">
              Never miss a<br />
              <span className="lp-hero-gradient">website outage again.</span>
            </h1>
            <p className="lp-hero-p">
              Get instant <span className="lp-highlight-wa">WhatsApp</span> &amp; <span className="lp-highlight-em">Email</span> alerts the moment your site goes down. Track SSL expiry, domain renewal, and response time — all from one simple dashboard.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary" onClick={() => { localStorage.removeItem('sm_intended_plan'); navigate('/register'); }}>
                Start Free — Just ₹2
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <a href="#pricing" className="lp-btn-outline">View Plans</a>
            </div>
            <div className="lp-hero-trust">
              {['5-day free trial', 'Alerts in under 60 sec', 'WhatsApp + Email', 'No hidden charges'].map(t => (
                <div key={t} className="lp-trust-item"><span className="lp-trust-check">✓</span>{t}</div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lp-hero-right">
            <div className="lp-dashboard-preview">
              <div className="lp-preview-header">
                <div className="lp-preview-dot red" /><div className="lp-preview-dot yellow" /><div className="lp-preview-dot green" />
                <span className="lp-preview-title">UptimeWatch — Dashboard</span>
              </div>
              <div className="lp-preview-stats">
                <div className="lp-stat-chip total"><span className="lp-chip-num">6</span><span>Total</span></div>
                <div className="lp-stat-chip online"><span className="lp-chip-num">5</span><span>Online</span></div>
                <div className="lp-stat-chip offline"><span className="lp-chip-num">1</span><span>Offline</span></div>
              </div>
              <div className="lp-preview-sites">
                <div className="lp-site-row up">
                  <div className="lp-site-dot green" />
                  <div className="lp-site-info"><span>yourstore.in</span><span className="lp-site-meta">⚡ 189ms · 🔒 SSL 94d</span></div>
                  <span className="lp-site-badge up">Online</span>
                </div>
                <div className="lp-site-row down">
                  <div className="lp-site-dot red pulse" />
                  <div className="lp-site-info"><span>checkout.yourstore.in</span><span className="lp-site-meta" style={{ color: '#ef4444' }}>🚨 Down · Alert sent!</span></div>
                  <span className="lp-site-badge down">Offline</span>
                </div>
                <div className="lp-site-row up">
                  <div className="lp-site-dot green" />
                  <div className="lp-site-info"><span>mybusiness.com</span><span className="lp-site-meta">⚡ 341ms · 🌐 Domain 58d</span></div>
                  <span className="lp-site-badge up">Online</span>
                </div>
                <div className="lp-site-row warn">
                  <div className="lp-site-dot yellow" />
                  <div className="lp-site-info"><span>clientsite.in</span><span className="lp-site-meta" style={{ color: '#f59e0b' }}>⚠️ SSL expires in 7 days</span></div>
                  <span className="lp-site-badge warn">SSL Alert</span>
                </div>
              </div>
              <div className="lp-preview-alert">
                <div className="lp-alert-icon">📱</div>
                <div>
                  <div className="lp-alert-title">WhatsApp Alert Sent</div>
                  <div className="lp-alert-sub">checkout.yourstore.in is DOWN · 43 sec ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="lp-stats-bar">
        {[['60s', 'Check Interval'], ['24/7', 'Always On'], ['< 1 min', 'Alert Speed'], ['Email', '+ WhatsApp Alerts'], ['₹2', 'Trial Cost'], ['SSL & Domain', 'Expiry Tracking']].map(([v, l]) => (
          <div key={l} className="lp-stat-item">
            <div className="lp-stat-val">{v}</div>
            <div className="lp-stat-label">{l}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-wrap">
          <div className="lp-section-eyebrow">Features</div>
          <h2 className="lp-section-h2">Everything you need, nothing you don't</h2>
          <p className="lp-section-sub">Paste your URL and we handle the rest — no complex setup required.</p>
          <div className="lp-feat4-grid">
            {[
              { icon: '⏱️', color: '#7c3aed', bg: '#ede9fe', title: 'Uptime Monitoring', desc: 'We check your site every 60 seconds. If it goes down, you get a WhatsApp message and email within a minute.' },
              { icon: '🔒', color: '#0891b2', bg: '#e0f2fe', title: 'SSL Expiry Alerts', desc: 'Get warned 30, 15 and 7 days before your SSL certificate expires. Never wake up to a broken padlock again.' },
              { icon: '🌐', color: '#059669', bg: '#d1fae5', title: 'Domain Expiry Tracking', desc: 'We watch your domain renewal date and alert you in advance so you never lose a domain you own.' },
              { icon: '📊', color: '#d97706', bg: '#fef3c7', title: 'Performance Charts', desc: 'See response time graphs, uptime history and alert logs. Spot slow trends before they become outages.' },
            ].map(f => (
              <div key={f.title} className="lp-feat4-card">
                <div className="lp-feat4-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <h3 className="lp-feat4-title">{f.title}</h3>
                <p className="lp-feat4-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how" id="how">
        <div className="lp-section-wrap">
          <div className="lp-section-eyebrow">How It Works</div>
          <h2 className="lp-section-h2">Up and running in 3 steps</h2>
          <div className="lp-how3-grid">
            {[
              { icon: '📝', step: '01', title: 'Create Account', desc: 'Sign up with your name, email and mobile. Verify via OTP — takes 30 seconds.' },
              { icon: '🌐', step: '02', title: 'Add Your Sites', desc: 'Paste your website URLs. We start monitoring every 60 seconds immediately.' },
              { icon: '🔔', step: '03', title: 'Get Instant Alerts', desc: 'If anything goes wrong — site down, SSL expiring, domain renewal — you get a WhatsApp + email alert right away.' },
            ].map((s, i) => (
              <div key={s.step} className="lp-how3-card">
                <div className="lp-how3-num">{s.step}</div>
                <div className="lp-how3-icon">{s.icon}</div>
                <h3 className="lp-how3-title">{s.title}</h3>
                <p className="lp-how3-desc">{s.desc}</p>
                {i < 2 && <div className="lp-how3-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-wrap">
          <div className="lp-section-eyebrow">Pricing</div>
          <h2 className="lp-section-h2">Simple, honest pricing</h2>
          <p className="lp-section-sub">Start free for 5 days. Pay just ₹2 to verify. Upgrade anytime — plans activate instantly via UPI, Card or Netbanking.</p>
          <div className="lp-plans">
            {plans.map(p => (
              <div key={p.key} className={`lp-plan ${p.popular ? 'lp-plan-popular' : ''}`}>
                {p.popular && <div className="lp-plan-pop-badge">Most Popular</div>}
                <div className="lp-plan-top" style={{ background: p.gradient }}>
                  <div className="lp-plan-name">{p.name}</div>
                  <div className="lp-plan-price-row">
                    <span className="lp-plan-price">{p.price}</span>
                    <span className="lp-plan-period">{p.period}</span>
                  </div>
                  <div className="lp-plan-sites">{p.note}</div>
                </div>
                <div className="lp-plan-body">
                  <ul className="lp-plan-list">
                    {p.features.map(f => (
                      <li key={f}>
                        <svg width="15" height="15" fill="none" stroke="#7c3aed" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className="lp-plan-btn" style={{ background: p.gradient }} onClick={() => handlePlan(p.key)}>
                    {p.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-pricing-note">
            <span>💳 Pay via UPI · Card · Netbanking · Wallets</span>
            <span>🔒 Secure checkout by Razorpay</span>
            <span>⚡ Instant activation · No auto-renewal</span>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-orb lp-cta-orb1" />
        <div className="lp-cta-orb lp-cta-orb2" />
        <div className="lp-cta-wrap">
          <div className="lp-cta-emoji">🚀</div>
          <h2 className="lp-cta-h2">Start monitoring your sites today</h2>
          <p className="lp-cta-p">5-day free trial · Only ₹2 to verify · Setup in 2 minutes · No credit card needed</p>
          <button className="lp-btn-primary lp-cta-btn" onClick={() => { localStorage.removeItem('sm_intended_plan'); navigate('/register'); }}>
            Get Started Free
            <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-wrap">
          <div className="lp-footer-brand">
            <UWLogo size={26} />
            <span className="lp-brand-text" style={{ fontSize: 14 }}>UptimeWatch</span>
          </div>
          <div className="lp-footer-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#how">How it works</a>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            <Link to="/terms">Terms</Link>
          </div>
          <div className="lp-footer-copy">© 2026 UptimeWatch · Built by <strong>Narendra Singh</strong></div>
        </div>
      </footer>

    </div>
  );
}
