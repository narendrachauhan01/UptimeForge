import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlans, createOrder, verifyPayment, deleteMyAccount } from '../api';
import UWLogo from '../components/UWLogo';
import { removeCookie } from '../utils/cookies';

function parseFeature(f) {
    const idx = f.indexOf(':');
    if (idx === -1) return { type: 'ok', label: f };
    return { type: f.slice(0, idx), label: f.slice(idx + 1) };
}

const PLAN_LABEL = {
    verification: 'Free Trial',
    bronze:       'Bronze',
    silver:       'Silver',
    gold:         'Gold',
    custom:       'Custom',
};
const PLAN_GRADIENT = {
    bronze:       'linear-gradient(135deg,#b45309,#d97706)',
    silver:       'linear-gradient(135deg,#5b21b6,#7c3aed)',
    gold:         'linear-gradient(135deg,#ca8a04,#eab308)',
    verification: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
};
const PLAN_ACCENT = {
    verification: '#a78bfa',
    bronze:       '#f59e0b',
    silver:       '#a78bfa',
    gold:         '#fbbf24',
    custom:       '#2dd4bf',
};
const PLAN_FEATURES_FALLBACK = {
    verification: ['2 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking — Not included', '5 min check interval', '5-day full access'],
    bronze:       ['5 sites monitored', '2 min check interval', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Performance charts'],
    silver:       ['15 sites monitored', '1 min check interval', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Full analytics & charts'],
    gold:         ['30 sites monitored', '30 sec check interval', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Priority support'],
    custom:       ['Unlimited sites', 'Dedicated account manager', 'Custom alert integrations', 'SLA guarantee', 'White-label options'],
};

function loadRazorpayScript() {
    return new Promise(resolve => {
        if (window.Razorpay) return resolve(true);
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload  = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });
}

const PLAN_ORDER = ['verification', 'bronze', 'silver', 'gold'];

const PLAN_BADGE = {
    verification: { text: 'FREE', color: '#7c3aed' },
    bronze:       null,
    silver:       { text: 'Most Popular', color: '#7c3aed' },
    gold:         { text: 'Best Value', color: '#ca8a04' },
    custom:       null,
};

const PLAN_COLOR_MAP = {
    verification: '#6366f1',
    bronze:       '#b45309',
    silver:       '#7c3aed',
    gold:         '#ca8a04',
};

function PlanSelectScreen({ planData, user, onSelect, onBack }) {
    const [billing, setBilling] = useState('monthly');
    const discPct = planData?.annualDiscount ?? 20;
    const ap = planData?.annualPlans;
    const annualPrice = (key, monthly) => {
        const custom = ap?.[key]?.price;
        if (custom && custom > 0) return custom;
        return Math.round(monthly * (1 - discPct / 100));
    };
    const EMOJI = { verification:'🆓', bronze:'🥉', silver:'🥈', gold:'🥇' };

    return (
        <div style={{ height:'100vh', background:'linear-gradient(160deg,#0f0a1e 0%,#1a0533 50%,#0a1628 100%)', padding:'16px 20px', fontFamily:"'Plus Jakarta Sans',sans-serif", position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {/* Bg glows */}
            <div style={{ position:'absolute', top:'-10%', left:'10%', width:'45%', height:'60%', background:'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents:'none', filter:'blur(60px)' }} />
            <div style={{ position:'absolute', bottom:'-5%', right:'5%', width:'40%', height:'50%', background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents:'none', filter:'blur(60px)' }} />

            {/* Back button */}
            <button onClick={onBack} style={{ position:'relative', zIndex:2, display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', borderRadius:10, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:8, transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#fff';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='rgba(255,255,255,0.6)';}}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back
            </button>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom:8, position:'relative', zIndex:2 }}>
                <UWLogo size={36} />
                <h1 style={{ fontSize:24, fontWeight:900, color:'#fff', margin:'8px 0 4px', fontFamily:"'Outfit',sans-serif", letterSpacing:'-0.8px', lineHeight:1.1 }}>Choose Your Plan</h1>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.5)', margin:0 }}>Welcome, <strong style={{ color:'#c084fc', fontWeight:700 }}>{user?.name}</strong>! Select a plan to get started.</p>
            </div>

            {/* Billing toggle */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:12, position:'relative', zIndex:2 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:50, padding:5, backdropFilter:'blur(10px)' }}>
                    <button onClick={() => setBilling('monthly')} style={{ padding:'10px 26px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.3s', fontFamily:'inherit',
                        background: billing==='monthly' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                        color: billing==='monthly' ? '#fff' : 'rgba(255,255,255,0.45)',
                        boxShadow: billing==='monthly' ? '0 4px 18px rgba(124,58,237,0.4)' : 'none' }}>
                        Monthly
                    </button>
                    <button onClick={() => setBilling('annually')} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 26px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.3s', fontFamily:'inherit',
                        background: billing==='annually' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                        color: billing==='annually' ? '#fff' : 'rgba(255,255,255,0.45)',
                        boxShadow: billing==='annually' ? '0 4px 18px rgba(124,58,237,0.4)' : 'none' }}>
                        Annually
                        <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', fontSize:10, fontWeight:800, padding:'3px 10px', borderRadius:50, letterSpacing:'0.3px' }}>Save {discPct}%</span>
                    </button>
                </div>
            </div>

            {/* No free trial banner */}
            {user?.noFreeTrial && (
                <div style={{ maxWidth:640, margin:'0 auto 28px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, position:'relative', zIndex:2 }}>
                    <span style={{ fontSize:20 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'#fbbf24' }}>Free Trial not available</div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:2 }}>You previously had a UptimeForge account. Please choose a paid plan.</div>
                    </div>
                </div>
            )}

            {/* Plan cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:14, maxWidth:1160, margin:'0 auto', position:'relative', zIndex:2 }}>
                {PLAN_ORDER.filter(p => {
                    if (p === 'verification' && user?.noFreeTrial) return false;
                    if (p === 'verification' && user?.plan && user.plan !== 'free_trial') return false;
                    return true;
                }).map(p => {
                    const isVerif   = p === 'verification';
                    const isPopular = p === 'silver';
                    const isGold    = p === 'gold';
                    const cfg       = planData?.plans?.[p] || {};
                    const monthlyPrice = isVerif ? (planData?.verificationFee ?? 2) : (cfg.price ?? { bronze:499, silver:999, gold:1499 }[p]);
                    const price     = (!isVerif && billing === 'annually') ? annualPrice(p, monthlyPrice) : monthlyPrice;
                    const sites     = isVerif ? (planData?.freeTrialSiteLimit ?? 2) : (cfg.sites ?? { bronze:5, silver:15, gold:30 }[p]);
                    const features  = isVerif
                        ? (planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : PLAN_FEATURES_FALLBACK.verification)
                        : (cfg.features?.length ? cfg.features : PLAN_FEATURES_FALLBACK[p]);
                    const note      = isVerif ? '5-day trial · one-time verification' : `${sites} sites`;
                    const gradient  = PLAN_GRADIENT[p] || 'linear-gradient(135deg,#7c3aed,#6d28d9)';
                    const planColor = PLAN_COLOR_MAP[p] || '#7c3aed';

                    return (
                        <div key={p} style={{
                            position:'relative', borderRadius:28, overflow:'hidden',
                            background: isPopular
                                ? 'linear-gradient(180deg, rgba(124,58,237,0.06) 0%, rgba(255,255,255,0.01) 100%)'
                                : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                            border: isPopular ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(255,255,255,0.04)',
                            boxShadow: isPopular ? '0 20px 55px -10px rgba(124,58,237,0.35)' : '0 15px 45px -10px rgba(0,0,0,0.5)',
                            display:'flex', flexDirection:'column',
                            backdropFilter:'blur(24px)',
                            transition:'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                            '--plan-color': planColor, '--plan-gradient': gradient,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform='translateY(-12px) scale(1.01)'; e.currentTarget.style.boxShadow=isPopular?'0 30px 65px -15px rgba(124,58,237,0.5)':'0 30px 65px -15px rgba(0,0,0,0.7)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.boxShadow=isPopular?'0 20px 55px -10px rgba(124,58,237,0.35)':'0 15px 45px -10px rgba(0,0,0,0.5)'; }}>

                            {/* Glow */}
                            <div style={{ position:'absolute', top:-40, left:'10%', width:'80%', height:80, background:`radial-gradient(circle, ${planColor} 0%, transparent 70%)`, opacity: isPopular ? 0.15 : 0.08, filter:'blur(25px)', pointerEvents:'none' }} />

                            {/* Badge */}
                            {(isVerif || isPopular || isGold) && (
                                <div style={{ position:'absolute', top:16, right:16, background: isPopular ? 'linear-gradient(135deg,#c084fc,#7c3aed)' : isGold ? 'linear-gradient(135deg,#f59e0b,#ca8a04)' : 'linear-gradient(135deg,#10b981,#059669)', color:'#fff', fontSize:10, fontWeight:800, padding:'6px 14px', borderRadius:99, letterSpacing:'1px', textTransform:'uppercase', zIndex:3, boxShadow: isPopular ? '0 4px 15px rgba(124,58,237,0.4)' : 'none' }}>
                                    {isVerif ? 'FREE' : isPopular ? '⭐ Most Popular' : '🏆 Best Value'}
                                </div>
                            )}

                            {/* Top section */}
                            <div style={{ padding:'14px 16px 10px', textAlign:'center', position:'relative', background:'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ fontSize:32, marginBottom:10 }}>{EMOJI[p]}</div>
                                <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:6, fontFamily:"'Outfit',sans-serif", letterSpacing:'0.3px' }}>{PLAN_LABEL[p]}</div>
                                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5, marginBottom:4 }}>
                                    <span style={{ fontSize:26, fontWeight:950, background:'linear-gradient(180deg,#fff 0%,rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', fontFamily:"'Outfit',sans-serif", letterSpacing:'-1px' }}>₹{price}</span>
                                    {!isVerif && <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)', fontWeight:600 }}>/mo</span>}
                                </div>
                                {!isVerif && billing === 'annually' && (
                                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', textDecoration:'line-through', marginBottom:2 }}>₹{monthlyPrice}/mo</div>
                                )}
                                <div style={{ display:'inline-block', fontSize:11, fontWeight:700, marginTop:6, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', padding:'3px 12px', borderRadius:99, color:'rgba(255,255,255,0.7)', letterSpacing:'0.5px' }}>{note}</div>
                            </div>

                            {/* Features */}
                            <div style={{ padding:'10px 14px 14px', flex:1, display:'flex', flexDirection:'column' }}>
                                <ul style={{ listStyle:'none', margin:'0 0 18px', padding:0, display:'flex', flexDirection:'column', gap:6, flex:1 }}>
                                    {features.map(f => {
                                        const { type, label } = parseFeature(f);
                                        return (
                                            <li key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color: type==='no' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)', fontWeight:500 }}>
                                                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', flexShrink:0,
                                                    background: type==='ok' ? 'rgba(16,185,129,0.1)' : type==='no' ? 'rgba(239,68,68,0.08)' : 'transparent',
                                                    border: type==='ok' ? '1px solid rgba(16,185,129,0.2)' : type==='no' ? '1px solid rgba(239,68,68,0.15)' : 'none',
                                                    color: type==='ok' ? '#10b981' : type==='no' ? '#ef4444' : 'rgba(255,255,255,0.4)', fontSize:10 }}>
                                                    {type==='ok' ? '✓' : type==='no' ? '✕' : type==='soon' ? '◷' : '~'}
                                                </span>
                                                <span>{label}</span>
                                                {type==='soon' && <span style={{ fontSize:9, background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.35)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:4, padding:'1px 6px', fontWeight:700, flexShrink:0, textTransform:'uppercase', letterSpacing:'0.5px', marginLeft:4 }}>Soon</span>}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button onClick={() => onSelect(p, isVerif ? 'monthly' : billing)}
                                    style={{ width:'100%', padding:'11px', background: gradient, color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:850, cursor:'pointer', transition:'all 0.4s cubic-bezier(0.16,1,0.3,1)', fontFamily:'inherit', letterSpacing:'0.8px', textTransform:'uppercase', boxShadow:'0 4px 20px -2px rgba(0,0,0,0.3)', position:'relative', overflow:'hidden' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.filter='brightness(1.1)'; e.currentTarget.style.boxShadow=`0 10px 25px rgba(0,0,0,0.4), 0 0 20px -2px ${planColor}`; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.filter='brightness(1)'; e.currentTarget.style.boxShadow='0 4px 20px -2px rgba(0,0,0,0.3)'; }}>
                                    {isVerif ? 'Start Free Trial' : billing === 'annually' ? `Get ${PLAN_LABEL[p]} — ₹${price*12}/yr` : `Get ${PLAN_LABEL[p]}`}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer note */}
            <div style={{ textAlign:'center', marginTop:40, color:'rgba(255,255,255,0.3)', fontSize:12, position:'relative', zIndex:2 }}>
                Payments secured by Razorpay · UPI · Cards · Netbanking
            </div>
        </div>
    );
}

export default function PaymentPage({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const plan = params.get('plan') || 'verification';

    const [planData, setPlanData] = useState(null);
    const [paying,   setPaying]  = useState(false);
    const [success,  setSuccess] = useState(false);
    const [error,    setError]   = useState('');
    const [billing,  setBilling] = useState('monthly');
    const paymentDone = React.useRef(false);

    const isSelect       = plan === 'select';
    const isVerification = plan === 'verification';

    // Calculate amount based on billing type
    const monthlyAmt = isVerification
        ? (planData?.verificationFee ?? 2)
        : (planData?.plans?.[plan]?.price ?? 0);

    const getAnnualMonthlyPrice = (key, monthly) => {
        const ap = planData?.annualPlans;
        const custom = ap?.[key]?.price;
        if (custom && custom > 0) return custom;
        return Math.round(monthly * (1 - (planData?.annualDiscount ?? 20) / 100));
    };

    const perMonthAmt = (!isVerification && billing === 'annually')
        ? getAnnualMonthlyPrice(plan, monthlyAmt)
        : monthlyAmt;
    const amount = billing === 'annually' && !isVerification ? perMonthAmt * 12 : perMonthAmt;

    const planFeatures = isVerification
        ? (planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : PLAN_FEATURES_FALLBACK.verification)
        : (planData?.plans?.[plan]?.features?.length ? planData.plans[plan].features : (PLAN_FEATURES_FALLBACK[plan] || []));

    // ALL hooks before any early return
    useEffect(() => {
        getPlans().then(r => setPlanData(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (isSelect || !user) return;
        if (plan === 'verification' && user.trialVerified) navigate('/monitoring');
    }, [user, plan, navigate, isSelect]);

    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => navigate('/monitoring'), 2000);
        return () => clearTimeout(t);
    }, [success, navigate]);

    const isNewUnverified = user && user.plan === 'free_trial' && !user.trialVerified;

    const handleCancel = async () => {
        if (!isNewUnverified || paymentDone.current) return;
        try { await deleteMyAccount(); } catch (_) {}
        sessionStorage.removeItem('sm_intended_plan');
        window.location.href = '/register';
    };

    const handlePay = async () => {
        setError('');
        setPaying(true);

        const loaded = await loadRazorpayScript();
        if (!loaded) {
            setError('Payment gateway load failed. Check your internet connection and try again.');
            setPaying(false);
            return;
        }

        let orderData;
        try {
            const res = await createOrder({ plan, billing });
            orderData = res.data;
        } catch (e) {
            setError(e.response?.data?.error || 'Could not create payment order. Please try again.');
            setPaying(false);
            return;
        }

        const options = {
            key:         orderData.keyId,
            amount:      orderData.amount,
            currency:    orderData.currency,
            name:        'UptimeForge',
            description: isVerification ? 'Free Trial Verification' : `${PLAN_LABEL[plan]} Plan`,
            image:       '',
            order_id:    orderData.orderId,
            prefill:     orderData.prefill,
            theme:       { color: '#7c3aed' },
            modal: {
                ondismiss: () => { setPaying(false); handleCancel(); },
            },
            handler: async (response) => {
                try {
                    const res = await verifyPayment({
                        razorpay_order_id:   response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature:  response.razorpay_signature,
                        plan,
                        billing,
                    });
                    // Fetch fresh user data so profile gate doesn't trigger
                    try {
                        const { getMe } = await import('../api');
                        const meRes = await getMe();
                        sessionStorage.removeItem('sm_intended_plan');
                        onUserUpdate?.(meRes.data);
                    } catch {
                        if (res.data.user) {
                            onUserUpdate?.(res.data.user);
                        }
                    }
                    paymentDone.current = true;
                    setSuccess(true);
                } catch (e) {
                    setError(e.response?.data?.error || 'Payment verification failed. Contact support with your payment ID.');
                }
                setPaying(false);
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => {
            setError(`Payment failed: ${resp.error.description}`);
            setPaying(false);
        });
        rzp.open();
    };

    // Plan selection screen — after all hooks
    if (isSelect) {
        return (
            <PlanSelectScreen
                planData={planData}
                user={user}
                onBack={() => navigate(-1)}
                onSelect={(p, selectedBilling) => {
                    setBilling(selectedBilling || 'monthly');
                    navigate(p === 'verification' ? '/pay?plan=verification' : `/pay?plan=${p}`);
                }}
            />
        );
    }

    return (
        <div className="pay-page">
            <div className="pay-card">

                {/* Header */}
                <div className="pay-header" style={{ background: PLAN_GRADIENT[plan] || PLAN_GRADIENT.verification }}>
                    <div className="pay-header-logo"><UWLogo size={32} /></div>
                    <div className="pay-header-plan">{PLAN_LABEL[plan] || plan}</div>
                    <div className="pay-header-amount">
                        {billing === 'annually' && !isVerification ? (
                            <>₹{perMonthAmt}<span>/mo</span></>
                        ) : (
                            <>₹{amount}<span>{isVerification ? ' one-time' : '/month'}</span></>
                        )}
                    </div>
                    {billing === 'annually' && !isVerification && (
                        <div className="pay-header-note">₹{amount} billed annually · {Math.round(100*(1-perMonthAmt/monthlyAmt))}% off</div>
                    )}
                    {isVerification && (
                        <div className="pay-header-note">Non-refundable · Activates 5-day free trial</div>
                    )}
                </div>

                {/* Cancel bar */}
                {!success && (
                    <div className="pay-cancel-bar">
                        <button
                            className="pay-cancel-btn"
                            onClick={() => isNewUnverified ? handleCancel() : navigate('/account')}
                            disabled={paying}
                        >
                            ← Cancel
                        </button>
                    </div>
                )}

                {success ? (
                    <div className="pay-success">
                        <div className="pay-success-icon">✅</div>
                        <h2>{isVerification ? 'Trial Activated!' : `${PLAN_LABEL[plan]} Plan Activated!`}</h2>
                        <p>
                            {isVerification
                                ? 'Your 5-day free trial is now active. Start monitoring your sites!'
                                : `Your ${PLAN_LABEL[plan]} plan is now active.`}
                        </p>
                        <p style={{ fontSize: 13, color: '#94a3b8' }}>
                            Receipt sent to <strong>{user?.email}</strong>
                        </p>
                        {user?.accountId && (
                            <div style={{ background:'#ede9fe', borderRadius:10, padding:'8px 18px', display:'inline-block', marginBottom:8 }}>
                                <span style={{ fontSize:12, color:'#7c3aed', fontWeight:600 }}>Account ID: </span>
                                <span style={{ fontSize:14, fontWeight:800, color:'#6d28d9', fontFamily:'monospace', letterSpacing:1 }}>{user.accountId}</span>
                            </div>
                        )}
                        <div className="pay-success-redirect">Redirecting to dashboard in 2s...</div>
                        <button onClick={() => navigate('/monitoring')} style={{ marginTop:16, padding:'10px 28px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
                            Go to Dashboard →
                        </button>
                    </div>
                ) : (
                    <div className="pay-body">

                        <div className="rzp-summary">
                            <div className="rzp-summary-row">
                                <span>Plan</span>
                                <strong>{PLAN_LABEL[plan] || plan}</strong>
                            </div>
                            <div className="rzp-summary-row">
                                <span>Amount</span>
                                <strong className="rzp-amount">
                                    {billing === 'annually' && !isVerification
                                        ? `₹${amount}/year (₹${perMonthAmt}/mo)`
                                        : `₹${amount}${isVerification ? '' : '/month'}`}
                                </strong>
                            </div>
                            {billing === 'annually' && !isVerification && (
                                <div className="rzp-summary-row">
                                    <span>Billing</span>
                                    <strong style={{ color:'#7c3aed' }}>Annual · Save {Math.round(100*(1-perMonthAmt/monthlyAmt))}%</strong>
                                </div>
                            )}
                            <div className="rzp-summary-row">
                                <span>Pay via</span>
                                <strong>UPI · Cards · Netbanking</strong>
                            </div>
                        </div>

                        {/Android|iPhone|iPad/i.test(navigator.userAgent) && (
                            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#92400e' }}>
                                📱 <strong>Mobile tip:</strong> UPI app open na ho to <strong>QR Code</strong> option use karo ya <strong>Debit/Credit Card</strong> try karo.
                            </div>
                        )}

                        {planFeatures.length > 0 && (
                            <ul className="rzp-features">
                                {planFeatures.map(f => {
                                    const { type, label } = parseFeature(f);
                                    return (
                                    <li key={f} style={{ opacity: type === 'no' ? 0.4 : 1, display:'flex', alignItems:'center', gap:6 }}>
                                        {type === 'ok'      && <svg width="13" height="13" fill="none" stroke="#7c3aed" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>}
                                        {type === 'no'      && <svg width="13" height="13" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                                        {type === 'limited' && <span style={{flexShrink:0}}>😐</span>}
                                        {type === 'soon'    && <span style={{flexShrink:0}}>🔜</span>}
                                        {label}
                                        {type === 'soon' && <span style={{ fontSize:9, background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'1px 5px', marginLeft:2, fontWeight:700 }}>Soon</span>}
                                    </li>
                                    );
                                })}
                            </ul>
                        )}

                        {isVerification && (
                            <div className="rzp-note">
                                ₹2 is a one-time non-refundable verification fee.
                            </div>
                        )}

                        {error && <div className="pay-error">{error}</div>}

                        <button
                            className="rzp-pay-btn"
                            onClick={handlePay}
                            disabled={paying || !planData}
                        >
                            {paying ? (
                                <><span className="rzp-spin"/> Opening payment...</>
                            ) : (
                                <>💳 Pay ₹{amount} Securely</>
                            )}
                        </button>

                        <div className="rzp-secure-row">
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Secured by <strong>Razorpay</strong> · UPI · Visa · Mastercard
                        </div>

                        <div className="pay-footer-note">
                            Logged in as <strong>{user?.email}</strong>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
