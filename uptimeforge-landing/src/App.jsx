import React, { useState, useEffect } from 'react';
import UWLogo from './components/UWLogo';

const DASHBOARD = import.meta.env.VITE_DASHBOARD_URL || 'https://servermonitor.narendrasingh.site';
const API       = import.meta.env.VITE_API_URL       || 'https://uptimeapi.narendrasingh.site';

// ── Helpers ──────────────────────────────────────────────────────────────────
function parseFeature(f) {
    const idx = f.indexOf(':');
    if (idx === -1) return { type: 'ok', label: f };
    return { type: f.slice(0, idx), label: f.slice(idx + 1) };
}

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
    nav: { position:'fixed', top:0, left:0, right:0, zIndex:1000, background:'rgba(8,4,20,0.85)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(124,58,237,0.15)', boxShadow:'0 1px 24px rgba(0,0,0,0.3)' },
    navWrap: { maxWidth:1180, margin:'0 auto', padding:'0 32px', height:68, display:'grid', gridTemplateColumns:'auto 1fr auto', alignItems:'center', gap:32 },
    navLink: { color:'rgba(255,255,255,0.65)', fontSize:14, fontWeight:500, textDecoration:'none', padding:'8px 16px', borderRadius:50, transition:'all 0.2s' },
    cta: { background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', fontSize:14, fontWeight:700, textDecoration:'none', padding:'10px 24px', borderRadius:50, boxShadow:'0 2px 14px rgba(124,58,237,0.4)', transition:'all 0.25s' },
    login: { color:'rgba(255,255,255,0.8)', fontSize:14, fontWeight:600, textDecoration:'none', padding:'9px 18px', borderRadius:50, transition:'all 0.2s' },
    section: { maxWidth:1180, margin:'0 auto', padding:'0 24px' },
};

// ── Components ────────────────────────────────────────────────────────────────
function Navbar({ menuOpen, setMenuOpen }) {
    return (
        <nav style={S.nav}>
            <div style={S.navWrap}>
                <div style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
                    <UWLogo size={32} />
                    <span style={{ fontSize:17, fontWeight:800, color:'#fff', fontFamily:'Outfit,sans-serif', letterSpacing:'-0.3px' }}>UptimeForge</span>
                </div>
                <div style={{ display:'flex', gap:0, justifyContent:'center' }}>
                    {[['#','Home'],['#features','Features'],['#how','How it works'],['#pricing','Pricing']].map(([href,label]) => (
                        <a key={label} href={href} style={S.navLink}
                            onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.65)'}>
                            {label}
                        </a>
                    ))}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <a href={`${DASHBOARD}/login`} style={S.login}
                        onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='rgba(255,255,255,0.8)'}>
                        Login
                    </a>
                    <a href={`${DASHBOARD}/register`} style={S.cta}>Get Started Free</a>
                </div>
            </div>
        </nav>
    );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
    const [planData, setPlanData] = useState(null);
    const [billing,  setBilling]  = useState('monthly');
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/payment/plans`)
            .then(r => r.json())
            .then(d => setPlanData(d))
            .catch(() => {});
    }, []);

    const discPct = planData?.annualDiscount ?? 20;
    const ap = planData?.annualPlans;
    const annualPrice = (key, monthly) => {
        const custom = ap?.[key]?.price;
        if (custom && custom > 0) return custom;
        return Math.round(monthly * (1 - discPct / 100));
    };

    const PLANS = [
        { key:'free_trial', emoji:'🆓', name:'Free Trial', gradient:'linear-gradient(135deg,#6366f1,#8b5cf6)', popular:false,
          price: `₹${planData?.verificationFee ?? 2}`, period:'one-time', note:`${planData?.freeTrialSiteLimit ?? 2} sites · 5 days`,
          features: planData?.freeTrialFeatures || [], cta:'Start Free Trial', href:`${DASHBOARD}/register` },
        { key:'bronze', emoji:'🥉', name:'Bronze', gradient:'linear-gradient(135deg,#b45309,#d97706)', popular:false,
          price: `₹${billing==='annually'?annualPrice('bronze',planData?.plans?.bronze?.price??499):(planData?.plans?.bronze?.price??499)}`,
          origPrice: billing==='annually'?`₹${planData?.plans?.bronze?.price??499}`:null,
          period:'/mo', note:`${planData?.plans?.bronze?.sites??5} sites`,
          features: planData?.plans?.bronze?.features||[], cta:'Get Bronze', href:`${DASHBOARD}/register` },
        { key:'silver', emoji:'🥈', name:'Silver', gradient:'linear-gradient(135deg,#475569,#64748b)', popular:true,
          price: `₹${billing==='annually'?annualPrice('silver',planData?.plans?.silver?.price??999):(planData?.plans?.silver?.price??999)}`,
          origPrice: billing==='annually'?`₹${planData?.plans?.silver?.price??999}`:null,
          period:'/mo', note:`${planData?.plans?.silver?.sites??15} sites`,
          features: planData?.plans?.silver?.features||[], cta:'Get Silver', href:`${DASHBOARD}/register` },
        { key:'gold', emoji:'🥇', name:'Gold', gradient:'linear-gradient(135deg,#ca8a04,#eab308)', popular:false,
          price: `₹${billing==='annually'?annualPrice('gold',planData?.plans?.gold?.price??1499):(planData?.plans?.gold?.price??1499)}`,
          origPrice: billing==='annually'?`₹${planData?.plans?.gold?.price??1499}`:null,
          period:'/mo', note:`${planData?.plans?.gold?.sites??30} sites`,
          features: planData?.plans?.gold?.features||[], cta:'Get Gold', href:`${DASHBOARD}/register` },
    ];

    return (
        <div style={{ fontFamily:"'Plus Jakarta Sans',Inter,Arial,sans-serif", background:'#0a0618', color:'#fff', minHeight:'100vh' }}>
            <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

            {/* ── HERO ── */}
            <section style={{ paddingTop:140, paddingBottom:80, textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-200, left:'50%', transform:'translateX(-50%)', width:800, height:800, background:'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents:'none' }}/>
                <div style={S.section}>
                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:50, padding:'6px 16px', marginBottom:24, fontSize:13, color:'#a78bfa' }}>
                        🚀 <span>24/7 Uptime Monitoring — WhatsApp &amp; Email Alerts</span>
                    </div>
                    <h1 style={{ fontSize:'clamp(36px,6vw,68px)', fontWeight:900, lineHeight:1.1, marginBottom:20, fontFamily:'Outfit,sans-serif' }}>
                        Know when your site<br />
                        <span style={{ background:'linear-gradient(135deg,#a78bfa,#7c3aed)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>goes down first</span>
                    </h1>
                    <p style={{ fontSize:'clamp(16px,2vw,20px)', color:'rgba(255,255,255,0.65)', maxWidth:560, margin:'0 auto 40px', lineHeight:1.7 }}>
                        Monitor websites, APIs &amp; servers. Get instant alerts via WhatsApp &amp; Email. Track SSL expiry &amp; domain renewal.
                    </p>
                    <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
                        <a href={`${DASHBOARD}/register`} style={{ ...S.cta, fontSize:16, padding:'14px 32px', borderRadius:12, boxShadow:'0 4px 24px rgba(124,58,237,0.5)' }}>
                            Start Free Trial →
                        </a>
                        <a href="#features" style={{ padding:'14px 28px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:12, color:'rgba(255,255,255,0.8)', textDecoration:'none', fontSize:16, fontWeight:600, transition:'all 0.2s' }}>
                            See Features
                        </a>
                    </div>
                    <div style={{ marginTop:20, fontSize:13, color:'rgba(255,255,255,0.4)' }}>
                        ✓ Free 5-day trial &nbsp;·&nbsp; ✓ No credit card required &nbsp;·&nbsp; ✓ Setup in 2 minutes
                    </div>
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" style={{ padding:'80px 0', background:'rgba(255,255,255,0.02)' }}>
                <div style={S.section}>
                    <div style={{ textAlign:'center', marginBottom:56 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>Features</div>
                        <h2 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:900, fontFamily:'Outfit,sans-serif' }}>Everything you need to stay online</h2>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:24 }}>
                        {[
                            { icon:'⚡', title:'30-second monitoring', desc:'Check your sites every 30 seconds. Know about downtime before your customers do.' },
                            { icon:'📱', title:'WhatsApp & Email alerts', desc:'Instant notifications via WhatsApp and Email when sites go down or recover.' },
                            { icon:'🔒', title:'SSL & Domain expiry', desc:'Never let SSL certificates or domains expire. Get alerts 30, 15, 7 days before.' },
                            { icon:'📊', title:'Performance charts', desc:'Track response times, uptime history, and performance trends over time.' },
                            { icon:'📡', title:'Ping Monitor', desc:'Monitor TCP connectivity for any host, IP or URL with live ping checks.' },
                            { icon:'👥', title:'Multi-recipient alerts', desc:'Notify your entire team via WhatsApp & Email when something goes wrong.' },
                        ].map(f => (
                            <div key={f.title} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'28px 24px', transition:'all 0.2s' }}
                                onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(124,58,237,0.4)'}
                                onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}>
                                <div style={{ fontSize:32, marginBottom:14 }}>{f.icon}</div>
                                <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>{f.title}</div>
                                <div style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>{f.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" style={{ padding:'80px 0' }}>
                <div style={S.section}>
                    <div style={{ textAlign:'center', marginBottom:56 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>How it works</div>
                        <h2 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:900, fontFamily:'Outfit,sans-serif' }}>Up and running in minutes</h2>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:32 }}>
                        {[
                            { step:'01', title:'Add your site', desc:'Enter your website URL. We start monitoring immediately.' },
                            { step:'02', title:'Get alerted', desc:'Receive instant WhatsApp & Email alerts when your site goes down.' },
                            { step:'03', title:'Track performance', desc:'View uptime history, response times and incident reports.' },
                        ].map(s => (
                            <div key={s.step} style={{ textAlign:'center' }}>
                                <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:900, margin:'0 auto 16px', fontFamily:'Outfit,sans-serif' }}>{s.step}</div>
                                <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>{s.title}</div>
                                <div style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>{s.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section id="pricing" style={{ padding:'80px 0', background:'rgba(255,255,255,0.02)' }}>
                <div style={S.section}>
                    <div style={{ textAlign:'center', marginBottom:40 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>Pricing</div>
                        <h2 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:900, fontFamily:'Outfit,sans-serif', marginBottom:8 }}>Choose the perfect plan for your journey</h2>
                        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15 }}>Start free for 5 days. Pay just ₹2 to verify. Upgrade anytime.</p>
                    </div>

                    {/* Toggle */}
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:40 }}>
                        <div style={{ display:'flex', gap:4, background:'#f1f5f9', borderRadius:50, padding:5 }}>
                            <button onClick={()=>setBilling('monthly')} style={{ padding:'10px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s', background:billing==='monthly'?'#1e293b':'transparent', color:billing==='monthly'?'#fff':'#64748b' }}>Monthly</button>
                            <button onClick={()=>setBilling('annually')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s', background:billing==='annually'?'#1e293b':'transparent', color:billing==='annually'?'#fff':'#64748b' }}>
                                Annually <span style={{ background:'#f59e0b', color:'#fff', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:50 }}>Save {discPct}%</span>
                            </button>
                        </div>
                    </div>

                    {/* Plan cards */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:24, alignItems:'stretch' }}>
                        {PLANS.map(p => (
                            <div key={p.key} style={{ background:'#fff', borderRadius:20, overflow:'hidden', position:'relative', display:'flex', flexDirection:'column', boxShadow: p.popular ? '0 0 0 2px #7c3aed, 0 8px 32px rgba(124,58,237,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' }}>
                                {p.popular && <div style={{ position:'absolute', top:16, right:16, background:'#7c3aed', color:'#fff', fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:20 }}>⭐ Most Popular</div>}
                                <div style={{ background:p.gradient, padding:'28px 24px', textAlign:'center' }}>
                                    <div style={{ fontSize:28, marginBottom:6 }}>{p.emoji}</div>
                                    <div style={{ color:'#fff', fontWeight:800, fontSize:18, marginBottom:8 }}>{p.name}</div>
                                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4 }}>
                                        <span style={{ color:'#fff', fontSize:32, fontWeight:900 }}>{p.price}</span>
                                        <span style={{ color:'rgba(255,255,255,0.7)', fontSize:14 }}>{p.period}</span>
                                    </div>
                                    {p.origPrice && <div style={{ color:'rgba(255,255,255,0.6)', fontSize:12, textDecoration:'line-through', marginTop:2 }}>{p.origPrice}/month</div>}
                                    <div style={{ background:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:20, fontSize:12, fontWeight:600, padding:'3px 12px', display:'inline-block', marginTop:8 }}>{p.note}</div>
                                </div>
                                <div style={{ padding:'20px 24px', flex:1, display:'flex', flexDirection:'column' }}>
                                    <ul style={{ listStyle:'none', flex:1, marginBottom:20 }}>
                                        {p.features.length > 0 ? p.features.map(f => {
                                            const { type, label } = parseFeature(f);
                                            return (
                                                <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color: type==='no'?'#94a3b8':'#374151', opacity:type==='no'?0.5:1, marginBottom:8 }}>
                                                    {type==='ok'      && <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>}
                                                    {type==='no'      && <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                                                    {type==='limited' && <span style={{flexShrink:0}}>😐</span>}
                                                    {type==='soon'    && <span style={{flexShrink:0}}>🔜</span>}
                                                    <span>{label}</span>
                                                    {type==='soon' && <span style={{ fontSize:9, background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'1px 6px', fontWeight:700 }}>Soon</span>}
                                                </li>
                                            );
                                        }) : [1,2,3,4].map(i => <li key={i} style={{ height:16, background:'#f1f5f9', borderRadius:4, marginBottom:8 }}/>)}
                                    </ul>
                                    <a href={p.href} style={{ display:'block', textAlign:'center', padding:'12px', borderRadius:12, background:p.gradient, color:'#fff', textDecoration:'none', fontWeight:700, fontSize:14 }}>
                                        {p.cta}
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA SECTION ── */}
            <section style={{ padding:'80px 24px', textAlign:'center' }}>
                <div style={{ maxWidth:600, margin:'0 auto' }}>
                    <h2 style={{ fontSize:'clamp(28px,4vw,42px)', fontWeight:900, fontFamily:'Outfit,sans-serif', marginBottom:16 }}>
                        Start monitoring today
                    </h2>
                    <p style={{ color:'rgba(255,255,255,0.55)', fontSize:16, marginBottom:32, lineHeight:1.7 }}>
                        Join hundreds of teams who trust UptimeForge to keep their sites online.
                    </p>
                    <a href={`${DASHBOARD}/register`} style={{ ...S.cta, fontSize:16, padding:'14px 40px', borderRadius:12, boxShadow:'0 4px 24px rgba(124,58,237,0.5)', display:'inline-block' }}>
                        Get Started Free →
                    </a>
                    <div style={{ marginTop:16, fontSize:13, color:'rgba(255,255,255,0.35)' }}>
                        Free 5-day trial · No credit card required
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop:'1px solid rgba(124,58,237,0.15)', padding:'40px 24px', background:'rgba(0,0,0,0.3)' }}>
                <div style={{ maxWidth:1180, margin:'0 auto', display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr', gap:40, flexWrap:'wrap' }}>
                    <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                            <UWLogo size={32} />
                            <span style={{ fontSize:17, fontWeight:800, color:'#fff', fontFamily:'Outfit,sans-serif' }}>UptimeForge</span>
                        </div>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7 }}>24×7 uptime monitoring with instant WhatsApp &amp; Email alerts. Know before your customers do.</p>
                    </div>
                    <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Product</div>
                        {[['#features','Features'],['#how','How it works'],['#pricing','Pricing'],[ `${DASHBOARD}/register`,'Get Started Free']].map(([h,l]) => (
                            <a key={l} href={h} style={{ display:'block', color:'#94a3b8', fontSize:14, textDecoration:'none', marginBottom:10 }}>{l}</a>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Account</div>
                        {[[`${DASHBOARD}/login`,'Login'],[`${DASHBOARD}/register`,'Register'],[`${DASHBOARD}/support`,'Support']].map(([h,l]) => (
                            <a key={l} href={h} style={{ display:'block', color:'#94a3b8', fontSize:14, textDecoration:'none', marginBottom:10 }}>{l}</a>
                        ))}
                    </div>
                    <div>
                        <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:1, marginBottom:16 }}>Legal</div>
                        {[[`${DASHBOARD}/terms`,'Terms of Service'],[`${DASHBOARD}/terms`,'Privacy Policy']].map(([h,l]) => (
                            <a key={l} href={h} style={{ display:'block', color:'#94a3b8', fontSize:14, textDecoration:'none', marginBottom:10 }}>{l}</a>
                        ))}
                    </div>
                </div>
                <div style={{ maxWidth:1180, margin:'32px auto 0', paddingTop:24, borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                    <div style={{ fontSize:13, color:'#475569' }}>© 2026 UptimeForge · Built by <strong style={{ color:'#94a3b8' }}>Narendra Singh</strong></div>
                    <a href={`${DASHBOARD}/staff-login`} style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.35)', textDecoration:'none', padding:'4px 12px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20 }}>
                        🔐 Staff Login
                    </a>
                </div>
            </footer>
        </div>
    );
}
