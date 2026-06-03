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
        <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#0f0a1e 0%,#1a0533 50%,#0a1628 100%)', padding:'32px 20px', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>

            {/* Back button */}
            <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.7)', borderRadius:10, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600, marginBottom:32, transition:'all 0.2s' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Back
            </button>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom:36 }}>
                <UWLogo size={48} />
                <h1 style={{ fontSize:32, fontWeight:900, color:'#fff', margin:'16px 0 8px', fontFamily:"'Outfit',sans-serif", letterSpacing:'-0.5px' }}>Choose Your Plan</h1>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.55)', margin:0 }}>Welcome, <strong style={{ color:'#a78bfa' }}>{user?.name}</strong>! Select a plan to get started.</p>
            </div>

            {/* Billing toggle */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:36 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:50, padding:5 }}>
                    <button onClick={() => setBilling('monthly')} style={{ padding:'9px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s', fontFamily:'inherit',
                        background: billing==='monthly' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                        color: billing==='monthly' ? '#fff' : 'rgba(255,255,255,0.5)',
                        boxShadow: billing==='monthly' ? '0 4px 14px rgba(124,58,237,0.4)' : 'none' }}>
                        Monthly
                    </button>
                    <button onClick={() => setBilling('annually')} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s', fontFamily:'inherit',
                        background: billing==='annually' ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'transparent',
                        color: billing==='annually' ? '#fff' : 'rgba(255,255,255,0.5)',
                        boxShadow: billing==='annually' ? '0 4px 14px rgba(124,58,237,0.4)' : 'none' }}>
                        Annually
                        <span style={{ background:'#f59e0b', color:'#78350f', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:50 }}>Save {discPct}%</span>
                    </button>
                </div>
            </div>

            {/* No free trial banner */}
            {user?.noFreeTrial && (
                <div style={{ maxWidth:600, margin:'0 auto 24px', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:20 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'#fbbf24' }}>Free Trial not available</div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>You previously had a UptimeForge account. Please choose a paid plan.</div>
                    </div>
                </div>
            )}

            {/* Plan cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:20, maxWidth:1100, margin:'0 auto' }}>
                {PLAN_ORDER.filter(p => !(p === 'verification' && user?.noFreeTrial)).map(p => {
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

                    return (
                        <div key={p} style={{ position:'relative', borderRadius:20, overflow:'hidden', background:'rgba(255,255,255,0.04)', border: isPopular ? '2px solid #7c3aed' : '1px solid rgba(255,255,255,0.1)', transition:'transform 0.2s, box-shadow 0.2s', boxShadow: isPopular ? '0 0 40px rgba(124,58,237,0.25)' : 'none', display:'flex', flexDirection:'column' }}
                            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=isPopular?'0 16px 50px rgba(124,58,237,0.35)':'0 8px 30px rgba(0,0,0,0.3)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=isPopular?'0 0 40px rgba(124,58,237,0.25)':'none'; }}>

                            {/* Badge */}
                            {(isVerif || isPopular || isGold) && (
                                <div style={{ position:'absolute', top:14, right:14, background: isPopular ? '#7c3aed' : isGold ? '#ca8a04' : '#10b981', color:'#fff', fontSize:11, fontWeight:800, padding:'4px 12px', borderRadius:50, letterSpacing:'0.3px' }}>
                                    {isVerif ? 'FREE' : isPopular ? '⭐ Most Popular' : '🏆 Best Value'}
                                </div>
                            )}

                            {/* Top gradient header */}
                            <div style={{ background: gradient, padding:'28px 24px 20px', textAlign:'center' }}>
                                <div style={{ fontSize:36, marginBottom:8 }}>{EMOJI[p]}</div>
                                <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:4, fontFamily:"'Outfit',sans-serif" }}>{PLAN_LABEL[p]}</div>
                                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:4 }}>
                                    <span style={{ fontSize:36, fontWeight:900, color:'#fff', fontFamily:"'Outfit',sans-serif" }}>₹{price}</span>
                                    {!isVerif && <span style={{ fontSize:13, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>/mo</span>}
                                </div>
                                {!isVerif && billing === 'annually' && (
                                    <>
                                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', textDecoration:'line-through', marginTop:2 }}>₹{monthlyPrice}/mo</div>
                                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.8)', marginTop:2, fontWeight:600 }}>₹{price * 12} billed annually</div>
                                    </>
                                )}
                                <div style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginTop:8, fontWeight:600 }}>{note}</div>
                            </div>

                            {/* Features */}
                            <div style={{ padding:'20px 24px', flex:1, display:'flex', flexDirection:'column', gap:0 }}>
                                <ul style={{ listStyle:'none', margin:'0 0 20px', padding:0, display:'flex', flexDirection:'column', gap:10 }}>
                                    {features.map(f => {
                                        const { type, label } = parseFeature(f);
                                        return (
                                            <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, opacity: type === 'no' ? 0.4 : 1, fontSize:13, color:'rgba(255,255,255,0.8)', fontWeight:500 }}>
                                                {type === 'ok'      && <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}><polyline points="20 6 9 17 4 12"/></svg>}
                                                {type === 'no'      && <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:2}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                                                {type === 'limited' && <span style={{flexShrink:0,fontSize:13,marginTop:-1}}>😐</span>}
                                                {type === 'soon'    && <span style={{flexShrink:0,fontSize:12,marginTop:-1}}>🔜</span>}
                                                <span>{label}</span>
                                                {type === 'soon' && <span style={{ fontSize:9, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:4, padding:'1px 6px', marginLeft:2, fontWeight:700, flexShrink:0 }}>Soon</span>}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button onClick={() => onSelect(p, isVerif ? 'monthly' : billing)}
                                    style={{ width:'100%', padding:'13px', background: gradient, color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:800, cursor:'pointer', transition:'all 0.2s', fontFamily:'inherit', marginTop:'auto', boxShadow:'0 4px 14px rgba(0,0,0,0.2)' }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity='0.88'; e.currentTarget.style.transform='translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='translateY(0)'; }}>
                                    {isVerif ? 'Start Free Trial' : billing === 'annually' ? `Get ${PLAN_LABEL[p]} — ₹${price*12}/yr` : `Get ${PLAN_LABEL[p]}`}
                                </button>
                            </div>
                        </div>
                    );
                })}
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
