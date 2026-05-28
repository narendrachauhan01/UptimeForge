import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addServer, getPlans } from '../api';

export default function AddMonitor() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', url: 'https://', domainExpiry: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [planInterval, setPlanInterval] = useState(null);
    const [plan, setPlan] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('sm_user') || '{}');
        const p = user?.plan || 'free_trial';
        setPlan(p);
        getPlans().then(r => {
            const s = r.data;
            const iv = p === 'free_trial' ? (s.freeTrialInterval || 300) : (s.plans?.[p]?.interval || 60);
            setPlanInterval(iv);
        }).catch(() => {});
    }, []);

    const intervalLabel = planInterval
        ? planInterval >= 60 ? `${planInterval / 60} minute${planInterval / 60 > 1 ? 's' : ''}` : `${planInterval} seconds`
        : '...';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim()) { setError('Site name is required'); return; }
        if (!form.url.trim() || form.url === 'https://') { setError('URL is required'); return; }
        setSaving(true);
        try {
            await addServer(form);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add monitor');
            if (err.response?.data?.limitReached) setError(`${err.response.data.error} — Upgrade your plan.`);
        }
        setSaving(false);
    };

    return (
        <div className="am-page">
            {/* Top breadcrumb */}
            <div className="am-topbar">
                <button className="am-back" onClick={() => navigate('/dashboard')}>← Monitoring</button>
            </div>

            <div className="am-wrap">
                <h1 className="am-title">Add single monitor <span style={{color:'#7c3aed'}}>.</span></h1>

                <form onSubmit={handleSubmit}>

                    {/* Monitor type */}
                    <div className="am-section">
                        <div className="am-section-label">Monitor type</div>
                        <div className="am-type-box">
                            <div className="am-type-icon">
                                <span style={{background:'#10b981',color:'#fff',padding:'4px 7px',borderRadius:5,fontSize:11,fontWeight:800,fontFamily:'monospace'}}>HTTP</span>
                            </div>
                            <div>
                                <div className="am-type-name">HTTP / website monitoring</div>
                                <div className="am-type-desc">Use HTTP(S) monitor to monitor your website, API endpoint, or anything running on HTTP.</div>
                            </div>
                        </div>
                    </div>

                    {/* Friendly name */}
                    <div className="am-section">
                        <div className="am-section-label">Friendly name</div>
                        <input className="am-input" type="text" placeholder="e.g. My Website"
                            value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
                    </div>

                    {/* URL */}
                    <div className="am-section">
                        <div className="am-section-label">URL to monitor</div>
                        <input className="am-input" type="url" placeholder="https://yoursite.com"
                            value={form.url} onChange={e => setForm({...form, url: e.target.value})} />
                    </div>

                    {/* Monitor interval */}
                    <div className="am-section">
                        <div className="am-section-label">Monitor interval</div>
                        <div className="am-interval-box">
                            <div className="am-interval-info">
                                <span className="am-interval-val">Every {intervalLabel}</span>
                                <span className="am-interval-plan">
                                    {plan === 'free_trial' ? '(Free Trial)' : plan === 'bronze' ? '(Bronze)' : plan === 'silver' ? '(Silver)' : '(Gold)'}
                                </span>
                            </div>
                            <div className="am-interval-sub">Check interval is set by your plan. Upgrade to get faster checks.</div>
                            <div className="am-interval-track">
                                <div className="am-interval-bar" style={{
                                    width: planInterval ? `${Math.min(100, Math.max(5, (1 - planInterval/1440)*100))}%` : '30%'
                                }} />
                                <div className="am-interval-labels">
                                    {['30s','1m','5m','30m','1h','12h','24h'].map(l => (
                                        <span key={l}>{l}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && <div className="am-error">⚠️ {error}</div>}

                    {/* Submit */}
                    <div className="am-footer">
                        <button type="button" className="am-cancel" onClick={() => navigate('/dashboard')}>Cancel</button>
                        <button type="submit" className="am-submit" disabled={saving}>
                            {saving ? 'Creating...' : 'Create monitor →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
