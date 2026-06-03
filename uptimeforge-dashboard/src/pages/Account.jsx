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

export default function Account({ user, onUserUpdate }) {
    const navigate  = useNavigate();
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [section, setSection] = useState('account');
    const [planData, setPlanData]     = useState(null);
    const [myRequests, setMyRequests] = useState([]);
    const [serverCount, setServerCount] = useState(0);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark'; // Keep dark mode ON by default
    });

    const isDark = localTheme === 'dark';

    // Synchronize theme cookie shifts
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
        <div className={`perf-page-container ${localTheme}`}>
            <style>{`
                /* Global CSS Variables for scope */
                .perf-page-container {
                  --primary: #7c3aed;
                  --primary-hover: #6d28d9;
                  --primary-rgb: 124, 58, 237;
                  --success: #10b981;
                  --success-rgb: 16, 185, 129;
                  --danger: #f43f5e;
                  --danger-rgb: 244, 63, 94;
                  --warning: #f59e0b;
                  --warning-rgb: 245, 158, 11;
                  --info: #06b6d4;
                  
                  transition: background-color 0.3s ease;
                  min-height: 100vh;
                  position: relative;
                  z-index: 1;
                }

                /* Light Theme Scope */
                .perf-page-container.light {
                  --bg-primary: #f8fafc;
                  --bg-card: #ffffff;
                  --bg-input: #f1f5f9;
                  --bg-sidebar: #ffffff;
                  --border-color: rgba(226, 232, 240, 0.8);
                  --text-main: #0f172a;
                  --text-muted: #64748b;
                  --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
                  --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
                  --input-focus-shadow: rgba(124, 58, 237, 0.08);
                  
                  --sidebar-btn-active-bg: #ede9fe;
                  --sidebar-btn-active-color: #7c3aed;
                  --danger-bg-zone: #FFF5F5;
                  --danger-border-zone: #FECDD3;
                  --danger-text-zone: #7f1d1d;
                  
                  --badge-total-bg: #eef2ff;
                  --badge-total-border: #ddd6fe;
                  --hover-row-bg: rgba(124, 58, 237, 0.04);
                }

                /* Dark Theme Scope */
                .perf-page-container.dark {
                  --bg-primary: #0b0f19;
                  --bg-card: #131a26;
                  --bg-input: #1b2535;
                  --bg-sidebar: #101622;
                  --border-color: rgba(255, 255, 255, 0.07);
                  --text-main: #f8fafc;
                  --text-muted: #94a3b8;
                  --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
                  --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
                  --input-focus-shadow: rgba(139, 92, 246, 0.15);
                  
                  --sidebar-btn-active-bg: rgba(124, 58, 237, 0.15);
                  --sidebar-btn-active-color: #a78bfa;
                  --danger-bg-zone: rgba(244, 63, 94, 0.05);
                  --danger-border-zone: rgba(244, 63, 94, 0.25);
                  --danger-text-zone: #f43f5e;
                  
                  --badge-total-bg: rgba(124, 58, 237, 0.08);
                  --badge-total-border: rgba(124, 58, 237, 0.25);
                  --hover-row-bg: rgba(124, 58, 237, 0.08);
                }

                /* Body background overrides */
                body.charts-dark-theme {
                  background-color: #0b0f19 !important;
                }
                body.charts-dark-theme .app-main,
                body.charts-dark-theme .content {
                  background-color: #0b0f19 !important;
                  transition: background-color 0.3s ease;
                }

                /* Sidebar Styling */
                .perf-page-container .ac-sidebar {
                  width: 220px;
                  background: var(--bg-sidebar) !important;
                  border-right: 1px solid var(--border-color) !important;
                  padding: 24px 0;
                  flex-shrink: 0;
                }
                .perf-page-container .sidebar-user-section {
                  padding: 0 20px 20px;
                  border-bottom: 1px solid var(--border-color) !important;
                  margin-bottom: 8px;
                }
                
                .perf-page-container .sidebar-btn {
                  width: 100%;
                  display: flex;
                  align-items: center;
                  gap: 10px;
                  padding: 10px 12px;
                  border-radius: 8px;
                  border: none !important;
                  cursor: pointer;
                  text-align: left;
                  font-size: 13px;
                  font-weight: 600;
                  margin-bottom: 2px;
                  transition: all 0.15s;
                  background: transparent !important;
                  color: var(--text-muted) !important;
                  font-family: 'Plus Jakarta Sans', sans-serif !important;
                }
                .perf-page-container .sidebar-btn:hover {
                  color: var(--text-main) !important;
                  background: var(--bg-input) !important;
                }
                .perf-page-container .sidebar-btn.active {
                  background: var(--sidebar-btn-active-bg) !important;
                  color: var(--sidebar-btn-active-color) !important;
                }

                /* Page wrapper */
                .perf-page-container .ac-layout {
                  display: flex;
                  min-height: calc(100vh - 64px);
                  background: var(--bg-primary) !important;
                }
                .perf-page-container .ac-main {
                  flex: 1;
                  padding: 32px 40px;
                  overflow-y: auto;
                  max-width: 900px;
                }

                /* Section Cards */
                .perf-page-container .ac-section {
                  background: var(--bg-card) !important;
                  border: 1px solid var(--border-color) !important;
                  border-radius: 20px;
                  padding: 28px 32px;
                  margin-bottom: 20px;
                  box-shadow: var(--card-shadow);
                }
                
                .perf-page-container .ac-section-title {
                  font-family: 'Outfit', sans-serif;
                  font-size: 20px;
                  font-weight: 800;
                  color: var(--text-main) !important;
                  margin-bottom: 6px;
                  display: flex;
                  align-items: center;
                  gap: 6px;
                }
                
                .perf-page-container .ac-section-desc {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 13px;
                  color: var(--text-muted);
                  margin-bottom: 20px;
                  line-height: 1.5;
                }
                
                .perf-page-container .ac-label {
                  font-size: 12px;
                  font-weight: 700;
                  color: var(--text-main) !important;
                  display: block;
                  margin-bottom: 6px;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                }
                
                .perf-page-container .ac-input {
                  width: 100%;
                  padding: 10px 14px;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 9px;
                  font-size: 14px;
                  color: var(--text-main) !important;
                  background: var(--bg-input) !important;
                  outline: none;
                  box-sizing: border-box;
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  transition: all 0.2s;
                }
                .perf-page-container .ac-input:focus {
                  border-color: var(--primary) !important;
                  box-shadow: 0 0 0 3px var(--input-focus-shadow);
                }
                .perf-page-container .ac-input:read-only {
                  opacity: 0.65;
                  cursor: not-allowed;
                }
                
                .perf-page-container .btn-primary {
                  padding: 10px 20px !important;
                  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
                  color: #fff !important;
                  border: none !important;
                  border-radius: 9px !important;
                  font-weight: 700 !important;
                  font-size: 14px !important;
                  cursor: pointer !important;
                  transition: all 0.2s !important;
                  box-shadow: 0 4px 12px rgba(124,58,237,0.2);
                }
                .perf-page-container .btn-primary:hover {
                  transform: translateY(-1px) !important;
                  box-shadow: 0 6px 18px rgba(124,58,237,0.3) !important;
                }

                .perf-page-container .btn-outline {
                  padding: 10px 14px !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 9px !important;
                  background: var(--bg-card) !important;
                  color: var(--text-main) !important;
                  cursor: pointer !important;
                  font-size: 13px !important;
                  font-weight: 700 !important;
                  transition: all 0.2s !important;
                }
                .perf-page-container .btn-outline:hover {
                  background: var(--bg-input) !important;
                }

                /* Danger Zone Card */
                .perf-page-container .ac-danger-zone {
                  background: var(--danger-bg-zone) !important;
                  border: 1.5px solid var(--danger-border-zone) !important;
                  border-radius: 20px;
                  padding: 28px 32px;
                  margin-bottom: 20px;
                  box-shadow: var(--card-shadow);
                }
                .perf-page-container .ac-danger-title {
                  font-family: 'Outfit', sans-serif;
                  font-size: 20px;
                  font-weight: 800;
                  color: var(--danger) !important;
                  margin-bottom: 6px;
                }
                .perf-page-container .ac-danger-desc {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 13px;
                  color: var(--danger-text-zone) !important;
                  margin-bottom: 20px;
                  line-height: 1.5;
                  opacity: 0.85;
                }
                .perf-page-container .btn-danger {
                  padding: 10px 20px !important;
                  background: var(--danger) !important;
                  color: #fff !important;
                  border: none !important;
                  border-radius: 9px !important;
                  font-weight: 700 !important;
                  font-size: 14px !important;
                  cursor: pointer !important;
                  transition: all 0.2s !important;
                  box-shadow: 0 4px 12px rgba(244,63,94,0.2);
                }
                .perf-page-container .btn-danger:hover {
                  transform: translateY(-1px) !important;
                  box-shadow: 0 6px 18px rgba(244,63,94,0.3) !important;
                }

                /* Stat Grid / Row items */
                .perf-page-container .info-card-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                  gap: 16px;
                  margin-bottom: 20px;
                }
                .perf-page-container .info-card {
                  background: var(--bg-input) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 12px;
                  padding: 16px;
                }
                .perf-page-container .info-card-label {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  color: var(--text-muted);
                  text-transform: uppercase;
                  margin-bottom: 6px;
                }
                .perf-page-container .info-card-value {
                  font-family: 'Outfit', sans-serif;
                  font-size: 17px;
                  font-weight: 800;
                }

                /* Invoices List Row */
                .perf-page-container .invoice-row {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 14px 16px;
                  border-bottom: 1px solid var(--border-color) !important;
                  gap: 12px;
                  flex-wrap: wrap;
                  transition: background-color 0.15s ease;
                  margin: 0 -16px;
                  border-radius: 10px;
                }
                .perf-page-container .invoice-row:hover {
                  background-color: var(--hover-row-bg) !important;
                }
                .perf-page-container .invoice-row:last-child {
                  border-bottom: none !important;
                }
                .perf-page-container .invoice-title {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                  color: var(--text-main);
                  font-size: 14px;
                }
                .perf-page-container .invoice-meta {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 12px;
                  color: var(--text-muted);
                  margin-top: 2px;
                }
                .perf-page-container .invoice-amount {
                  font-family: 'Outfit', sans-serif;
                  font-weight: 800;
                  font-size: 15px;
                  color: var(--primary);
                }
                .perf-page-container .invoice-badge {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 11px;
                  font-weight: 700;
                  padding: 3px 10px;
                  border-radius: 20px;
                }

                /* Plan display row */
                .perf-page-container .plan-display-card {
                  display: flex;
                  align-items: center;
                  gap: 16px;
                  padding: 20px;
                  background: var(--bg-input) !important;
                  border-radius: 14px;
                  border: 1.5px solid var(--border-color) !important;
                  margin-bottom: 20px;
                }
                
                /* Referral Hero Section */
                .perf-page-container .referral-hero {
                  background: linear-gradient(135deg, #7c3aed, #6d28d9) !important;
                  border-radius: 16px;
                  padding: 32px;
                  margin-bottom: 20px;
                  color: #fff;
                  box-shadow: 0 4px 20px rgba(124,58,237,0.25);
                }
                .perf-page-container .referral-badge-item {
                  background: rgba(255,255,255,0.12);
                  border-radius: 10px;
                  padding: 12px 18px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                }
                .perf-page-container .ref-status-applied {
                  background: var(--bg-input) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 14px;
                  padding: 16px 20px;
                  margin-bottom: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  flex-wrap: wrap;
                  gap: 12px;
                }

                .perf-page-container .ref-stat-card {
                  border-radius: 12px;
                  padding: 20px;
                  text-align: center;
                  border: 1.5px solid var(--border-color) !important;
                  background: var(--bg-card) !important;
                  box-shadow: var(--card-shadow);
                }

                .perf-page-container .ref-code-box {
                  background: var(--bg-input) !important;
                  border-radius: 10px;
                  padding: 14px 24px;
                  font-family: monospace;
                  font-size: 20px;
                  font-weight: 900;
                  color: var(--primary);
                  letter-spacing: 3px;
                  border: 2.5px dashed var(--border-color) !important;
                }

                /* How it works Referral */
                .perf-page-container .ref-step-card {
                  background: var(--bg-input) !important;
                  border: 1.5px solid var(--border-color) !important;
                  border-radius: 12px;
                  padding: 20px;
                  text-align: center;
                }
                .perf-page-container .ref-step-title {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-weight: 700;
                  color: var(--text-main);
                  font-size: 14px;
                  margin-bottom: 4px;
                }
                .perf-page-container .ref-step-desc {
                  font-family: 'Plus Jakarta Sans', sans-serif;
                  font-size: 12px;
                  color: var(--text-muted);
                  line-height: 1.5;
                }
            `}</style>

            <ConfirmDialog />

            <div className="ac-layout">
                {/* Left Sidebar */}
                <aside className="ac-sidebar">
                    {/* User info */}
                    <div className="sidebar-user-section">
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                            <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:16, flexShrink:0 }}>
                                {user?.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                                <div style={{ fontWeight:700, fontSize:13, color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
                                <span style={{ fontSize:11, fontWeight:600, padding:'1px 8px', borderRadius:20, background: planColor, color:'#fff' }}>
                                    {PLAN_LABEL[plan]}
                                </span>
                            </div>
                        </div>
                        {user?.accountId && (
                            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'monospace', textAlign:'center', background:'var(--bg-input)', borderRadius:6, padding:'4px 8px' }}>
                                {user.accountId}
                            </div>
                        )}
                    </div>

                    {/* Nav */}
                    <nav style={{ padding:'0 8px' }}>
                        {NAV.map(n => (
                            <button key={n.id} onClick={() => setSection(n.id)}
                                className={`sidebar-btn ${section === n.id ? 'active' : ''}`}>
                                <span>{n.icon}</span>
                                <span>{n.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="ac-main">

                    {/* ── ACCOUNT DETAILS ── */}
                    {section === 'account' && (
                        <>
                            <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:28, fontFamily:'Outfit, sans-serif' }}>Account details.</h1>

                            {/* Account Info */}
                            <div className="ac-section">
                                <div className="ac-section-title">Account info.</div>
                                <div className="ac-section-desc">Used to display in your dashboard and all communications with you.</div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                                    <div>
                                        <label className="ac-label">Full name</label>
                                        <input className="ac-input" value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} placeholder="Your name" />
                                    </div>
                                    <div>
                                        <label className="ac-label">Account ID</label>
                                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                                            <input className="ac-input" style={{ fontFamily:'monospace', color:'var(--primary)', fontWeight:700 }} value={user?.accountId || '—'} readOnly />
                                            <button className="btn-outline" onClick={() => navigator.clipboard.writeText(user?.accountId || '')}>📋</button>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
                                    <div>
                                        <label className="ac-label">Email address</label>
                                        <input className="ac-input" value={user?.email || ''} readOnly />
                                    </div>
                                    <div>
                                        <label className="ac-label">Phone</label>
                                        <input className="ac-input" value={user?.phone || '—'} readOnly />
                                    </div>
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                    <button className="btn-primary" onClick={saveName}>Save changes</button>
                                    {nameMsg && <span style={{ fontSize:13, color: nameMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{nameMsg}</span>}
                                </div>
                            </div>

                            {/* Plan Status */}
                            <div className="ac-section">
                                <div className="ac-section-title">Plan status.</div>
                                <div className="info-card-grid">
                                    {[
                                        { label:'Current Plan', value: PLAN_LABEL[plan], color: planColor },
                                        { label:'Sites Used', value: `${serverCount} / ${siteLimit}`, color:'var(--primary)' },
                                        { label:'Status', value: !isActive ? 'Expired' : accountStatus === 'grace' ? 'Grace Period' : 'Active', color: !isActive ? 'var(--danger)' : 'var(--success)' },
                                        plan === 'free_trial'
                                            ? { label:'Trial Days Left', value: isActive ? `${trialLeft} days` : 'Expired', color: trialLeft <= 2 ? 'var(--danger)' : 'var(--success)' }
                                            : { label:'Renews', value: fmt(user?.planEndsAt), color:'var(--text-main)' },
                                    ].map(s => (
                                        <div key={s.label} className="info-card">
                                            <div className="info-card-label">{s.label}</div>
                                            <div className="info-card-value" style={{ color: s.color }}>{s.value}</div>
                                        </div>
                                    ))}
                                </div>
                                {/* Show upgrade only for free trial OR expired plan */}
                                {(plan === 'free_trial' || !isActive) ? (
                                    <Link to="/pay?plan=select" className="btn-primary" style={{ display:'inline-block', textDecoration:'none' }}>
                                        {!isActive ? '🔄 Renew Plan' : '⬆️ Upgrade Plan'}
                                    </Link>
                                ) : (
                                    <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'9px 20px', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:8, color:'#10b981', fontWeight:600, fontSize:14 }}>
                                        ✓ Active {PLAN_LABEL[plan]} Plan
                                    </div>
                                )}
                            </div>

                            {/* Delete Account */}
                            <div className="ac-danger-zone">
                                <div className="ac-danger-title">Delete account.</div>
                                <div className="ac-danger-desc">
                                    UptimeForge sends an <strong>"account deletion verification e-mail"</strong> to the account e-mail. Once the verification link inside the e-mail is clicked, all account information at UptimeForge (including the account, monitors, logs and settings) will be <strong>lost and can not be recovered</strong>.
                                </div>
                                <button onClick={deleteAccount} className="btn-danger">
                                    Delete account
                                </button>
                                {deleteMsg && <p style={{ marginTop:12, fontSize:13, color: deleteMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', fontWeight:600 }}>{deleteMsg}</p>}
                            </div>
                        </>
                    )}

                    {/* ── BILLING ── */}
                    {section === 'billing' && (
                        <>
                            <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:28, fontFamily:'Outfit, sans-serif' }}>Billing & subscription.</h1>
                            <div className="ac-section">
                                <div className="ac-section-title">Current plan.</div>
                                <div className="plan-display-card">
                                    <div style={{ width:48, height:48, borderRadius:12, background: PLAN_GRADIENTS[plan], display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                                        {plan === 'free_trial' ? '🆓' : plan === 'bronze' ? '🥉' : plan === 'silver' ? '🥈' : '🥇'}
                                    </div>
                                    <div style={{ flex:1 }}>
                                        <div style={{ fontWeight:800, fontSize:16, color:'var(--text-main)' }}>{PLAN_LABEL[plan]} Plan</div>
                                        <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
                                            {plan === 'free_trial' ? `Trial ${isActive ? `· ${trialLeft} days left` : '· Expired'}` : `${siteLimit} sites · Renews ${fmt(user?.planEndsAt)}`}
                                        </div>
                                    </div>
                                    {(plan === 'free_trial' || !isActive) ? (
                                        <Link to="/pay?plan=select" className="btn-primary" style={{ textDecoration:'none' }}>
                                            {!isActive ? '🔄 Renew' : '⬆️ Upgrade'}
                                        </Link>
                                    ) : (
                                        <span style={{ fontSize:12, fontWeight:700, color:'#10b981', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, padding:'6px 14px' }}>
                                            ✓ Active
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize:13, color:'var(--text-muted)' }}>
                                    💳 Payments secured by <strong>Razorpay</strong> · UPI · Cards · Netbanking
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── INVOICES ── */}
                    {section === 'invoices' && (
                        <>
                            <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:28, fontFamily:'Outfit, sans-serif' }}>Invoices.</h1>
                            <div className="ac-section">
                                <div className="ac-section-title">Payment history.</div>
                                {myRequests.length === 0 ? (
                                    <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
                                        <div style={{ fontSize:40, marginBottom:12 }}>🧾</div>
                                        <div style={{ fontWeight:600 }}>No payments yet</div>
                                    </div>
                                ) : (
                                    <div>
                                        {myRequests.map(r => (
                                            <div key={r._id} className="invoice-row">
                                                <div style={{ flex:1, minWidth:180 }}>
                                                    <div className="invoice-title">
                                                        {r.type === 'verification' ? 'Free Trial Verification' : `${PLAN_LABEL[r.plan] || r.plan} Plan`}
                                                    </div>
                                                    <div className="invoice-meta">{r.utr} · {fmt(r.createdAt)}</div>
                                                </div>
                                                <div className="invoice-amount">₹{r.amount}</div>
                                                <span className="invoice-badge" style={{
                                                    background: r.status==='approved'?'rgba(16, 185, 129, 0.08)':'rgba(244, 63, 94, 0.08)',
                                                    color: r.status==='approved'?'var(--success)':'var(--danger)',
                                                    border: `1px solid ${r.status==='approved'?'rgba(16, 185, 129, 0.25)':'rgba(244, 63, 94, 0.25)'}`
                                                }}>
                                                    {r.status}
                                                </span>
                                                <button onClick={() => downloadInvoice(r)} className="btn-outline" style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px' }}>
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
                            <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:28, fontFamily:'Outfit, sans-serif' }}>Security.</h1>

                            {!user?.isGoogleUser && (
                            <div className="ac-section">
                                <div className="ac-section-title">Change password.</div>
                                <div className="ac-section-desc">Choose a strong password to keep your account safe.</div>
                                <div style={{ maxWidth:440, display:'flex', flexDirection:'column', gap:14 }}>
                                    <div>
                                        <label className="ac-label">Current password</label>
                                        <input type="password" className="ac-input" value={pwForm.current} onChange={e => setPwForm(f => ({...f, current:e.target.value}))} placeholder="Enter current password" />
                                    </div>
                                    <div>
                                        <label className="ac-label">New password</label>
                                        <input type="password" className="ac-input" value={pwForm.newPw} onChange={e => setPwForm(f => ({...f, newPw:e.target.value}))} placeholder="Min 6 characters" />
                                    </div>
                                    <div>
                                        <label className="ac-label">Confirm new password</label>
                                        <input type="password" className="ac-input" value={pwForm.confirm} onChange={e => setPwForm(f => ({...f, confirm:e.target.value}))} placeholder="Repeat new password" />
                                    </div>
                                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                        <button className="btn-primary" onClick={savePw}>Update password</button>
                                        {pwMsg.text && <span style={{ fontSize:13, color: pwMsg.type==='ok'?'var(--success)':'var(--danger)' }}>{pwMsg.text}</span>}
                                    </div>
                                </div>
                            </div>
                            )}

                            {user?.isGoogleUser && (
                            <div className="ac-section">
                                <div className="ac-section-title">Google account.</div>
                                <div className="ac-section-desc">Your account is linked with Google. Password change is managed through Google.</div>
                                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:'var(--bg-input)', borderRadius:10, border:'1.5px solid var(--border-color)', width:'fit-content' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    <span style={{ fontSize:14, fontWeight:600, color:'var(--text-main)', fontFamily:'Plus Jakarta Sans, sans-serif' }}>Connected with Google</span>
                                </div>
                            </div>
                            )}

                            <div className="ac-danger-zone">
                                <div className="ac-danger-title">Danger zone.</div>
                                <div className="ac-danger-desc">
                                    UptimeForge sends an <strong>"account deletion verification e-mail"</strong> to the account e-mail. Once the verification link inside the e-mail is clicked, all account information at UptimeForge (including the account, monitors, logs and settings) will be <strong>lost and can not be recovered</strong>.
                                </div>
                                <button onClick={deleteAccount} className="btn-danger">
                                    Delete account
                                </button>
                                {deleteMsg && <p style={{ marginTop:12, fontSize:13, color: deleteMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', fontWeight:600 }}>{deleteMsg}</p>}
                            </div>
                        </>
                    )}

                    {/* ── REFERRAL ── */}
                    {section === 'referral' && (
                        <>
                            <h1 style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:28, fontFamily:'Outfit, sans-serif' }}>Referral.</h1>

                            {/* Hero */}
                            <div className="referral-hero">
                                <div style={{ fontSize:40, marginBottom:12 }}>🎁</div>
                                <h2 style={{ fontSize:22, fontWeight:900, marginBottom:8, fontFamily:'Outfit, sans-serif' }}>Invite friends, earn rewards!</h2>
                                <p style={{ fontSize:14, color:'rgba(255,255,255,0.8)', lineHeight:1.7, marginBottom:16, fontFamily:'Plus Jakarta Sans, sans-serif' }}>
                                    Share your referral link. When a friend purchases any paid plan using your code, <strong>both of you get 10 extra days free!</strong>
                                </p>
                                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                                    <div className="referral-badge-item">
                                        <span style={{ fontSize:20 }}>👤</span>
                                        <div>
                                            <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>YOUR FRIEND GETS</div>
                                            <div style={{ fontSize:14, fontWeight:800 }}>10 days free on any paid plan</div>
                                        </div>
                                    </div>
                                    <div className="referral-badge-item">
                                        <span style={{ fontSize:20 }}>🤩</span>
                                        <div>
                                            <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>YOU GET</div>
                                            <div style={{ fontSize:14, fontWeight:800 }}>10 days added to your plan</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* My referral status — if I used someone's code */}
                            {user?.referredBy && (
                                <div className="ref-status-applied" style={{
                                    border: `1.5px solid ${user.referralBonusUsed ? 'var(--stats-up-border)' : 'var(--badge-total-border)'}`
                                }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                        <span style={{ fontSize:28 }}>{user.referralBonusUsed ? '✅' : '🎁'}</span>
                                        <div>
                                            <div style={{ fontWeight:800, fontSize:15, color: user.referralBonusUsed ? 'var(--success)' : 'var(--primary)', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
                                                Referral code applied! 10 extra days FREE
                                            </div>
                                            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, fontFamily:'Plus Jakarta Sans, sans-serif' }}>
                                                {user.referralBonusUsed
                                                    ? '🎉 Bonus already applied to your plan — 10 extra days added!'
                                                    : '⏳ Purchase any paid plan (Bronze/Silver/Gold) to get 10 bonus days automatically.'}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="invoice-badge" style={{
                                        background: user.referralBonusUsed ? 'rgba(16, 185, 129, 0.08)' : 'rgba(124, 58, 237, 0.08)',
                                        color: user.referralBonusUsed ? 'var(--success)' : 'var(--primary)',
                                        border: `1px solid ${user.referralBonusUsed ? 'rgba(16, 185, 129, 0.25)' : 'rgba(124, 58, 237, 0.25)'}`
                                    }}>
                                        {user.referralBonusUsed ? 'Used ✓' : 'Pending'}
                                    </span>
                                </div>
                            )}

                            {/* Stats */}
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, marginBottom:20 }}>
                                {[
                                    { label:'Friends Joined', value: refStats.total, icon:'👥', color:'var(--primary)' },
                                    { label:'Paid Plans', value: refStats.paid, icon:'💳', color:'var(--success)' },
                                    { label:'Bonus Days Earned', value: refStats.paid * 10, icon:'⏱️', color:'var(--warning)' },
                                ].map(s => (
                                    <div key={s.label} className="ref-stat-card">
                                        <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
                                        <div style={{ fontSize:26, fontWeight:900, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Referral Link */}
                            <div className="ac-section">
                                <div className="ac-section-title">Your referral link.</div>
                                <div className="ac-section-desc">Share this link with friends to invite them to UptimeForge.</div>
                                <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                                    <input className="ac-input" style={{ fontFamily:'monospace', fontSize:13, flex:1 }} value={referralLink} readOnly />
                                    <button onClick={copyRef} className="btn-primary" style={{ padding:'10px 20px', whiteSpace:'nowrap', minWidth:100, background: refCopied ? 'var(--success)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                                        {refCopied ? '✓ Copied!' : '📋 Copy Link'}
                                    </button>
                                </div>
                                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                                    <a href={`https://wa.me/?text=Join UptimeForge - 24/7 website monitoring! Use my link: ${encodeURIComponent(referralLink)}`} target="_blank" rel="noreferrer"
                                        style={{ padding:'8px 16px', background:'#25d366', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:6, fontFamily:'Plus Jakarta Sans, sans-serif' }}>
                                        💬 Share on WhatsApp
                                    </a>
                                    <a href={`mailto:?subject=Try UptimeForge&body=I'm using UptimeForge for website monitoring. Join using my link: ${referralLink}`}
                                        style={{ padding:'8px 16px', background:'#EA4335', color:'#fff', borderRadius:8, fontWeight:600, fontSize:13, textDecoration:'none', display:'flex', alignItems:'center', gap:6, fontFamily:'Plus Jakarta Sans, sans-serif' }}>
                                        📧 Share via Email
                                    </a>
                                </div>
                            </div>

                            {/* Referral Code */}
                            <div className="ac-section">
                                <div className="ac-section-title">Your referral code.</div>
                                <div className="ac-section-desc">Friends can enter this code during registration.</div>
                                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                    <div className="ref-code-box">
                                        {user?.accountId || 'N/A'}
                                    </div>
                                    <button className="btn-outline" onClick={() => { navigator.clipboard.writeText(user?.accountId || ''); }}>
                                        📋 Copy Code
                                    </button>
                                </div>
                            </div>

                            {/* How it works */}
                            <div className="ac-section">
                                <div className="ac-section-title">How it works.</div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16 }}>
                                    {[
                                        { step:'1', icon:'🔗', title:'Share your link', desc:'Copy and share your unique referral link or code' },
                                        { step:'2', icon:'👤', title:'Friend signs up', desc:'Your friend registers using your link or code' },
                                        { step:'3', icon:'🎉', title:'Both benefit', desc:'You both get rewards when they activate a plan' },
                                    ].map(s => (
                                        <div key={s.step} className="ref-step-card">
                                            <div style={{ fontSize:32, marginBottom:8 }}>{s.icon}</div>
                                            <div className="ref-step-title">{s.title}</div>
                                            <div className="ref-step-desc">{s.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                </main>
            </div>
        </div>
    );
}
