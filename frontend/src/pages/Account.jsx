import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPlans, getMyPaymentRequests, getServers, changePassword } from '../api';
import { useConfirm } from '../components/ConfirmDialog';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_COLORS = { free_trial:'#64748b', bronze:'#b45309', silver:'#475569', gold:'#ca8a04' };
const PLAN_LABEL  = { free_trial:'Free Trial', bronze:'Bronze', silver:'Silver', gold:'Gold' };
const PLAN_GRADIENTS = {
    free_trial: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    bronze: 'linear-gradient(135deg,#b45309,#d97706)',
    silver: 'linear-gradient(135deg,#475569,#64748b)',
    gold:   'linear-gradient(135deg,#ca8a04,#eab308)',
};

function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

const S = {
    section: { background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'28px 32px', marginBottom:20 },
    title: { fontSize:20, fontWeight:800, color:'#111827', marginBottom:6, display:'flex', alignItems:'center', gap:6 },
    desc: { fontSize:13, color:'#6B7280', marginBottom:20, lineHeight:1.5 },
    label: { fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 },
    sublabel: { fontSize:12, color:'#9CA3AF', marginBottom:8, display:'block' },
    input: { width:'100%', padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:14, color:'#111827', background:'#fff', outline:'none', boxSizing:'border-box' },
    saveBtn: { padding:'9px 20px', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' },
    grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 },
};

export default function Account({ user, onUserUpdate }) {
    const navigate  = useNavigate();
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [section, setSection] = useState('account');
    const [planData, setPlanData]     = useState(null);
    const [myRequests, setMyRequests] = useState([]);
    const [serverCount, setServerCount] = useState(0);

    // Form states
    const [nameForm,  setNameForm]  = useState({ name: user?.name || '' });
    const [nameMsg,   setNameMsg]   = useState('');
    const [pwForm,    setPwForm]    = useState({ current:'', newPw:'', confirm:'' });
    const [pwMsg,     setPwMsg]     = useState({ type:'', text:'' });

    useEffect(() => {
        getPlans().then(r => setPlanData(r.data)).catch(() => {});
        getMyPaymentRequests().then(r => setMyRequests(r.data)).catch(() => {});
        getServers().then(r => setServerCount(r.data.length)).catch(() => {});
        setNameForm({ name: user?.name || '' });
    }, [user]);

    const plan      = user?.plan || 'free_trial';
    const planColor = PLAN_COLORS[plan] || '#64748b';
    const siteLimit = user?.siteLimit || 2;
    const trialLeft = user?.trialDaysLeft || 0;
    const isActive  = user?.isActive;
    const accountStatus = user?.accountStatus || 'active';

    const saveName = async () => {
        try {
            const r = await axios.put(`${API_URL}/api/users/profile`, { name: nameForm.name }, { withCredentials: true });
            onUserUpdate && onUserUpdate(r.data);
            setNameMsg('✅ Saved!');
            setTimeout(() => setNameMsg(''), 3000);
        } catch { setNameMsg('❌ Failed'); }
    };

    const savePw = async () => {
        if (pwForm.newPw !== pwForm.confirm) { setPwMsg({ type:'error', text:'Passwords do not match' }); return; }
        if (pwForm.newPw.length < 6) { setPwMsg({ type:'error', text:'Min 6 characters' }); return; }
        try {
            await changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw });
            setPwMsg({ type:'ok', text:'✅ Password updated!' });
            setPwForm({ current:'', newPw:'', confirm:'' });
        } catch(e) { setPwMsg({ type:'error', text: e.response?.data?.error || 'Failed' }); }
    };

    const [deleteMsg,  setDeleteMsg]  = useState('');
    const [refCopied,  setRefCopied]  = useState(false);
    const [refStats,   setRefStats]   = useState({ total: 0, paid: 0 });
    const referralLink = `https://servermonitor.narendrasingh.site/register?ref=${user?.accountId || ''}`;
    const copyRef = () => {
        navigator.clipboard.writeText(referralLink);
        setRefCopied(true);
        setTimeout(() => setRefCopied(false), 2500);
    };
    useEffect(() => {
        axios.get(`${API_URL}/api/users/referral-stats`, { withCredentials: true })
            .then(r => setRefStats(r.data)).catch(() => {});
    }, []);

    const downloadInvoice = (r) => {
        const planName  = r.type === 'verification' ? 'Free Trial Verification' : `${PLAN_LABEL[r.plan] || r.plan} Plan`;
        const period    = r.type === 'verification' ? '5-day trial period' : (r.billing === 'annually' ? '12 months' : '1 month');
        const invNo     = 'UW-' + (r._id?.slice(-8).toUpperCase() || 'XXXXXXXX');
        const dateStr   = new Date(r.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
        const note      = r.type === 'verification'
            ? `This ₹${r.amount} verification fee is non-refundable and activates your 5-day free trial.`
            : `This payment activates your ${planName} for ${period}.`;

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice #${invNo} - UptimeForge</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,Arial,sans-serif;background:#f1f5f9;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:40px 20px}
  .card{background:#fff;border-radius:16px;width:100%;max-width:720px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.12)}
  .hdr{background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:28px 36px;display:flex;justify-content:space-between;align-items:flex-start}
  .hdr-left h1{color:#fff;font-size:22px;font-weight:900;margin-bottom:4px}
  .hdr-left p{color:rgba(255,255,255,0.75);font-size:12px;margin-bottom:2px}
  .hdr-right{text-align:right}
  .hdr-right .inv-label{color:#fff;font-size:28px;font-weight:900;letter-spacing:2px}
  .hdr-right .inv-no{color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px}
  .hdr-right .inv-date{color:rgba(255,255,255,0.75);font-size:12px}
  .body{padding:32px 36px}
  .from-to{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:28px}
  .from-to .label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
  .from-to h3{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:6px}
  .from-to p{font-size:13px;color:#64748b;line-height:1.7}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#f8fafc}
  th{padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0}
  td{padding:14px;font-size:13px;color:#374151;border-bottom:1px solid #f1f5f9}
  .txn{font-family:monospace;font-size:12px;background:#f8fafc;padding:3px 8px;border-radius:6px;border:1px solid #e2e8f0}
  .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${r.status==='approved'?'#dcfce7':'#fef2f2'};color:${r.status==='approved'?'#16a34a':'#dc2626'}}
  .total-row{background:#f0fdf4;border-radius:10px;padding:16px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
  .total-row span{font-size:15px;font-weight:700;color:#374151}
  .total-row strong{font-size:22px;font-weight:900;color:#16a34a}
  .note{font-size:12px;color:#64748b;line-height:1.7;margin-bottom:8px}
  .footer{padding:16px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
  .footer span{font-size:12px;color:#94a3b8}
  .footer strong{font-size:12px;font-weight:700;color:#7c3aed}
  .print-btn{margin-top:24px;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}.print-btn{display:none}}
</style></head>
<body>
<div class="card">
  <div class="hdr">
    <div class="hdr-left">
      <h1>UptimeForge</h1>
      <p>24/7 Uptime Monitoring</p>
      <p>uptimeforge@gmail.com</p>
    </div>
    <div class="hdr-right">
      <div class="inv-label">INVOICE</div>
      <div class="inv-no"># ${invNo}</div>
      <div class="inv-date">Date: ${dateStr}</div>
    </div>
  </div>
  <div class="body">
    <div class="from-to">
      <div>
        <div class="label">From</div>
        <h3>UptimeForge</h3>
        <p>Narendra Singh — DevOps Engineer<br>uptimeforge@gmail.com<br>India</p>
      </div>
      <div>
        <div class="label">Billed To</div>
        <h3>${user?.name || '—'}</h3>
        <p>${user?.email || ''}<br>${user?.phone || ''}<br>${[user?.state, user?.country].filter(Boolean).join(', ') || 'India'}</p>
        <p style="margin-top:8px"><span style="font-size:11px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px">Account ID: </span><strong style="font-family:monospace;font-size:13px;color:#7c3aed;letter-spacing:1px">${user?.accountId || 'N/A'}</strong></p>
      </div>
    </div>
    <table>
      <thead><tr><th>Description</th><th>Plan Period</th><th>Transaction ID</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>${planName}</strong></td>
          <td>${period}</td>
          <td><span class="txn">${r.utr || '—'}</span></td>
          <td><span class="badge">${r.status?.charAt(0).toUpperCase()+r.status?.slice(1)}</span></td>
          <td style="text-align:right;font-weight:700">₹${r.amount}</td>
        </tr>
      </tbody>
    </table>
    <div class="total-row">
      <span>Total Paid</span>
      <strong>₹${r.amount}</strong>
    </div>
    <p class="note">Payment received via UPI / Card / Netbanking. This is a computer-generated invoice and does not require a signature. ${note}</p>
  </div>
  <div class="footer">
    <span>Thank you for using UptimeForge! For support: uptimeforge@gmail.com</span>
    <strong>UptimeForge © 2026</strong>
  </div>
</div>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
</body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    };

    const deleteAccount = async () => {
        const ok = await confirm(
            'A verification email will be sent to your account email. Click the link to confirm permanent deletion.',
            { title:'Delete Account', confirmText:'Send Verification Email', danger:true }
        );
        if (!ok) return;
        try {
            await axios.post(`${API_URL}/api/users/request-delete`, {}, { withCredentials: true });
            setDeleteMsg('✅ Verification email sent! Check your inbox and click the link to confirm deletion.');
        } catch(e) { setDeleteMsg('❌ ' + (e.response?.data?.error || 'Failed to send email')); }
    };

    const NAV = [
        { id:'account',  label:'Account details',         icon:'👤' },
        { id:'billing',  label:'Billing & subscription',  icon:'💳' },
        { id:'invoices', label:'Invoices',                 icon:'🧾' },
        { id:'security', label:'Security',                 icon:'🔒' },
        { id:'referral', label:'Referral',                 icon:'🎁' },
    ];

    return (
        <div style={{ display:'flex', minHeight:'calc(100vh - 64px)', background:'#F9FAFB' }}>
            <ConfirmDialog />

            {/* Left Sidebar */}
            <aside style={{ width:220, background:'#fff', borderRight:'1px solid #E5E7EB', padding:'24px 0', flexShrink:0 }}>
                {/* User info */}
                <div style={{ padding:'0 20px 20px', borderBottom:'1px solid #E5E7EB', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                        <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:16, flexShrink:0 }}>
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:13, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
                            <span style={{ fontSize:11, fontWeight:600, padding:'1px 8px', borderRadius:20, background: planColor, color:'#fff' }}>
                                {PLAN_LABEL[plan]}
                            </span>
                        </div>
                    </div>
                    {user?.accountId && (
                        <div style={{ fontSize:11, color:'#9CA3AF', fontFamily:'monospace', textAlign:'center', background:'#F9FAFB', borderRadius:6, padding:'4px 8px' }}>
                            {user.accountId}
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav style={{ padding:'0 8px' }}>
                    {NAV.map(n => (
                        <button key={n.id} onClick={() => setSection(n.id)}
                            style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', fontSize:13, fontWeight:600, marginBottom:2, transition:'all 0.15s',
                                background: section === n.id ? '#ede9fe' : 'transparent',
                                color: section === n.id ? '#7c3aed' : '#374151' }}>
                            <span>{n.icon}</span>
                            <span>{n.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex:1, padding:'32px 40px', overflowY:'auto', maxWidth:900 }}>

                {/* ── ACCOUNT DETAILS ── */}
                {section === 'account' && (
                    <>
                        <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', marginBottom:28 }}>Account details.</h1>

                        {/* Account Info */}
                        <div style={S.section}>
                            <div style={S.title}>Account info.</div>
                            <div style={S.desc}>Used to display in your dashboard and all communications with you.</div>
                            <div style={S.grid2}>
                                <div>
                                    <label style={S.label}>Full name</label>
                                    <input style={S.input} value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} placeholder="Your name" />
                                </div>
                                <div>
                                    <label style={S.label}>Account ID</label>
                                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                        <input style={{ ...S.input, fontFamily:'monospace', background:'#F9FAFB', color:'#7c3aed', fontWeight:700 }} value={user?.accountId || '—'} readOnly />
                                        <button onClick={() => navigator.clipboard.writeText(user?.accountId || '')}
                                            style={{ padding:'10px 14px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13, whiteSpace:'nowrap' }}>📋</button>
                                    </div>
                                </div>
                            </div>
                            <div style={S.grid2}>
                                <div>
                                    <label style={S.label}>Email address</label>
                                    <input style={{ ...S.input, background:'#F9FAFB', color:'#6B7280' }} value={user?.email || ''} readOnly />
                                </div>
                                <div>
                                    <label style={S.label}>Phone</label>
                                    <input style={{ ...S.input, background:'#F9FAFB', color:'#6B7280' }} value={user?.phone || '—'} readOnly />
                                </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <button style={S.saveBtn} onClick={saveName}>Save changes</button>
                                {nameMsg && <span style={{ fontSize:13, color: nameMsg.startsWith('✅') ? '#16a34a' : '#dc2626' }}>{nameMsg}</span>}
                            </div>
                        </div>

                        {/* Plan Status */}
                        <div style={S.section}>
                            <div style={S.title}>Plan status.</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16, marginBottom:20 }}>
                                {[
                                    { label:'Current Plan', value: PLAN_LABEL[plan], color: planColor },
                                    { label:'Sites Used', value: `${serverCount} / ${siteLimit}`, color:'#7c3aed' },
                                    { label:'Status', value: !isActive ? 'Expired' : accountStatus === 'grace' ? 'Grace Period' : 'Active', color: !isActive ? '#dc2626' : '#16a34a' },
                                    plan === 'free_trial'
                                        ? { label:'Trial Days Left', value: isActive ? `${trialLeft} days` : 'Expired', color: trialLeft <= 2 ? '#dc2626' : '#16a34a' }
                                        : { label:'Renews', value: fmt(user?.planEndsAt), color:'#374151' },
                                ].map(s => (
                                    <div key={s.label} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'16px' }}>
                                        <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:6 }}>{s.label}</div>
                                        <div style={{ fontSize:17, fontWeight:800, color: s.color }}>{s.value}</div>
                                    </div>
                                ))}
                            </div>
                            <Link to="/pay?plan=select" style={{ display:'inline-block', padding:'9px 20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontWeight:600, fontSize:14, textDecoration:'none' }}>
                                ⬆️ Upgrade Plan
                            </Link>
                        </div>

                        {/* Delete Account */}
                        <div style={{ ...S.section, border:'1px solid #FECDD3', background:'#FFF5F5' }}>
                            <div style={{ ...S.title, color:'#DC2626' }}>Delete account.</div>
                            <div style={{ ...S.desc, color:'#7f1d1d' }}>
                                UptimeForge sends an <strong>"account deletion verification e-mail"</strong> to the account e-mail. Once the verification link inside the e-mail is clicked, all account information at UptimeForge (including the account, monitors, logs and settings) will be <strong>lost and can not be recovered</strong>.
                            </div>
                            <button onClick={deleteAccount} style={{ padding:'9px 20px', background:'#DC2626', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>
                                Delete account
                            </button>
                            {deleteMsg && <p style={{ marginTop:12, fontSize:13, color: deleteMsg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight:600 }}>{deleteMsg}</p>}
                        </div>
                    </>
                )}

                {/* ── BILLING ── */}
                {section === 'billing' && (
                    <>
                        <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', marginBottom:28 }}>Billing & subscription.</h1>
                        <div style={S.section}>
                            <div style={S.title}>Current plan.</div>
                            <div style={{ display:'flex', alignItems:'center', gap:16, padding:'20px', background:'#F9FAFB', borderRadius:10, border:'1px solid #E5E7EB', marginBottom:20 }}>
                                <div style={{ width:48, height:48, borderRadius:12, background: PLAN_GRADIENTS[plan], display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                                    {plan === 'free_trial' ? '🆓' : plan === 'bronze' ? '🥉' : plan === 'silver' ? '🥈' : '🥇'}
                                </div>
                                <div style={{ flex:1 }}>
                                    <div style={{ fontWeight:800, fontSize:16, color:'#111827' }}>{PLAN_LABEL[plan]} Plan</div>
                                    <div style={{ fontSize:13, color:'#6B7280', marginTop:2 }}>
                                        {plan === 'free_trial' ? `Trial ${isActive ? `· ${trialLeft} days left` : '· Expired'}` : `${siteLimit} sites · Renews ${fmt(user?.planEndsAt)}`}
                                    </div>
                                </div>
                                <Link to="/pay?plan=select" style={{ padding:'9px 18px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13, textDecoration:'none' }}>
                                    Change Plan
                                </Link>
                            </div>
                            <div style={{ fontSize:13, color:'#6B7280' }}>
                                💳 Payments secured by <strong>Razorpay</strong> · UPI · Cards · Netbanking
                            </div>
                        </div>
                    </>
                )}

                {/* ── INVOICES ── */}
                {section === 'invoices' && (
                    <>
                        <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', marginBottom:28 }}>Invoices.</h1>
                        <div style={S.section}>
                            <div style={S.title}>Payment history.</div>
                            {myRequests.length === 0 ? (
                                <div style={{ textAlign:'center', padding:'40px 0', color:'#9CA3AF' }}>
                                    <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
                                    <div style={{ fontWeight:600 }}>No payments yet</div>
                                </div>
                            ) : (
                                <div>
                                    {myRequests.map(r => (
                                        <div key={r._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid #F3F4F6', gap:12, flexWrap:'wrap' }}>
                                            <div style={{ flex:1, minWidth:180 }}>
                                                <div style={{ fontWeight:700, color:'#111827', fontSize:14 }}>
                                                    {r.type === 'verification' ? 'Free Trial Verification' : `${PLAN_LABEL[r.plan] || r.plan} Plan`}
                                                </div>
                                                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{r.utr} · {fmt(r.createdAt)}</div>
                                            </div>
                                            <div style={{ fontWeight:800, fontSize:15, color:'#7c3aed' }}>₹{r.amount}</div>
                                            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20,
                                                background: r.status==='approved'?'#f0fdf4':r.status==='refunded'?'#fef2f2':'#f9fafb',
                                                color: r.status==='approved'?'#16a34a':r.status==='refunded'?'#dc2626':'#6B7280' }}>
                                                {r.status}
                                            </span>
                                            <button onClick={() => downloadInvoice(r)}
                                                style={{ padding:'6px 14px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', color:'#374151', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                                                📄 Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── SECURITY ── */}
                {section === 'security' && (
                    <>
                        <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', marginBottom:28 }}>Security.</h1>

                        {!user?.isGoogleUser && (
                        <div style={S.section}>
                            <div style={S.title}>Change password.</div>
                            <div style={S.desc}>Choose a strong password to keep your account safe.</div>
                            <div style={{ maxWidth:440, display:'flex', flexDirection:'column', gap:14 }}>
                                <div>
                                    <label style={S.label}>Current password</label>
                                    <input type="password" style={S.input} value={pwForm.current} onChange={e => setPwForm(f => ({...f, current:e.target.value}))} placeholder="Enter current password" />
                                </div>
                                <div>
                                    <label style={S.label}>New password</label>
                                    <input type="password" style={S.input} value={pwForm.newPw} onChange={e => setPwForm(f => ({...f, newPw:e.target.value}))} placeholder="Min 6 characters" />
                                </div>
                                <div>
                                    <label style={S.label}>Confirm new password</label>
                                    <input type="password" style={S.input} value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm:e.target.value}))} placeholder="Repeat new password" />
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                    <button style={S.saveBtn} onClick={savePw}>Update password</button>
                                    {pwMsg.text && <span style={{ fontSize:13, color: pwMsg.type==='ok'?'#16a34a':'#dc2626' }}>{pwMsg.text}</span>}
                                </div>
                            </div>
                        </div>
                        )}

                        {user?.isGoogleUser && (
                        <div style={S.section}>
                            <div style={S.title}>Google account.</div>
                            <div style={S.desc}>Your account is linked with Google. Password change is managed through Google.</div>
                            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:'#F9FAFB', borderRadius:10, border:'1px solid #E5E7EB', width:'fit-content' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                <span style={{ fontSize:14, fontWeight:600, color:'#374151' }}>Connected with Google</span>
                            </div>
                        </div>
                        )}

                        <div style={{ ...S.section, border:'1px solid #FECDD3', background:'#FFF5F5' }}>
                            <div style={{ ...S.title, color:'#DC2626' }}>Danger zone.</div>
                            <div style={{ ...S.desc, color:'#7f1d1d' }}>
                                UptimeForge sends an <strong>"account deletion verification e-mail"</strong> to the account e-mail. Once the verification link inside the e-mail is clicked, all account information at UptimeForge (including the account, monitors, logs and settings) will be <strong>lost and can not be recovered</strong>.
                            </div>
                            <button onClick={deleteAccount} style={{ padding:'9px 20px', background:'#DC2626', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:14, cursor:'pointer' }}>
                                Delete account
                            </button>
                            {deleteMsg && <p style={{ marginTop:12, fontSize:13, color: deleteMsg.startsWith('✅') ? '#16a34a' : '#dc2626', fontWeight:600 }}>{deleteMsg}</p>}
                        </div>
                    </>
                )}

                {/* ── REFERRAL ── */}
                {section === 'referral' && (
                    <>
                        <h1 style={{ fontSize:26, fontWeight:900, color:'#111827', marginBottom:28 }}>Referral.</h1>

                        {/* Hero */}
                        <div style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius:16, padding:'32px', marginBottom:20, color:'#fff' }}>
                            <div style={{ fontSize:40, marginBottom:12 }}>🎁</div>
                            <h2 style={{ fontSize:22, fontWeight:900, marginBottom:8 }}>Invite friends, earn rewards!</h2>
                            <p style={{ fontSize:14, color:'rgba(255,255,255,0.8)', lineHeight:1.7, marginBottom:0 }}>
                                Share your referral link with friends. When they sign up using your link, both of you get benefits.
                            </p>
                        </div>

                        {/* Stats */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
                            {[
                                { label:'Friends Joined', value: refStats.total, icon:'👥', color:'#7c3aed', bg:'#ede9fe' },
                                { label:'Paid Plans', value: refStats.paid, icon:'💳', color:'#16a34a', bg:'#f0fdf4' },
                                { label:'Bonus Days Earned', value: refStats.paid * 10, icon:'⏱️', color:'#f59e0b', bg:'#fef3c7' },
                            ].map(s => (
                                <div key={s.label} style={{ background: s.bg, borderRadius:12, padding:'20px', textAlign:'center', border:`1px solid ${s.color}20` }}>
                                    <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
                                    <div style={{ fontSize:26, fontWeight:900, color: s.color }}>{s.value}</div>
                                    <div style={{ fontSize:12, color:'#6B7280', fontWeight:600 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Referral Link */}
                        <div style={S.section}>
                            <div style={S.title}>Your referral link.</div>
                            <div style={S.desc}>Share this link with friends to invite them to UptimeForge.</div>
                            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                                <input style={{ ...S.input, fontFamily:'monospace', fontSize:13, background:'#F9FAFB', color:'#374151', flex:1 }}
                                    value={referralLink} readOnly />
                                <button onClick={copyRef}
                                    style={{ padding:'10px 20px', background: refCopied ? '#16a34a' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer', whiteSpace:'nowrap', minWidth:100 }}>
                                    {refCopied ? '✓ Copied!' : '📋 Copy Link'}
                                </button>
                            </div>
                            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                                <a href={`https://wa.me/?text=Join UptimeForge - 24/7 website monitoring! Use my link: ${encodeURIComponent(referralLink)}`} target="_blank" rel="noreferrer"
                                    style={{ padding:'8px 16px', background:'#25d366', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                                    💬 Share on WhatsApp
                                </a>
                                <a href={`mailto:?subject=Try UptimeForge&body=I'm using UptimeForge for website monitoring. Join using my link: ${referralLink}`}
                                    style={{ padding:'8px 16px', background:'#EA4335', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:6 }}>
                                    📧 Share via Email
                                </a>
                            </div>
                        </div>

                        {/* Referral Code */}
                        <div style={S.section}>
                            <div style={S.title}>Your referral code.</div>
                            <div style={S.desc}>Friends can enter this code during registration.</div>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ background:'#ede9fe', borderRadius:10, padding:'14px 24px', fontFamily:'monospace', fontSize:20, fontWeight:900, color:'#7c3aed', letterSpacing:3, border:'2px dashed #c4b5fd' }}>
                                    {user?.accountId || 'N/A'}
                                </div>
                                <button onClick={() => { navigator.clipboard.writeText(user?.accountId || ''); }}
                                    style={{ padding:'10px 16px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                                    📋 Copy Code
                                </button>
                            </div>
                        </div>

                        {/* How it works */}
                        <div style={S.section}>
                            <div style={S.title}>How it works.</div>
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16 }}>
                                {[
                                    { step:'1', icon:'🔗', title:'Share your link', desc:'Copy and share your unique referral link or code' },
                                    { step:'2', icon:'👤', title:'Friend signs up', desc:'Your friend registers using your link or code' },
                                    { step:'3', icon:'🎉', title:'Both benefit', desc:'You both get rewards when they activate a plan' },
                                ].map(s => (
                                    <div key={s.step} style={{ background:'#F9FAFB', border:'1px solid #E5E7EB', borderRadius:10, padding:'20px', textAlign:'center' }}>
                                        <div style={{ fontSize:32, marginBottom:8 }}>{s.icon}</div>
                                        <div style={{ fontWeight:700, color:'#111827', fontSize:14, marginBottom:4 }}>{s.title}</div>
                                        <div style={{ fontSize:12, color:'#9CA3AF', lineHeight:1.5 }}>{s.desc}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

            </main>
        </div>
    );
}
