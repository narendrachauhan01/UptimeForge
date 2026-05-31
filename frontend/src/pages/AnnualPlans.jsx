let _loaded_AnnualPlans = false;
import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

const PLAN_COLORS = { bronze: '#B45309', silver: '#475569', gold: '#CA8A04' };
const PLAN_BG     = { bronze: '#FEF3C7', silver: '#F1F5F9', gold: '#FEF9C3' };
const PLAN_EMOJI  = { bronze: '🥉',      silver: '🥈',      gold: '🥇'    };

const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid #E5E7EB',
    borderRadius: 8, fontSize: 14, color: '#111827', background: '#fff',
    boxSizing: 'border-box', outline: 'none',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

export default function AnnualPlans() {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [pageLoading, setPageLoading] = useState(!_loaded_AnnualPlans);

    useEffect(() => {
        adminGetSettings().then(r => {
            const d = r.data;
            const monthly = { bronze: d.plans?.bronze?.price ?? 499, silver: d.plans?.silver?.price ?? 999, gold: d.plans?.gold?.price ?? 1499 };
            setForm({
                enabled: d.annualPlans?.enabled ?? true,
                discount: d.annualDiscount ?? 20,
                bronze: { monthlyPrice: monthly.bronze, annualPrice: d.annualPlans?.bronze?.price || 0 },
                silver: { monthlyPrice: monthly.silver, annualPrice: d.annualPlans?.silver?.price || 0 },
                gold:   { monthlyPrice: monthly.gold,   annualPrice: d.annualPlans?.gold?.price   || 0 },
                threeMonth: {
                    enabled:  d.customPlans?.threeMonth?.enabled ?? true,
                    price:    d.customPlans?.threeMonth?.price || 0,
                    label:    d.customPlans?.threeMonth?.label || '3 Month Plan',
                    features: (d.customPlans?.threeMonth?.features || []).join('\n'),
                },
                sixMonth: {
                    enabled:  d.customPlans?.sixMonth?.enabled ?? true,
                    price:    d.customPlans?.sixMonth?.price || 0,
                    label:    d.customPlans?.sixMonth?.label || '6 Month Plan',
                    features: (d.customPlans?.sixMonth?.features || []).join('\n'),
                },
            });
            setPageLoading(false);
            _loaded_AnnualPlans = true;
        }).catch(() => setPageLoading(false));
    }, []);

    const autoPrice = (monthly, discount) => Math.round(monthly * (1 - discount / 100));

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateSettings({
                annualDiscount: Number(form.discount),
                annualPlans: {
                    enabled: form.enabled,
                    bronze: { price: Number(form.bronze.annualPrice) },
                    silver: { price: Number(form.silver.annualPrice) },
                    gold:   { price: Number(form.gold.annualPrice)   },
                },
                customPlans: {
                    threeMonth: { enabled: form.threeMonth.enabled, price: Number(form.threeMonth.price), label: form.threeMonth.label, features: form.threeMonth.features.split('\n').map(s=>s.trim()).filter(Boolean) },
                    sixMonth:   { enabled: form.sixMonth.enabled,   price: Number(form.sixMonth.price),   label: form.sixMonth.label,   features: form.sixMonth.features.split('\n').map(s=>s.trim()).filter(Boolean) },
                },
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch(e) { alert('Save failed: ' + e.message); }
        setSaving(false);
    };

    if (pageLoading) return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (!form) return null;

    return (
        <div className="pg-wrap">
            <div style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>Annual Plans</h1>
                    <p style={{ fontSize:14, color:'#6B7280', margin:0 }}>Set annual pricing for each plan shown on the Landing page</p>
                </div>
                <button onClick={save} disabled={saving}
                    style={{ background: saved ? '#10b981' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, padding:'10px 28px', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
                    {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* Toggle */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'20px 24px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
                <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Enable Annual Billing Toggle</div>
                    <div style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>Show Monthly/Annually toggle on Landing page pricing section</div>
                </div>
                <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                    style={{ width:50, height:28, borderRadius:50, border:'none', cursor:'pointer', transition:'all 0.2s', position:'relative',
                        background: form.enabled ? '#7c3aed' : '#D1D5DB' }}>
                    <span style={{ position:'absolute', top:3, left: form.enabled ? 24 : 3, width:22, height:22, borderRadius:'50%', background:'#fff', transition:'all 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }}/>
                </button>
            </div>

            {/* Global Discount */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'20px 24px', marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#111827', marginBottom:4 }}>Global Annual Discount</div>
                <div style={{ fontSize:13, color:'#6B7280', marginBottom:16 }}>Applied automatically if no custom annual price is set for a plan</div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <input type="number" min="0" max="80" value={form.discount}
                        onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                        style={{ ...inputStyle, width:100 }} />
                    <span style={{ fontWeight:600, color:'#6B7280', fontSize:14 }}>% off monthly price</span>
                    <span style={{ background:'#f59e0b', color:'#fff', fontSize:12, fontWeight:700, padding:'3px 12px', borderRadius:50 }}>Save {form.discount}%</span>
                </div>
            </div>

            {/* Per-plan annual prices */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:20 }}>
                {['bronze','silver','gold'].map(key => {
                    const p = form[key];
                    const auto = autoPrice(p.monthlyPrice, form.discount);
                    return (
                        <div key={key} style={{ background:'#fff', borderRadius:12, border:`1px solid #E5E7EB`, borderTop:`4px solid ${PLAN_COLORS[key]}`, padding:'20px 24px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                                <span style={{ fontSize:24 }}>{PLAN_EMOJI[key]}</span>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:16, color: PLAN_COLORS[key], textTransform:'capitalize' }}>{key}</div>
                                    <div style={{ fontSize:12, color:'#9CA3AF' }}>Monthly: ₹{p.monthlyPrice}/month</div>
                                </div>
                            </div>
                            <label style={labelStyle}>Custom Annual Price (₹/month)</label>
                            <input type="number" min="0" placeholder={`Auto: ₹${auto}`}
                                value={p.annualPrice || ''}
                                onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], annualPrice: e.target.value } }))}
                                style={inputStyle} />
                            <div style={{ marginTop:8, fontSize:12, color:'#9CA3AF' }}>
                                Leave 0 or empty to use auto discount → <strong style={{ color: PLAN_COLORS[key] }}>₹{auto}/month</strong>
                            </div>
                            <div style={{ marginTop:12, background: PLAN_BG[key], borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Annual price shown:</span>
                                <span style={{ fontSize:18, fontWeight:800, color: PLAN_COLORS[key] }}>
                                    ₹{p.annualPrice > 0 ? p.annualPrice : auto}
                                    <span style={{ fontSize:12, fontWeight:500, color:'#9CA3AF' }}>/mo</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 3 Month & 6 Month Custom Plans */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'20px 24px', marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:15, color:'#111827', marginBottom:4 }}>Custom Duration Plans</div>
                <div style={{ fontSize:13, color:'#6B7280', marginBottom:20 }}>3-Month and 6-Month plan cards shown on Landing page with "Contact Support" button</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
                    {[
                        { key:'threeMonth', label:'3 Month Plan', color:'#8b5cf6', bg:'#f3f0ff', emoji:'🗓️' },
                        { key:'sixMonth',   label:'6 Month Plan', color:'#10b981', bg:'#f0fdf4', emoji:'📅' },
                    ].map(({ key, label, color, bg, emoji }) => {
                        const p = form[key];
                        return (
                            <div key={key} style={{ borderRadius:12, border:`1px solid #E5E7EB`, borderTop:`4px solid ${color}`, padding:'20px 24px' }}>
                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                        <span style={{ fontSize:24 }}>{emoji}</span>
                                        <div style={{ fontWeight:800, fontSize:16, color }}>{label}</div>
                                    </div>
                                    <button onClick={() => setForm(f => ({ ...f, [key]: { ...f[key], enabled: !f[key].enabled } }))}
                                        style={{ width:44, height:24, borderRadius:50, border:'none', cursor:'pointer', position:'relative', background: p.enabled ? color : '#D1D5DB' }}>
                                        <span style={{ position:'absolute', top:2, left: p.enabled?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'all 0.2s' }}/>
                                    </button>
                                </div>
                                <div style={{ display:'grid', gap:12 }}>
                                    <div>
                                        <label style={labelStyle}>Card Title</label>
                                        <input type="text" value={p.label} onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], label: e.target.value } }))} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Price (₹/month shown)</label>
                                        <input type="number" min="0" value={p.price} placeholder="e.g. 399" onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], price: e.target.value } }))} style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Features (one per line, use ok:/no:/limited:/soon: prefix)</label>
                                        <textarea rows={6} value={p.features} onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], features: e.target.value } }))}
                                            placeholder={'ok:5 sites monitored\nok:Email alerts\nno:WhatsApp alerts'}
                                            style={{ ...inputStyle, resize:'vertical', lineHeight:1.6 }} />
                                    </div>
                                    {p.price > 0 && (
                                        <div style={{ background: bg, borderRadius:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                            <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>Price shown on card:</span>
                                            <span style={{ fontSize:18, fontWeight:800, color }}>₹{p.price}<span style={{ fontSize:12, fontWeight:500, color:'#9CA3AF' }}>/mo</span></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
