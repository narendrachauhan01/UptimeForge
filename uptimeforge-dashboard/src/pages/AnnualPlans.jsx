let _loaded_AnnualPlans = false;
import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

const PLAN_COLORS = { bronze: '#B45309', silver: '#475569', gold: '#CA8A04' };
const PLAN_EMOJI  = { bronze: '🥉',      silver: '🥈',      gold: '🥇'    };

const ANNUAL_PLANS_STYLES = `
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
    font-size: 15px;
    font-weight: 800;
    color: var(--text-main);
    margin-bottom: 4px;
  }
  
  .perf-page-container .form-card-sub {
    font-size: 13px;
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
    padding: 10px 14px;
    border: 1px solid var(--border-color) !important;
    border-radius: 8px;
    font-size: 12.5px;
    font-family: monospace;
    line-height: 1.6;
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

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
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
  
  .perf-page-container .btn-success {
    background: #10b981;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
  }

  /* Custom toggle switch */
  .perf-page-container .switch-btn {
    width: 50px;
    height: 28px;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  
  .perf-page-container .switch-btn-circle {
    position: absolute;
    top: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: all 0.2s;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  /* Plans grid */
  .perf-page-container .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .perf-page-container .plan-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--card-shadow);
    transition: border-color 0.2s;
  }

  .perf-page-container .custom-plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }

  .perf-page-container .custom-plan-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    padding: 24px;
    box-shadow: var(--card-shadow);
  }

  .perf-page-container .discount-badge {
    background: #f59e0b;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .perf-page-container .spin {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export default function AnnualPlans({ readOnly = false }) {
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [pageLoading, setPageLoading] = useState(!_loaded_AnnualPlans);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

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
        <div className="perf-page-container">
            <style>{ANNUAL_PLANS_STYLES}</style>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, gap:14 }}>
                <div className="spin"/>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Loading Annual Plans...</p>
            </div>
        </div>
    );
    
    if (!form) return null;

    const isDark = localTheme === 'dark';
    
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

    const CUSTOM_PLAN_THEME = {
        threeMonth: {
            color: isDark ? '#a78bfa' : '#8b5cf6',
            bg: isDark ? 'rgba(139, 92, 246, 0.08)' : '#f3f0ff',
            border: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.15)',
            btnBg: isDark ? 'rgba(139, 92, 246, 0.15)' : '#ede9fe'
        },
        sixMonth: {
            color: isDark ? '#34d399' : '#10b981',
            bg: isDark ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4',
            border: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
            btnBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7'
        }
    };

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{ANNUAL_PLANS_STYLES}</style>
            
            <div className="pg-wrap">
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">Annual Plans <span style={{ color: 'var(--primary)' }}>.</span></h1>
                        <p className="pg-sub">Set annual pricing for each plan shown on the Landing page</p>
                    </div>
                    {readOnly
                        ? <span style={{ fontSize:12, fontWeight:700, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:8, padding:'7px 14px' }}>👁 Read Only</span>
                        : <button onClick={save} disabled={saving} className={saved ? "btn-success" : "btn-primary"}>
                            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                          </button>
                    }
                </div>

                {/* Toggle Card */}
                <div className="form-card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, marginBottom: 20 }}>
                    <div>
                        <div style={{ fontWeight:800, fontSize:15, color:'var(--text-main)' }}>Enable Annual Billing Toggle</div>
                        <div style={{ fontSize:13.5, color:'var(--text-muted)', marginTop:4 }}>Show Monthly/Annually toggle on Landing page pricing section</div>
                    </div>
                    <button 
                        onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                        className="switch-btn"
                        style={{ background: form.enabled ? 'var(--primary)' : '#D1D5DB' }}
                    >
                        <span 
                            className="switch-btn-circle" 
                            style={{ left: form.enabled ? 25 : 3 }}
                        />
                    </button>
                </div>

                {/* Global Discount Card */}
                <div className="form-card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:'var(--text-main)', marginBottom:4 }}>Global Annual Discount</div>
                    <div style={{ fontSize:13.5, color:'var(--text-muted)', marginBottom:20 }}>Applied automatically if no custom annual price is set for a plan</div>
                    <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap: 'wrap' }}>
                        <input 
                            type="number" min="0" max="80" 
                            value={form.discount}
                            onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) }))}
                            className="custom-input" 
                            style={{ width:100 }} 
                        />
                        <span style={{ fontWeight:700, color:'var(--text-muted)', fontSize:14 }}>% off monthly price</span>
                        <span className="discount-badge">Save {form.discount}%</span>
                    </div>
                </div>

                {/* Per-plan annual prices */}
                <div className="plans-grid">
                    {['bronze','silver','gold'].map(key => {
                        const p = form[key];
                        const auto = autoPrice(p.monthlyPrice, form.discount);
                        return (
                            <div 
                                key={key} 
                                className="plan-card" 
                                style={{ borderTop: `4px solid ${PLAN_COLORS[key]}` }}
                            >
                                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                                    <span style={{ fontSize:24 }}>{PLAN_EMOJI[key]}</span>
                                    <div>
                                        <div style={{ fontWeight:800, fontSize:16, color: PLAN_COLORS[key], textTransform:'capitalize' }}>{key}</div>
                                        <div style={{ fontSize:12, color:'var(--text-muted)', marginTop: 2 }}>Monthly: ₹{p.monthlyPrice}/month</div>
                                    </div>
                                </div>
                                
                                <label className="custom-label">Custom Annual Price (₹/month)</label>
                                <input 
                                    type="number" min="0" placeholder={`Auto: ₹${auto}`}
                                    value={p.annualPrice || ''}
                                    onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], annualPrice: e.target.value } }))}
                                    className="custom-input" 
                                />
                                
                                <div style={{ marginTop:8, fontSize:12, color:'var(--text-muted)' }}>
                                    Leave 0 or empty to use auto discount → <strong style={{ color: PLAN_COLORS[key] }}>₹{auto}/month</strong>
                                </div>
                                
                                <div 
                                    style={{ 
                                        marginTop:16, 
                                        background: PLAN_THEME[key].bg, 
                                        borderRadius:10, 
                                        padding:'12px 16px', 
                                        display:'flex', 
                                        justifyContent:'space-between', 
                                        alignItems:'center',
                                        border: `1px solid ${PLAN_THEME[key].border}` 
                                    }}
                                >
                                    <span style={{ fontSize:13, color: PLAN_THEME[key].color, fontWeight:700 }}>Annual price shown:</span>
                                    <span style={{ fontSize:18, fontWeight:800, color: PLAN_COLORS[key], marginLeft: 'auto' }}>
                                        ₹{p.annualPrice > 0 ? p.annualPrice : auto}
                                        <span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)' }}>/mo</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 3 Month & 6 Month Custom Plans */}
                <div className="form-card">
                    <div style={{ fontWeight:800, fontSize:15, color:'var(--text-main)', marginBottom:4 }}>Custom Duration Plans</div>
                    <div style={{ fontSize:13.5, color:'var(--text-muted)', marginBottom:20 }}>3-Month and 6-Month plan cards shown on Landing page with "Contact Support" button</div>
                    
                    <div className="custom-plans-grid">
                        {[
                            { key:'threeMonth', label:'3 Month Plan', emoji:'🗓️' },
                            { key:'sixMonth',   label:'6 Month Plan', emoji:'📅' },
                        ].map(({ key, label, emoji }) => {
                            const p = form[key];
                            const t = CUSTOM_PLAN_THEME[key];
                            return (
                                <div 
                                    key={key} 
                                    className="custom-plan-card"
                                    style={{ borderTop: `4px solid ${t.color}` }}
                                >
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                            <span style={{ fontSize:24 }}>{emoji}</span>
                                            <div style={{ fontWeight:800, fontSize:16, color: t.color }}>{label}</div>
                                        </div>
                                        <button 
                                            onClick={() => setForm(f => ({ ...f, [key]: { ...f[key], enabled: !f[key].enabled } }))}
                                            className="switch-btn"
                                            style={{ background: p.enabled ? t.color : '#D1D5DB' }}
                                        >
                                            <span 
                                                className="switch-btn-circle" 
                                                style={{ left: p.enabled ? 25 : 3, width: 22, height: 22, top: 3 }}
                                            />
                                        </button>
                                    </div>
                                    
                                    <div style={{ display:'grid', gap:16 }}>
                                        <div>
                                            <label className="custom-label">Card Title</label>
                                            <input 
                                                type="text" 
                                                value={p.label} 
                                                onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], label: e.target.value } }))} 
                                                className="custom-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="custom-label">Price (₹/month shown)</label>
                                            <input 
                                                type="number" min="0" 
                                                value={p.price} placeholder="e.g. 399" 
                                                onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], price: e.target.value } }))} 
                                                className="custom-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="custom-label">Features (one per line, use ok:/no:/limited:/soon: prefix)</label>
                                            <textarea 
                                                rows={6} 
                                                value={p.features} 
                                                onChange={e => setForm(f => ({ ...f, [key]: { ...f[key], features: e.target.value } }))}
                                                placeholder={'ok:5 sites monitored\nok:Email alerts\nno:WhatsApp alerts'}
                                                className="custom-textarea" 
                                            />
                                        </div>
                                        {p.price > 0 && (
                                            <div 
                                                style={{ 
                                                    background: t.bg, 
                                                    borderRadius:10, 
                                                    padding:'12px 16px', 
                                                    display:'flex', 
                                                    justifyContent:'space-between', 
                                                    alignItems:'center',
                                                    border: `1px solid ${t.border}` 
                                                }}
                                            >
                                                <span style={{ fontSize:13, color: t.color, fontWeight:700 }}>Price shown on card:</span>
                                                <span style={{ fontSize:18, fontWeight:800, color: t.color }}>
                                                    ₹{p.price}
                                                    <span style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)' }}>/mo</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
