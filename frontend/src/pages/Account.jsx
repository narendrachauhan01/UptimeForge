import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlans, getMyPaymentRequests, getServers, changePassword } from '../api';

const PLAN_GRADIENTS = {
    bronze: 'linear-gradient(135deg,#b45309,#d97706)',
    silver: 'linear-gradient(135deg,#475569,#64748b)',
    gold:   'linear-gradient(135deg,#ca8a04,#eab308)',
};
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
        <div class="inv-party-line">support@uptimewatch.in</div>
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
    <div class="inv-footer-note">Thank you for using UptimeForge! For support: support@uptimewatch.in</div>
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

export default function Account({ user, onUserUpdate }) {
    const navigate = useNavigate();
    const [serverCount, setServerCount] = useState(0);
    const [planData, setPlanData]       = useState(null);
    const [myRequests, setMyRequests]   = useState([]);
    const [tab, setTab]                 = useState('plan'); // 'plan' | 'billing' | 'security'
    const [pwForm, setPwForm]           = useState({ current: '', newPw: '', confirm: '' });
    const [pwSaving, setPwSaving]       = useState(false);
    const [pwMsg, setPwMsg]             = useState({ type: '', text: '' });

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
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">My Account</h1>
                    <p className="pg-sub">Plan & billing management</p>
                </div>
            </div>

            {/* Current Plan Card */}
            <div className="acct-current-plan" style={{ borderColor: planColor }}>
                <div className="acct-plan-left">
                    <div className="acct-plan-badge" style={{ background: planColor }}>
                        {plan === 'free_trial' ? 'FREE TRIAL' : plan.toUpperCase()}
                    </div>
                    <div className="acct-plan-info">
                        <div className="acct-user-name">{user?.name}</div>
                        <div className="acct-user-email">{user?.email}</div>
                    </div>
                </div>
                <div className="acct-plan-right">
                    {plan === 'free_trial' && (
                        <div className={`acct-trial-days ${trialLeft <= 1 ? 'critical' : trialLeft <= 3 ? 'warn' : ''}`}>
                            {isActive ? `${trialLeft} day${trialLeft !== 1 ? 's' : ''} left` : 'Trial expired'}
                        </div>
                    )}
                    {plan !== 'free_trial' && user?.planEndsAt && (
                        <div className="acct-plan-expiry">Renews: {fmt(user.planEndsAt)}</div>
                    )}
                    <div className="acct-usage">
                        <span>{serverCount}</span> / <span>{siteLimit}</span> sites used
                    </div>
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
                <button className={`acct-tab${tab === 'plan' ? ' acct-tab-active' : ''}`} onClick={() => setTab('plan')}>Upgrade Plan</button>
                <button className={`acct-tab${tab === 'billing' ? ' acct-tab-active' : ''}`} onClick={() => setTab('billing')}>
                    Billing & Invoices
                    {myRequests.length > 0 && <span className="acct-tab-count">{myRequests.length}</span>}
                </button>
                <button className={`acct-tab${tab === 'security' ? ' acct-tab-active' : ''}`} onClick={() => { setTab('security'); setPwMsg({ type:'', text:'' }); }}>
                    🔒 Security
                </button>
            </div>

            {/* ── PLAN TAB ── */}
            {tab === 'plan' && (
                <div className="acct-plans-row">
                    {[
                        { pk: 'bronze', emoji: '🥉', features: ['5 sites monitored', '60s check interval', 'Email alerts', 'SSL & Domain tracking', 'Performance charts'] },
                        { pk: 'silver', emoji: '🥈', features: ['15 sites monitored', '60s check interval', 'Email alerts', 'SSL & Domain tracking', 'Performance charts', 'Priority support'] },
                        { pk: 'gold',   emoji: '🥇', features: ['30 sites monitored', '60s check interval', 'Email alerts', 'SSL & Domain tracking', 'Performance charts', 'Priority support', 'Server monitoring'] },
                    ].map(({ pk, emoji, features }) => {
                        const cfg   = plans[pk] || {};
                        const price = cfg.price || (pk === 'bronze' ? 499 : pk === 'silver' ? 999 : 1499);
                        const sites = cfg.sites || (pk === 'bronze' ? 5 : pk === 'silver' ? 15 : 30);
                        const isCurrent = plan === pk;
                        const isPopular = pk === 'silver';
                        return (
                            <div key={pk} className={`acct-plan-card ${isCurrent ? 'acct-current' : ''} ${isPopular ? 'acct-popular' : ''}`}>
                                {isPopular && <div className="acct-pop-badge">⭐ Most Popular</div>}
                                {isCurrent && <div className="acct-active-glow" />}
                                <div className="acct-plan-card-header" style={{ background: PLAN_GRADIENTS[pk] }}>
                                    <div className="acct-plan-card-emoji">{emoji}</div>
                                    <div className="acct-plan-card-name">{PLAN_LABEL[pk]}</div>
                                    <div className="acct-plan-card-price">₹{price}<span>/mo</span></div>
                                    <div className="acct-plan-card-sites">{sites} sites included</div>
                                </div>
                                <div className="acct-plan-card-body">
                                    <ul className="acct-plan-features">
                                        {features.map(f => (
                                            <li key={f}><span className="acct-feat-check">✓</span>{f}</li>
                                        ))}
                                    </ul>
                                    {isCurrent ? (
                                        <div className="acct-current-label">✓ Your Current Plan</div>
                                    ) : (
                                        <button
                                            className="acct-upgrade-btn"
                                            style={{ background: PLAN_GRADIENTS[pk] }}
                                            onClick={() => navigate(`/pay?plan=${pk}`)}
                                        >
                                            Upgrade to {PLAN_LABEL[pk]} →
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

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
    );
}
