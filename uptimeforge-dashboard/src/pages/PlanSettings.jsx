import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

const PLAN_EMOJI    = { bronze: '🥉',      silver: '🥈',      gold: '🥇'    };
const PLAN_LABEL    = { bronze: 'Bronze',  silver: 'Silver',  gold: 'Gold'   };

const PLAN_SETTINGS_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Light Theme Scope */
  .perf-page-container.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
    --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
    --input-focus-shadow: rgba(124, 58, 237, 0.08);
  }

  /* Dark Theme Scope */
  .perf-page-container.dark {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.07);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
    --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
    --input-focus-shadow: rgba(139, 92, 246, 0.15);
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  /* Layout and elements */
  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }
  
  .perf-page-container .pg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .perf-page-container .pg-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
  }
  
  .perf-page-container .pg-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  /* Style inputs dynamically using classes or variables */
  .perf-page-container .form-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--card-shadow);
    margin-bottom: 24px;
  }
  
  .perf-page-container .form-card-title {
    font-family: 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  
  .perf-page-container .form-card-sub {
    font-size: 13.5px;
    color: var(--text-muted);
    margin-bottom: 20px;
  }
  
  .perf-page-container .custom-label {
    font-size: 12.5px;
    font-weight: 700;
    color: var(--text-muted);
    display: block;
    margin-bottom: 6px;
  }
  
  .perf-page-container .custom-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border-color) !important;
    border-radius: 8px;
    font-size: 13.5px;
    color: var(--text-main) !important;
    background: var(--bg-input) !important;
    box-sizing: border-box;
    outline: none;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  
  .perf-page-container .custom-input:focus {
    border-color: var(--primary) !important;
    background: var(--bg-card) !important;
    box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
  }
  
  .perf-page-container .custom-textarea {
    width: 100%;
    min-height: 120px;
    padding: 10px 14px;
    border: 1px solid var(--border-color) !important;
    border-radius: 8px;
    font-size: 12.5px;
    font-family: monospace;
    line-height: 1.7;
    resize: vertical;
    box-sizing: border-box;
    color: var(--text-main) !important;
    background: var(--bg-input) !important;
    outline: none;
    transition: all 0.2s ease;
  }
  
  .perf-page-container .custom-textarea:focus {
    border-color: var(--primary) !important;
    background: var(--bg-card) !important;
    box-shadow: 0 0 0 4px var(--input-focus-shadow) !important;
  }
  
  .perf-page-container .hint-text {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 4px;
    display: block;
  }
  
  /* Paid Plans grid layout */
  .perf-page-container .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .perf-page-container .plan-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s;
  }
  
  .perf-page-container .plan-header {
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .perf-page-container .plan-title {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 16px;
  }
  
  .perf-page-container .plan-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
  }
  
  .perf-page-container .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }
  
  .perf-page-container .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
  
  .perf-page-container .toast-box {
    border-radius: 10px;
    padding: 12px 18px;
    margin-bottom: 24px;
    font-weight: 700;
    font-size: 14px;
  }
`;

export default function PlanSettings({ readOnly = false }) {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    useEffect(() => {
        adminGetSettings().then(r => {
            const d = r.data;
            setForm({
                trialDays: d.trialDays,
                verificationFee: d.verificationFee ?? 2,
                annualDiscount: d.annualDiscount ?? 20,
                freeTrialSiteLimit: d.freeTrialSiteLimit ?? 2,
                freeTrialInterval: d.freeTrialInterval ?? 300,
                freeTrialPingInterval: d.freeTrialPingInterval ?? 180,
                freeTrialPingLimit: d.freeTrialPingLimit ?? 2,
                freeTrialRecipientLimit: d.freeTrialRecipientLimit ?? 2,
                freeTrialFeatures: (d.freeTrialFeatures || []).join('\n'),
                plans: {
                    bronze: { price: d.plans.bronze.price, sites: d.plans.bronze.sites, interval: d.plans.bronze.interval ?? 120, pingInterval: d.plans.bronze.pingInterval ?? 120, pingLimit: d.plans.bronze.pingLimit ?? 5,  recipientLimit: d.plans.bronze.recipientLimit ?? 10, features: (d.plans.bronze.features || []).join('\n') },
                    silver: { price: d.plans.silver.price, sites: d.plans.silver.sites, interval: d.plans.silver.interval ?? 60,  pingInterval: d.plans.silver.pingInterval ?? 60,  pingLimit: d.plans.silver.pingLimit ?? 15, recipientLimit: d.plans.silver.recipientLimit ?? 20, features: (d.plans.silver.features || []).join('\n') },
                    gold:   { price: d.plans.gold.price,   sites: d.plans.gold.sites,   interval: d.plans.gold.interval   ?? 30,  pingInterval: d.plans.gold.pingInterval   ?? 30,  pingLimit: d.plans.gold.pingLimit   ?? 30, recipientLimit: d.plans.gold.recipientLimit   ?? 30, features: (d.plans.gold.features   || []).join('\n') },
                },
            });
        }).catch(() => showToast('Failed to load settings'));
    }, []);

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

    const setPlanField = (plan, field, val) =>
        setForm(prev => ({
            ...prev,
            plans: { ...prev.plans, [plan]: { ...prev.plans[plan], [field]: field === 'features' ? val : Number(val) } },
        }));

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateSettings({
                trialDays: form.trialDays,
                verificationFee: form.verificationFee,
                annualDiscount: Number(form.annualDiscount),
                freeTrialInterval: Number(form.freeTrialInterval),
                freeTrialSiteLimit: Number(form.freeTrialSiteLimit),
                freeTrialPingInterval: Number(form.freeTrialPingInterval),
                freeTrialPingLimit: Number(form.freeTrialPingLimit),
                freeTrialRecipientLimit: Number(form.freeTrialRecipientLimit),
                freeTrialFeatures: form.freeTrialFeatures.split('\n').map(s => s.trim()).filter(Boolean),
                plans: {
                    bronze: { price: form.plans.bronze.price, sites: form.plans.bronze.sites, interval: Number(form.plans.bronze.interval), pingInterval: Number(form.plans.bronze.pingInterval), pingLimit: Number(form.plans.bronze.pingLimit), recipientLimit: Number(form.plans.bronze.recipientLimit), features: form.plans.bronze.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    silver: { price: form.plans.silver.price, sites: form.plans.silver.sites, interval: Number(form.plans.silver.interval), pingInterval: Number(form.plans.silver.pingInterval), pingLimit: Number(form.plans.silver.pingLimit), recipientLimit: Number(form.plans.silver.recipientLimit), features: form.plans.silver.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    gold:   { price: form.plans.gold.price,   sites: form.plans.gold.sites,   interval: Number(form.plans.gold.interval),   pingInterval: Number(form.plans.gold.pingInterval),   pingLimit: Number(form.plans.gold.pingLimit),   recipientLimit: Number(form.plans.gold.recipientLimit),   features: form.plans.gold.features.split('\n').map(s => s.trim()).filter(Boolean) },
                },
            });
            showToast('✅ Settings saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    if (!form) return (
        <div className="perf-page-container">
            <style>{PLAN_SETTINGS_STYLES}</style>
            <div className="pg-wrap">
                <p style={{ color: 'var(--text-muted)', padding: 40, fontSize: 14 }}>Loading settings...</p>
            </div>
        </div>
    );

    const isDark = localTheme === 'dark';
    const isSuccess = toast.startsWith('✅');

    const PLAN_THEME = {
        bronze: isDark 
            ? { bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.2)', color: '#F59E0B' }
            : { bg: '#FEF3C7', border: 'rgba(180, 83, 9, 0.15)', color: '#B45309' },
        silver: isDark
            ? { bg: 'rgba(148, 163, 184, 0.08)', border: 'rgba(148, 163, 184, 0.2)', color: '#CBD5E1' }
            : { bg: '#F1F5F9', border: 'rgba(71, 85, 105, 0.15)', color: '#475569' },
        gold: isDark
            ? { bg: 'rgba(250, 204, 21, 0.08)', border: 'rgba(250, 204, 21, 0.2)', color: '#FACC15' }
            : { bg: '#FEF9C3', border: 'rgba(202, 138, 4, 0.15)', color: '#CA8A04' }
    };

    const getToastStyle = () => {
        if (!toast) return {};
        if (isSuccess) {
            return isDark
                ? { background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981' }
                : { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' };
        } else {
            return isDark
                ? { background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#F43F5E' }
                : { background: '#FEF2F2', border: '1px solid #FECDD3', color: '#DC2626' };
        }
    };

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{PLAN_SETTINGS_STYLES}</style>
            
            <div className="pg-wrap">
                {/* Page Header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Plan Settings <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">
                            Configure pricing, limits and features for each plan
                        </p>
                    </div>
                    {readOnly
                        ? <span style={{ fontSize:12, fontWeight:700, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'7px 14px' }}>👁 Read Only</span>
                        : <button onClick={save} disabled={saving} className="btn-primary">
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                    }
                </div>

                {/* Toast */}
                {toast && (
                    <div className="toast-box" style={getToastStyle()}>
                        {toast}
                    </div>
                )}

                {/* Free Trial card */}
                <div className="form-card">
                    <div className="form-card-title">
                        Free Trial
                    </div>
                    <div className="form-card-sub">
                        Applied to all new registrations
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                        <div>
                            <label className="custom-label">Trial Duration (days)</label>
                            <input
                                type="number" min="1"
                                value={form.trialDays}
                                disabled={readOnly} onChange={e => setForm({ ...form, trialDays: Number(e.target.value) })}
                                className="custom-input"
                            />
                        </div>
                        <div>
                            <label className="custom-label">Verification Fee (₹)</label>
                            <input
                                type="number" min="0"
                                value={form.verificationFee}
                                disabled={readOnly} onChange={e => setForm({ ...form, verificationFee: Number(e.target.value) })}
                                className="custom-input"
                            />
                        </div>
                        <div>
                            <label className="custom-label">Max Sites</label>
                            <input type="number" min="1"
                                value={form.freeTrialSiteLimit}
                                disabled={readOnly} onChange={e => setForm({ ...form, freeTrialSiteLimit: Number(e.target.value) })}
                                className="custom-input" />
                            <span className="hint-text">Max sites Free Trial user can add</span>
                        </div>
                        <div>
                            <label className="custom-label">Site Check Interval (sec)</label>
                            <input
                                type="number" min="60" step="30"
                                value={form.freeTrialInterval}
                                disabled={readOnly} onChange={e => setForm({ ...form, freeTrialInterval: Number(e.target.value) })}
                                className="custom-input"
                            />
                            <span className="hint-text">{Math.floor(form.freeTrialInterval / 60)} min per check</span>
                        </div>
                        <div>
                            <label className="custom-label">Ping Interval (sec)</label>
                            <input type="number" min="30" step="30" value={form.freeTrialPingInterval}
                                disabled={readOnly} onChange={e => setForm({ ...form, freeTrialPingInterval: Number(e.target.value) })} className="custom-input" />
                            <span className="hint-text">{Math.floor(form.freeTrialPingInterval / 60)} min per ping</span>
                        </div>
                        <div>
                            <label className="custom-label">Max Ping Targets</label>
                            <input type="number" min="0" value={form.freeTrialPingLimit}
                                disabled={readOnly} onChange={e => setForm({ ...form, freeTrialPingLimit: Number(e.target.value) })} className="custom-input" />
                            <span className="hint-text">Free Trial ping target limit</span>
                        </div>
                        <div>
                            <label className="custom-label">Max Recipients</label>
                            <input
                                type="number" min="1"
                                value={form.freeTrialRecipientLimit}
                                disabled={readOnly} onChange={e => setForm({ ...form, freeTrialRecipientLimit: Number(e.target.value) })}
                                className="custom-input"
                            />
                        </div>
                    </div>
                    <div style={{ marginTop: 20 }}>
                        <label className="custom-label">
                            Features <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(one per line · format: ok/no/limited/soon:text)</span>
                        </label>
                        <textarea
                            value={form.freeTrialFeatures}
                            disabled={readOnly} onChange={e => setForm({ ...form, freeTrialFeatures: e.target.value })}
                            className="custom-textarea"
                            placeholder="ok:2 sites monitored&#10;limited:5 min check interval&#10;no:SSL expiry monitoring"
                        />
                    </div>
                </div>

                {/* Paid Plans grid */}
                <div className="plans-grid">
                    {['bronze', 'silver', 'gold'].map(pk => (
                        <div key={pk} className="plan-card">
                            {/* Plan header bar */}
                            <div 
                                className="plan-header"
                                style={{
                                    background: PLAN_THEME[pk].bg,
                                    borderBottom: `1px solid ${PLAN_THEME[pk].border}`
                                }}
                            >
                                <span style={{ fontSize: 20 }}>{PLAN_EMOJI[pk]}</span>
                                <span className="plan-title" style={{ color: PLAN_THEME[pk].color }}>
                                    {PLAN_LABEL[pk]} Plan
                                </span>
                            </div>

                            <div className="plan-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label className="custom-label">Price (₹/month)</label>
                                        <input
                                            type="number" min="0"
                                            value={form.plans[pk].price}
                                            onChange={e => setPlanField(pk, 'price', e.target.value)}
                                            className="custom-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="custom-label">Max Sites</label>
                                        <input
                                            type="number" min="1"
                                            value={form.plans[pk].sites}
                                            onChange={e => setPlanField(pk, 'sites', e.target.value)}
                                            className="custom-input"
                                        />
                                    </div>
                                    <div>
                                        <label className="custom-label">Site Check Interval (sec)</label>
                                        <input
                                            type="number" min="30" step="30"
                                            value={form.plans[pk].interval}
                                            onChange={e => setPlanField(pk, 'interval', e.target.value)}
                                            className="custom-input"
                                        />
                                        <span className="hint-text">
                                            {form.plans[pk].interval >= 60 ? `${form.plans[pk].interval / 60}m` : `${form.plans[pk].interval}s`} per check
                                        </span>
                                    </div>
                                    <div>
                                        <label className="custom-label">Ping Interval (sec)</label>
                                        <input
                                            type="number" min="30" step="30"
                                            value={form.plans[pk].pingInterval}
                                            onChange={e => setPlanField(pk, 'pingInterval', e.target.value)}
                                            className="custom-input"
                                        />
                                        <span className="hint-text">
                                            {form.plans[pk].pingInterval >= 60 ? `${form.plans[pk].pingInterval / 60}m` : `${form.plans[pk].pingInterval}s`} per ping
                                        </span>
                                    </div>
                                    <div>
                                        <label className="custom-label">Max Ping Targets</label>
                                        <input type="number" min="0"
                                            value={form.plans[pk].pingLimit}
                                            onChange={e => setPlanField(pk, 'pingLimit', e.target.value)}
                                            className="custom-input" />
                                    </div>
                                    <div>
                                        <label className="custom-label">Max Recipients</label>
                                        <input type="number" min="1"
                                            value={form.plans[pk].recipientLimit}
                                            onChange={e => setPlanField(pk, 'recipientLimit', e.target.value)}
                                            className="custom-input" />
                                    </div>
                                </div>
                                <div>
                                    <label className="custom-label">Features (one per line)</label>
                                    <textarea
                                        value={form.plans[pk].features}
                                        onChange={e => setPlanField(pk, 'features', e.target.value)}
                                        className="custom-textarea"
                                        style={{ minHeight: 180 }}
                                        placeholder={`ok:${form.plans[pk].sites} sites monitored\nok:Email alerts\nno:SSL expiry monitoring`}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Save footer */}
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                    {!readOnly && (
                        <button onClick={save} disabled={saving} className="btn-primary" style={{ padding: '12px 30px', fontSize: 14 }}>
                            {saving ? 'Saving...' : 'Save All Settings'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
