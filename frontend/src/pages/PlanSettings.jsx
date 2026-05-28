import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

const PLAN_COLORS = { bronze: '#b45309', silver: '#475569', gold: '#ca8a04' };
const PLAN_LABEL  = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const PLAN_EMOJI  = { bronze: '🥉', silver: '🥈', gold: '🥇' };

export default function PlanSettings() {
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
                freeTrialInterval: d.freeTrialInterval ?? 300,
                freeTrialRecipientLimit: d.freeTrialRecipientLimit ?? 2,
                freeTrialFeatures: (d.freeTrialFeatures || []).join('\n'),
                plans: {
                    bronze: { price: d.plans.bronze.price, sites: d.plans.bronze.sites, interval: d.plans.bronze.interval ?? 120, recipientLimit: d.plans.bronze.recipientLimit ?? 10, features: (d.plans.bronze.features || []).join('\n') },
                    silver: { price: d.plans.silver.price, sites: d.plans.silver.sites, interval: d.plans.silver.interval ?? 60,  recipientLimit: d.plans.silver.recipientLimit ?? 20, features: (d.plans.silver.features || []).join('\n') },
                    gold:   { price: d.plans.gold.price,   sites: d.plans.gold.sites,   interval: d.plans.gold.interval   ?? 30,  recipientLimit: d.plans.gold.recipientLimit   ?? 30, features: (d.plans.gold.features   || []).join('\n') },
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
                freeTrialInterval: Number(form.freeTrialInterval),
                freeTrialRecipientLimit: Number(form.freeTrialRecipientLimit),
                freeTrialFeatures: form.freeTrialFeatures.split('\n').map(s => s.trim()).filter(Boolean),
                plans: {
                    bronze: { price: form.plans.bronze.price, sites: form.plans.bronze.sites, interval: Number(form.plans.bronze.interval), recipientLimit: Number(form.plans.bronze.recipientLimit), features: form.plans.bronze.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    silver: { price: form.plans.silver.price, sites: form.plans.silver.sites, interval: Number(form.plans.silver.interval), recipientLimit: Number(form.plans.silver.recipientLimit), features: form.plans.silver.features.split('\n').map(s => s.trim()).filter(Boolean) },
                    gold:   { price: form.plans.gold.price,   sites: form.plans.gold.sites,   interval: Number(form.plans.gold.interval),   recipientLimit: Number(form.plans.gold.recipientLimit),   features: form.plans.gold.features.split('\n').map(s => s.trim()).filter(Boolean) },
                },
            });
            showToast('✅ Settings saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    if (!form) return <div className="pg-wrap"><p style={{ color:'#94a3b8', padding:40 }}>Loading...</p></div>;

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Plan Settings</h1>
                    <p className="pg-sub">Configure pricing, limits and features for each plan</p>
                </div>
                <button onClick={save} disabled={saving}
                    style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
            </div>

            {toast && (
                <div style={{ background: toast.startsWith('✅') ? '#f0fdf4' : '#fef2f2', border:`1px solid ${toast.startsWith('✅') ? '#bbf7d0' : '#fecdd3'}`, color: toast.startsWith('✅') ? '#15803d' : '#dc2626', borderRadius:10, padding:'10px 16px', marginBottom:20, fontWeight:600, fontSize:14 }}>
                    {toast}
                </div>
            )}

            {/* Free Trial */}
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:24, marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                    <span style={{ fontSize:24 }}>🆓</span>
                    <div>
                        <div style={{ fontWeight:800, fontSize:16, color:'#1e1b4b' }}>Free Trial</div>
                        <div style={{ fontSize:12, color:'#94a3b8' }}>Applied to all new registrations</div>
                    </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16 }}>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Trial Duration (days)</label>
                        <input type="number" min="1" value={form.trialDays} onChange={e => setForm({...form, trialDays: Number(e.target.value)})}
                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }} />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Verification Fee (₹)</label>
                        <input type="number" min="0" value={form.verificationFee} onChange={e => setForm({...form, verificationFee: Number(e.target.value)})}
                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }} />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Check Interval (sec)</label>
                        <input type="number" min="60" step="30" value={form.freeTrialInterval} onChange={e => setForm({...form, freeTrialInterval: Number(e.target.value)})}
                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }} />
                        <span style={{ fontSize:11, color:'#94a3b8', marginTop:3, display:'block' }}>{Math.floor(form.freeTrialInterval/60)} min per check</span>
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Max Recipients</label>
                        <input type="number" min="1" value={form.freeTrialRecipientLimit} onChange={e => setForm({...form, freeTrialRecipientLimit: Number(e.target.value)})}
                            style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14 }} />
                    </div>
                </div>
                <div style={{ marginTop:16 }}>
                    <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Features (one per line · format: ok/no/limited/soon:text)</label>
                    <textarea value={form.freeTrialFeatures} onChange={e => setForm({...form, freeTrialFeatures: e.target.value})}
                        style={{ width:'100%', minHeight:120, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, fontFamily:'monospace', lineHeight:1.7, resize:'vertical', boxSizing:'border-box' }}
                        placeholder="ok:2 sites monitored&#10;limited:5 min check interval&#10;no:SSL expiry monitoring" />
                </div>
            </div>

            {/* Paid Plans */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:20 }}>
                {['bronze', 'silver', 'gold'].map(pk => (
                    <div key={pk} style={{ background:'#fff', borderRadius:16, border:`2px solid ${PLAN_COLORS[pk]}30`, padding:24, borderTop:`4px solid ${PLAN_COLORS[pk]}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                            <span style={{ fontSize:24 }}>{PLAN_EMOJI[pk]}</span>
                            <div style={{ fontWeight:800, fontSize:16, color: PLAN_COLORS[pk] }}>{PLAN_LABEL[pk]}</div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                            <div>
                                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Price (₹/month)</label>
                                <input type="number" min="0" value={form.plans[pk].price} onChange={e => setPlanField(pk, 'price', e.target.value)}
                                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Max Sites</label>
                                <input type="number" min="1" value={form.plans[pk].sites} onChange={e => setPlanField(pk, 'sites', e.target.value)}
                                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Check Interval (sec)</label>
                                <input type="number" min="30" step="30" value={form.plans[pk].interval} onChange={e => setPlanField(pk, 'interval', e.target.value)}
                                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                                <span style={{ fontSize:11, color:'#94a3b8', marginTop:3, display:'block' }}>
                                    {form.plans[pk].interval >= 60 ? `${form.plans[pk].interval/60} min` : `${form.plans[pk].interval} sec`} per check
                                </span>
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Max Recipients</label>
                                <input type="number" min="1" value={form.plans[pk].recipientLimit} onChange={e => setPlanField(pk, 'recipientLimit', e.target.value)}
                                    style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Features (one per line)</label>
                            <textarea value={form.plans[pk].features} onChange={e => setPlanField(pk, 'features', e.target.value)}
                                style={{ width:'100%', minHeight:150, padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, fontFamily:'monospace', lineHeight:1.7, resize:'vertical', boxSizing:'border-box' }}
                                placeholder={`ok:${form.plans[pk].sites} sites monitored\nok:Email alerts\nno:SSL expiry monitoring`} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop:24, textAlign:'right' }}>
                <button onClick={save} disabled={saving}
                    style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, padding:'12px 32px', fontWeight:700, fontSize:15, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Saving...' : '💾 Save All Changes'}
                </button>
            </div>
        </div>
    );
}
