import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPlans, createOrder, verifyPayment, deleteMyAccount } from '../api';
import UWLogo from '../components/UWLogo';

const PLAN_LABEL = {
    bronze:       'Bronze',
    silver:       'Silver',
    gold:         'Gold',
    verification: 'Free Trial Verification',
};
const PLAN_GRADIENT = {
    bronze:       'linear-gradient(135deg,#b45309,#d97706)',
    silver:       'linear-gradient(135deg,#475569,#64748b)',
    gold:         'linear-gradient(135deg,#ca8a04,#eab308)',
    verification: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
};
const PLAN_FEATURES_FALLBACK = {
    verification: ['5-day free trial', 'Email + WhatsApp alerts', 'SSL & Domain monitoring', '2 sites included'],
    bronze:       ['5 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Performance charts'],
    silver:       ['15 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Full analytics'],
    gold:         ['30 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Priority support'],
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
const PLAN_ICON  = { verification: '🆓', bronze: '🥉', silver: '🥈', gold: '🥇' };

function PlanSelectScreen({ planData, user, onSelect }) {
    return (
        <div className="pay-page">
            <div className="pay-select-wrap">
                <div className="pay-select-header">
                    <UWLogo size={36} />
                    <h2>Choose Your Plan</h2>
                    <p>Welcome, <strong>{user?.name}</strong>! Select a plan to get started.</p>
                </div>
                <div className="pay-select-cards">
                    {PLAN_ORDER.map(p => {
                        const isVerif = p === 'verification';
                        const price = isVerif
                            ? (planData?.verificationFee ?? 2)
                            : (planData?.plans?.[p]?.price ?? 0);
                        const features = isVerif
                            ? (planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : PLAN_FEATURES_FALLBACK.verification)
                            : (planData?.plans?.[p]?.features?.length ? planData.plans[p].features : PLAN_FEATURES_FALLBACK[p]);
                        return (
                            <div key={p} className={`pay-select-card ${p === 'silver' ? 'pay-select-popular' : ''}`}>
                                {p === 'silver' && <div className="pay-select-badge">Most Popular</div>}
                                <div className="pay-select-icon">{PLAN_ICON[p]}</div>
                                <div className="pay-select-name">{PLAN_LABEL[p]}</div>
                                <div className="pay-select-price">
                                    ₹{price}
                                    <span>{isVerif ? ' one-time' : '/month'}</span>
                                </div>
                                {isVerif && <div style={{fontSize:11,color:'#a78bfa',marginBottom:8,textAlign:'center'}}>5-day free trial · Non-refundable</div>}
                                <ul className="pay-select-features">
                                    {features.map(f => <li key={f}><span>✓</span>{f}</li>)}
                                </ul>
                                <button
                                    className="pay-select-btn"
                                    style={{ background: PLAN_GRADIENT[p] }}
                                    onClick={() => onSelect(p)}
                                >
                                    {isVerif ? 'Start Free Trial' : `Get ${PLAN_LABEL[p]}`}
                                </button>
                            </div>
                        );
                    })}
                </div>
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
    const paymentDone = React.useRef(false);

    const isSelect       = plan === 'select';
    const isVerification = plan === 'verification';
    const amount = isVerification
        ? (planData?.verificationFee ?? 2)
        : (planData?.plans?.[plan]?.price ?? 0);

    const planFeatures = isVerification
        ? (planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : PLAN_FEATURES_FALLBACK.verification)
        : (planData?.plans?.[plan]?.features?.length ? planData.plans[plan].features : (PLAN_FEATURES_FALLBACK[plan] || []));

    useEffect(() => {
        getPlans().then(r => setPlanData(r.data)).catch(() => {});
    }, []);

    // Plan selection screen for new Google users
    if (isSelect) {
        return <PlanSelectScreen
            planData={planData}
            user={user}
            onSelect={(p) => navigate(p === 'verification' ? '/pay?plan=verification' : `/pay?plan=${p}`)}
        />;
    }

    // Redirect if already verified (on verification plan)
    useEffect(() => {
        if (!user) return;
        if (plan === 'verification' && user.trialVerified) navigate('/dashboard');
    }, [user, plan, navigate]);

    // Auto-redirect to dashboard after success
    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => navigate('/dashboard'), 4000);
        return () => clearTimeout(t);
    }, [success, navigate]);

    const isNewUnverified = user && user.plan === 'free_trial' && !user.trialVerified;

    const handleCancel = async () => {
        if (!isNewUnverified || paymentDone.current) return;
        try { await deleteMyAccount(); } catch (_) {}
        localStorage.removeItem('sm_token');
        localStorage.removeItem('sm_user');
        localStorage.removeItem('sm_intended_plan');
        window.location.href = '/register';
    };

    const handlePay = async () => {
        setError('');
        setPaying(true);

        // Load Razorpay JS
        const loaded = await loadRazorpayScript();
        if (!loaded) {
            setError('Payment gateway load failed. Check your internet connection and try again.');
            setPaying(false);
            return;
        }

        // Create order on backend
        let orderData;
        try {
            const res = await createOrder({ plan });
            orderData = res.data;
        } catch (e) {
            setError(e.response?.data?.error || 'Could not create payment order. Please try again.');
            setPaying(false);
            return;
        }

        // Open Razorpay checkout
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
                // Payment done — verify with backend
                try {
                    const res = await verifyPayment({
                        razorpay_order_id:   response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature:  response.razorpay_signature,
                        plan,
                    });
                    if (res.data.token) {
                        localStorage.setItem('sm_token', res.data.token);
                        localStorage.setItem('sm_user', JSON.stringify(res.data.user));
                        localStorage.removeItem('sm_intended_plan');
                        onUserUpdate?.(res.data.user);
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

    return (
        <div className="pay-page">
            <div className="pay-card">

                {/* ── Header ── */}
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

                {/* ── Cancel bar ── */}
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
                    /* ── Success ── */
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
                        <div className="pay-success-redirect">Redirecting to dashboard in 4s...</div>
                    </div>
                ) : (
                    /* ── Payment body ── */
                    <div className="pay-body">

                        {/* Plan summary */}
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

                        {/* Features included */}
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

                        {/* Pay button */}
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
