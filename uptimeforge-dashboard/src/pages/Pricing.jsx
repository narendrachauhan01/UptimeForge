import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import UWLogo from '../components/UWLogo';
import { getPlans } from '../api';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';

const PLAN_META = {
    free_trial: {
        name: 'Free Trial', priceNote: 'one-time', color: '#64748b',
        gradient: 'linear-gradient(135deg,#64748b,#94a3b8)',
        note: '5-day trial · ₹2 verification fee (non-refundable) · Instant activation',
        cta: 'Start Free Trial', badge: null,
    },
    bronze: {
        name: 'Bronze', priceNote: '/month', color: '#b45309',
        gradient: 'linear-gradient(135deg,#b45309,#d97706)',
        note: 'Instant activation via Razorpay',
        cta: 'Get Bronze', badge: null,
    },
    silver: {
        name: 'Silver', priceNote: '/month', color: '#7c3aed',
        gradient: 'linear-gradient(135deg,#7c3aed,#6d28d9)',
        note: 'Instant activation via Razorpay',
        cta: 'Get Silver', badge: 'Most Popular',
    },
    gold: {
        name: 'Gold', priceNote: '/month', color: '#ca8a04',
        gradient: 'linear-gradient(135deg,#ca8a04,#eab308)',
        note: 'Instant activation via Razorpay',
        cta: 'Get Gold', badge: 'Best Value',
    },
};

export default function Pricing({ user, authed }) {
    const navigate = useNavigate();
    const [planData, setPlanData] = useState(null);

    useEffect(() => {
        getPlans().then(r => setPlanData(r.data)).catch(() => {});
    }, []);

    const plans = [
        {
            key: 'free_trial', ...PLAN_META.free_trial,
            price: `₹${planData?.verificationFee ?? 2}`,
            sites: 2,
            features: planData?.freeTrialFeatures?.length ? planData.freeTrialFeatures : ['2 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain expiry checks', '60s uptime checks', '5-day full access'],
        },
        {
            key: 'bronze', ...PLAN_META.bronze,
            price: `₹${planData?.plans?.bronze?.price ?? 499}`,
            sites: planData?.plans?.bronze?.sites ?? 5,
            features: planData?.plans?.bronze?.features?.length ? planData.plans.bronze.features : ['5 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Performance charts', 'Multi-recipient alerts'],
        },
        {
            key: 'silver', ...PLAN_META.silver,
            price: `₹${planData?.plans?.silver?.price ?? 999}`,
            sites: planData?.plans?.silver?.sites ?? 15,
            features: planData?.plans?.silver?.features?.length ? planData.plans.silver.features : ['15 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Full analytics & charts', 'Server resource monitoring'],
        },
        {
            key: 'gold', ...PLAN_META.gold,
            price: `₹${planData?.plans?.gold?.price ?? 1499}`,
            sites: planData?.plans?.gold?.sites ?? 30,
            features: planData?.plans?.gold?.features?.length ? planData.plans.gold.features : ['30 sites monitored', 'Email + WhatsApp alerts', 'SSL & Domain tracking', 'Advanced analytics', 'Priority support'],
        },
    ];

    const handleCta = (plan) => {
        if (plan.key !== 'free_trial') sessionStorage.setItem('sm_intended_plan', plan.key);
        else sessionStorage.removeItem('sm_intended_plan');

        if (authed) {
            navigate(plan.key === 'free_trial' ? '/pay?plan=verification' : `/pay?plan=${plan.key}`);
        } else {
            navigate('/register');
        }
    };

    return (
        <div className="pricing-page">
            <div className="pricing-hero">
                <a href={LANDING_URL} className="pricing-brand-link">
                    <UWLogo size={40} />
                    <span className="pricing-brand-name">UptimeForge</span>
                </a>
                <h1 className="pricing-title">Simple, transparent pricing</h1>
                <p className="pricing-sub">Start with a 5-day free trial. Pay ₹{planData?.verificationFee ?? 2} via Razorpay (UPI/Card/Netbanking/Wallet) to verify. Upgrade anytime — instant activation.</p>
            </div>

            <div className="pricing-grid">
                {plans.map(plan => (
                    <div key={plan.key} className={`plan-card${plan.badge === 'Most Popular' ? ' plan-popular' : ''}`}>
                        {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                        <div className="plan-header" style={{ background: plan.gradient }}>
                            <div className="plan-name">{plan.name}</div>
                            <div className="plan-price-row">
                                <span className="plan-price">{plan.price}</span>
                                <span className="plan-period">{plan.priceNote}</span>
                            </div>
                            <div className="plan-sites">{plan.sites} sites included</div>
                        </div>
                        <div className="plan-body">
                            <div className="plan-note">{plan.note}</div>
                            <ul className="plan-features">
                                {plan.features.map(f => (
                                    <li key={f}><span className="plan-check">✓</span> {f}</li>
                                ))}
                            </ul>
                            <button
                                className="plan-cta"
                                style={{ background: plan.gradient }}
                                onClick={() => handleCta(plan)}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pricing-footer">
                Already have an account?{' '}
                <button className="pricing-login-link" onClick={() => navigate('/login')}>Sign in</button>
            </div>
        </div>
    );
}
