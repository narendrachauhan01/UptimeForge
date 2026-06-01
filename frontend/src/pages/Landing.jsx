import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import UWLogo from '../components/UWLogo';
import { getPlans } from '../api';

// Parse "type:label" feature strings from admin settings
function parseFeatures(arr) {
  if (!arr || !arr.length) return [];
  return arr.map(f => {
    const idx = f.indexOf(':');
    if (idx === -1) return { type: 'ok', label: f };
    return { type: f.slice(0, idx), label: f.slice(idx + 1) };
  });
}

const PLAN_META = {
  free_trial: { name: 'Free Trial', emoji: '🆓', period: 'one-time', gradient: 'linear-gradient(135deg,#6366f1,#7c3aed)', cta: 'Start Free Trial', popular: false },
  bronze:     { name: 'Bronze',     emoji: '🥉', period: '/month',   gradient: 'linear-gradient(135deg,#b45309,#d97706)', cta: 'Get Bronze',       popular: false },
  silver:     { name: 'Silver',     emoji: '🥈', period: '/month',   gradient: 'linear-gradient(135deg,#475569,#334155)', cta: 'Get Silver',       popular: true  },
  gold:       { name: 'Gold',       emoji: '🥇', period: '/month',   gradient: 'linear-gradient(135deg,#ca8a04,#eab308)', cta: 'Get Gold',         popular: false },
};

export default function Landing() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    getPlans().then(r => setPlanData(r.data)).catch(() => {});
  }, []);

  // Features come from admin settings — parsed from "type:label" format
  const PLAN_FEATURES = {
    free_trial: parseFeatures(planData?.freeTrialFeatures),
    bronze:     parseFeatures(planData?.plans?.bronze?.features),
    silver:     parseFeatures(planData?.plans?.silver?.features),
    gold:       parseFeatures(planData?.plans?.gold?.features),
  };

  const discPct = planData?.annualDiscount ?? 20;
  const ap = planData?.annualPlans;
  const annualPrice = (key, monthly) => {
    if (billing !== 'annually') return monthly;
    const custom = ap?.[key]?.price;
    if (custom && custom > 0) return custom;
    return Math.round(monthly * (1 - discPct / 100));
  };
  const plans = [
    { key: 'free_trial', ...PLAN_META.free_trial, price: `₹${planData?.verificationFee ?? 2}`, origPrice: null, note: '5-day trial · one-time verification' },
    { key: 'bronze', ...PLAN_META.bronze, price: `₹${annualPrice('bronze', planData?.plans?.bronze?.price ?? 499)}`, origPrice: billing==='annually'?`₹${planData?.plans?.bronze?.price??499}`:null, note: `${planData?.plans?.bronze?.sites ?? 5} sites` },
    { key: 'silver', ...PLAN_META.silver, price: `₹${annualPrice('silver', planData?.plans?.silver?.price ?? 999)}`, origPrice: billing==='annually'?`₹${planData?.plans?.silver?.price??999}`:null, note: `${planData?.plans?.silver?.sites ?? 15} sites` },
    { key: 'gold',   ...PLAN_META.gold,   price: `₹${annualPrice('gold',   planData?.plans?.gold?.price ?? 1499)}`,  origPrice: billing==='annually'?`₹${planData?.plans?.gold?.price??1499}`:null,  note: `${planData?.plans?.gold?.sites ?? 30} sites` },
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
            <span className="lp-brand-text">UptimeForge</span>
          </Link>
          <div className="lp-nav-center">
            <a href="#">Home</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="lp-nav-right">
            <Link to="/login" className="lp-nav-login">Login</Link>
            <Link to="/register" className="lp-nav-cta">Get Started Free</Link>
          </div>
          <button className={`lp-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu">
            <a href="#" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="lp-nav-cta" onClick={() => setMenuOpen(false)} style={{ textAlign: 'center' }}>Get Started Free</Link>
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
              UptimeForge is a 24/7 website monitoring platform built for businesses. It watches your sites every 30 seconds to 5 minutes (based on your plan), tracks SSL &amp; domain expiry, measures response time, and instantly alerts you on WhatsApp &amp; Email — so downtime never catches you off guard.
            </p>
            <div className="lp-hero-actions">
              <button className="lp-btn-primary" onClick={() => { localStorage.removeItem('sm_intended_plan'); navigate('/register'); }}>
                Start Free — Just ₹2
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <a href="#pricing" className="lp-btn-outline">View Plans</a>
            </div>
            <div className="lp-hero-trust">
              {['5-day free trial', 'Alerts in under 1 min', 'WhatsApp + Email', 'No hidden charges'].map(t => (
                <div key={t} className="lp-trust-item"><span className="lp-trust-check">✓</span>{t}</div>
              ))}
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lp-hero-right">
            <div className="lp-dashboard-preview">
              <div className="lp-preview-header">
                <div className="lp-preview-dot red" /><div className="lp-preview-dot yellow" /><div className="lp-preview-dot green" />
                <span className="lp-preview-title">UptimeForge — Dashboard</span>
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
        {[['30s–5m', 'Check Interval'], ['24/7', 'Always On'], ['< 1 min', 'Alert Speed'], ['Email', '+ WhatsApp Alerts'], ['₹2', 'Trial Cost'], ['SSL & Domain', 'Expiry Tracking']].map(([v, l]) => (
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
              { icon: '⏱️', color: '#7c3aed', bg: '#ede9fe', title: 'Uptime Monitoring', desc: 'We check your site every 30 seconds to 5 minutes based on your plan. If it goes down, you get alerted instantly via Email.' },
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
              { icon: '🌐', step: '02', title: 'Add Your Sites', desc: 'Paste your website URLs. We start monitoring immediately — every 30s to 5 min based on your plan.' },
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

          {/* Interval comparison */}
          <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap', marginBottom:32 }}>
            {[
              { plan:'Free Trial', interval:'5 min', color:'#64748b' },
              { plan:'Bronze',     interval:'2 min', color:'#b45309' },
              { plan:'Silver',     interval:'1 min', color:'#7c3aed' },
              { plan:'Gold',       interval:'30 sec', color:'#ca8a04' },
            ].map(({ plan, interval, color }) => (
              <div key={plan} style={{ background:'#fff', border:`2px solid ${color}20`, borderRadius:12, padding:'10px 18px', textAlign:'center', minWidth:110, boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{plan}</div>
                <div style={{ fontSize:20, fontWeight:900, color, marginTop:4 }}>⏱ {interval}</div>
                <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }}>check interval</div>
              </div>
            ))}
          </div>

          {/* Monthly / Annually Toggle */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:4, marginBottom:32, background:'#f1f5f9', borderRadius:50, padding:5, width:'fit-content', margin:'0 auto 32px' }}>
            <button onClick={()=>setBilling('monthly')} style={{ padding:'10px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s',
              background: billing==='monthly' ? '#1e293b' : 'transparent',
              color: billing==='monthly' ? '#fff' : '#64748b' }}>
              Monthly
            </button>
            <button onClick={()=>setBilling('annually')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s',
              background: billing==='annually' ? '#1e293b' : 'transparent',
              color: billing==='annually' ? '#fff' : '#64748b' }}>
              Annually
              <span style={{ background:'#f59e0b', color:'#fff', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:50 }}>Save {discPct}%</span>
            </button>
          </div>

          <div className="lp-plans">
            {plans.map(p => (
              <div key={p.key} className={`lp-plan ${p.popular ? 'lp-plan-popular' : ''}`}>
                {p.popular && <div className="lp-plan-pop-badge">⭐ Most Popular</div>}
                <div className="lp-plan-top" style={{ background: p.gradient }}>
                  <div className="lp-plan-emoji">{p.emoji}</div>
                  <div className="lp-plan-name">{p.name}</div>
                  <div className="lp-plan-price-row">
                    <span className="lp-plan-price">{p.price}</span>
                    <span className="lp-plan-period">{p.period}</span>
                  </div>
                  {p.origPrice && <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', textDecoration:'line-through', marginTop:2 }}>{p.origPrice}/month</div>}
                  <div className="lp-plan-sites">{p.note}</div>
                </div>
                <div className="lp-plan-body">
                  <ul className="lp-plan-list">
                    {(PLAN_FEATURES[p.key] || []).map(({ label, type }) => (
                      <li key={label} style={{ opacity: type === 'no' ? 0.4 : 1 }}>
                        {type === 'ok'      && <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>}
                        {type === 'no'      && <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                        {type === 'limited' && <span style={{flexShrink:0, fontSize:13}}>😐</span>}
                        {type === 'soon'    && <span style={{flexShrink:0, fontSize:12}}>🔜</span>}
                        <span>{label}</span>
                        {type === 'soon' && <span style={{ fontSize:9, background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'1px 6px', marginLeft:2, fontWeight:700, flexShrink:0 }}>Soon</span>}
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
          {/* 3M / 6M Custom Cards */}
          {[
            { key:'threeMonth', emoji:'🗓️', gradient:'linear-gradient(135deg,#8b5cf6,#6d28d9)', label: planData?.customPlans?.threeMonth?.label || '3 Month Plan', duration:'3 months', color:'#8b5cf6' },
            { key:'sixMonth',   emoji:'📅', gradient:'linear-gradient(135deg,#10b981,#059669)', label: planData?.customPlans?.sixMonth?.label   || '6 Month Plan', duration:'6 months', color:'#10b981' },
          ].filter(c => planData?.customPlans?.[c.key]?.enabled !== false).map(c => {
            const cp = planData?.customPlans?.[c.key];
            const features = (cp?.features || []).map(f => { const i=f.indexOf(':'); return i===-1?{type:'ok',label:f}:{type:f.slice(0,i),label:f.slice(i+1)}; });
            return (
              <div key={c.key} style={{ maxWidth:900, margin:'24px auto 0', background:'#fff', borderRadius:16, border:'1px solid #E5E7EB', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', overflow:'hidden' }}>
                <div style={{ background:c.gradient, padding:'20px 28px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <span style={{ fontSize:32 }}>{c.emoji}</span>
                    <div>
                      <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{c.label}</div>
                      <div style={{ fontSize:13, color:'rgba(255,255,255,0.75)', marginTop:2 }}>Custom {c.duration} plan · Contact our team</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                    {cp?.price > 0 && (
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:28, fontWeight:900, color:'#fff' }}>₹{cp.price}<span style={{ fontSize:14, fontWeight:500, opacity:0.75 }}>/mo</span></div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)' }}>billed every {c.duration}</div>
                      </div>
                    )}
                    <a href={`mailto:chauhan.narendrasingh.01@gmail.com?subject=Custom Plan Enquiry - ${c.label}&body=Hi, I am interested in the ${c.label}. Please share more details.`}
                      style={{ padding:'12px 28px', borderRadius:50, border:'2px solid rgba(255,255,255,0.8)', background:'rgba(255,255,255,0.15)', color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', backdropFilter:'blur(8px)', transition:'all 0.2s', textDecoration:'none', display:'inline-block' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.25)'}
                      onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.15)'}>
                      Contact Support →
                    </a>
                  </div>
                </div>
                {features.length > 0 && (
                  <div style={{ padding:'16px 28px', display:'flex', flexWrap:'wrap', gap:'8px 32px' }}>
                    {features.map(({type,label}) => (
                      <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color: type==='no'?'#9CA3AF':'#374151', opacity:type==='no'?0.5:1 }}>
                        {type==='ok'      && <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                        {type==='no'      && <svg width="13" height="13" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                        {type==='limited' && <span style={{fontSize:12}}>😐</span>}
                        {type==='soon'    && <span style={{fontSize:11}}>🔜</span>}
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

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
      <div style={{ background: '#0a0a14', padding: '10px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 14, color: '#94a3b8' }}>
          ✉️ Email alerts are live. WhatsApp notifications coming soon.
        </span>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-wrap">

          {/* Brand */}
          <div className="lp-footer-brand">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <UWLogo size={32} />
              <span className="lp-brand-text" style={{ fontSize:16 }}>UptimeForge</span>
            </div>
            <p className="lp-footer-brand-desc">
              24/7 uptime monitoring with instant WhatsApp & Email alerts. Know before your customers do.
            </p>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              {['SSL Monitoring','Ping Monitor','Alerts'].map(t => (
                <span key={t} style={{ fontSize:11, color:'#7c3aed', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:20, padding:'2px 10px', fontWeight:600 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="lp-footer-col-title">Product</div>
            <div className="lp-footer-links">
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <Link to="/register">Get Started Free</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="lp-footer-col-title">Account</div>
            <div className="lp-footer-links">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/pricing">Plans</Link>
              <Link to="/support">Support</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <div className="lp-footer-links">
              <Link to="/terms">Terms of Service</Link>
              <Link to="/terms">Privacy Policy</Link>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="lp-footer-bottom">
          <div className="lp-footer-copy">© 2026 UptimeForge · Built by <strong style={{ color:'#94a3b8' }}>Narendra Singh</strong></div>
          <Link to="/staff-login" style={{ color:'rgba(255,255,255,0.35)', textDecoration:'none', fontSize:11, fontWeight:600, padding:'4px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, transition:'all 0.2s' }}
            onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.borderColor='rgba(255,255,255,0.3)'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.35)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; e.currentTarget.style.background='transparent'; }}>
            🔐 Staff Login
          </Link>
        </div>
        </div>
      </footer>

    </div>
  );
}
