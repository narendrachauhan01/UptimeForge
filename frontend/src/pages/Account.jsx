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

    const [deleteMsg, setDeleteMsg] = useState('');

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
                                        <div key={r._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid #F3F4F6', gap:12 }}>
                                            <div style={{ flex:1 }}>
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

            </main>
        </div>
    );
}
