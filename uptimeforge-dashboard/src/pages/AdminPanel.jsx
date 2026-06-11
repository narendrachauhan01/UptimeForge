import React, { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { adminGetUsers, adminUpdateUser, adminDeleteUser, adminGetSettings, adminUpdateSettings, adminGetPayments, adminDeletePayment, adminApprovePayment, adminRejectPayment, adminRefundPayment, adminRefundStatus, getAdminProfile, updateAdminProfile, adminClearCache, API_URL } from '../api';

const ADMIN_STYLES = `
    .perf-page-container {
      --primary: #7c3aed;
      --primary-hover: #6d28d9;
      --primary-rgb: 124, 58, 237;
      --success: #10b981;
      --success-rgb: 16, 185, 129;
      --danger: #ef4444;
      --danger-rgb: 239, 68, 68;
      --warning: #f59e0b;
      --warning-rgb: 245, 158, 11;
      --info: #3b82f6;
      
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
      --border-color: rgba(226, 232, 240, 0.8);
      --text-main: #0f172a;
      --text-muted: #64748b;
      --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
      --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
      --input-focus-shadow: rgba(124, 58, 237, 0.08);
      --hover-row-bg: rgba(124, 58, 237, 0.04);
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

    /* Font Family defaults */
    .perf-page-container {
      font-family: 'Plus Jakarta Sans', sans-serif !important;
      background-color: var(--bg-primary);
      color: var(--text-main);
    }
    .perf-page-container h1, 
    .perf-page-container h2, 
    .perf-page-container h3 {
      font-family: 'Outfit', sans-serif !important;
    }

    /* Clean cards, tables, elements */
    .perf-page-container .admin-pg {
      background: transparent !important;
    }

    /* Table custom tr hovers */
    .perf-page-container .admin-tr {
      border-bottom: 1px solid var(--border-color) !important;
      background: var(--bg-card) !important;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    .perf-page-container .admin-tr td {
      background: transparent !important;
      transition: background-color 0.15s ease;
    }
    .perf-page-container .admin-tr:hover td {
      background: var(--hover-row-bg) !important;
    }
    .perf-page-container .admin-tr.blocked {
      background: rgba(239, 68, 68, 0.04) !important;
    }
    .perf-page-container .admin-tr.blocked td {
      background: rgba(239, 68, 68, 0.04) !important;
    }
    .perf-page-container .admin-tr.blocked:hover td {
      background: rgba(239, 68, 68, 0.08) !important;
    }

    /* Integration cards */
    .perf-page-container .ap-card {
      background: var(--bg-card) !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 20px;
      box-shadow: var(--card-shadow);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
`;

const PLAN_OPTIONS = ['free_trial', 'bronze', 'silver', 'gold'];
const PLAN_COLORS  = { free_trial: 'var(--text-muted)', bronze: '#f59e0b', silver: '#94a3b8', gold: '#ca8a04' };
const PLAN_BG     = { free_trial: 'var(--bg-input)', bronze: 'rgba(245, 158, 11, 0.08)', silver: 'rgba(148, 163, 184, 0.08)', gold: 'rgba(202, 138, 4, 0.08)' };
const PLAN_LABEL  = { free_trial: 'Free Trial', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

// ── Design tokens (Theme Aware) ────────────────────────────────────────
const T = {
    primary:  '#7c3aed',
    success:  '#10B981',
    danger:   '#EF4444',
    warning:  '#F59E0B',
    info:     '#3B82F6',
    border:   'var(--border-color)',
    pageBg:   'transparent',
    card:     'var(--bg-card)',
    headerBg: 'var(--bg-input)',
    text:     'var(--text-main)',
    sub:      'var(--text-muted)',
    muted:    'var(--text-muted)',
    rowHover: 'var(--hover-row-bg)',
};

// ── Reusable style helpers ────────────────────────────────────────────────────
const cardStyle = {
    background: 'var(--bg-card)',
    border: `1px solid var(--border-color)`,
    borderRadius: 12,
    boxShadow: 'var(--card-shadow)',
};

const pill = (bg, color) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: 9999,
    fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
    background: bg, color,
    whiteSpace: 'nowrap',
});

const inputSt = {
    width: '100%', padding: '9px 12px',
    border: `1px solid var(--border-color)`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: 'var(--bg-input)',
    color: 'var(--text-main)', fontFamily: 'inherit',
    boxSizing: 'border-box',
};

const btnPrimary = {
    padding: '9px 18px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: '0 2px 6px rgba(124, 58, 237, 0.15)',
};
const btnDanger = {
    padding: '9px 18px', background: T.danger, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
};
const btnSuccess = {
    padding: '9px 18px', background: T.success, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
};
const btnSecondary = {
    padding: '9px 18px', background: 'var(--bg-card)',
    border: `1px solid var(--border-color)`, borderRadius: 8,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    color: 'var(--text-main)',
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
    const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const palette = ['#4F46E5','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6'];
    const idx = (name || '').charCodeAt(0) % palette.length;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: palette[idx], color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: size * 0.38, flexShrink: 0, letterSpacing: 0.5,
        }}>{initials}</div>
    );
}

// ── Plan Badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }) {
    return <span style={pill(PLAN_BG[plan] || '#f1f5f9', PLAN_COLORS[plan] || '#64748b')}>{PLAN_LABEL[plan] || plan}</span>;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ u }) {
    if (u.isBlocked)    return <span style={pill('#FEE2E2','#DC2626')}>Blocked</span>;
    if (!u.isActive)    return <span style={pill('#FEF3C7','#D97706')}>Expired</span>;
    if (u.plan === 'free_trial') return <span style={pill('#EFF6FF','#2563EB')}>Trial</span>;
    return <span style={pill('#D1FAE5','#065F46')}>Active</span>;
}
function VerifiedBadge({ u }) {
    if (u.trialVerified)
        return <span style={{ ...pill('#D1FAE5','#065F46'), marginLeft: 4 }}>✓ Verified</span>;
    return <span style={{ ...pill('#FEF3C7','#B45309'), marginLeft: 4 }}>⚠ Not Verified</span>;
}
const ABANDON_REASON_LABEL = {
    payment_failed:    { label: '❌ Payment Failed',     bg: '#FEE2E2', color: '#B91C1C' },
    payment_cancelled: { label: '↩ Cancelled Payment',  bg: '#FEF3C7', color: '#92400E' },
    profile_only:      { label: '📝 Profile Only',       bg: '#EFF6FF', color: '#1D4ED8' },
};
function AbandonReasonBadge({ reason }) {
    const r = ABANDON_REASON_LABEL[reason] || { label: '⏳ Awaiting Payment', bg: '#F3F4F6', color: '#6B7280' };
    return <span style={pill(r.bg, r.color)}>{r.label}</span>;
}

// ── Payment Status Badge ──────────────────────────────────────────────────────
function PayStatusBadge({ status }) {
    const map = {
        approved: { bg:'#D1FAE5', color:'#065F46', label:'Approved' },
        pending:  { bg:'#FEF9C3', color:'#92400E', label:'Pending'  },
        rejected: { bg:'#FEE2E2', color:'#B91C1C', label:'Rejected' },
        refunded: { bg:'#FEE2E2', color:'#B91C1C', label:'Refunded' },
    };
    const s = map[status] || { bg:'#F3F4F6', color:'#6B7280', label: status || 'Unknown' };
    return <span style={pill(s.bg, s.color)}>{s.label}</span>;
}

// ── Date formatter ────────────────────────────────────────────────────────────
function fmt(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Metric Card (left color border + icon) ────────────────────────────────────
function MetricCard({ label, value, color, icon, sub, onClick }) {
    return (
        <div onClick={onClick} style={{
            ...cardStyle,
            borderLeft: `4px solid ${color}`,
            padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.15s',
            ...(onClick ? { ':hover': { transform: 'translateY(-2px)' } } : {}),
        }}
        onMouseEnter={e => onClick && (e.currentTarget.style.boxShadow = `0 4px 16px ${color}30`)}
        onMouseLeave={e => onClick && (e.currentTarget.style.boxShadow = '')}>
            <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: T.sub, fontWeight: 700, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.3 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>}
                {onClick && <div style={{ fontSize:10, color: color, marginTop:3, fontWeight:600 }}>Click to filter →</div>}
            </div>
        </div>
    );
}

// ── Revenue Tile ──────────────────────────────────────────────────────────────
function RevTile({ label, value, sub, color }) {
    return (
        <div style={{
            ...cardStyle,
            borderLeft: `4px solid ${color}`,
            padding: '16px 18px',
        }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 5 }}>{sub}</div>}
        </div>
    );
}

// ── Table TH ─────────────────────────────────────────────────────────────────
const thStyle = {
    padding: '11px 16px', textAlign: 'left',
    fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: 0.6,
    background: 'var(--bg-input)', borderBottom: `1px solid var(--border-color)`,
    whiteSpace: 'nowrap',
};

// ── Table TD ─────────────────────────────────────────────────────────────────
const tdStyle = {
    padding: '13px 16px', fontSize: 13, color: 'var(--text-main)',
    borderBottom: `1px solid var(--border-color)`, verticalAlign: 'middle',
};

// ── Section Title ─────────────────────────────────────────────────────────────
function SectionTitle({ title, right }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{title}</div>
            {right && <div>{right}</div>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPanel({ initialTab = 'overview', staffMode = false, readOnly = false, permissions = [] }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const location = useLocation();
    const urlTab = new URLSearchParams(location.search).get('tab');
    const [tab, setTab] = useState(urlTab || initialTab);
    const [users, setUsers]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [editId, setEditId]       = useState(null);
    const [editForm, setEditForm]   = useState({});
    const [editModal, setEditModal] = useState(null); // user object for modal edit
    const [search, setSearch]       = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [durationFilter, setDurationFilter] = useState('all');
    const [toast, setToast]         = useState('');
    const [settingsForm, setSettingsForm] = useState(null);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [detailUser, setDetailUser] = useState(null);
    const [payments, setPayments]   = useState([]);
    const [paySearch, setPaySearch] = useState('');
    const [payStatusFilter, setPayStatusFilter] = useState('all');
    const [assignModal, setAssignModal] = useState(null);
    const [assignForm, setAssignForm]   = useState({ plan: 'bronze', duration: '1m', customDate: '', billing: 'monthly' });
    const [profileForm, setProfileForm] = useState({ username: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [refundStatuses, setRefundStatuses] = useState({});
    const [abandonedUsers, setAbandonedUsers]   = useState([]);
    const [abandonedLoading, setAbandonedLoading] = useState(false);
    const [followupSending, setFollowupSending]   = useState({});
    const [planHistory, setPlanHistory]       = useState([]);
    const [planHistoryTotal, setPlanHistoryTotal] = useState(0);
    const [planHistoryPages, setPlanHistoryPages] = useState(1);
    const [planHistoryPage, setPlanHistoryPage]   = useState(1);
    const [planHistoryLoading, setPlanHistoryLoading] = useState(false);
    const [planHistoryUserId, setPlanHistoryUserId]   = useState(null); // filter by user
    const [planHistoryUser, setPlanHistoryUser]       = useState(null); // user detail modal
    const [userHistoryModal, setUserHistoryModal]     = useState(null); // { user, records }
    const [userHistoryLoading, setUserHistoryLoading] = useState(false);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        if (match) return match[1];
        return 'dark';
    });

    const isDark = localTheme === 'dark';

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

    const saveProfile = async () => {
        if (!profileForm.currentPassword) { setProfileMsg({ type: 'error', text: 'Current password is required' }); return; }
        if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) { setProfileMsg({ type: 'error', text: 'New passwords do not match' }); return; }
        setProfileSaving(true);
        try {
            await axios.put(`${API_URL}/api/auth/profile`, {
                username: profileForm.username,
                email: profileForm.email,
                currentPassword: profileForm.currentPassword,
                newPassword: profileForm.newPassword,
            }, { withCredentials: true });
            setProfileMsg({ type: 'ok', text: '✅ Profile updated! Changes apply on next login.' });
            setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch(e) { setProfileMsg({ type: 'error', text: e.response?.data?.error || 'Update failed' }); }
        setProfileSaving(false);
    };

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const load = async () => {
        setLoading(true);
        try {
            const r = await adminGetUsers();
            setUsers(r.data);
        } catch (e) { showToast('Failed to load users'); }
        setLoading(false);
    };

    const loadSettings = async () => {
        try {
            const r = await adminGetSettings();
            const d = r.data;
            setSettingsForm({
                trialDays: d.trialDays,
                verificationFee: d.verificationFee ?? 2,
                annualDiscount: d.annualDiscount ?? 20,
                freeTrialInterval: d.freeTrialInterval ?? 300,
                freeTrialRecipientLimit: d.freeTrialRecipientLimit ?? 2,
                freeTrialFeatures: (d.freeTrialFeatures || []).join('\n'),
                plans: {
                    bronze: { price: d.plans.bronze.price, sites: d.plans.bronze.sites, interval: d.plans.bronze.interval ?? 120, recipientLimit: d.plans.bronze.recipientLimit ?? 10, features: (d.plans.bronze.features || []).join('\n') },
                    silver: { price: d.plans.silver.price, sites: d.plans.silver.sites, interval: d.plans.silver.interval ?? 60,  recipientLimit: d.plans.silver.recipientLimit ?? 20, features: (d.plans.silver.features || []).join('\n') },
                    gold:   { price: d.plans.gold.price,   sites: d.plans.gold.sites,   interval: d.plans.gold.interval   ?? 30,  recipientLimit: d.plans.gold.recipientLimit   ?? 30, features: (d.plans.gold.features   || []).join('\n') },
                },
            });
        } catch (e) { showToast('Failed to load settings'); }
    };

    const loadPayments = async () => {
        try { const r = await adminGetPayments(); setPayments(r.data); } catch {}
    };

    const loadProfile = async () => {
        try {
            const r = await getAdminProfile();
            setProfileForm(prev => ({ ...prev, username: r.data.username, email: r.data.email }));
        } catch {}
    };

    useEffect(() => { load(); loadSettings(); loadPayments(); loadProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { setTab(initialTab); }, [initialTab]);

    const saveSettings = async () => {
        setSettingsSaving(true);
        try {
            const payload = {
                trialDays: settingsForm.trialDays,
                verificationFee: settingsForm.verificationFee,
                annualDiscount: Number(settingsForm.annualDiscount),
                freeTrialInterval: Number(settingsForm.freeTrialInterval),
                freeTrialRecipientLimit: Number(settingsForm.freeTrialRecipientLimit),
                freeTrialFeatures: settingsForm.freeTrialFeatures.split('\n').map(s => s.trim()).filter(Boolean),
                plans: {
                    bronze: {
                        price: settingsForm.plans.bronze.price,
                        sites: settingsForm.plans.bronze.sites,
                        interval: Number(settingsForm.plans.bronze.interval),
                        recipientLimit: Number(settingsForm.plans.bronze.recipientLimit),
                        features: settingsForm.plans.bronze.features.split('\n').map(s => s.trim()).filter(Boolean),
                    },
                    silver: {
                        price: settingsForm.plans.silver.price,
                        sites: settingsForm.plans.silver.sites,
                        interval: Number(settingsForm.plans.silver.interval),
                        recipientLimit: Number(settingsForm.plans.silver.recipientLimit),
                        features: settingsForm.plans.silver.features.split('\n').map(s => s.trim()).filter(Boolean),
                    },
                    gold: {
                        price: settingsForm.plans.gold.price,
                        sites: settingsForm.plans.gold.sites,
                        interval: Number(settingsForm.plans.gold.interval),
                        recipientLimit: Number(settingsForm.plans.gold.recipientLimit),
                        features: settingsForm.plans.gold.features.split('\n').map(s => s.trim()).filter(Boolean),
                    },
                },
            };
            await adminUpdateSettings(payload);
            showToast('Settings saved!');
        } catch (e) { showToast('Save failed'); }
        setSettingsSaving(false);
    };

    const setPlanField = (plan, field, val) =>
        setSettingsForm(prev => ({
            ...prev,
            plans: { ...prev.plans, [plan]: { ...prev.plans[plan], [field]: field === 'features' ? val : Number(val) } },
        }));

    const startEdit = (u) => {
        setEditModal(u);
        setEditId(u._id?.toString());
        setEditForm({
            plan: u.plan,
            isBlocked: u.isBlocked,
            planEndsAt: u.planEndsAt ? new Date(u.planEndsAt).toISOString().split('T')[0] : '',
        });
    };

    const saveEdit = async () => {
        try {
            await adminUpdateUser(editId, { plan: editForm.plan, isBlocked: editForm.isBlocked, planEndsAt: editForm.planEndsAt || undefined });
            setEditId(null);
            showToast('User updated');
            load();
        } catch (e) { showToast(e.response?.data?.error || 'Update failed'); }
    };

    const extendTrial = async (id, name) => {
        const ok = await confirm(`Extend trial by 5 days for "${name}"?`, { title:'Extend Trial', confirmText:'+5 Days', danger:false });
        if (!ok) return;
        try { await adminUpdateUser(id, { extendTrial: true }); showToast('Trial extended by 5 days'); load(); }
        catch (e) { showToast('Failed'); }
    };

    const toggleBlock = async (u) => {
        const action = u.isBlocked ? 'Unblock' : 'Block';
        const ok = await confirm(`${action} user "${u.name}"?`, { title:`${action} User`, confirmText:action, danger: !u.isBlocked });
        if (!ok) return;
        try { await adminUpdateUser(u._id, { isBlocked: !u.isBlocked }); showToast(u.isBlocked ? 'User unblocked' : 'User blocked'); load(); }
        catch (e) { showToast('Failed'); }
    };

    const deleteUser = async (u) => {
        const ok = await confirm(`Delete "${u.name}" and all their data? This cannot be undone.`, { title:'Delete User', confirmText:'Delete', danger:true });
        if (!ok) return;
        try { await adminDeleteUser(u._id); showToast('User deleted'); load(); }
        catch (e) { showToast('Delete failed'); }
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
        const matchPlan = planFilter === 'all' ? true
            : planFilter === '__paid__' ? u.plan !== 'free_trial'
            : planFilter === '__active__' ? (u.isActive && !u.isBlocked)
            : u.plan === planFilter;
        const matchDuration = durationFilter === 'all'
            || (durationFilter === 'free_trial' && u.plan === 'free_trial')
            || (durationFilter === '1m'  && u.plan !== 'free_trial' && (u.planDuration === '1m' || (!u.planDuration && u.billing !== 'annually')))
            || (durationFilter === '3m'  && u.planDuration === '3m')
            || (durationFilter === '6m'  && u.planDuration === '6m')
            || (durationFilter === '1y'  && (u.planDuration === '1y' || u.billing === 'annually'));
        return matchSearch && matchPlan && matchDuration;
    });
    const freeTrialFiltered = filtered.filter(u => u.plan === 'free_trial');
    const monthlyFiltered   = filtered.filter(u => u.plan !== 'free_trial' && u.billing !== 'annually');
    const annualFiltered    = filtered.filter(u => u.billing === 'annually');

    // Stats for overview
    const totalSites   = users.reduce((a, u) => a + (u.serverCount || 0), 0);
    const blockedUsers = users.filter(u => u.isBlocked).length;
    const paidUsers    = users.filter(u => u.plan !== 'free_trial').length;
    const freeTrialUsers = users.filter(u => u.plan === 'free_trial').length;
    const activeUsers  = users.filter(u => u.isActive && !u.isBlocked).length;
    const expiredUsers = users.filter(u => {
        if (u.isBlocked) return false;
        const d = new Date();
        const endDate = u.plan === 'free_trial' ? u.trialEndsAt : u.planEndsAt;
        return endDate && new Date(endDate) < d;
    });

    // Navigate to Users tab with filter
    const goToUsersFilter = (filterType) => {
        setTab('users');
        setDurationFilter('all');
        setPlanFilter('all');
        setSearch('');
        if (filterType === 'paid')       { setPlanFilter('__paid__'); }   // custom: all non-free_trial
        else if (filterType === 'free_trial') setDurationFilter('free_trial');
        else if (filterType === 'annual')     setDurationFilter('1y');
        else if (filterType === 'blocked')    {}
        else if (filterType === 'active')     { setPlanFilter('__active__'); }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Revenue — exclude refunded payments
    const activePayments   = payments.filter(p => p.status !== 'refunded');
    const totalRevenue     = activePayments.reduce((s, p) => s + (p.amount || 0), 0);
    const now              = new Date();
    const monthRevenue     = activePayments.filter(p => {
        const d = new Date(p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((s, p) => s + (p.amount || 0), 0);
    const planRevenue      = activePayments.filter(p => p.type !== 'verification').reduce((s, p) => s + (p.amount || 0), 0);

    // Pending payments
    const pendingPayments = payments.filter(p => p.status === 'pending');

    // Expiring plans in 7 days
    const in7 = new Date(Date.now() + 7 * 864e5);
    const expiringPlans = users.filter(u =>
        u.plan !== 'free_trial' && u.planEndsAt &&
        new Date(u.planEndsAt) <= in7 && new Date(u.planEndsAt) > now && !u.isBlocked
    );

    // Trial expiring in 2 days
    const in2 = new Date(Date.now() + 2 * 864e5);
    const trialExpiring = users.filter(u =>
        u.plan === 'free_trial' && u.trialEndsAt &&
        new Date(u.trialEndsAt) <= in2 && new Date(u.trialEndsAt) > now
    );

    // Export users as CSV
    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Phone', 'Plan', 'Status', 'Sites', 'Plan Ends', 'Trial Ends', 'Joined', 'State'];
        const rows = users.map(u => [
            `"${(u.name||'').replace(/"/g,'""')}"`,
            `"${(u.email||'').replace(/"/g,'""')}"`,
            u.phone || '',
            PLAN_LABEL[u.plan] || u.plan,
            u.isBlocked ? 'Blocked' : u.isActive ? 'Active' : 'Expired',
            u.serverCount || 0,
            u.planEndsAt ? new Date(u.planEndsAt).toLocaleDateString('en-IN') : '',
            u.trialEndsAt ? new Date(u.trialEndsAt).toLocaleDateString('en-IN') : '',
            u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
            u.state || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    const approvePayment = async (id) => {
        try { await adminApprovePayment(id); showToast('Payment approved & plan activated'); load(); loadPayments(); }
        catch (e) { showToast(e.response?.data?.error || 'Approve failed'); }
    };
    const rejectPayment = async (id) => {
        const ok = await confirm('Reject this payment request?', { title:'Reject Payment', confirmText:'Reject', danger:true });
        if (!ok) return;
        try { await adminRejectPayment(id); showToast('Payment rejected'); loadPayments(); }
        catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Failed')); }
    };
    const refundPayment = async (id) => {
        const ok = await confirm('Refund this payment on Razorpay? User plan will be cancelled.', { title:'Refund Payment', confirmText:'Refund', danger:true });
        if (!ok) return;
        try { await adminRefundPayment(id); showToast('Refund initiated — plan cancelled'); loadPayments(); load(); }
        catch (e) { showToast(e.response?.data?.error || 'Reject failed'); }
    };

    const openAssign = (u) => {
        setAssignModal({ user: u });
        setAssignForm({ plan: u.plan === 'free_trial' ? 'bronze' : u.plan, duration: '1m', customDate: '', billing: u.billing || 'monthly' });
    };

    const calcEndsAt = () => {
        const base = new Date();
        if (assignForm.duration === 'custom') return assignForm.customDate || '';
        const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[assignForm.duration] || 1;
        base.setMonth(base.getMonth() + months);
        return base.toISOString().split('T')[0];
    };

    const saveAssign = async () => {
        const endsAt = calcEndsAt();
        if (!endsAt) { showToast('Select plan end date'); return; }
        try {
            await adminUpdateUser(assignModal.user._id, { plan: assignForm.plan, planEndsAt: endsAt, billing: assignForm.billing, planDuration: assignForm.planDuration || (assignForm.duration === 'custom' ? '1m' : assignForm.duration), isBlocked: false });
            showToast(`${PLAN_LABEL[assignForm.plan]} assigned to ${assignModal.user.name}`);
            setAssignModal(null);
            load();
        } catch (e) { showToast(e.response?.data?.error || 'Failed to assign plan'); }
    };

    const deletePayment = async (id) => {
        const ok = await confirm('Delete this payment record permanently?', { title:'Delete Payment', confirmText:'Delete', danger:true });
        if (!ok) return;
        try {
            await adminDeletePayment(id);
            showToast('Payment record deleted');
            loadPayments();
        } catch (e) { showToast(e.response?.data?.error || 'Delete failed'); }
    };

    const refundedPayments = payments.filter(p => p.status === 'refunded');
    const totalRefunded    = refundedPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const [tickets, setTickets] = useState([]);
    const loadTickets = async () => {
        try { const r = await axios.get(`${API_URL}/api/admin/support-tickets`, { withCredentials: true }); setTickets(r.data); } catch {}
    };
    useEffect(() => { if (tab === 'support') loadTickets(); }, [tab]);

    const updateTicket = async (id, data) => {
        await axios.put(`${API_URL}/api/admin/support-tickets/${id}`, data, { withCredentials: true });
        loadTickets();
    };
    const deleteTicket = async (id) => {
        const ok = await confirm('Delete this support ticket?', { title:'Delete Ticket', confirmText:'Delete', danger:true });
        if (!ok) return;
        await axios.delete(`${API_URL}/api/admin/support-tickets/${id}`, { withCredentials: true });
        loadTickets();
    };

    // Load plan history (summary: one row per user)
    const loadPlanHistory = (page = 1) => {
        setPlanHistoryLoading(true);
        axios.get(`${API_URL}/api/admin/plan-history/summary?page=${page}&limit=25`, { withCredentials: true })
            .then(r => { setPlanHistory(r.data.records); setPlanHistoryTotal(r.data.total); setPlanHistoryPages(r.data.pages); setPlanHistoryPage(r.data.page); })
            .catch(() => {})
            .finally(() => setPlanHistoryLoading(false));
    };
    useEffect(() => { if (tab === 'planhistory') loadPlanHistory(1); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const openUserHistory = async (u) => {
        setUserHistoryLoading(true);
        setUserHistoryModal({ user: u, records: [] });
        try {
            const r = await axios.get(`${API_URL}/api/admin/plan-history/user/${u._id}`, { withCredentials: true });
            setUserHistoryModal({ user: r.data.user || u, records: r.data.records || [] });
        } catch {}
        setUserHistoryLoading(false);
    };

    // Load abandoned users when tab selected
    useEffect(() => {
        if (tab !== 'abandoned') return;
        setAbandonedLoading(true);
        axios.get(`${API_URL}/api/admin/abandoned-users`, { withCredentials: true })
            .then(r => setAbandonedUsers(r.data))
            .catch(() => {})
            .finally(() => setAbandonedLoading(false));
    }, [tab]);

    const sendFollowup = async (userId, email) => {
        setFollowupSending(s => ({ ...s, [userId]: true }));
        try {
            await axios.post(`${API_URL}/api/admin/abandoned-users/${userId}/followup`, {}, { withCredentials: true });
            setToast(`✅ Follow-up email sent to ${email}`);
            setAbandonedUsers(u => u.map(x => x._id === userId ? { ...x, followupSent: true, followupSentAt: new Date() } : x));
        } catch (e) {
            setToast(`❌ ${e.response?.data?.error || 'Failed to send email'}`);
        }
        setFollowupSending(s => ({ ...s, [userId]: false }));
    };

    const TABS = [
        { id: 'overview',     label: 'Overview' },
        { id: 'users',        label: `Users (${users.length})` },
        { id: 'planhistory',  label: `Plan History (${planHistoryTotal || '...'})` },
        { id: 'abandoned',    label: `Abandoned (${abandonedUsers.length || '?'})` },
        { id: 'expired',      label: `Expired Plans (${expiredUsers.length})` },
        { id: 'payments',     label: `Payments (${payments.length})` },
        { id: 'transactions', label: `Payments & Refund (${payments.length})` },
        { id: 'canceling',   label: `Plan Canceling (${refundedPayments.length})` },
    ];

    // Filtered payments
    const filteredPayments = (() => {
        const q = paySearch.toLowerCase();
        return payments.filter(p => {
            const matchSearch = !q || p.utr?.toLowerCase().includes(q) || p.userName?.toLowerCase().includes(q) || p.userEmail?.toLowerCase().includes(q);
            const matchStatus = payStatusFilter === 'all' || p.status === payStatusFilter;
            return matchSearch && matchStatus;
        });
    })();

    // ── Icon helpers ──────────────────────────────────────────────────────────
    const SearchIcon = () => (
        <svg width="15" height="15" fill="none" stroke={T.muted} strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
    );

    const ThemeToggle = () => (
        <button
            onClick={() => {
                const next = localTheme === 'dark' ? 'light' : 'dark';
                document.cookie = `charts_theme=${next}; path=/; max-age=31536000`;
                setLocalTheme(next);
            }}
            style={{
                padding: '9px 12px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
                transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-input)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-card)';
            }}
            title={`Switch to ${localTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
            {localTheme === 'dark' ? (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
            ) : (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
            )}
        </button>
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{ADMIN_STYLES}</style>
            <div className="pg-wrap admin-pg" style={{ background: T.pageBg, minHeight: '100vh', overflowX: 'hidden' }}>

                {/* ── Toast ────────────────────────────────────────────────────── */}
                {toast && (
                    <div style={{
                        position: 'fixed', bottom: 28, right: 28,
                        background: '#1E293B', color: '#fff',
                        padding: '12px 20px', borderRadius: 10,
                        fontSize: 13, fontWeight: 600,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                        zIndex: 9999,
                    }}>{toast}</div>
                )}

                {tab === 'profile' && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,3,15,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                        <div style={{ width: '100%', maxWidth: 480, animation: 'apFadeIn 0.25s ease-out' }}>
                        {/* Back button */}
                        <div style={{ marginBottom: 16 }}>
                            <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                                Back to Admin
                            </button>
                        </div>

                        {/* Profile Header */}
                        <div style={{ textAlign: 'center', marginBottom: 28 }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', color: '#fff', fontSize: 32, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 28px rgba(245,158,11,0.4)' }}>A</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: "'Outfit',sans-serif" }}>Admin</div>
                            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Full access · UptimeForge</div>
                        </div>

                        {/* Form card */}
                        <div style={{ background: 'rgba(20,12,40,0.95)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 20, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Account Settings</div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Username</label>
                                <input style={{ ...inputSt, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
                                    placeholder="New username (leave blank to keep current)"
                                    value={profileForm.username}
                                    onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Email</label>
                                <input style={{ ...inputSt, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
                                    type="email" placeholder="New email (leave blank to keep current)"
                                    value={profileForm.email}
                                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: -4 }}>Change Password</div>

                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Current Password <span style={{ color: '#EF4444' }}>*</span></label>
                                <input style={{ ...inputSt, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
                                    type="password" placeholder="Required to save changes"
                                    value={profileForm.currentPassword}
                                    onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>New Password</label>
                                <input style={{ ...inputSt, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
                                    type="password" placeholder="Leave blank to keep current password"
                                    value={profileForm.newPassword}
                                    onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                                <input style={{ ...inputSt, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: '#fff' }}
                                    type="password" placeholder="Confirm new password"
                                    value={profileForm.confirmPassword}
                                    onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                            </div>

                            {profileMsg.text && (
                                <div style={{ padding: '10px 14px', borderRadius: 8, background: profileMsg.type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: profileMsg.type === 'ok' ? '#10B981' : '#EF4444', border: `1px solid ${profileMsg.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize: 13, fontWeight: 600 }}>
                                    {profileMsg.text}
                                </div>
                            )}
                            <button onClick={saveProfile} disabled={profileSaving}
                                style={{ padding: '13px 24px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: profileSaving ? 'not-allowed' : 'pointer', opacity: profileSaving ? 0.7 : 1, width: '100%', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                                {profileSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                        </div>
                    </div>
                )}

            {tab !== 'profile' && (
                <>
                    {/* ── Page Header ──────────────────────────────────────── */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        marginBottom: 24, flexWrap: 'wrap', gap: 12,
                    }}>
                        <div>
                            <h1 style={{ fontSize: 22, fontWeight: 800, color: T.text, margin: 0 }}>Admin Panel</h1>
                            <p style={{ fontSize: 13, color: T.sub, margin: '4px 0 0' }}>Manage users, plans, and payments</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <ThemeToggle />
                            <button
                                onClick={() => window.location.reload()}
                                style={{ padding:'9px 18px', background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--text-main)' }}
                                onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-input)'; e.currentTarget.style.borderColor='var(--border-color)'; }}
                                onMouseLeave={e=>{ e.currentTarget.style.background='var(--bg-card)'; e.currentTarget.style.borderColor='var(--border-color)'; }}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Pill Tabs ─────────────────────────────────────────── */}
                    <div style={{
                        display: 'flex', gap: 6, marginBottom: 28,
                        overflowX: 'auto', paddingBottom: 4,
                        msOverflowStyle: 'none', scrollbarWidth: 'none',
                    }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{
                                padding: '8px 18px', border: `1px solid ${tab === t.id ? T.primary : T.border}`,
                                borderRadius: 9999, fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                                background: tab === t.id ? T.primary : 'var(--bg-card)',
                                color: tab === t.id ? '#fff' : T.sub,
                                boxShadow: tab === t.id ? '0 2px 8px rgba(79,70,229,0.25)' : 'none',
                            }}>{t.label}</button>
                        ))}
                    </div>
                </>
            )}

            {/* ================================================================
                OVERVIEW TAB
            ================================================================ */}
            {tab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                    {/* Row 1 — User Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        <MetricCard label="Total Users"  value={users.length}    color={T.primary}  icon="👥" onClick={() => goToUsersFilter('all')} />
                        <MetricCard label="Active Subscriptions" value={activeUsers} color={T.success} icon="🟢" onClick={() => goToUsersFilter('active')} />
                        <MetricCard label="Free Trial"   value={freeTrialUsers}  color="#64748B"    icon="⏳" onClick={() => goToUsersFilter('free_trial')} />
                        <MetricCard label="Paid Users"   value={paidUsers}       color={T.warning}  icon="💳" onClick={() => goToUsersFilter('paid')} />
                        <MetricCard label="Total Sites"  value={totalSites}      color={T.info}     icon="🌐" />
                        <MetricCard label="Blocked"      value={blockedUsers}    color={T.danger}   icon="🚫" onClick={() => goToUsersFilter('blocked')} />
                    </div>

                    {/* Row 2 — Revenue Tiles */}
                    <div style={{ ...cardStyle, padding: '20px 24px' }}>
                        <SectionTitle title="Revenue Summary" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
                            <RevTile label="Total Revenue"     value={`₹${totalRevenue.toLocaleString('en-IN')}`}                   sub={`${payments.length} transactions`}                                   color={T.success} />
                            <RevTile label="This Month"        value={`₹${monthRevenue.toLocaleString('en-IN')}`}                   sub={now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}     color={T.primary} />
                            <RevTile label="Plan Revenue"      value={`₹${planRevenue.toLocaleString('en-IN')}`}                    sub="Subscriptions only"                                                    color={T.warning} />
                            <RevTile label="Verification Fees" value={`₹${(totalRevenue - planRevenue).toLocaleString('en-IN')}`}   sub="₹2 trial fees"                                                        color="#64748B"   />
                        </div>
                    </div>

                    {/* Pending Payments alert */}
                    {pendingPayments.length > 0 && (
                        <div style={{ ...cardStyle, borderLeft: `4px solid ${T.warning}`, padding: '20px 24px' }}>
                            <SectionTitle title={`Pending Payments — Action Required (${pendingPayments.length})`} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {pendingPayments.map(pr => (
                                    <div key={pr._id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: 12, background: '#FFFBEB', border: `1px solid #FDE68A`,
                                        borderRadius: 8, padding: '12px 16px', flexWrap: 'wrap',
                                    }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{pr.userName}</div>
                                            <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>{pr.userEmail}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={pill('#FEF3C7','#92400E')}>
                                                    {pr.type === 'verification' ? '₹2 Verification' : `${pr.plan?.charAt(0).toUpperCase() + pr.plan?.slice(1)} ₹${pr.amount}`}
                                                </span>
                                                <span style={{ fontSize: 11, color: T.muted }}>{fmt(pr.createdAt)}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>UTR: <strong>{pr.utr}</strong></div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                            {!readOnly && <><button style={btnSuccess} onClick={() => approvePayment(pr._id)}>Approve</button>
                                            <button style={btnDanger}  onClick={() => rejectPayment(pr._id)}>Reject</button></>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Plans Expiring + Trials Expiring */}
                    <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Plans expiring in 7 days */}
                        <div style={{ ...cardStyle, borderLeft: expiringPlans.length > 0 ? `4px solid ${T.warning}` : `4px solid ${T.border}`, padding: '20px 20px' }}>
                            <SectionTitle title={`Plans Expiring in 7 Days (${expiringPlans.length})`} />
                            {expiringPlans.length === 0 ? (
                                <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>No plans expiring soon</div>
                            ) : expiringPlans.map((u, i) => (
                                <div key={u._id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: i < expiringPlans.length - 1 ? `1px solid ${T.border}` : 'none', gap: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{u.name}</div>
                                        <div style={{ fontSize: 11, color: T.sub }}>{u.email}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <PlanBadge plan={u.plan} />
                                        <div style={{ fontSize: 11, color: T.warning, fontWeight: 600, marginTop: 3 }}>Ends {fmt(u.planEndsAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trials expiring in 2 days */}
                        <div style={{ ...cardStyle, borderLeft: trialExpiring.length > 0 ? `4px solid ${T.warning}` : `4px solid ${T.border}`, padding: '20px 20px' }}>
                            <SectionTitle title={`Trials Expiring in 2 Days (${trialExpiring.length})`} />
                            {trialExpiring.length === 0 ? (
                                <div style={{ fontSize: 13, color: T.muted, padding: '8px 0' }}>No trials expiring soon</div>
                            ) : trialExpiring.map((u, i) => (
                                <div key={u._id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 0', borderBottom: i < trialExpiring.length - 1 ? `1px solid ${T.border}` : 'none', gap: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{u.name}</div>
                                        <div style={{ fontSize: 11, color: T.sub }}>{u.email}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 11, color: T.warning, fontWeight: 600, marginBottom: 4 }}>Ends {fmt(u.trialEndsAt)}</div>
                                        {!readOnly && <button style={{ ...btnPrimary, padding: '5px 12px', fontSize: 11 }} onClick={() => extendTrial(u._id, u.name)}>+5 days</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Plan Distribution — horizontal bar chart */}
                    <div style={{ ...cardStyle, padding: '20px 24px' }}>
                        <SectionTitle title="Plan Distribution" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {PLAN_OPTIONS.map(p => {
                                const count = users.filter(u => u.plan === p).length;
                                const pct = users.length ? Math.round(count / users.length * 100) : 0;
                                return (
                                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{ width: 90, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAN_COLORS[p], flexShrink: 0 }} />
                                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{PLAN_LABEL[p]}</span>
                                        </div>
                                        <div style={{ flex: 1, height: 8, background: '#F3F4F6', borderRadius: 9999, overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: PLAN_COLORS[p], borderRadius: 9999, transition: 'width 0.5s ease', minWidth: pct > 0 ? 4 : 0 }} />
                                        </div>
                                        <div style={{ width: 72, textAlign: 'right', flexShrink: 0, fontSize: 12, fontWeight: 700, color: T.text }}>
                                            {count} <span style={{ color: T.muted, fontWeight: 400 }}>({pct}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Registrations */}
                    <div style={{ ...cardStyle, padding: '20px 24px' }}>
                        <SectionTitle title="Recent Registrations" right={
                            <span style={{ fontSize: 12, color: T.sub }}>Last {Math.min(users.length, 8)} users</span>
                        } />
                        <div>
                            {users.slice(0, 8).map((u, i) => (
                                <div key={u._id} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    padding: '12px 0',
                                    borderBottom: i < 7 ? `1px solid #F3F4F6` : 'none',
                                }}>
                                    <Avatar name={u.name} size={38} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{u.name}</span>
                                            {u.accountId && (
                                                <span style={{ fontSize: 10, fontWeight: 700, background: '#EDE9FE', color: T.primary, padding: '1px 8px', borderRadius: 9999, fontFamily: 'monospace' }}>{u.accountId}</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 12, color: T.sub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.email}{u.phone ? ` · ${u.phone}` : ''}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                        <PlanBadge plan={u.plan} />
                                        <span style={{ fontSize: 12, color: T.sub }}>{u.serverCount || 0} sites</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: T.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt(u.createdAt)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================
                USERS TAB
            ================================================================ */}
            {tab === 'users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Toolbar */}
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', background:'var(--bg-card)', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 14px' }}>
                        {/* Search */}
                        <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8 }}>
                            <SearchIcon />
                            <input style={{ border:'none', outline:'none', background:'transparent', fontSize:13, color:T.text, flex:1, fontFamily:'inherit' }}
                                placeholder="Search name, email, phone..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', color:T.muted, cursor:'pointer', fontSize:13, padding:0 }}>✕</button>}
                        </div>
                        <div style={{ width:1, height:28, background:'var(--border-color)' }} />
                        <select value={durationFilter} onChange={e => setDurationFilter(e.target.value)}
                            style={{ 
                                padding: '6px 12px', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: 6, 
                                fontSize: 13, 
                                fontWeight: 600, 
                                color: 'var(--text-main)', 
                                background: 'var(--bg-input)', 
                                cursor: 'pointer', 
                                fontFamily: 'inherit', 
                                outline: 'none' 
                            }}
                        >
                            <option value="all" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>All Users</option>
                            <option value="free_trial" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Free Trial</option>
                            <option value="1m" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Monthly (1M)</option>
                            <option value="3m" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>3 Months</option>
                            <option value="6m" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>6 Months</option>
                            <option value="1y" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Yearly (1Y)</option>
                        </select>



                        {/* Export CSV */}
                        <button onClick={exportCSV} disabled={users.length === 0} style={{
                            ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export CSV
                        </button>
                    </div>

                    {/* Count label */}
                    <div style={{ fontSize: 12, color: T.muted }}>Showing {filtered.length} of {users.length} users</div>

                    {/* Users Table */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 60, color: T.muted, fontSize: 14 }}>Loading users...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: T.muted, fontSize: 14 }}>No users found.</div>
                    ) : (
                    <>
                    {/* ── Free Trial Users ── */}
                    {(durationFilter === 'all' || durationFilter === 'free_trial') && freeTrialFiltered.length > 0 && <div style={{ marginBottom: 24 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <span style={{ fontWeight:800, fontSize:15, color:'#6d28d9' }}>🆓 Free Trial Users</span>
                            <span style={{ background:'#ede9fe', color:'#6d28d9', fontWeight:700, fontSize:12, padding:'2px 10px', borderRadius:50 }}>{freeTrialFiltered.length}</span>
                        </div>
                        <div style={{ ...cardStyle, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr>{['User', 'Plan', 'Sites', 'Status', 'Expiry', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {freeTrialFiltered.map(u => (
                                            <React.Fragment key={u._id}>
                                                <tr className={`admin-tr ${u.isBlocked ? 'blocked' : ''}`}>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <Avatar name={u.name} size={36} />
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {u.name}
                                                                    {u.accountId && <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#EDE9FE', color: T.primary, padding: '1px 7px', borderRadius: 9999 }}>{u.accountId}</span>}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{u.email}</div>
                                                                {u.phone && <div style={{ fontSize: 11, color: T.muted }}>{u.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle }}><PlanBadge plan={u.plan} /></td>
                                                    <td style={{ ...tdStyle, fontWeight: 700 }}>{u.serverCount || 0}</td>
                                                    <td style={{ ...tdStyle }}>
                                                        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                                                            <StatusBadge u={u} />
                                                            <VerifiedBadge u={u} />
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle, fontSize: 12, color: T.sub }}>{u.trialEndsAt ? fmt(u.trialEndsAt) : '—'}</td>
                                                    <td style={{ ...tdStyle }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            {readOnly ? <span style={{ fontSize:11, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'4px 10px', fontWeight:600 }}>👁 Read Only</span> : <>
                                                            <button onClick={() => openAssign(u)} style={{ ...btnPrimary, padding: '5px 10px', fontSize: 11 }}>Assign Plan</button>
                                                            <button onClick={() => startEdit(u)} style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }}>Edit</button>
                                                            <button onClick={() => openUserHistory(u)} style={{ padding: '5px 10px', fontSize: 11, background: '#F5F3FF', color: '#7C3AED', border: `1px solid #DDD6FE`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>📋 History</button>
                                                            <button onClick={() => extendTrial(u._id, u.name)} style={{ padding: '5px 10px', fontSize: 11, background: '#EFF6FF', color: T.info, border: `1px solid #BFDBFE`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+Trial</button>
                                                            <button onClick={() => toggleBlock(u)} style={{ padding: '5px 10px', fontSize: 11, borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: `1px solid ${u.isBlocked ? '#BBF7D0' : '#FECDD3'}`, background: u.isBlocked ? '#F0FDF4' : '#FFF1F2', color: u.isBlocked ? T.success : T.danger }}>{u.isBlocked ? 'Unblock' : 'Block'}</button>
                                                            <button onClick={() => deleteUser(u)} style={{ padding: '5px 10px', fontSize: 11, background: '#FEF2F2', color: T.danger, border: `1px solid #FECDD3`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                                                            </>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>}

                    {/* ── Monthly Users ── */}
                    {((durationFilter === 'all' && monthlyFiltered.length > 0) || (durationFilter !== 'free_trial' && durationFilter !== '1y' && monthlyFiltered.length > 0)) && <div style={{ marginBottom: 24 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <span style={{ fontWeight:800, fontSize:15, color:'#1e40af' }}>📅 {durationFilter==='3m'?'3 Monthly':durationFilter==='6m'?'6 Monthly':'Monthly'} Users</span>
                            <span style={{ background:'#dbeafe', color:'#1e40af', fontWeight:700, fontSize:12, padding:'2px 10px', borderRadius:50 }}>{monthlyFiltered.length}</span>
                        </div>
                        {monthlyFiltered.length === 0 ? (
                            <div style={{ textAlign:'center', padding:'24px 0', color:T.muted, fontSize:13 }}>No monthly users</div>
                        ) : (
                        <div style={{ ...cardStyle, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr>{['User', 'Plan', 'Sites', 'Status', 'Expiry', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {monthlyFiltered.map(u => (
                                            <React.Fragment key={u._id}>
                                                <tr
                                                    className={`admin-tr ${u.isBlocked ? 'blocked' : ''}`}
                                                    onClick={() => setExpandedId(expandedId === u._id ? null : u._id)}
                                                >
                                                    {/* User cell */}
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <Avatar name={u.name} size={36} />
                                                            <div>
                                                                <div style={{ fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    {u.name}
                                                                    {u.accountId && <span style={{ fontSize: 10, fontFamily: 'monospace', background: '#EDE9FE', color: T.primary, padding: '1px 7px', borderRadius: 9999 }}>{u.accountId}</span>}
                                                                </div>
                                                                <div style={{ fontSize: 11, color: T.sub, marginTop: 1 }}>{u.email}</div>
                                                                {u.phone && <div style={{ fontSize: 11, color: T.muted }}>{u.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Plan */}
                                                    <td style={tdStyle}>
                                                        <PlanBadge plan={u.plan} />
                                                    </td>
                                                    {/* Sites */}
                                                    <td style={{ ...tdStyle, fontWeight: 700 }}>
                                                        {u.serverCount || 0}
                                                    </td>
                                                    {/* Status */}
                                                    <td style={tdStyle}>
                                                        <StatusBadge u={u} />
                                                    </td>
                                                    {/* Expiry */}
                                                    <td style={{ ...tdStyle, fontSize: 12, color: T.sub }}>
                                                        {u.plan !== 'free_trial' && u.planEndsAt ? fmt(u.planEndsAt) : u.trialEndsAt ? fmt(u.trialEndsAt) : '—'}
                                                    </td>
                                                    {/* Actions */}
                                                    <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            {readOnly ? <span style={{ fontSize:11, color:'#92400e', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'4px 10px', fontWeight:600 }}>👁 Read Only</span> : <>
                                                            <button title="Assign Plan" onClick={() => openAssign(u)} style={{ ...btnPrimary, padding: '5px 10px', fontSize: 11 }}>Assign Plan</button>
                                                            <button title="Edit" onClick={e => { e.stopPropagation(); startEdit(u); }} style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }}>Edit</button>
                                                            <button title="Extend Trial +5 days" onClick={() => extendTrial(u._id, u.name)} style={{ padding: '5px 10px', fontSize: 11, background: '#EFF6FF', color: T.info, border: `1px solid #BFDBFE`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+Trial</button>
                                                            <button title={u.isBlocked ? 'Unblock user' : 'Block user'} onClick={() => toggleBlock(u)}
                                                                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: `1px solid ${u.isBlocked ? '#BBF7D0' : '#FECDD3'}`, background: u.isBlocked ? '#F0FDF4' : '#FFF1F2', color: u.isBlocked ? T.success : T.danger }}>
                                                                {u.isBlocked ? 'Unblock' : 'Block'}
                                                            </button>
                                                            <button title="Delete user permanently" onClick={() => deleteUser(u)} style={{ padding: '5px 10px', fontSize: 11, background: '#FEF2F2', color: T.danger, border: `1px solid #FECDD3`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                                                            </>}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Expanded detail row */}
                                                {expandedId === u._id && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: 0, background: '#F9FAFB', borderBottom: `1px solid ${T.border}` }}>
                                                            <div style={{ padding: '16px 20px' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
                                                                    {[
                                                                        { label: 'Plan',       val: <PlanBadge plan={u.plan} /> },
                                                                        { label: 'Billing',    val: <span style={{ fontWeight:700, fontSize:12, padding:'2px 10px', borderRadius:50, background: u.billing==='annually'?'#fef3c7':'#eff6ff', color: u.billing==='annually'?'#b45309':'#2563eb' }}>{u.billing === 'annually' ? '📆 Annual' : '📅 Monthly'}</span> },
                                                                        { label: 'Status',     val: <StatusBadge u={u} /> },
                                                                        { label: 'Sites',      val: <strong>{u.serverCount || 0}</strong> },
                                                                        { label: 'Trial Ends', val: <strong>{fmt(u.trialEndsAt)}</strong> },
                                                                        { label: 'Plan Ends',  val: <strong>{fmt(u.planEndsAt)}</strong> },
                                                                        { label: 'Registered', val: <strong>{fmt(u.createdAt)}</strong> },
                                                                        ...(u.address ? [{ label: 'Address', val: <strong>{u.address}</strong> }] : []),
                                                                        ...(u.state   ? [{ label: 'State',   val: <strong>{u.state}</strong>   }] : []),
                                                                        ...(u.country ? [{ label: 'Country', val: <strong>{u.country}</strong> }] : []),
                                                                    ].map(item => (
                                                                        <div key={item.label}>
                                                                            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                                                                            <div style={{ fontSize: 13 }}>{item.val}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Edit panel row */}
                                                {editId?.toString() === u._id?.toString() && (
                                                    <tr>
                                                        <td colSpan={6} style={{ padding: 0, background: '#F5F3FF', borderBottom: `1px solid #DDD6FE` }}>
                                                            <div style={{ padding: '16px 20px' }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 6 }}>Plan</label>
                                                                        <select value={editForm.plan} onChange={e => setEditForm({ ...editForm, plan: e.target.value })} style={inputSt}>
                                                                            {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, display: 'block', marginBottom: 6 }}>Plan Ends At</label>
                                                                        <input type="date" style={inputSt} value={editForm.planEndsAt} onChange={e => setEditForm({ ...editForm, planEndsAt: e.target.value })} />
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: T.text }}>
                                                                            <input type="checkbox" checked={editForm.isBlocked} onChange={e => setEditForm({ ...editForm, isBlocked: e.target.checked })} />
                                                                            Block this account
                                                                        </label>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 10 }}>
                                                                    <button style={btnPrimary} onClick={saveEdit}>Save Changes</button>
                                                                    <button style={btnSecondary} onClick={() => setEditId(null)}>Cancel</button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}
                    </div>}

                    {/* ── Annual Users ── */}
                    {(durationFilter === 'all' || annualFiltered.length > 0) && <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                            <span style={{ fontWeight:800, fontSize:15, color:'#b45309' }}>📆 Annual Users</span>
                            <span style={{ background:'#fef3c7', color:'#b45309', fontWeight:700, fontSize:12, padding:'2px 10px', borderRadius:50 }}>{annualFiltered.length}</span>
                        </div>
                        {annualFiltered.length === 0 ? (
                            <div style={{ textAlign:'center', padding:'24px 0', color:T.muted, fontSize:13 }}>No annual users yet</div>
                        ) : (
                        <div style={{ ...cardStyle, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead><tr>{['User', 'Plan', 'Sites', 'Status', 'Expiry', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                                    <tbody>
                                        {annualFiltered.map(u => (
                                            <React.Fragment key={u._id}>
                                                <tr className={`admin-tr ${u.isBlocked ? 'blocked' : ''}`}
                                                    onClick={()=>setExpandedId(expandedId===u._id?null:u._id)}>
                                                    <td style={tdStyle}>
                                                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                                                            <Avatar name={u.name} size={36}/>
                                                            <div>
                                                                <div style={{fontWeight:700,color:T.text,display:'flex',alignItems:'center',gap:6}}>
                                                                    {u.name}
                                                                    {u.accountId&&<span style={{fontSize:10,fontFamily:'monospace',background:'#EDE9FE',color:T.primary,padding:'1px 7px',borderRadius:9999}}>{u.accountId}</span>}
                                                                </div>
                                                                <div style={{fontSize:11,color:T.sub,marginTop:1}}>{u.email}</div>
                                                                {u.phone&&<div style={{fontSize:11,color:T.muted}}>{u.phone}</div>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={tdStyle}><PlanBadge plan={u.plan}/></td>
                                                    <td style={{...tdStyle,fontWeight:700}}>{u.serverCount||0}</td>
                                                    <td style={tdStyle}><StatusBadge u={u}/></td>
                                                    <td style={{...tdStyle,fontSize:12,color:T.sub}}>
                                                        {u.plan!=='free_trial'&&u.planEndsAt?fmt(u.planEndsAt):u.trialEndsAt?fmt(u.trialEndsAt):'—'}
                                                    </td>
                                                    <td style={tdStyle} onClick={e=>e.stopPropagation()}>
                                                        <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                                                            {readOnly ? <span style={{fontSize:11,color:'#92400e',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:6,padding:'4px 10px',fontWeight:600}}>👁 Read Only</span> : <>
                                                            <button onClick={()=>openAssign(u)} style={{...btnPrimary,padding:'5px 10px',fontSize:11}}>Assign Plan</button>
                                                            <button onClick={e=>{e.stopPropagation();startEdit(u);}} style={{...btnSecondary,padding:'5px 10px',fontSize:11}}>Edit</button>
                                                            <button onClick={()=>extendTrial(u._id,u.name)} style={{padding:'5px 10px',fontSize:11,background:'#EFF6FF',color:T.info,border:`1px solid #BFDBFE`,borderRadius:8,cursor:'pointer',fontWeight:600}}>+Trial</button>
                                                            <button onClick={()=>toggleBlock(u)} style={{padding:'5px 10px',fontSize:11,borderRadius:8,cursor:'pointer',fontWeight:600,border:`1px solid ${u.isBlocked?'#BBF7D0':'#FECDD3'}`,background:u.isBlocked?'#F0FDF4':'#FFF1F2',color:u.isBlocked?T.success:T.danger}}>{u.isBlocked?'Unblock':'Block'}</button>
                                                            <button onClick={()=>deleteUser(u)} style={{padding:'5px 10px',fontSize:11,background:'#FEF2F2',color:T.danger,border:`1px solid #FECDD3`,borderRadius:8,cursor:'pointer',fontWeight:600}}>Delete</button>
                                                            </>}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedId===u._id&&(
                                                    <tr><td colSpan={6} style={{padding:0,background:'#F9FAFB',borderBottom:`1px solid ${T.border}`}}>
                                                        <div style={{padding:'16px 20px'}}>
                                                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:14}}>
                                                                {[
                                                                    {label:'Plan',val:<PlanBadge plan={u.plan}/>},
                                                                    {label:'Billing',val:<span style={{fontWeight:700,fontSize:12,padding:'2px 10px',borderRadius:50,background:'#fef3c7',color:'#b45309'}}>📆 Annual</span>},
                                                                    {label:'Status',val:<StatusBadge u={u}/>},
                                                                    {label:'Sites',val:<strong>{u.serverCount||0}</strong>},
                                                                    {label:'Plan Ends',val:<strong>{fmt(u.planEndsAt)}</strong>},
                                                                    {label:'Registered',val:<strong>{fmt(u.createdAt)}</strong>},
                                                                ].map(item=>(
                                                                    <div key={item.label}>
                                                                        <div style={{fontSize:10,fontWeight:700,color:T.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{item.label}</div>
                                                                        <div style={{fontSize:13}}>{item.val}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td></tr>
                                                )}
                                                {editId?.toString()===u._id?.toString()&&(
                                                    <tr><td colSpan={6} style={{padding:0,background:'#F5F3FF',borderBottom:`1px solid #DDD6FE`}}>
                                                        <div style={{padding:'16px 20px'}}>
                                                            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:14}}>
                                                                <div><label style={{fontSize:11,fontWeight:700,color:T.sub,display:'block',marginBottom:6}}>Plan</label>
                                                                    <select value={editForm.plan} onChange={e=>setEditForm({...editForm,plan:e.target.value})} style={inputSt}>
                                                                        {PLAN_OPTIONS.map(p=><option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                                                                    </select></div>
                                                                <div><label style={{fontSize:11,fontWeight:700,color:T.sub,display:'block',marginBottom:6}}>Plan Ends At</label>
                                                                    <input type="date" style={inputSt} value={editForm.planEndsAt} onChange={e=>setEditForm({...editForm,planEndsAt:e.target.value})}/></div>
                                                                <div style={{display:'flex',alignItems:'flex-end',paddingBottom:2}}>
                                                                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:T.text}}>
                                                                        <input type="checkbox" checked={editForm.isBlocked} onChange={e=>setEditForm({...editForm,isBlocked:e.target.checked})}/>Block this account
                                                                    </label></div>
                                                            </div>
                                                            <div style={{display:'flex',gap:10}}>
                                                                <button style={btnPrimary} onClick={saveEdit}>Save Changes</button>
                                                                <button style={btnSecondary} onClick={()=>setEditId(null)}>Cancel</button>
                                                            </div>
                                                        </div>
                                                    </td></tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}
                    </div>}
                    </>
                    )}
                </div>
            )}

            {/* ================================================================
                ABANDONED USERS TAB
            ================================================================ */}
            {tab === 'abandoned' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header card */}
                    <div style={{ ...cardStyle, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 17 }}>👥 Abandoned Users</div>
                                <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
                                    Users who filled profile but haven't paid ₹2 verification fee (account &gt; 2 hours old)
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span style={{ ...pill('#F5F3FF', '#7C3AED'), fontSize: 13 }}>{abandonedUsers.length} users</span>
                                <span style={{ ...pill('#FEF3C7', '#D97706'), fontSize: 13 }}>
                                    {abandonedUsers.filter(u => u.followupSent).length} emailed
                                </span>
                                <button onClick={() => {
                                    setAbandonedLoading(true);
                                    axios.get(`${API_URL}/api/admin/abandoned-users`, { withCredentials: true })
                                        .then(r => setAbandonedUsers(r.data)).catch(() => {}).finally(() => setAbandonedLoading(false));
                                }} style={{ padding: '6px 14px', background: T.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                    ↻ Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                        {abandonedLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Loading...</div>
                        ) : abandonedUsers.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                                <div style={{ fontWeight: 600 }}>No abandoned users</div>
                                <div style={{ fontSize: 13, marginTop: 4 }}>All users who filled profile have completed payment!</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: T.headerBg }}>
                                            {['Name', 'Email', 'Phone', 'City', 'Reason', 'Signup', 'Hours Ago', 'Follow-up'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {abandonedUsers.map(u => (
                                            <tr key={u._id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.name}</td>
                                                <td style={{ padding: '12px 16px', color: T.sub }}>{u.email}</td>
                                                <td style={{ padding: '12px 16px', color: T.sub, fontFamily: 'monospace' }}>{u.phone || '—'}</td>
                                                <td style={{ padding: '12px 16px', color: T.sub }}>{u.city || '—'}{u.state ? `, ${u.state}` : ''}</td>
                                                <td style={{ padding: '12px 16px' }}><AbandonReasonBadge reason={u.abandonReason} /></td>
                                                <td style={{ padding: '12px 16px', color: T.muted, fontSize: 12 }}>
                                                    {new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ ...pill(u.hoursSinceSignup < 24 ? '#FEF3C7' : '#FEE2E2', u.hoursSinceSignup < 24 ? '#D97706' : '#DC2626'), fontSize: 11 }}>
                                                        {u.hoursSinceSignup}h ago
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {u.followupSent ? (
                                                        <span style={{ ...pill('#D1FAE5', '#065F46'), fontSize: 11 }}>
                                                            ✅ Sent {u.followupSentAt ? new Date(u.followupSentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => sendFollowup(u._id, u.email)}
                                                            disabled={followupSending[u._id]}
                                                            style={{ padding: '5px 12px', background: followupSending[u._id] ? T.muted : '#7c3aed', color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: followupSending[u._id] ? 'not-allowed' : 'pointer' }}>
                                                            {followupSending[u._id] ? 'Sending...' : '📧 Send Follow-up'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                PLAN HISTORY TAB
            ================================================================ */}
            {tab === 'planhistory' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Header */}
                    <div style={{ ...cardStyle, padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 17 }}>📋 Plan History</div>
                                <div style={{ color: T.muted, fontSize: 13, marginTop: 4 }}>
                                    {planHistoryTotal} users with plan records — click any row to see full history
                                </div>
                            </div>
                            <button onClick={() => loadPlanHistory(planHistoryPage)}
                                style={{ padding: '6px 14px', background: T.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Table — one row per user */}
                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                        {planHistoryLoading ? (
                            <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>Loading...</div>
                        ) : planHistory.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                                <div style={{ fontWeight: 600 }}>No plan history found</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: T.headerBg }}>
                                            {['User', 'Current Plan', 'Latest Billing', 'Total Paid', 'Records', 'Latest Start Date', 'Expires On', 'Status'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {planHistory.map(r => {
                                            const PLAN_COLOR = { bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04', free_trial:'#6366f1' };
                                            // Current plan from user doc (most accurate)
                                            const curPlan = r.currentPlan || r.plan || 'free_trial';
                                            const planLabel = { bronze:'Bronze', silver:'Silver', gold:'Gold', free_trial:'Free Trial' }[curPlan] || curPlan;
                                            const planColor = PLAN_COLOR[curPlan] || '#6366f1';
                                            const sd = r.startDate || r.createdAt;
                                            // Expiry: use currentPlanEndsAt (user's actual current expiry) or trialEndsAt
                                            const expiry = r.currentPlanEndsAt || (curPlan === 'free_trial' ? r.currentTrialEndsAt : null) || r.planEndsAt;
                                            const isExpired = expiry && new Date(expiry) < new Date();
                                            return (
                                                <tr key={r._id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    onClick={() => openUserHistory({ _id: r.userId, name: r.userName, email: r.userEmail })}>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: 13, color: T.primary }}>{r.userName}</div>
                                                        <div style={{ fontSize: 11, color: T.muted }}>{r.userEmail}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ ...pill(planColor + '20', planColor), fontWeight: 700 }}>{planLabel}</span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: T.sub }}>
                                                        {r.billing ? (r.billing === 'annually' ? '🗓 Annual' : '📅 Monthly') : '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                                                        ₹{r.totalAmount || 0}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ ...pill('#F5F3FF', '#7C3AED'), fontWeight: 700, fontSize: 12 }}>
                                                            {r.totalRecords} {r.totalRecords === 1 ? 'record' : 'records'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', color: T.sub, fontSize: 12, whiteSpace: 'nowrap' }}>
                                                        {sd ? new Date(sd).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                                        <div style={{ fontSize: 10, color: T.muted }}>
                                                            {sd ? new Date(sd).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : ''}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                        {expiry ? (
                                                            <span style={{ color: isExpired ? T.danger : T.success, fontWeight: 600 }}>
                                                                {new Date(expiry).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                                            </span>
                                                        ) : <span style={{ color: T.muted }}>—</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ ...pill(isExpired ? '#FEE2E2' : '#D1FAE5', isExpired ? '#DC2626' : '#065F46'), fontSize: 11, fontWeight: 700 }}>
                                                            {isExpired ? '✕ Expired' : '✓ Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {planHistoryPages > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px', borderTop: `1px solid ${T.border}` }}>
                                <button onClick={() => loadPlanHistory(planHistoryPage - 1)} disabled={planHistoryPage <= 1}
                                    style={{ padding: '6px 14px', background: planHistoryPage <= 1 ? T.border : T.primary, color: planHistoryPage <= 1 ? T.muted : '#fff', border: 'none', borderRadius: 8, cursor: planHistoryPage <= 1 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                                    ← Prev
                                </button>
                                <span style={{ fontSize: 13, color: T.sub }}>Page {planHistoryPage} / {planHistoryPages} &nbsp;·&nbsp; {planHistoryTotal} users</span>
                                <button onClick={() => loadPlanHistory(planHistoryPage + 1)} disabled={planHistoryPage >= planHistoryPages}
                                    style={{ padding: '6px 14px', background: planHistoryPage >= planHistoryPages ? T.border : T.primary, color: planHistoryPage >= planHistoryPages ? T.muted : '#fff', border: 'none', borderRadius: 8, cursor: planHistoryPage >= planHistoryPages ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                EXPIRED PLANS TAB
            ================================================================ */}
            {tab === 'expired' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${T.border}` }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Expired Plan Users</div>
                                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Users whose plan has expired and need renewal</div>
                            </div>
                            <span style={{ ...pill('#FEF3C7', '#D97706'), fontSize: 13 }}>{expiredUsers.length} expired</span>
                        </div>
                        {expiredUsers.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: T.muted }}>
                                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                                <div style={{ fontWeight: 600 }}>No expired plans</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: T.headerBg }}>
                                            {['User', 'Email', 'Plan', 'Expired On', 'Sites Used', 'Action'].map(h => (
                                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expiredUsers.map(u => (
                                            <tr key={u._id} style={{ borderBottom: `1px solid ${T.border}` }}
                                                onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '14px 16px', fontWeight: 700, color: T.text }}>
                                                    <div>{u.name}</div>
                                                    <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{u.accountId}</div>
                                                </td>
                                                <td style={{ padding: '14px 16px', color: T.sub }}>{u.email}</td>
                                                <td style={{ padding: '14px 16px' }}><PlanBadge plan={u.plan} /></td>
                                                <td style={{ padding: '14px 16px', color: T.danger, fontWeight: 600 }}>{fmt(u.planEndsAt || u.trialEndsAt)}</td>
                                                <td style={{ padding: '14px 16px', color: T.sub }}>{u.serverCount || 0} sites used</td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    {!readOnly && (
                                                        <button style={{ ...btnPrimary, fontSize: 12, padding: '6px 14px' }}
                                                            onClick={() => { setAssignModal({ user: u }); setAssignForm({ plan: 'bronze', billing: 'monthly', planDuration: '1m', duration: '1m' }); }}>
                                                            Assign Plan
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                PAYMENTS TAB
            ================================================================ */}
            {tab === 'payments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Filter bar */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {[
                            { key: 'all',      label: 'All',      count: payments.length,                                    activeBg: T.primary, activeColor: '#fff' },
                            { key: 'pending',  label: 'Pending',  count: payments.filter(p=>p.status==='pending').length,   activeBg: '#D97706', activeColor: '#fff' },
                            { key: 'approved', label: 'Approved', count: payments.filter(p=>p.status==='approved').length,  activeBg: T.success, activeColor: '#fff' },
                            { key: 'rejected', label: 'Rejected', count: payments.filter(p=>p.status==='rejected').length,  activeBg: T.danger,  activeColor: '#fff' },
                            { key: 'refunded', label: 'Refunded', count: payments.filter(p=>p.status==='refunded').length,  activeBg: '#B91C1C', activeColor: '#fff' },
                        ].map(s => (
                            <button key={s.key} onClick={() => setPayStatusFilter(s.key)} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 7,
                                padding: '7px 16px', borderRadius: 9999,
                                border: `1px solid ${payStatusFilter === s.key ? s.activeBg : T.border}`,
                                background: payStatusFilter === s.key ? s.activeBg : 'var(--bg-card)',
                                color: payStatusFilter === s.key ? s.activeColor : T.sub,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                            }}>
                                {s.label}
                                <span style={{
                                    background: payStatusFilter === s.key ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
                                    color: payStatusFilter === s.key ? '#fff' : T.sub,
                                    borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                                }}>{s.count}</span>
                            </button>
                        ))}

                        {/* Search */}
                        <div style={{
                            flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10,
                            background: 'var(--bg-card)', border: `1px solid ${T.border}`, borderRadius: 8,
                            padding: '9px 12px',
                        }}>
                            <SearchIcon />
                            <input style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: T.text, flex: 1, fontFamily: 'inherit' }}
                                placeholder="Search by ID, name or email..."
                                value={paySearch} onChange={e => setPaySearch(e.target.value)} />
                            {paySearch && <button onClick={() => setPaySearch('')} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>}
                        </div>
                    </div>

                    {/* Payment Table */}
                    <div style={{ ...cardStyle, overflow: 'hidden' }}>
                        {filteredPayments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: T.muted, fontSize: 14 }}>
                                {paySearch || payStatusFilter !== 'all' ? 'No payments match your filter.' : 'No payments yet.'}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ background: T.headerBg }}>
                                            {['#', 'User', 'Type', 'Amount', 'Razorpay ID', 'Date', 'Status', 'Actions'].map(h => (
                                                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPayments.map((pr, idx) => {
                                            const isPending = !pr.status || pr.status === 'pending';
                                            const planColor = { bronze:'#B45309', silver:'#475569', gold:'#CA8A04' }[pr.plan] || '#64748B';
                                            return (
                                                <tr key={pr._id} style={{ borderBottom: `1px solid ${T.border}`, background: isPending ? `${T.warning}08` : 'transparent' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                    onMouseLeave={e => e.currentTarget.style.background = isPending ? `${T.warning}08` : 'transparent'}>
                                                    <td style={{ padding: '12px 14px', color: T.muted, fontWeight: 600, fontSize: 12 }}>{idx + 1}</td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ fontWeight: 700, color: T.text }}>{pr.userName}</div>
                                                        <div style={{ fontSize: 11, color: T.sub }}>{pr.userEmail}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        {pr.type === 'verification'
                                                            ? <span style={pill('#FEF3C7','#92400E')}>Verification</span>
                                                            : <span style={pill(`${planColor}20`, planColor)}>{pr.plan?.charAt(0).toUpperCase() + pr.plan?.slice(1)}</span>}
                                                    </td>
                                                    <td style={{ padding: '12px 14px', fontWeight: 800, color: T.text }}>₹{pr.amount}</td>
                                                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: T.sub }}>{pr.utr}</td>
                                                    <td style={{ padding: '12px 14px', fontSize: 12, color: T.muted, whiteSpace: 'nowrap' }}>{fmt(pr.createdAt)}</td>
                                                    <td style={{ padding: '12px 14px' }}><PayStatusBadge status={pr.status} /></td>
                                                    <td style={{ padding: '12px 14px' }}>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            {isPending && <>
                                                                <button style={{ ...btnSuccess, padding: '5px 12px', fontSize: 11 }} onClick={() => approvePayment(pr._id)}>Approve</button>
                                                                <button style={{ ...btnDanger, padding: '5px 12px', fontSize: 11 }} onClick={() => rejectPayment(pr._id)}>Reject</button>
                                                            </>}
                                                            {!readOnly && pr.status === 'approved' && (
                                                                <button onClick={() => refundPayment(pr._id)} style={{ ...btnSecondary, padding: '5px 12px', fontSize: 11, color: T.danger, borderColor: '#FECDD3' }}>Refund</button>
                                                            )}
                                                            {pr.status === 'refunded' && <span style={pill('#FEE2E2','#B91C1C')}>Refunded</span>}
                                                            {!readOnly && <button onClick={() => deletePayment(pr._id)} style={{ ...btnSecondary, color: T.danger, borderColor: '#FECDD3', padding: '6px 10px' }}>
                                                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                            </button>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                TRANSACTIONS TAB — auto-load refund statuses
            ================================================================ */}
            {tab === 'transactions' && (() => {
                const refunded = payments.filter(p => p.status === 'refunded');
                refunded.forEach(p => {
                    if (!refundStatuses[p._id]) {
                        adminRefundStatus(p._id).then(r => {
                            setRefundStatuses(prev => ({ ...prev, [p._id]: r.data }));
                        }).catch(() => {
                            setRefundStatuses(prev => ({ ...prev, [p._id]: { label: 'Unknown', color: '#9CA3AF', desc: 'Could not fetch' } }));
                        });
                    }
                });
                return null;
            })()}

            {tab === 'transactions' && (
                <div style={{ ...cardStyle, overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                                <tr>
                                    {['#', 'Date', 'User', 'Type', 'Plan', 'Amount', 'Status', 'Razorpay ID'].map(h => (
                                        <th key={h} style={thStyle}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: T.muted }}>No transactions yet</td></tr>
                                ) : payments.map((p, i) => {
                                    const isRefunded = p.status === 'refunded';
                                    const statusMap = {
                                        approved: { bg:'#D1FAE5', color:'#065F46' },
                                        pending:  { bg:'#FEF9C3', color:'#92400E' },
                                        rejected: { bg:'#FEE2E2', color:'#B91C1C' },
                                        refunded: { bg:'#FEE2E2', color:'#B91C1C' },
                                    };
                                    const sc = statusMap[p.status] || { bg:'#F3F4F6', color:'#6B7280' };
                                    return (
                                        <tr key={p._id}
                                            className={`admin-tr ${isRefunded ? 'blocked' : ''}`}
                                        >
                                            <td style={{ ...tdStyle, color: T.muted, fontWeight: 600 }}>{i + 1}</td>
                                            <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: T.sub }}>
                                                {fmt(p.createdAt)}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: 700, color: T.text }}>{p.userName || '—'}</div>
                                                <div style={{ fontSize: 11, color: T.muted }}>{p.userEmail || ''}</div>
                                            </td>
                                            <td style={{ ...tdStyle, color: T.sub, textTransform: 'capitalize' }}>{p.type}</td>
                                            <td style={tdStyle}>
                                                <span style={pill(
                                                    p.plan==='gold'?'#FEF9C3': p.plan==='silver'?'#F1F5F9': p.plan==='bronze'?'#FEF3C7':'#F3F4F6',
                                                    p.plan==='gold'?'#92400E': p.plan==='silver'?'#475569': p.plan==='bronze'?'#92400E':'#6B7280'
                                                )}>
                                                    {p.plan ? p.plan.charAt(0).toUpperCase()+p.plan.slice(1) : 'Verification'}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: isRefunded ? T.danger : T.text }}>
                                                {isRefunded ? <s>₹{p.amount}</s> : `₹${p.amount}`}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    <span style={pill(sc.bg, sc.color)}>
                                                        {isRefunded ? 'Refunded' : p.status?.charAt(0).toUpperCase()+p.status?.slice(1)}
                                                    </span>
                                                    {isRefunded && (
                                                        refundStatuses[p._id]
                                                            ? <span style={{ ...pill('#F0FDF4', refundStatuses[p._id].color), border: `1px solid ${refundStatuses[p._id].color}44` }}>
                                                                {refundStatuses[p._id].label}
                                                              </span>
                                                            : <span style={{ fontSize: 11, color: T.muted }}>Checking...</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 11, color: T.sub }}>
                                                {p.razorpay_payment_id || p.utr || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ background: T.headerBg, borderTop: `2px solid ${T.border}` }}>
                                    <td colSpan={5} style={{ padding: '13px 16px', fontWeight: 700, color: T.text, fontSize: 13 }}>
                                        Total Revenue (excl. refunds)
                                    </td>
                                    <td style={{ padding: '13px 16px', fontWeight: 800, color: T.primary, fontSize: 16 }}>₹{totalRevenue}</td>
                                    <td colSpan={2} />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ================================================================
                PLAN CANCELING TAB
            ================================================================ */}
            {tab === 'canceling' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* Summary — 3 clean stat tiles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                        {[
                            { label: 'Total Cancelled',   value: refundedPayments.length,  accent:'#EF4444' },
                            { label: 'Total Refunded',    value: `₹${totalRefunded}`,       accent:'#F59E0B' },
                            { label: 'Revenue Lost',      value: `₹${refundedPayments.filter(p=>p.type!=='verification').reduce((s,p)=>s+(p.amount||0),0)}`, accent:'#7C3AED' },
                        ].map(c => (
                            <div key={c.label} style={{ background:'var(--bg-card)', borderRadius:10, border:`1px solid var(--border-color)`, borderTop:`3px solid ${c.accent}`, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize:28, fontWeight:800, color:c.accent, lineHeight:1, marginBottom:6 }}>{c.value}</div>
                                <div style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.6 }}>{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div style={{ background:'var(--bg-card)', borderRadius:10, border:'1px solid var(--border-color)', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border-color)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--bg-input)' }}>
                            <div style={{ fontWeight:700, color:'var(--text-main)', fontSize:14 }}>Cancelled & Refunded Plans <span style={{ color:'var(--text-muted)', fontWeight:500 }}>({refundedPayments.length})</span></div>
                            {refundedPayments.length > 0 && (
                                <span style={{ fontSize:12, fontWeight:700, color:'#EF4444', background:'rgba(239, 68, 68, 0.08)', border:'1px solid rgba(239, 68, 68, 0.25)', padding:'3px 12px', borderRadius:20 }}>Total Lost: ₹{totalRefunded}</span>
                            )}
                        </div>

                        {refundedPayments.length === 0 ? (
                            <div style={{ padding:60, textAlign:'center' }}>
                                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                                <div style={{ fontWeight:700, fontSize:16, color:'#10B981' }}>No Cancelled Plans</div>
                                <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:6 }}>All plans are active</div>
                            </div>
                        ) : (
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                    <thead>
                                        <tr style={{ background:'var(--bg-input)' }}>
                                            {['#','Date','User','Plan','Refunded','Payment ID'].map(h => (
                                                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {refundedPayments.map((p, i) => (
                                            <tr key={p._id} className="admin-tr blocked">
                                                <td style={{ padding:'13px 16px', color:'var(--text-muted)', fontSize:12 }}>{i+1}</td>
                                                <td style={{ padding:'13px 16px', color:'var(--text-muted)', whiteSpace:'nowrap', fontSize:12 }}>{fmt(p.reviewedAt||p.createdAt)}</td>
                                                <td style={{ padding:'13px 16px' }}>
                                                    <div style={{ fontWeight:600, color:'var(--text-main)' }}>{p.userName||'—'}</div>
                                                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{p.userEmail||''}</div>
                                                </td>
                                                <td style={{ padding:'13px 16px' }}><PlanBadge plan={p.plan||'free_trial'} /></td>
                                                <td style={{ padding:'13px 16px' }}>
                                                    <span style={{ fontWeight:700, color:'#EF4444', textDecoration:'line-through', fontSize:14 }}>₹{p.amount}</span>
                                                </td>
                                                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontSize:11, color:'var(--text-muted)' }}>
                                                    {(p.razorpay_payment_id||p.utr||'—').slice(0,18)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background:'var(--bg-input)', borderTop:'2px solid var(--border-color)' }}>
                                            <td colSpan={4} style={{ padding:'12px 16px', fontWeight:700, color:'var(--text-main)', fontSize:13 }}>Total Refunded</td>
                                            <td style={{ padding:'12px 16px', fontWeight:800, color:'#EF4444', fontSize:15 }}>₹{totalRefunded}</td>
                                            <td/>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ================================================================
                SUPPORT TICKETS TAB — leave as-is
            ================================================================ */}
            {tab === 'support' && (
                <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <div>
                            <div style={{ fontWeight:800, fontSize:16, color:'#1e1b4b' }}>Support Tickets</div>
                            <div style={{ fontSize:13, color:'#64748b' }}>Messages from users via Contact Support page</div>
                        </div>
                        <button onClick={loadTickets} style={{ padding:'8px 16px', background:'#f1f5f9', border:'1.5px solid #e2e8f0', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>Refresh</button>
                    </div>

                    {tickets.length > 0 && (
                        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
                            {[['high','High','#fef2f2','#dc2626'],['medium','Medium','#fffbeb','#b45309'],['low','Low','#f0fdf4','#15803d']].map(([p,l,bg,c]) => (
                                <div key={p} style={{ padding:'6px 16px', background:bg, borderRadius:20, fontSize:12, fontWeight:700, color:c }}>
                                    {l}: {tickets.filter(t=>t.priority===p&&t.status!=='closed').length} open
                                </div>
                            ))}
                        </div>
                    )}

                    {tickets.length === 0 ? (
                        <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1.5px solid var(--border-color)', padding:60, textAlign:'center' }}>
                            <div style={{ fontSize:48, marginBottom:12 }}>🎧</div>
                            <div style={{ fontWeight:700, color:'#1e1b4b', fontSize:16 }}>No support tickets yet</div>
                            <div style={{ fontSize:13, color:'#94a3b8', marginTop:6 }}>Tickets from users will appear here</div>
                        </div>
                    ) : [...tickets].sort((a,b) => {
                        const p = {high:0,medium:1,low:2};
                        return (p[a.priority]??1) - (p[b.priority]??1);
                    }).map(t => {
                        const prioColor = t.priority==='high'?'#ef4444':t.priority==='medium'?'#f59e0b':'#22c55e';
                        const prioBg    = t.priority==='high'?'#fef2f2':t.priority==='medium'?'#fffbeb':'#f0fdf4';
                        return (
                        <div key={t._id} style={{ background:'var(--bg-card)', borderRadius:16, border:`1.5px solid ${t.status==='open'?(isDark?'rgba(59,130,246,0.3)':'#bfdbfe'):t.status==='replied'?(isDark?'rgba(16,185,129,0.3)':'#bbf7d0'):'var(--border-color)'}`, padding:22, marginBottom:12, borderLeft:`4px solid ${prioColor}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                                <div style={{ flex:1 }}>
                                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:6 }}>
                                        <span style={{ fontWeight:800, fontSize:15, color:'#1e1b4b' }}>{t.subject}</span>
                                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:prioBg, color:prioColor }}>
                                            {t.priority==='high'?'High':t.priority==='medium'?'Medium':'Low'}
                                        </span>
                                        <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                                            background: t.status==='open'?'#eff6ff':t.status==='replied'?'#f0fdf4':'#f1f5f9',
                                            color: t.status==='open'?'#1d4ed8':t.status==='replied'?'#15803d':'#64748b' }}>
                                            {t.status==='open'?'Open':t.status==='replied'?'Replied':'Closed'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize:13, color:'#64748b', marginBottom:4 }}>
                                        <strong>{t.name}</strong> · <a href={`mailto:${t.email}`} style={{ color:'#7c3aed' }}>{t.email}</a> · {new Date(t.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                                    </div>
                                    <div style={{ fontSize:13, color:'#374151', background:'#f8fafc', borderRadius:8, padding:'10px 14px', marginTop:8, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{t.message}</div>

                                    {t.adminReply && (
                                        <div style={{ marginTop:10, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 14px' }}>
                                            <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', marginBottom:4 }}>YOUR REPLY</div>
                                            <div style={{ fontSize:13, color:'#15803d', lineHeight:1.7 }}>{t.adminReply}</div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                    <select value={t.status} onChange={e=>updateTicket(t._id,{status:e.target.value})}
                                        style={{ padding:'5px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:'var(--bg-card)', color:'var(--text-main)', border:'1.5px solid var(--border-color)' }}>
                                        <option value="open">Open</option>
                                        <option value="replied">Replied</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                    <a href={`mailto:${t.email}?subject=Re: ${encodeURIComponent(t.subject)}`}
                                        style={{ padding:'5px 12px', background:'#7c3aed', color:'#fff', borderRadius:8, fontSize:12, fontWeight:700, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                                        Reply
                                    </a>
                                    <button onClick={()=>deleteTicket(t._id)} style={{ padding:'5px 10px', background:'#fef2f2', border:'1px solid #fecdd3', borderRadius:8, color:'#dc2626', fontSize:12, cursor:'pointer' }}>Delete</button>
                                </div>
                            </div>
                        </div>
                    );})}
                </div>
            )}

            {/* ================================================================
                INTEGRATIONS TAB
            ================================================================ */}
            {tab === 'integrations' && (
                <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
                            Configure backend notification services. These are platform-level settings — users receive alerts automatically.
                        </p>
                        <button onClick={async()=>{
                            try {
                                const r = await adminClearCache();
                                showToast(`Cache cleared — ${r.data.cleared} entries removed`);
                            } catch { showToast('Cache clear failed'); }
                        }} style={{ padding:'8px 18px', background:'#fef3c7', border:'1.5px solid #fde68a', borderRadius:9, fontSize:13, fontWeight:700, color:'#d97706', cursor:'pointer', whiteSpace:'nowrap' }}>
                            Clear SSL/Domain Cache
                        </button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                        <div className="ap-card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:44, height:44, borderRadius:12, background:'#fef2f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:15, color:'#1e1b4b' }}>Email — SMTP</div>
                                    <div style={{ fontSize:12, color:'#64748b' }}>Gmail/SMTP for sending alert emails</div>
                                </div>
                            </div>
                            <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#475569' }}>
                                <div>From: <strong>{process.env.MAIL_USER || 'Not set'}</strong></div>
                                <div style={{ marginTop:4 }}>Status: SMTP credentials configured in server .env</div>
                            </div>
                            <a href="/email" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content' }}>
                                Configure Email
                            </a>
                        </div>

                        <div className="ap-card" style={{ display:'flex', flexDirection:'column', gap:16 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                                <div style={{ width:44, height:44, borderRadius:12, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontWeight:800, fontSize:15, color:'#1e1b4b' }}>WhatsApp Alerts</div>
                                    <div style={{ fontSize:12, color:'#64748b' }}>Green API / Twilio / AiSensy</div>
                                </div>
                            </div>
                            <div style={{ background:'#f8fafc', borderRadius:10, padding:'12px 14px', fontSize:13, color:'#475569' }}>
                                <div>Provider: <strong>Green API / Twilio / AiSensy</strong></div>
                                <div style={{ marginTop:4 }}>Configure credentials to enable WhatsApp alerts for users</div>
                            </div>
                            <a href="/whatsapp" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content' }}>
                                Configure WhatsApp
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog />

            {/* Assign Plan Modal */}
            {/* ── User Detail Modal ── */}
            {detailUser && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:600, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                    onClick={() => setDetailUser(null)}>
                    <div style={{ background: T.card, borderRadius:18, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.4)', border:`1px solid ${T.border}` }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                                <Avatar name={detailUser.name} size={48} />
                                <div>
                                    <div style={{ fontWeight:800, fontSize:17, color:T.text }}>{detailUser.name}</div>
                                    <div style={{ fontSize:12, color:T.sub }}>{detailUser.email}</div>
                                    <div style={{ fontSize:11, fontFamily:'monospace', color:T.primary, marginTop:2 }}>{detailUser.accountId}</div>
                                </div>
                            </div>
                            <button onClick={() => setDetailUser(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:T.muted }}>✕</button>
                        </div>
                        {/* Details grid */}
                        <div style={{ padding:'20px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                            {[
                                { label:'Plan', value: <PlanBadge plan={detailUser.plan} /> },
                                { label:'Status', value: <StatusBadge u={detailUser} /> },
                                { label:'Phone', value: detailUser.phone || '—' },
                                { label:'Country', value: detailUser.country || '—' },
                                { label:'City', value: detailUser.city || '—' },
                                { label:'State', value: detailUser.state || '—' },
                                { label:'Gender', value: detailUser.gender ? detailUser.gender.charAt(0).toUpperCase() + detailUser.gender.slice(1) : '—' },
                                { label:'Account Purpose', value: detailUser.purpose || '—' },
                                { label:'Sites Used', value: `${detailUser.serverCount || 0} / ${detailUser.siteLimit || 2}` },
                                { label:'Billing', value: detailUser.billing === 'annually' ? '📆 Annual' : '📅 Monthly' },
                                { label:'Trial Ends', value: fmt(detailUser.trialEndsAt) },
                                { label:'Plan Ends', value: fmt(detailUser.planEndsAt) },
                                { label:'Registered', value: fmt(detailUser.createdAt) },
                                { label:'Google User', value: detailUser.isGoogleUser ? '✅ Yes' : '❌ No' },
                                { label:'Blocked', value: detailUser.isBlocked ? '🚫 Yes' : '✅ No' },
                                { label:'Referral Code', value: detailUser.accountId ? `UF-REF-${detailUser.accountId}` : '—' },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ background: T.headerBg, borderRadius:10, padding:'12px 14px' }}>
                                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{label}</div>
                                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{value}</div>
                                </div>
                            ))}
                        </div>
                        {/* Actions */}
                        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10, flexWrap:'wrap' }}>
                            <button style={{ ...btnPrimary, fontSize:12 }} onClick={() => { setDetailUser(null); setAssignModal({ user: detailUser }); setAssignForm({ plan:'bronze', billing:'monthly', planDuration:'1m', duration:'1m' }); }}>Assign Plan</button>
                            <button style={{ ...btnSecondary, fontSize:12 }} onClick={() => { setDetailUser(null); startEdit(detailUser); }}>Edit User</button>
                            <button style={{ ...btnSecondary, fontSize:12, color:T.danger, borderColor:'rgba(239,68,68,0.2)' }} onClick={() => setDetailUser(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit User Modal ── */}
            {editModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                    onClick={() => setEditModal(null)}>
                    <div style={{ background: T.card, borderRadius:16, width:'100%', maxWidth:460, boxShadow:'0 20px 60px rgba(0,0,0,0.3)', border:`1px solid ${T.border}` }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ padding:'20px 24px 16px', borderBottom:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <div>
                                <div style={{ fontSize:16, fontWeight:800, color:T.text }}>Edit User</div>
                                <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{editModal.name} · {editModal.email}</div>
                            </div>
                            <button onClick={() => setEditModal(null)} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:T.muted }}>✕</button>
                        </div>
                        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:T.sub, display:'block', marginBottom:6 }}>Plan</label>
                                <select value={editForm.plan} onChange={e => setEditForm({ ...editForm, plan: e.target.value })} style={inputSt}>
                                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize:12, fontWeight:700, color:T.sub, display:'block', marginBottom:6 }}>Plan Ends At</label>
                                <input type="date" style={inputSt} value={editForm.planEndsAt} onChange={e => setEditForm({ ...editForm, planEndsAt: e.target.value })} />
                            </div>
                            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:600, color:T.text }}>
                                <input type="checkbox" checked={editForm.isBlocked} onChange={e => setEditForm({ ...editForm, isBlocked: e.target.checked })} />
                                Block this account
                            </label>
                        </div>
                        <div style={{ padding:'16px 24px', borderTop:`1px solid ${T.border}`, display:'flex', gap:10 }}>
                            <button style={{ ...btnPrimary, flex:1 }} onClick={async () => { await saveEdit(); setEditModal(null); }}>Save Changes</button>
                            <button style={btnSecondary} onClick={() => setEditModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {assignModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(17,24,39,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:500 }}
                    onClick={() => setAssignModal(null)}>
                    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-color)', borderRadius:12, width:'100%', maxWidth:480, boxShadow:'var(--card-hover-shadow)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'20px 24px 16px', borderBottom:`1px solid ${T.border}` }}>
                            <div>
                                <div style={{ fontSize:16, fontWeight:700, color:T.text }}>Assign Plan</div>
                                <div style={{ fontSize:12, color:T.sub, marginTop:2 }}>{assignModal.user.name} · {assignModal.user.email}</div>
                            </div>
                            <button onClick={() => setAssignModal(null)} style={{ width:30, height:30, borderRadius:'50%', border:'none', background:'#F3F4F6', color:T.sub, fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                        </div>
                        <div style={{ padding:'20px 24px 24px' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>SELECT PLAN</div>
                            <div style={{ display:'flex', gap:10, marginBottom:20 }}>
                                {['bronze','silver','gold'].map(p => (
                                    <button key={p} onClick={() => setAssignForm(f => ({ ...f, plan: p }))} style={{ flex:1, padding:'10px', border:`2px solid ${assignForm.plan===p?PLAN_COLORS[p]:T.border}`, borderRadius:8, background:assignForm.plan===p?PLAN_COLORS[p]:'transparent', color:assignForm.plan===p?'#fff':PLAN_COLORS[p], fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                                        {PLAN_LABEL[p]}
                                    </button>
                                ))}
                            </div>
                            <div style={{ fontSize:11, fontWeight:700, color:T.sub, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>DURATION</div>
                            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
                                {[{val:'1m',label:'1 Month'},{val:'3m',label:'3 Months'},{val:'6m',label:'6 Months'},{val:'1y',label:'1 Year'},{val:'custom',label:'Custom Date'}].map(d => (
                                    <button key={d.val} onClick={() => setAssignForm(f => ({ ...f, duration: d.val, planDuration: d.val === 'custom' ? f.planDuration : d.val, billing: d.val === '1y' ? 'annually' : 'monthly' }))} style={{ padding:'7px 14px', border:`1px solid ${assignForm.duration===d.val?T.primary:T.border}`, borderRadius:9999, fontSize:12, fontWeight:600, background:assignForm.duration===d.val?T.primary:'transparent', color:assignForm.duration===d.val?'#fff':T.sub, cursor:'pointer', fontFamily:'inherit' }}>
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                            {assignForm.duration === 'custom' && (
                                <input type="date" style={{ ...inputSt, marginBottom:16 }} value={assignForm.customDate} onChange={e => setAssignForm(f => ({ ...f, customDate: e.target.value }))} />
                            )}
                            <div style={{ marginBottom:16 }}>
                                <div style={{ fontSize:12, fontWeight:700, color:T.sub, marginBottom:8 }}>BILLING TYPE</div>
                                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                                    {[['monthly','📅 Monthly','#3b82f6','#eff6ff','#1d4ed8'],['3m','📅 3 Months','#8b5cf6','#f3f0ff','#6d28d9'],['6m','📅 6 Months','#10b981','#f0fdf4','#065f46'],['annually','📆 Annual','#f59e0b','#fef3c7','#b45309']].map(([val,label,border,bg,color]) => (
                                        <button key={val} onClick={() => setAssignForm(f => ({ ...f, billing:val==='annually'?'annually':'monthly', planDuration:val==='annually'?'1y':val==='monthly'?'1m':val, duration:val==='annually'?'1y':val==='monthly'?'1m':val }))}
                                            style={{ flex:1, minWidth:80, padding:'9px 0', border:`2px solid ${assignForm.billing===(val==='annually'?'annually':'monthly')&&assignForm.planDuration===(val==='annually'?'1y':val)?border:T.border}`, borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer',
                                                background:assignForm.billing===(val==='annually'?'annually':'monthly')&&assignForm.planDuration===(val==='annually'?'1y':val)?(isDark?'rgba(255,255,255,0.03)':bg):'transparent',
                                                color:assignForm.billing===(val==='annually'?'annually':'monthly')&&assignForm.planDuration===(val==='annually'?'1y':val)?color:T.sub }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ background:'#F9FAFB', border:`1px solid ${T.border}`, borderRadius:8, padding:'12px 16px', fontSize:13, color:T.sub, marginBottom:20 }}>
                                Plan: <strong style={{ color:PLAN_COLORS[assignForm.plan] }}>{PLAN_LABEL[assignForm.plan]}</strong> &nbsp;·&nbsp;
                                Billing: <strong style={{ color:assignForm.billing==='annually'?'#b45309':'#1d4ed8' }}>{assignForm.billing==='annually'?'Annual':assignForm.planDuration==='3m'?'3 Months':assignForm.planDuration==='6m'?'6 Months':'Monthly'}</strong> &nbsp;·&nbsp;
                                Expires: <strong style={{ color:T.text }}>{calcEndsAt()||'—'}</strong>
                            </div>
                            <div style={{ display:'flex', gap:10 }}>
                                <button style={{ ...btnPrimary, flex:1 }} onClick={saveAssign}>Assign Plan</button>
                                <button style={btnSecondary} onClick={() => setAssignModal(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── User Plan History Modal ── */}
            {userHistoryModal && (
                <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', zIndex:700, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
                    onClick={() => setUserHistoryModal(null)}>
                    <div style={{ background: T.card, borderRadius:16, boxShadow:'0 20px 60px rgba(0,0,0,0.4)', width:'100%', maxWidth:820, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div style={{ padding:'20px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div>
                                <div style={{ fontWeight:800, fontSize:16 }}>📋 Plan History — {userHistoryModal.user?.name}</div>
                                <div style={{ fontSize:12, color:T.muted, marginTop:3 }}>{userHistoryModal.user?.email}</div>
                            </div>
                            <button onClick={() => setUserHistoryModal(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:T.muted, lineHeight:1 }}>✕</button>
                        </div>
                        {/* Current Plan Summary */}
                        {userHistoryModal.user && (
                            <div style={{ padding:'12px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', gap:24, flexWrap:'wrap', background: isDark ? '#1a1a2e' : '#F8FAFC' }}>
                                <div style={{ fontSize:12 }}>
                                    <span style={{ color:T.muted }}>Current Plan: </span>
                                    <strong style={{ color: ({ bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04', free_trial:'#6366f1' })[userHistoryModal.user.plan] || T.text }}>
                                        {PLAN_LABEL[userHistoryModal.user.plan] || userHistoryModal.user.plan}
                                    </strong>
                                </div>
                                {userHistoryModal.user.planEndsAt && (
                                    <div style={{ fontSize:12 }}>
                                        <span style={{ color:T.muted }}>Expires: </span>
                                        <strong style={{ color: new Date(userHistoryModal.user.planEndsAt) < new Date() ? T.danger : T.success }}>
                                            {new Date(userHistoryModal.user.planEndsAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </strong>
                                    </div>
                                )}
                                {userHistoryModal.user.trialEndsAt && userHistoryModal.user.plan === 'free_trial' && (
                                    <div style={{ fontSize:12 }}>
                                        <span style={{ color:T.muted }}>Trial Ends: </span>
                                        <strong>{new Date(userHistoryModal.user.trialEndsAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</strong>
                                    </div>
                                )}
                                <div style={{ fontSize:12 }}>
                                    <span style={{ color:T.muted }}>Verified: </span>
                                    <strong style={{ color: userHistoryModal.user.trialVerified ? T.success : T.danger }}>
                                        {userHistoryModal.user.trialVerified ? '✓ Yes' : '✗ No'}
                                    </strong>
                                </div>
                            </div>
                        )}
                        {/* Records Table */}
                        <div style={{ overflowY:'auto', flex:1 }}>
                            {userHistoryLoading ? (
                                <div style={{ padding:40, textAlign:'center', color:T.muted }}>Loading history...</div>
                            ) : userHistoryModal.records.length === 0 ? (
                                <div style={{ padding:'40px 20px', textAlign:'center', color:T.muted }}>
                                    <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                                    <div style={{ fontWeight:600 }}>No payment history</div>
                                    <div style={{ fontSize:13, marginTop:4 }}>This user hasn't made any purchases yet</div>
                                </div>
                            ) : (
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                    <thead>
                                        <tr style={{ background: T.headerBg, position:'sticky', top:0, zIndex:1 }}>
                                            {['#', 'Plan', 'Billing', 'Amount', 'Type', 'Payment ID', 'Purchase Date', 'Expires On'].map(h => (
                                                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.5px', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userHistoryModal.records.map((r, idx) => {
                                            const PLAN_COLOR = { bronze:'#b45309', silver:'#7c3aed', gold:'#ca8a04', free_trial:'#6366f1' };
                                            const planLabel = r.type === 'verification' ? 'Free Trial' : ({ bronze:'Bronze', silver:'Silver', gold:'Gold' }[r.plan] || r.plan || '—');
                                            const planColor = PLAN_COLOR[r.plan] || PLAN_COLOR.free_trial;
                                            const isExpired = r.planEndsAt && new Date(r.planEndsAt) < new Date();
                                            return (
                                                <tr key={r._id} style={{ borderBottom:`1px solid ${T.border}`, transition:'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    <td style={{ padding:'10px 14px', color:T.muted, fontSize:11, fontWeight:700 }}>#{userHistoryModal.records.length - idx}</td>
                                                    <td style={{ padding:'10px 14px' }}>
                                                        <span style={{ ...pill(planColor + '20', planColor), fontWeight:700 }}>{planLabel}</span>
                                                    </td>
                                                    <td style={{ padding:'10px 14px', color:T.sub }}>
                                                        {r.billing ? (r.billing === 'annually' ? '🗓 Annual' : '📅 Monthly') : '—'}
                                                    </td>
                                                    <td style={{ padding:'10px 14px', fontWeight:700, color: r.amount > 0 ? '#16a34a' : T.muted }}>
                                                        {r.amount > 0 ? `₹${r.amount}` : '₹0 (Admin)'}
                                                    </td>
                                                    <td style={{ padding:'10px 14px' }}>
                                                        {(() => {
                                                            const utr = r.utr || '';
                                                            if (utr.startsWith('admin_trial_ext')) return <span style={{ ...pill('#FEF3C7','#B45309'), fontSize:11 }}>🔧 Admin +Trial</span>;
                                                            if (utr.startsWith('admin_plan')) return <span style={{ ...pill('#F0FDF4','#166534'), fontSize:11 }}>🔧 Admin Assign</span>;
                                                            if (r.type === 'verification') return <span style={{ ...pill('#EFF6FF','#1D4ED8'), fontSize:11 }}>Trial Activation</span>;
                                                            return <span style={{ ...pill('#F0FDF4','#166534'), fontSize:11 }}>Plan Purchase</span>;
                                                        })()}
                                                    </td>
                                                    <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:10, color:T.muted, maxWidth:130, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={r.razorpay_payment_id || r.utr || ''}>
                                                        {r.razorpay_payment_id || (r.utr?.startsWith('admin_') ? '(admin action)' : r.utr) || '—'}
                                                    </td>
                                                    <td style={{ padding:'10px 14px', color:T.sub, fontSize:11, whiteSpace:'nowrap' }}>
                                                        {(r.startDate || r.createdAt) ? new Date(r.startDate || r.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                                                    </td>
                                                    <td style={{ padding:'10px 14px', fontSize:11, whiteSpace:'nowrap' }}>
                                                        {r.planEndsAt ? (
                                                            <span style={{ color: isExpired ? T.danger : T.success, fontWeight:600 }}>
                                                                {new Date(r.planEndsAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                                                <div style={{ fontSize:10, opacity:0.8 }}>{isExpired ? '✕ Expired' : '✓ Active'}</div>
                                                            </span>
                                                        ) : <span style={{ color:T.muted }}>—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {/* Footer */}
                        <div style={{ padding:'14px 24px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontSize:12, color:T.muted }}>{userHistoryModal.records.length} record{userHistoryModal.records.length !== 1 ? 's' : ''} found</span>
                            <button onClick={() => setUserHistoryModal(null)} style={{ padding:'7px 20px', background:T.primary, color:'#fff', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:13 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            </div>
        </div>
    );
}
