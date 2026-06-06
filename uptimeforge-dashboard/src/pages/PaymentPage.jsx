import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlans, createOrder, verifyPayment, markAbandoned } from '../api';
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
};function PlanSelectScreen({ planData, user, onSelect, onBack }) {
    const [billing, setBilling] = useState('monthly');
    const discPct = planData?.annualDiscount ?? 20;
    const ap = planData?.annualPlans;
    const annualPrice = (key, monthly) => {
        const custom = ap?.[key]?.price;
        if (custom && custom > 0) return custom;
        return Math.round(monthly * (1 - discPct / 100));
    };
    const EMOJI = { verification:'🆓', bronze: '🥉', silver: '🥈', gold: '🥇' };

    return (
        <div className="pricing-page-container">
            {/* Background Glows */}
            <div className="pricing-glow-1" />
            <div className="pricing-glow-2" />

            {/* Back button */}
            <div style={{ position: 'relative', zIndex: 10, marginBottom: 8 }}>
                <button onClick={onBack} className="pricing-back-btn">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 5l-7 7 7 7"/>
                    </svg>
                    Back to Dashboard
                </button>
            </div>

            {/* Header */}
            <div className="pricing-header" style={{ textAlign: 'center', marginBottom: 14, position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                    <UWLogo size={36} />
                </div>
                <h1>Choose Your Plan</h1>
                <p style={{ fontSize: 15, color: 'var(--pricing-card-text-muted)', margin: 0 }}>
                    Welcome, <span className="pricing-welcome-user">{user?.name}</span>! Upgrade to unlock premium monitoring features.
                </p>
            </div>

            {/* Billing Toggle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative', zIndex: 10 }}>
                <div className="pricing-toggle-wrap">
                    <button 
                        onClick={() => setBilling('monthly')} 
                        className={`pricing-toggle-btn ${billing === 'monthly' ? 'active' : ''}`}
                    >
                        Monthly
                    </button>
                    <button 
                        onClick={() => setBilling('annually')} 
                        className={`pricing-toggle-btn ${billing === 'annually' ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center' }}
                    >
                        Annually
                        <span className="pricing-discount-badge">Save {discPct}%</span>
                    </button>
                </div>
            </div>

            {/* No free trial banner */}
            {user?.noFreeTrial && (
                <div style={{ maxWidth: 640, margin: '0 auto 28px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 14, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 10 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#fbbf24' }}>Free Trial not available</div>
                        <div style={{ fontSize: 12, color: 'var(--pricing-card-text-muted)', marginTop: 2 }}>You previously had an active free trial. Please select a premium plan.</div>
                    </div>
                </div>
            )}

            {/* Plan cards */}
            <div className="pricing-grid">
                {PLAN_ORDER.filter(p => {
                    if (p === 'verification') {
                        // Hide free trial if: re-registered user, already used free trial, or already has/had a paid plan
                        if (user?.noFreeTrial) return false;
                        if (user?.trialVerified) return false;
                        if (user?.plan && user.plan !== 'free_trial') return false;
                        return true; // new user — show free trial
                    }
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
                    const note      = isVerif ? '5-day trial · one-time ₹2 verification' : `${sites} sites`;
                    const gradient  = PLAN_GRADIENT[p] || 'linear-gradient(135deg,#7c3aed,#6d28d9)';
                    const planColor = PLAN_COLOR_MAP[p] || '#7c3aed';

                    return (
                        <div 
                            key={p} 
                            className={`pricing-card ${isPopular ? 'pricing-card-popular' : ''}`}
                        >
                            {/* Card top gradient glow */}
                            <div 
                                className="pricing-card-glow" 
                                style={{ background: `radial-gradient(circle, ${planColor} 0%, transparent 70%)` }} 
                            />

                            {/* Badge */}
                            {(isPopular || isGold) && (
                                <div 
                                    className="pricing-card-badge" 
                                    style={{ background: isPopular ? 'linear-gradient(135deg,#c084fc,#7c3aed)' : 'linear-gradient(135deg,#f59e0b,#ca8a04)' }}
                                >
                                    {isPopular ? '⭐ Popular' : '🏆 Value'}
                                </div>
                            )}

                            {/* Top section */}
                            <div className="pricing-card-top" style={{ background: gradient }}>
                                <div className="pricing-card-emoji">{EMOJI[p]}</div>
                                <div className="pricing-card-name">{PLAN_LABEL[p]}</div>
                                <div className="pricing-card-price-row">
                                    <span className="pricing-card-price">₹{price}</span>
                                    <span className="pricing-card-period">/mo</span>
                                </div>
                                {billing === 'annually' && (
                                    <div className="pricing-card-original-price">₹{monthlyPrice}/mo if billed monthly</div>
                                )}
                                <div className="pricing-card-limit-badge">{note}</div>
                            </div>

                            {/* Features and CTA */}
                            <div className="pricing-card-body">
                                <ul className="pricing-features-list">
                                    {features.map(f => {
                                        const { type, label } = parseFeature(f);
                                        return (
                                            <li 
                                                key={f} 
                                                className={`pricing-feature-item ${type === 'no' ? 'muted' : ''}`}
                                            >
                                                <span className={`pricing-feature-icon ${type}`}>
                                                    {type === 'ok' ? '✓' : type === 'no' ? '✕' : type === 'soon' ? '◷' : '~'}
                                                </span>
                                                <span>{label}</span>
                                                {type === 'soon' && <span className="pricing-soon-tag">Soon</span>}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button
                                    onClick={() => onSelect(p, isVerif ? 'monthly' : billing)}
                                    className="pricing-card-btn"
                                    style={{ background: gradient }}
                                >
                                    {isVerif ? 'Start Free Trial — ₹2' : billing === 'annually' ? `Get ${PLAN_LABEL[p]} — ₹${price * 12}/yr` : `Get ${PLAN_LABEL[p]}`}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer note */}
            <div className="pricing-bottom-secure">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ verticalAlign: 'middle' }}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Payments secured by Razorpay · UPI · Cards · Netbanking</span>
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
    const paymentDone   = React.useRef(false);
    const paymentFailed = React.useRef(false);

    const isSelect       = plan === 'select';
    const isVerification = plan === 'verification';

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

    useEffect(() => {
        const checkThemeCookie = () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const current = match ? match[1] : 'dark';
            if (current !== localTheme) {
                setLocalTheme(current);
            }
        };
        checkThemeCookie();
        const interval = setInterval(checkThemeCookie, 1000);
        return () => clearInterval(interval);
    }, [localTheme]);

    useEffect(() => {
        if (localTheme === 'dark') {
            document.body.classList.add('charts-dark-theme');
        } else {
            document.body.classList.remove('charts-dark-theme');
        }
        return () => {
            document.body.classList.remove('charts-dark-theme');
        };
    }, [localTheme]);

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
        // Full reload ensures fresh auth state after payment
        const t = setTimeout(() => { window.location.href = '/performance'; }, 2000);
        return () => clearTimeout(t);
    }, [success]);

    const isNewUnverified = user && user.plan === 'free_trial' && !user.trialVerified;

    const handleCancel = async () => {
        if (!isNewUnverified || paymentDone.current) return;
        try { await markAbandoned('payment_cancelled'); } catch (_) {}
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
                ondismiss: () => {
                    setPaying(false);
                    // Payment failed (technical error) → don't delete account, just show error
                    if (paymentFailed.current) {
                        paymentFailed.current = false;
                        return;
                    }
                    // User deliberately closed without paying → cancel flow
                    handleCancel();
                },
            },
            handler: async (response) => {
                try {
                    const res = await verifyPayment({
                        razorpay_order_id:   response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature:  response.razorpay_signature,
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
            paymentFailed.current = true;
            setError(`Payment failed: ${resp.error.description}. Please try again.`);
            setPaying(false);
            if (isNewUnverified) markAbandoned('payment_failed').catch(() => {});
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
                        <button onClick={() => { window.location.href = '/performance'; }} style={{ marginTop:16, padding:'10px 28px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
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
