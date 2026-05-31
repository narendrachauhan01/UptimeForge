import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlans, createOrder, verifyPayment, deleteMyAccount } from '../api';
import UWLogo from '../components/UWLogo';

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

    return (
        <div className="pss-page">
            <button className="pss-back-btn" onClick={onBack}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Back
            </button>

            <div className="pss-header">
                <UWLogo size={44} />
                <h1 className="pss-title">Choose Your Plan</h1>
                <p className="pss-sub">Welcome, <strong>{user?.name}</strong>! Select a plan to get started.</p>
            </div>

            {/* Monthly / Annually Toggle */}
            <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.08)', borderRadius:50, padding:5 }}>
                    <button onClick={() => setBilling('monthly')} style={{ padding:'9px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s',
                        background: billing==='monthly' ? '#fff' : 'transparent',
                        color: billing==='monthly' ? '#1e293b' : 'rgba(255,255,255,0.6)' }}>
                        Monthly
                    </button>
                    <button onClick={() => setBilling('annually')} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 22px', borderRadius:50, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, transition:'all 0.2s',
                        background: billing==='annually' ? '#fff' : 'transparent',
                        color: billing==='annually' ? '#1e293b' : 'rgba(255,255,255,0.6)' }}>
                        Annually
                        <span style={{ background:'#f59e0b', color:'#fff', fontSize:11, fontWeight:800, padding:'2px 10px', borderRadius:50 }}>Save {discPct}%</span>
                    </button>
                </div>
            </div>

            <div className="pss-cards">
                {PLAN_ORDER.map(p => {
                    const isVerif = p === 'verification';
                    const monthlyPrice = isVerif
                        ? (planData?.verificationFee ?? 2)
                        : (planData?.plans?.[p]?.price ?? { bronze: 499, silver: 999, gold: 1499 }[p]);
                    const price = (!isVerif && billing === 'annually') ? annualPrice(p, monthlyPrice) : monthlyPrice;
                    const features = isVerif
                        ? (planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : PLAN_FEATURES_FALLBACK.verification)
                        : (planData?.plans?.[p]?.features?.length ? planData.plans[p].features : PLAN_FEATURES_FALLBACK[p]);
                    const badge = PLAN_BADGE[p];
                    const accent = PLAN_ACCENT[p];
                    const isPopular = p === 'silver';

                    return (
                        <div key={p} className={`pss-card ${isPopular ? 'pss-card-popular' : ''}`}
                            style={{ '--accent': accent }}>
                            <div className="pss-card-top-bar" style={{ background: PLAN_GRADIENT[p] || `linear-gradient(135deg,${accent},${accent}99)` }} />
                            {badge && (
                                <div className="pss-badge" style={{ background: badge.color }}>
                                    {badge.text}
                                </div>
                            )}
                            <div className="pss-card-icon">
                                {isVerif ? (
                                    <div className="pss-free-tag">₹{price}</div>
                                ) : (
                                    <div style={{ textAlign:'center' }}>
                                        <div className="pss-price-big" style={{ color: accent }}>₹{price}</div>
                                        {billing === 'annually' && <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textDecoration:'line-through' }}>₹{monthlyPrice}/mo</div>}
                                    </div>
                                )}
                            </div>
                            <div className="pss-plan-name">{PLAN_LABEL[p]}</div>
                            {isVerif
                                ? <div className="pss-period">one-time verification</div>
                                : <div className="pss-period">{billing === 'annually' ? 'per month · billed annually' : 'per month'}</div>
                            }
                            {isVerif && <div className="pss-trial-note">5-day free trial · Non-refundable</div>}
                            <ul className="pss-features">
                                {features.map(f => {
                                    const { type, label } = parseFeature(f);
                                    return (
                                        <li key={f} style={{ opacity: type === 'no' ? 0.4 : 1 }}>
                                            {type === 'ok'      && <svg width="13" height="13" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><polyline points="20 6 9 17 4 12"/></svg>}
                                            {type === 'no'      && <svg width="13" height="13" fill="none" stroke="#f87171" strokeWidth="2.5" viewBox="0 0 24 24" style={{flexShrink:0}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                                            {type === 'limited' && <span style={{flexShrink:0, fontSize:12}}>😐</span>}
                                            {type === 'soon'    && <span style={{flexShrink:0, fontSize:11}}>🔜</span>}
                                            <span>{label}</span>
                                            {type === 'soon' && <span style={{ fontSize:9, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', borderRadius:4, padding:'1px 5px', marginLeft:2, fontWeight:700 }}>Soon</span>}
                                        </li>
                                    );
                                })}
                            </ul>
                            <button className="pss-btn" style={{ background: PLAN_GRADIENT[p] || `linear-gradient(135deg,${accent},${accent}cc)` }}
                                onClick={() => onSelect(p, isVerif ? 'monthly' : billing)}>
                                {isVerif ? 'Start Free Trial' : `Get ${PLAN_LABEL[p]}`}
                            </button>
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
    const amount = isVerification
        ? (planData?.verificationFee ?? 2)
        : (planData?.plans?.[plan]?.price ?? 0);

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
        // token cleared via logout API;
        localStorage.removeItem('sm_user');
        localStorage.removeItem('sm_intended_plan');
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
                        localStorage.setItem('sm_user', JSON.stringify(meRes.data));
                        localStorage.removeItem('sm_intended_plan');
                        onUserUpdate?.(meRes.data);
                    } catch {
                        if (res.data.user) {
                            localStorage.setItem('sm_user', JSON.stringify(res.data.user));
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
                        ₹{amount}
                        <span>{isVerification ? ' one-time' : '/month'}</span>
                    </div>
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
                                <strong className="rzp-amount">₹{amount}{isVerification ? '' : '/month'}</strong>
                            </div>
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
                                {planFeatures.map(f => (
                                    <li key={f}>
                                        <svg width="15" height="15" fill="none" stroke="#7c3aed" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                        {f}
                                    </li>
                                ))}
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
