import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

const PLAN_COLORS   = { bronze: '#B45309', silver: '#475569', gold: '#CA8A04' };
const PLAN_BG       = { bronze: '#FEF3C7', silver: '#F1F5F9', gold: '#FEF9C3' };
const PLAN_LABEL    = { bronze: 'Bronze',  silver: 'Silver',  gold: 'Gold'   };
const PLAN_EMOJI    = { bronze: '🥉',      silver: '🥈',      gold: '🥇'    };

const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    fontSize: 14,
    color: '#111827',
    background: '#fff',
    boxSizing: 'border-box',
    outline: 'none',
};

const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    display: 'block',
    marginBottom: 6,
};

const hintStyle = {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    display: 'block',
};

export default function PlanSettings({ readOnly = false }) {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    useEffect(() => {
        adminGetSettings().then(r => {
            const d = r.data;
            setForm({
                trialDays: d.trialDays,
                verificationFee: d.verificationFee ?? 2,
                annualDiscount: d.annualDiscount ?? 20,
                freeTrialInterval: d.freeTrialInterval ?? 300,
                freeTrialPingInterval: d.freeTrialPingInterval ?? 180,
                freeTrialRecipientLimit: d.freeTrialRecipientLimit ?? 2,
                freeTrialFeatures: (d.freeTrialFeatures || []).join('\n'),
                plans: {
                    bronze: { price: d.plans.bronze.price, sites: d.plans.bronze.sites, interval: d.plans.bronze.interval ?? 120, pingInterval: d.plans.bronze.pingInterval ?? 120, recipientLimit: d.plans.bronze.recipientLimit ?? 10, features: (d.plans.bronze.features || []).join('\n') },
                    silver: { price: d.plans.silver.price, sites: d.plans.silver.sites, interval: d.plans.silver.interval ?? 60,  pingInterval: d.plans.silver.pingInterval ?? 60,  recipientLimit: d.plans.silver.recipientLimit ?? 20, features: (d.plans.silver.features || []).join('\n') },
                    gold:   { price: d.plans.gold.price,   sites: d.plans.gold.sites,   interval: d.plans.gold.interval   ?? 30,  pingInterval: d.plans.gold.pingInterval   ?? 30,  recipientLimit: d.plans.gold.recipientLimit   ?? 30, features: (d.plans.gold.features   || []).join('\n') },
                },
            });
        }).catch(() => showToast('Failed to load settings'));
    }, []);

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
                freeTrialPingInterval: Number(form.freeTrialPingInterval),
                freeTrialRecipientLimit: Number(form.freeTrialRecipientLimit),
                freeTrialFeatures: form.freeTrialFeatures.split('\n').map(s => s.trim()).filter(Boolean),
                plans: {
                    bronze: { price: form.plans.bronze.price, sites: form.plans.bronze.sites, interval: Number(form.plans.bronze.interval), pingInterval: Number(form.plans.bronze.pingInterval), recipientLimit: Number(form.plans.bronze.recipientLimit), features: form.plans.bronze.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    silver: { price: form.plans.silver.price, sites: form.plans.silver.sites, interval: Number(form.plans.silver.interval), pingInterval: Number(form.plans.silver.pingInterval), recipientLimit: Number(form.plans.silver.recipientLimit), features: form.plans.silver.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    gold:   { price: form.plans.gold.price,   sites: form.plans.gold.sites,   interval: Number(form.plans.gold.interval),   pingInterval: Number(form.plans.gold.pingInterval),   recipientLimit: Number(form.plans.gold.recipientLimit),   features: form.plans.gold.features.split('\n').map(s => s.trim()).filter(Boolean) },
                },
            });
            showToast('✅ Settings saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    if (!form) return (
        <div className="pg-wrap">
            <p style={{ color: '#9CA3AF', padding: 40, fontSize: 14 }}>Loading...</p>
        </div>
    );

    const isSuccess = toast.startsWith('✅');

    return (
        <div className="pg-wrap">
            {/* Page Header */}
            <div className="pg-header">
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                        Plan Settings
                    </h1>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
                        Configure pricing, limits and features for each plan
                    </p>
                </div>
                {readOnly
                    ? <span style={{ fontSize:12, fontWeight:700, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'7px 14px' }}>👁 Read Only</span>
                    : <button onClick={save} disabled={saving} style={{ background: saving?'#9CA3AF':'#4F46E5', color:'#fff', border:'none', borderRadius:8, padding:'9px 18px', fontWeight:600, fontSize:14, cursor: saving?'not-allowed':'pointer' }}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                }
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    background: isSuccess ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECDD3'}`,
                    color: isSuccess ? '#15803D' : '#DC2626',
                    borderRadius: 10,
                    padding: '10px 16px',
                    marginBottom: 20,
                    fontWeight: 600,
                    fontSize: 14,
                }}>
                    {toast}
                </div>
            )}

            {/* Free Trial card */}
            <div style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: 24,
                marginBottom: 20,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 16 }}>
                    Free Trial
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
                    Applied to all new registrations
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                    <div>
                        <label style={labelStyle}>Trial Duration (days)</label>
                        <input
                            type="number" min="1"
                            value={form.trialDays}
                            onChange={e => setForm({ ...form, trialDays: Number(e.target.value) })}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Verification Fee (₹)</label>
                        <input
                            type="number" min="0"
                            value={form.verificationFee}
                            onChange={e => setForm({ ...form, verificationFee: Number(e.target.value) })}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Site Check Interval (sec)</label>
                        <input
                            type="number" min="60" step="30"
                            value={form.freeTrialInterval}
                            onChange={e => setForm({ ...form, freeTrialInterval: Number(e.target.value) })}
                            style={inputStyle}
                        />
                        <span style={hintStyle}>{Math.floor(form.freeTrialInterval / 60)} min per check</span>
                    </div>
                    <div>
                        <label style={labelStyle}>Ping Interval (sec)</label>
                        <input
                            type="number" min="30" step="30"
                            value={form.freeTrialPingInterval}
                            onChange={e => setForm({ ...form, freeTrialPingInterval: Number(e.target.value) })}
                            style={inputStyle}
                        />
                        <span style={hintStyle}>{Math.floor(form.freeTrialPingInterval / 60)} min per ping</span>
                    </div>
                    <div>
                        <label style={labelStyle}>Max Recipients</label>
                        <input
                            type="number" min="1"
                            value={form.freeTrialRecipientLimit}
                            onChange={e => setForm({ ...form, freeTrialRecipientLimit: Number(e.target.value) })}
                            style={inputStyle}
                        />
                    </div>
                </div>
                <div style={{ marginTop: 16 }}>
                    <label style={{ ...labelStyle, marginBottom: 6 }}>
                        Features <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(one per line · format: ok/no/limited/soon:text)</span>
                    </label>
                    <textarea
                        value={form.freeTrialFeatures}
                        onChange={e => setForm({ ...form, freeTrialFeatures: e.target.value })}
                        style={{
                            width: '100%',
                            minHeight: 120,
                            padding: '10px 14px',
                            border: '1px solid #E5E7EB',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'monospace',
                            lineHeight: 1.7,
                            resize: 'vertical',
                            boxSizing: 'border-box',
                            color: '#374151',
                            outline: 'none',
                        }}
                        placeholder="ok:2 sites monitored&#10;limited:5 min check interval&#10;no:SSL expiry monitoring"
                    />
                </div>
            </div>

            {/* Paid Plans grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {['bronze', 'silver', 'gold'].map(pk => (
                    <div key={pk} style={{
                        background: '#fff',
                        borderRadius: 10,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        overflow: 'hidden',
                    }}>
                        {/* Plan header bar */}
                        <div style={{
                            padding: '14px 20px',
                            background: PLAN_BG[pk],
                            borderBottom: `1px solid ${PLAN_COLORS[pk]}30`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}>
                            <span style={{ fontSize: 20 }}>{PLAN_EMOJI[pk]}</span>
                            <span style={{ fontWeight: 800, fontSize: 15, color: PLAN_COLORS[pk] }}>
                                {PLAN_LABEL[pk]}
                            </span>
                        </div>

                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label style={labelStyle}>Price (₹/month)</label>
                                    <input
                                        type="number" min="0"
                                        value={form.plans[pk].price}
                                        onChange={e => setPlanField(pk, 'price', e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Max Sites</label>
                                    <input
                                        type="number" min="1"
                                        value={form.plans[pk].sites}
                                        onChange={e => setPlanField(pk, 'sites', e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Site Check Interval (sec)</label>
                                    <input
                                        type="number" min="30" step="30"
                                        value={form.plans[pk].interval}
                                        onChange={e => setPlanField(pk, 'interval', e.target.value)}
                                        style={inputStyle}
                                    />
                                    <span style={hintStyle}>
                                        {form.plans[pk].interval >= 60 ? `${form.plans[pk].interval / 60}m` : `${form.plans[pk].interval}s`} per check
                                    </span>
                                </div>
                                <div>
                                    <label style={labelStyle}>Ping Interval (sec)</label>
                                    <input
                                        type="number" min="30" step="30"
                                        value={form.plans[pk].pingInterval}
                                        onChange={e => setPlanField(pk, 'pingInterval', e.target.value)}
                                        style={inputStyle}
                                    />
                                    <span style={hintStyle}>
                                        {form.plans[pk].pingInterval >= 60 ? `${form.plans[pk].pingInterval / 60}m` : `${form.plans[pk].pingInterval}s`} per ping
                                    </span>
                                </div>
                                <div>
                                    <label style={labelStyle}>Max Recipients</label>
                                    <input
                                        type="number" min="1"
                                        value={form.plans[pk].recipientLimit}
                                        onChange={e => setPlanField(pk, 'recipientLimit', e.target.value)}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Features (one per line)</label>
                                <textarea
                                    value={form.plans[pk].features}
                                    onChange={e => setPlanField(pk, 'features', e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: 150,
                                        padding: '10px 14px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontFamily: 'monospace',
                                        lineHeight: 1.7,
                                        resize: 'vertical',
                                        boxSizing: 'border-box',
                                        color: '#374151',
                                        outline: 'none',
                                    }}
                                    placeholder={`ok:${form.plans[pk].sites} sites monitored\nok:Email alerts\nno:SSL expiry monitoring`}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Save footer */}
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        background: saving ? '#9CA3AF' : '#4F46E5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 24px',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    );
}
