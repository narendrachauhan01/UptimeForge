import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getMyPaymentRequests, getServers, changePassword } from '../api';

function parseFeatures(arr) {
  if (!arr || !arr.length) return [];
  return arr.map(f => {
    const idx = f.indexOf(':');
    if (idx === -1) return { type: 'ok', label: f };
    return { type: f.slice(0, idx), label: f.slice(idx + 1) };
  });
}

const PLAN_GRADIENTS = {
    free_trial: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    bronze: 'linear-gradient(135deg,#b45309,#d97706)',
    silver: 'linear-gradient(135deg,#475569,#64748b)',
    gold:   'linear-gradient(135deg,#ca8a04,#eab308)',
};
const PLAN_RANK = { free_trial: 0, bronze: 1, silver: 2, gold: 3 };
const PLAN_COLORS = { free_trial:'#64748b', bronze:'#b45309', silver:'#475569', gold:'#ca8a04' };
const PLAN_LABEL  = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold', null:'₹2 Verification' };
const STATUS_STYLE = {
    pending:  { bg:'#eff6ff', color:'#1d4ed8', label:'Pending' },
    approved: { bg:'#f0fdf4', color:'#15803d', label:'Approved' },
    rejected: { bg:'#fef2f2', color:'#dc2626', label:'Rejected' },
};

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function fmtFull(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });
}

function generateInvoiceHtml(r, user) {
    const invoiceNo = `UW-${r._id.toString().slice(-8).toUpperCase()}`;
    const planName  = r.type === 'verification' ? 'Free Trial Verification' : (PLAN_LABEL[r.plan] || r.plan || '');
    const planPeriod = r.planEndsAt ? `Until ${fmtFull(r.planEndsAt)}` : '5-day trial period';
    const date      = fmtFull(r.createdAt);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${invoiceNo} — UptimeForge</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#f8fafc; color:#1e293b; }
  .page { max-width:720px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 40px rgba(0,0,0,0.12); }
  .inv-header { background:linear-gradient(135deg,#7c3aed,#6d28d9); padding:36px 40px; color:#fff; display:flex; justify-content:space-between; align-items:flex-start; }
  .inv-brand { display:flex; flex-direction:column; gap:4px; }
  .inv-brand-name { font-size:22px; font-weight:900; letter-spacing:-0.5px; }
  .inv-brand-sub  { font-size:12px; opacity:0.8; }
  .inv-title-block { text-align:right; }
  .inv-title { font-size:28px; font-weight:900; letter-spacing:2px; text-transform:uppercase; opacity:0.95; }
  .inv-no   { font-size:13px; opacity:0.8; margin-top:4px; }
  .inv-date { font-size:13px; opacity:0.8; }
  .inv-body { padding:40px; }
  .inv-parties { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-bottom:36px; }
  .inv-party-label { font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px; }
  .inv-party-name  { font-size:16px; font-weight:800; color:#1e293b; }
  .inv-party-line  { font-size:13px; color:#64748b; margin-top:3px; }
  table { width:100%; border-collapse:collapse; margin-bottom:28px; }
  thead th { background:#f1f5f9; padding:12px 16px; text-align:left; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; }
  tbody td { padding:14px 16px; border-bottom:1px solid #f1f5f9; font-size:14px; color:#1e293b; }
  tbody tr:last-child td { border-bottom:none; }
  .txn-mono { font-family:monospace; background:#f8fafc; padding:3px 8px; border-radius:5px; font-size:13px; color:#475569; border:1px solid #e2e8f0; }
  .status-pill { display:inline-block; padding:3px 12px; border-radius:20px; font-size:12px; font-weight:700; }
  .inv-total-row { background:#f0fdf4; border-radius:12px; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; }
  .inv-total-label { font-size:14px; font-weight:700; color:#475569; }
  .inv-total-amount{ font-size:28px; font-weight:900; color:#059669; }
  .inv-footer { border-top:1px solid #f1f5f9; padding:24px 40px; display:flex; justify-content:space-between; align-items:center; background:#fafafa; }
  .inv-footer-note { font-size:12px; color:#94a3b8; }
  .inv-footer-brand{ font-size:13px; font-weight:700; color:#7c3aed; }
  .badge-approved { background:#dcfce7; color:#15803d; }
  .badge-pending  { background:#dbeafe; color:#1d4ed8; }
  .badge-rejected { background:#fee2e2; color:#dc2626; }
  @media print {
    body { background:#fff; }
    .page { box-shadow:none; border-radius:0; margin:0; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="inv-header">
    <div class="inv-brand">
      <div class="inv-brand-name">UptimeForge</div>
      <div class="inv-brand-sub">24/7 Uptime Monitoring</div>
      <div class="inv-brand-sub" style="margin-top:8px">usnarendra19961@ybl</div>
    </div>
    <div class="inv-title-block">
      <div class="inv-title">Invoice</div>
      <div class="inv-no"># ${invoiceNo}</div>
      <div class="inv-date">Date: ${date}</div>
    </div>
  </div>

  <div class="inv-body">
    <div class="inv-parties">
      <div>
        <div class="inv-party-label">From</div>
        <div class="inv-party-name">UptimeForge</div>
        <div class="inv-party-line">Narendra Singh — DevOps Engineer</div>
        <div class="inv-party-line">uptimeforge@gmail.com</div>
        <div class="inv-party-line">India</div>
      </div>
      <div>
        <div class="inv-party-label">Billed To</div>
        <div class="inv-party-name">${user?.name || '—'}</div>
        <div class="inv-party-line">${user?.email || '—'}</div>
        ${user?.phone ? `<div class="inv-party-line">${user.phone}</div>` : ''}
        ${(user?.city || user?.state) ? `<div class="inv-party-line">${[user.city, user.state, 'India'].filter(Boolean).join(', ')}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Plan Period</th>
          <th>Transaction ID</th>
          <th>Status</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>${planName}</strong></td>
          <td>${planPeriod}</td>
          <td><span class="txn-mono">${r.utr || '—'}</span></td>
          <td>
            <span class="status-pill badge-${r.status}">
              ${r.status.charAt(0).toUpperCase() + r.status.slice(1)}
            </span>
          </td>
          <td style="text-align:right"><strong>₹${r.amount}</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="inv-total-row">
      <div class="inv-total-label">Total Paid</div>
      <div class="inv-total-amount">₹${r.amount}</div>
    </div>

    <p style="font-size:13px;color:#64748b;line-height:1.6">
      Payment received via UPI. This is a computer-generated invoice and does not require a signature.
      ${r.type === 'verification' ? 'This ₹2 verification fee is non-refundable and activates your 5-day free trial.' : ''}
    </p>
  </div>

  <div class="inv-footer">
    <div class="inv-footer-note">Thank you for using UptimeForge! For support: uptimeforge@gmail.com</div>
    <div class="inv-footer-brand">UptimeForge © 2026</div>
  </div>
</div>

<div class="no-print" style="text-align:center;margin:24px 0">
  <button onclick="window.print()" style="padding:12px 32px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">
    🖨 Print / Save as PDF
  </button>
</div>

</body>
</html>`;
}

function downloadInvoice(r, user) {
    const html = generateInvoiceHtml(r, user);
    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 600);
    }
}

function ConfirmModal({ plan, gradient, onConfirm, onCancel }) {
    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ background:'#fff', borderRadius:20, padding:'32px 28px', maxWidth:360, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', textAlign:'center' }}>
                <div style={{ width:56, height:56, borderRadius:16, background:gradient, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:26 }}>
                    {plan === 'bronze' ? '🥉' : plan === 'silver' ? '🥈' : '🥇'}
                </div>
                <h3 style={{ margin:'0 0 8px', fontSize:18, fontWeight:800, color:'#1e1b4b' }}>Upgrade to {PLAN_LABEL[plan]}?</h3>
                <p style={{ margin:'0 0 24px', fontSize:14, color:'#64748b', lineHeight:1.6 }}>
                    Ready to upgrade? Clicking <strong style={{color:'#1e1b4b'}}>Yes, Proceed</strong> will take you to the payment page to complete your plan upgrade.
                </p>
                <div style={{ display:'flex', gap:12 }}>
                    <button onClick={onCancel} style={{ flex:1, padding:'11px', borderRadius:10, border:'1.5px solid #e2e8f0', background:'#f8fafc', color:'#475569', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:gradient, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        Yes, Proceed →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Account({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const [serverCount, setServerCount] = useState(0);
    const [planData, setPlanData]       = useState(null);
    const [myRequests, setMyRequests]   = useState([]);
    const [tab, setTab]                 = useState('plan'); // 'plan' | 'billing' | 'security'
    const [pwForm, setPwForm]           = useState({ current: '', newPw: '', confirm: '' });
    const [pwSaving, setPwSaving]       = useState(false);
    const [pwMsg, setPwMsg]             = useState({ type: '', text: '' });
    const [confirmPlan, setConfirmPlan] = useState(null);

    useEffect(() => {
        getServers().then(r => setServerCount(r.data.length)).catch(() => {});
        getPlans().then(r => setPlanData(r.data)).catch(() => {});
        getMyPaymentRequests().then(r => setMyRequests(r.data)).catch(() => {});
    }, []);

    const plan      = user?.plan || 'free_trial';
    const planColor = PLAN_COLORS[plan] || '#64748b';
    const siteLimit = user?.siteLimit || 2;
    const trialLeft = user?.trialDaysLeft || 0;
    const isActive  = user?.isActive;
    const plans     = planData?.plans || {};

    return (
      <>
        <div className="pg-wrap">
            {/* Profile Hero Card */}
            <div style={{ background:'linear-gradient(135deg,#3730a3,#4f46e5)', borderRadius:16, padding:'28px 32px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:20, boxShadow:'0 4px 24px rgba(79,70,229,0.25)' }}>
                {/* Left: Avatar + Info */}
                <div style={{ display:'flex', alignItems:'center', gap:18 }}>
                    <div style={{ width:60, height:60, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800, color:'#fff', flexShrink:0, boxShadow:'0 0 0 3px rgba(167,139,250,0.3)' }}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:3 }}>{user?.name}</div>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', marginBottom:8 }}>{user?.email}</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                            <span style={{ fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20, background: planColor, color:'#fff', letterSpacing:0.5 }}>
                                {plan === 'free_trial' ? '🆓 FREE TRIAL' : `⭐ ${plan.toUpperCase()}`}
                            </span>
                            {plan === 'free_trial' && (
                                <span style={{ fontSize:11, fontWeight:700, padding:'3px 12px', borderRadius:20,
                                    background: !isActive ? 'rgba(239,68,68,0.2)' : trialLeft <= 2 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                    color: !isActive ? '#f87171' : trialLeft <= 2 ? '#fbbf24' : '#34d399',
                                    border: `1px solid ${!isActive ? 'rgba(239,68,68,0.3)' : trialLeft <= 2 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}>
                                    {isActive ? `⏱ ${trialLeft} day${trialLeft !== 1 ? 's' : ''} left` : '⛔ Trial expired'}
                                </span>
                            )}
                            {plan !== 'free_trial' && user?.planEndsAt && (
                                <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', padding:'3px 10px', borderRadius:20, background:'rgba(255,255,255,0.08)' }}>
                                    Renews {fmt(user.planEndsAt)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Stats + Account ID */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12 }}>
                    {/* Sites used */}
                    <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Sites Used</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:100, height:6, background:'rgba(255,255,255,0.15)', borderRadius:10, overflow:'hidden' }}>
                                <div style={{ width:`${Math.min(100,(serverCount/siteLimit)*100)}%`, height:'100%', background: serverCount >= siteLimit ? '#ef4444' : '#7c3aed', borderRadius:10, transition:'width 0.4s' }}/>
                            </div>
                            <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{serverCount}<span style={{ color:'rgba(255,255,255,0.4)', fontWeight:400 }}>/{siteLimit}</span></span>
                        </div>
                    </div>
                    {/* Account ID */}
                    {user?.accountId && (
                        <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(0,0,0,0.2)', borderRadius:10, padding:'10px 16px', border:'1px solid rgba(255,255,255,0.15)' }}>
                            <div>
                                <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:3 }}>Account ID</div>
                                <div style={{ fontSize:16, fontWeight:800, color:'#fff', fontFamily:'monospace', letterSpacing:2 }}>{user.accountId}</div>
                            </div>
                            <button onClick={()=>navigator.clipboard.writeText(user.accountId)}
                                style={{ background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:7, padding:'5px 12px', color:'#fff', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
                                📋 Copy
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {plan === 'free_trial' && !isActive && (
                <div className="acct-expired-banner">Your free trial has expired. Upgrade to continue monitoring.</div>
            )}
            {plan === 'free_trial' && isActive && trialLeft <= 2 && (
                <div className="acct-warn-banner">Trial expires in {trialLeft} day{trialLeft !== 1 ? 's' : ''}. Upgrade now.</div>
            )}

            {/* Tabs */}
            <div className="acct-tabs">
                <button className={`acct-tab${tab === 'plan' ? ' acct-tab-active' : ''}`} onClick={() => setTab('plan')}>My Plan</button>
                <button className={`acct-tab${tab === 'billing' ? ' acct-tab-active' : ''}`} onClick={() => setTab('billing')}>
                    Billing & Invoices
                    {myRequests.length > 0 && <span className="acct-tab-count">{myRequests.length}</span>}
                </button>
                <button className={`acct-tab${tab === 'security' ? ' acct-tab-active' : ''}`} onClick={() => { setTab('security'); setPwMsg({ type:'', text:'' }); }}>
                    🔒 Security
                </button>
            </div>

            {/* ── PLAN TAB ── */}
            {tab === 'plan' && (() => {
                const emojiMap = { free_trial:'🆓', bronze:'🥉', silver:'🥈', gold:'🥇' };
                const featMap  = {
                    free_trial: parseFeatures(plans?.free_trial?.features || planData?.freeTrialFeatures),
                    bronze:     parseFeatures(plans?.bronze?.features),
                    silver:     parseFeatures(plans?.silver?.features),
                    gold:       parseFeatures(plans?.gold?.features),
                };
                const cfg      = plans[plan] || {};
                const price    = plan === 'free_trial' ? 'Free' : (cfg.price || (plan === 'bronze' ? 499 : plan === 'silver' ? 999 : 1499));
                const sites    = cfg.sites || (plan === 'free_trial' ? 2 : plan === 'bronze' ? 5 : plan === 'silver' ? 15 : 30);
                const features = featMap[plan] || [];
                const expired  = !isActive;

                return (
                    <div style={{ display:'flex', justifyContent:'flex-start', padding:'8px 0' }}>
                        <div style={{ width:'100%', maxWidth:340 }}>
                            <div className={`acct-plan-card acct-current`} style={{ margin:'0 auto' }}>
                                <div className="acct-active-glow" />
                                <div className="acct-plan-card-header" style={{ background: PLAN_GRADIENTS[plan] }}>
                                    <div className="acct-plan-card-emoji">{emojiMap[plan]}</div>
                                    <div className="acct-plan-card-name">{PLAN_LABEL[plan]}</div>
                                    <div className="acct-plan-card-price">{plan === 'free_trial' ? 'Free' : <>₹{price}<span>/mo</span></>}</div>
                                    <div className="acct-plan-card-sites">{sites} sites included</div>
                                </div>
                                <div className="acct-plan-card-body">
                                    <ul className="acct-plan-features">
                                        {features.map(({ label, type }) => (
                                            <li key={label} style={{ display:'flex', alignItems:'center', gap:7, color: type === 'no' ? '#cbd5e1' : '#475569', opacity: type === 'no' ? 0.6 : 1 }}>
                                                {type === 'ok'      && <span style={{ color:'#10b981', fontWeight:900, fontSize:12, flexShrink:0 }}>✓</span>}
                                                {type === 'no'      && <span style={{ color:'#ef4444', fontWeight:900, fontSize:12, flexShrink:0 }}>✕</span>}
                                                {type === 'limited' && <span style={{ fontSize:12, flexShrink:0 }}>😐</span>}
                                                {type === 'soon'    && <span style={{ fontSize:11, flexShrink:0 }}>🔜</span>}
                                                <span style={{ fontSize:11 }}>{label}</span>
                                                {type === 'soon' && <span style={{ fontSize:9, background:'#f1f5f9', color:'#94a3b8', borderRadius:4, padding:'1px 5px', fontWeight:700, flexShrink:0 }}>Soon</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    {expired ? (
                                        <button className="acct-upgrade-btn" style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}
                                            onClick={() => navigate('/pay?plan=select')}>
                                            🔄 Renew / Upgrade Plan →
                                        </button>
                                    ) : (
                                        <div className="acct-current-label">✓ Your Current Plan</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── BILLING TAB ── */}
            {tab === 'billing' && (
                <div className="acct-billing">
                    {myRequests.length === 0 ? (
                        <div className="acct-billing-empty">
                            <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
                            <p>No billing records yet.</p>
                        </div>
                    ) : (
                        <>
                            <div className="acct-billing-header-row">
                                <span className="acct-billing-col-head">Plan</span>
                                <span className="acct-billing-col-head">Txn ID</span>
                                <span className="acct-billing-col-head">Amount</span>
                                <span className="acct-billing-col-head">Date</span>
                                <span className="acct-billing-col-head">Status</span>
                                <span className="acct-billing-col-head">Invoice</span>
                            </div>
                            {myRequests.map(r => {
                                const s = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                                const planName = r.type === 'verification' ? '₹2 Verification' : (PLAN_LABEL[r.plan] || r.plan || '—');
                                return (
                                    <div key={r._id} className="acct-billing-row">
                                        <span className="acct-billing-plan" style={{ color: r.type === 'verification' ? '#7c3aed' : (PLAN_COLORS[r.plan] || '#64748b') }}>
                                            {planName}
                                        </span>
                                        <span className="acct-billing-txn">{r.utr || '—'}</span>
                                        <span className="acct-billing-amount">₹{r.amount}</span>
                                        <span className="acct-billing-date">{fmt(r.createdAt)}</span>
                                        <span className="acct-billing-status" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                                        <button
                                            className="acct-dl-btn"
                                            onClick={() => downloadInvoice(r, user)}
                                            title="Download Invoice"
                                        >
                                            ⬇ Invoice
                                        </button>
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
            {/* ── SECURITY TAB ── */}
            {tab === 'security' && (
                <div className="acct-security">
                    <div className="acct-sec-card">
                        <div className="acct-sec-title">🔑 Change Password</div>
                        <div className="acct-sec-sub">Enter your current password to set a new one.</div>

                        <div className="acct-sec-form">
                            <div className="form-group">
                                <label>Current Password</label>
                                <input
                                    type="password" placeholder="Enter current password"
                                    value={pwForm.current}
                                    onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="form-group">
                                <label>New Password</label>
                                <input
                                    type="password" placeholder="Min. 6 characters"
                                    value={pwForm.newPw}
                                    onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password" placeholder="Re-enter new password"
                                    value={pwForm.confirm}
                                    onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                                    autoComplete="new-password"
                                />
                            </div>

                            {pwMsg.text && (
                                <div className={`acct-sec-msg ${pwMsg.type}`}>{pwMsg.text}</div>
                            )}

                            <button
                                className="acct-sec-btn"
                                disabled={pwSaving}
                                onClick={async () => {
                                    setPwMsg({ type: '', text: '' });
                                    if (!pwForm.current) return setPwMsg({ type: 'error', text: 'Enter your current password' });
                                    if (pwForm.newPw.length < 6) return setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' });
                                    if (pwForm.newPw !== pwForm.confirm) return setPwMsg({ type: 'error', text: 'New passwords do not match' });
                                    setPwSaving(true);
                                    try {
                                        await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
                                        setPwMsg({ type: 'success', text: '✅ Password changed successfully!' });
                                        setPwForm({ current: '', newPw: '', confirm: '' });
                                    } catch (e) {
                                        setPwMsg({ type: 'error', text: e.response?.data?.error || 'Failed to change password' });
                                    }
                                    setPwSaving(false);
                                }}
                            >
                                {pwSaving ? 'Saving...' : 'Update Password'}
                            </button>
                        </div>
                    </div>

                    <div className="acct-sec-info">
                        <div className="acct-sec-info-row">🔒 Password is stored securely using bcrypt hashing</div>
                        <div className="acct-sec-info-row">📧 Logged in as <strong>{user?.email}</strong></div>
                        <div className="acct-sec-info-row">💡 Use a strong password with letters, numbers & symbols</div>
                    </div>
                </div>
            )}
        </div>

        {confirmPlan && (
            <ConfirmModal
                plan={confirmPlan}
                gradient={PLAN_GRADIENTS[confirmPlan]}
                onConfirm={() => { setConfirmPlan(null); navigate(`/pay?plan=${confirmPlan}`); }}
                onCancel={() => setConfirmPlan(null)}
            />
        )}
      </>
    );
}
