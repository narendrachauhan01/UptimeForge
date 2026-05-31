import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { adminGetUsers, adminUpdateUser, adminDeleteUser, adminGetSettings, adminUpdateSettings, adminGetPayments, adminDeletePayment, adminApprovePayment, adminRejectPayment, adminRefundPayment, adminRefundStatus, getAdminProfile, updateAdminProfile, adminClearCache, API_URL } from '../api';

const PLAN_OPTIONS = ['free_trial', 'bronze', 'silver', 'gold'];
const PLAN_COLORS  = { free_trial: '#64748b', bronze: '#b45309', silver: '#475569', gold: '#ca8a04' };
const PLAN_BG     = { free_trial: '#f1f5f9', bronze: '#fef3c7', silver: '#f8fafc', gold: '#fefce8' };
const PLAN_LABEL  = { free_trial: 'Free Trial', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

// ── Design tokens (TailAdmin palette) ────────────────────────────────────────
const T = {
    primary:  '#4F46E5',
    success:  '#10B981',
    danger:   '#EF4444',
    warning:  '#F59E0B',
    info:     '#3B82F6',
    border:   '#E5E7EB',
    pageBg:   '#F1F5F9',
    card:     '#ffffff',
    headerBg: '#F9FAFB',
    text:     '#111827',
    sub:      '#6B7280',
    muted:    '#9CA3AF',
    rowHover: '#F9FAFB',
};

// ── Reusable style helpers ────────────────────────────────────────────────────
const cardStyle = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const pill = (bg, color) => ({
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 10px', borderRadius: 9999,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    background: bg, color,
    whiteSpace: 'nowrap',
});

const inputSt = {
    width: '100%', padding: '9px 12px',
    border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff',
    color: T.text, fontFamily: 'inherit',
    boxSizing: 'border-box',
};

const btnPrimary = {
    padding: '9px 18px', background: T.primary, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
};
const btnDanger = {
    padding: '9px 18px', background: T.danger, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
};
const btnSuccess = {
    padding: '9px 18px', background: T.success, color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
};
const btnSecondary = {
    padding: '9px 18px', background: '#fff',
    border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    color: T.sub,
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
function MetricCard({ label, value, color, icon, sub }) {
    return (
        <div style={{
            ...cardStyle,
            borderLeft: `4px solid ${color}`,
            padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: T.sub, fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>}
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
    fontSize: 11, fontWeight: 700, color: T.sub,
    textTransform: 'uppercase', letterSpacing: 0.6,
    background: T.headerBg, borderBottom: `1px solid ${T.border}`,
    whiteSpace: 'nowrap',
};

// ── Table TD ─────────────────────────────────────────────────────────────────
const tdStyle = {
    padding: '13px 16px', fontSize: 13, color: T.text,
    borderBottom: `1px solid #F3F4F6`, verticalAlign: 'middle',
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
export default function AdminPanel({ initialTab = 'overview' }) {
    const location = useLocation();
    const urlTab = new URLSearchParams(location.search).get('tab');
    const [tab, setTab] = useState(urlTab || initialTab);
    const [users, setUsers]         = useState([]);
    const [loading, setLoading]     = useState(true);
    const [editId, setEditId]       = useState(null);
    const [editForm, setEditForm]   = useState({});
    const [search, setSearch]       = useState('');
    const [planFilter, setPlanFilter] = useState('all');
    const [toast, setToast]         = useState('');
    const [settingsForm, setSettingsForm] = useState(null);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [payments, setPayments]   = useState([]);
    const [paySearch, setPaySearch] = useState('');
    const [payStatusFilter, setPayStatusFilter] = useState('all');
    const [assignModal, setAssignModal] = useState(null);
    const [assignForm, setAssignForm]   = useState({ plan: 'bronze', duration: '1m', customDate: '' });
    const [profileForm, setProfileForm] = useState({ username: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });
    const [refundStatuses, setRefundStatuses] = useState({});

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
        setEditId(u._id);
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

    const extendTrial = async (id) => {
        try { await adminUpdateUser(id, { extendTrial: true }); showToast('Trial extended by 5 days'); load(); }
        catch (e) { showToast('Failed'); }
    };

    const toggleBlock = async (u) => {
        try { await adminUpdateUser(u._id, { isBlocked: !u.isBlocked }); showToast(u.isBlocked ? 'User unblocked' : 'User blocked'); load(); }
        catch (e) { showToast('Failed'); }
    };

    const deleteUser = async (u) => {
        if (!window.confirm(`Delete "${u.name}" (${u.email}) and all their sites?`)) return;
        try { await adminDeleteUser(u._id); showToast('User deleted'); load(); }
        catch (e) { showToast('Delete failed'); }
    };

    const filtered = users.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
        const matchPlan = planFilter === 'all' || u.plan === planFilter;
        return matchSearch && matchPlan;
    });

    // Stats for overview
    const totalSites   = users.reduce((a, u) => a + (u.serverCount || 0), 0);
    const activeUsers  = users.filter(u => u.isActive && !u.isBlocked).length;
    const blockedUsers = users.filter(u => u.isBlocked).length;
    const paidUsers    = users.filter(u => u.plan !== 'free_trial').length;

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
        if (!window.confirm('Reject this payment request?')) return;
        try { await adminRejectPayment(id); showToast('Payment rejected'); loadPayments(); }
        catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Failed')); }
    };
    const refundPayment = async (id) => {
        if (!window.confirm('Refund this payment on Razorpay? User plan will be cancelled.')) return;
        try { await adminRefundPayment(id); showToast('Refund initiated — plan cancelled'); loadPayments(); load(); }
        catch (e) { showToast(e.response?.data?.error || 'Reject failed'); }
    };

    const openAssign = (u) => {
        setAssignModal({ user: u });
        setAssignForm({ plan: u.plan === 'free_trial' ? 'bronze' : u.plan, duration: '1m', customDate: '' });
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
            await adminUpdateUser(assignModal.user._id, { plan: assignForm.plan, planEndsAt: endsAt, isBlocked: false });
            showToast(`${PLAN_LABEL[assignForm.plan]} assigned to ${assignModal.user.name}`);
            setAssignModal(null);
            load();
        } catch (e) { showToast(e.response?.data?.error || 'Failed to assign plan'); }
    };

    const deletePayment = async (id) => {
        if (!window.confirm('Delete this payment record permanently?')) return;
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
        if (!window.confirm('Delete this ticket?')) return;
        await axios.delete(`${API_URL}/api/admin/support-tickets/${id}`, { withCredentials: true });
        loadTickets();
    };

    const TABS = [
        { id: 'overview',     label: 'Overview' },
        { id: 'users',        label: `Users (${users.length})` },
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

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="pg-wrap" style={{ background: T.pageBg, minHeight: '100vh' }}>

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
                        <button
                            onClick={() => { load(); loadPayments(); }}
                            style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Refresh
                        </button>
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
                                background: tab === t.id ? T.primary : '#fff',
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 16 }}>
                        <MetricCard label="Total Users"  value={users.length}  color={T.primary}  icon="👥" />
                        <MetricCard label="Active"       value={activeUsers}    color={T.success}  icon="✅" />
                        <MetricCard label="Paid Users"   value={paidUsers}      color={T.warning}  icon="💳" />
                        <MetricCard label="Total Sites"  value={totalSites}     color={T.info}     icon="🌐" />
                        <MetricCard label="Free Trial"   value={users.filter(u => u.plan === 'free_trial').length} color="#64748B" icon="⏳" />
                        <MetricCard label="Blocked"      value={blockedUsers}   color={T.danger}   icon="🚫" />
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
                                            <button style={btnSuccess} onClick={() => approvePayment(pr._id)}>Approve</button>
                                            <button style={btnDanger}  onClick={() => rejectPayment(pr._id)}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Plans Expiring + Trials Expiring */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
                                        <button style={{ ...btnPrimary, padding: '5px 12px', fontSize: 11 }} onClick={() => extendTrial(u._id)}>+5 days</button>
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
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search */}
                        <div style={{
                            flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 10,
                            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8,
                            padding: '9px 12px',
                        }}>
                            <SearchIcon />
                            <input style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: T.text, flex: 1, fontFamily: 'inherit' }}
                                placeholder="Search name, email, phone..."
                                value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>}
                        </div>

                        {/* Plan filter pills */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {['all', ...PLAN_OPTIONS].map(p => (
                                <button key={p} onClick={() => setPlanFilter(p)} style={{
                                    padding: '7px 14px',
                                    border: `1px solid ${planFilter === p ? (p !== 'all' ? PLAN_COLORS[p] : T.primary) : T.border}`,
                                    borderRadius: 9999, fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                    background: planFilter === p ? (p !== 'all' ? PLAN_COLORS[p] : T.primary) : '#fff',
                                    color: planFilter === p ? '#fff' : T.sub,
                                }}>
                                    {p === 'all' ? 'All' : PLAN_LABEL[p]}
                                </button>
                            ))}
                        </div>

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
                        <div style={{ ...cardStyle, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr>
                                            {['User', 'Plan', 'Sites', 'Status', 'Expiry', 'Actions'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(u => (
                                            <React.Fragment key={u._id}>
                                                <tr
                                                    style={{ borderBottom: `1px solid #F3F4F6`, cursor: 'pointer', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                                                    onMouseLeave={e => e.currentTarget.style.background = u.isBlocked ? '#FFF5F5' : '#fff'}
                                                    onClick={() => setExpandedId(expandedId === u._id ? null : u._id)}
                                                >
                                                    {/* User cell */}
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent' }}>
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
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent' }}>
                                                        <PlanBadge plan={u.plan} />
                                                    </td>
                                                    {/* Sites */}
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent', fontWeight: 700 }}>
                                                        {u.serverCount || 0}
                                                    </td>
                                                    {/* Status */}
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent' }}>
                                                        <StatusBadge u={u} />
                                                    </td>
                                                    {/* Expiry */}
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent', fontSize: 12, color: T.sub }}>
                                                        {u.plan !== 'free_trial' && u.planEndsAt ? fmt(u.planEndsAt) : u.trialEndsAt ? fmt(u.trialEndsAt) : '—'}
                                                    </td>
                                                    {/* Actions */}
                                                    <td style={{ ...tdStyle, background: u.isBlocked ? '#FFF5F5' : 'transparent' }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            <button title="Assign Plan" onClick={() => openAssign(u)} style={{ ...btnPrimary, padding: '5px 10px', fontSize: 11 }}>Plan</button>
                                                            <button title="Edit" onClick={() => startEdit(u)} style={{ ...btnSecondary, padding: '5px 10px', fontSize: 11 }}>Edit</button>
                                                            <button title="Extend Trial" onClick={() => extendTrial(u._id)} style={{ padding: '5px 10px', fontSize: 11, background: '#EFF6FF', color: T.info, border: `1px solid #BFDBFE`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>+Trial</button>
                                                            <button title={u.isBlocked ? 'Unblock' : 'Block'} onClick={() => toggleBlock(u)}
                                                                style={{ padding: '5px 10px', fontSize: 11, borderRadius: 8, cursor: 'pointer', fontWeight: 600, border: `1px solid ${u.isBlocked ? '#BBF7D0' : '#FECDD3'}`, background: u.isBlocked ? '#F0FDF4' : '#FFF1F2', color: u.isBlocked ? T.success : T.danger }}>
                                                                {u.isBlocked ? 'Unblock' : 'Block'}
                                                            </button>
                                                            <button title="Delete" onClick={() => deleteUser(u)} style={{ padding: '5px 10px', fontSize: 11, background: '#FEF2F2', color: T.danger, border: `1px solid #FECDD3`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Del</button>
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
                                                {editId === u._id && (
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
                                background: payStatusFilter === s.key ? s.activeBg : '#fff',
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
                            background: '#fff', border: `1px solid ${T.border}`, borderRadius: 8,
                            padding: '9px 12px',
                        }}>
                            <SearchIcon />
                            <input style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: T.text, flex: 1, fontFamily: 'inherit' }}
                                placeholder="Search by ID, name or email..."
                                value={paySearch} onChange={e => setPaySearch(e.target.value)} />
                            {paySearch && <button onClick={() => setPaySearch('')} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>}
                        </div>
                    </div>

                    {/* Payment Cards */}
                    {filteredPayments.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: T.muted, fontSize: 14 }}>
                            {paySearch || payStatusFilter !== 'all' ? 'No payments match your filter.' : 'No payments yet.'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filteredPayments.map(pr => {
                                const isPending = !pr.status || pr.status === 'pending';
                                const planColor = { bronze:'#B45309', silver:'#475569', gold:'#CA8A04' }[pr.plan] || '#64748B';
                                return (
                                    <div key={pr._id} style={{
                                        ...cardStyle,
                                        padding: '18px 20px',
                                        borderLeft: isPending ? `4px solid ${T.warning}` : `4px solid ${T.border}`,
                                    }}>
                                        {/* Top row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                                <Avatar name={pr.userName} size={40} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{pr.userName}</div>
                                                    <div style={{ fontSize: 12, color: T.sub }}>{pr.userEmail}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
                                                {pr.type === 'verification' ? (
                                                    <span style={pill('#FEF3C7','#92400E')}>₹{pr.amount} Verification</span>
                                                ) : (
                                                    <span style={pill(`${planColor}20`, planColor)}>
                                                        {pr.plan?.charAt(0).toUpperCase() + pr.plan?.slice(1)}
                                                    </span>
                                                )}
                                                <strong style={{ fontSize: 20, color: T.text }}>₹{pr.amount}</strong>
                                                <PayStatusBadge status={pr.status} />
                                            </div>
                                        </div>

                                        {/* UTR + date */}
                                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                            <div style={{ fontSize: 12, color: T.sub }}>
                                                Razorpay ID: <span style={{ fontFamily: 'monospace', color: T.text, fontWeight: 600 }}>{pr.utr}</span>
                                            </div>
                                            <span style={{ fontSize: 12, color: T.muted }}>{fmt(pr.createdAt)}</span>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                                            {isPending && (
                                                <>
                                                    <button style={btnSuccess} onClick={() => approvePayment(pr._id)}>Approve</button>
                                                    <button style={btnDanger}  onClick={() => rejectPayment(pr._id)}>Reject</button>
                                                </>
                                            )}
                                            {pr.status === 'approved' && (
                                                <button onClick={() => refundPayment(pr._id)} style={{ ...btnSecondary, color: T.danger, borderColor: '#FECDD3' }}>
                                                    Refund
                                                </button>
                                            )}
                                            {pr.status === 'refunded' && (
                                                <span style={pill('#FEE2E2','#B91C1C')}>Refunded</span>
                                            )}
                                            <button onClick={() => deletePayment(pr._id)} style={{ ...btnSecondary, color: T.danger, borderColor: '#FECDD3', padding: '9px 12px' }}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
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
                                            style={{ background: isRefunded ? '#FFF5F5' : '#fff', transition: 'background 0.1s' }}
                                            onMouseEnter={e => !isRefunded && (e.currentTarget.style.background = T.rowHover)}
                                            onMouseLeave={e => (e.currentTarget.style.background = isRefunded ? '#FFF5F5' : '#fff')}
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
                            { label: 'Total Cancelled',   value: refundedPayments.length,  accent:'#EF4444', bg:'#FFF5F5' },
                            { label: 'Total Refunded',    value: `₹${totalRefunded}`,       accent:'#F59E0B', bg:'#FFFBEB' },
                            { label: 'Revenue Lost',      value: `₹${refundedPayments.filter(p=>p.type!=='verification').reduce((s,p)=>s+(p.amount||0),0)}`, accent:'#6B7280', bg:'#F9FAFB' },
                        ].map(c => (
                            <div key={c.label} style={{ background:'#fff', borderRadius:10, border:`1px solid #E5E7EB`, borderTop:`3px solid ${c.accent}`, padding:'20px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize:28, fontWeight:800, color:c.accent, lineHeight:1, marginBottom:6 }}>{c.value}</div>
                                <div style={{ fontSize:12, color:'#6B7280', fontWeight:600, textTransform:'uppercase', letterSpacing:0.6 }}>{c.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div style={{ background:'#fff', borderRadius:10, border:'1px solid #E5E7EB', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F3F4F6', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#FAFAFA' }}>
                            <div style={{ fontWeight:700, color:'#111827', fontSize:14 }}>Cancelled & Refunded Plans <span style={{ color:'#6B7280', fontWeight:500 }}>({refundedPayments.length})</span></div>
                            {refundedPayments.length > 0 && (
                                <span style={{ fontSize:12, fontWeight:700, color:'#EF4444', background:'#FFF5F5', border:'1px solid #FECDD3', padding:'3px 12px', borderRadius:20 }}>Total Lost: ₹{totalRefunded}</span>
                            )}
                        </div>

                        {refundedPayments.length === 0 ? (
                            <div style={{ padding:60, textAlign:'center' }}>
                                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                                <div style={{ fontWeight:700, fontSize:16, color:'#10B981' }}>No Cancelled Plans</div>
                                <div style={{ fontSize:13, color:'#9CA3AF', marginTop:6 }}>All plans are active</div>
                            </div>
                        ) : (
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                                    <thead>
                                        <tr style={{ background:'#F9FAFB', borderBottom:'1px solid #E5E7EB' }}>
                                            {['#','Date','User','Plan','Refunded','Payment ID'].map(h => (
                                                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {refundedPayments.map((p, i) => (
                                            <tr key={p._id} style={{ borderBottom:'1px solid #F3F4F6' }}
                                                onMouseEnter={e=>e.currentTarget.style.background='#FFF5F5'}
                                                onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                                                <td style={{ padding:'13px 16px', color:'#9CA3AF', fontSize:12 }}>{i+1}</td>
                                                <td style={{ padding:'13px 16px', color:'#6B7280', whiteSpace:'nowrap', fontSize:12 }}>{fmt(p.reviewedAt||p.createdAt)}</td>
                                                <td style={{ padding:'13px 16px' }}>
                                                    <div style={{ fontWeight:600, color:'#111827' }}>{p.userName||'—'}</div>
                                                    <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{p.userEmail||''}</div>
                                                </td>
                                                <td style={{ padding:'13px 16px' }}><PlanBadge plan={p.plan||'free_trial'} /></td>
                                                <td style={{ padding:'13px 16px' }}>
                                                    <span style={{ fontWeight:700, color:'#EF4444', textDecoration:'line-through', fontSize:14 }}>₹{p.amount}</span>
                                                </td>
                                                <td style={{ padding:'13px 16px', fontFamily:'monospace', fontSize:11, color:'#9CA3AF' }}>
                                                    {(p.razorpay_payment_id||p.utr||'—').slice(0,18)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background:'#F9FAFB', borderTop:'2px solid #E5E7EB' }}>
                                            <td colSpan={4} style={{ padding:'12px 16px', fontWeight:700, color:'#374151', fontSize:13 }}>Total Refunded</td>
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
                        <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #e2e8f0', padding:60, textAlign:'center' }}>
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
                        <div key={t._id} style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${t.status==='open'?'#bfdbfe':t.status==='replied'?'#bbf7d0':'#e2e8f0'}`, padding:22, marginBottom:12, borderLeft:`4px solid ${prioColor}` }}>
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
                                        style={{ padding:'5px 10px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', background:'#fff' }}>
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

            {/* ================================================================
                SETTINGS TAB — moved to /plan-settings
            ================================================================ */}
            {false && settingsForm && (
                <div>
                    <div className="ap-card">
                        <div className="ap-card-title">Trial Verification Fee</div>
                        <p className="ap-card-sub">One-time non-refundable fee charged during free trial activation.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: 18 }}>₹</span>
                            <input
                                type="number" min="1" max="99" className="ap-settings-input"
                                style={{ width: 100 }}
                                value={settingsForm.verificationFee ?? 2}
                                onChange={e => setSettingsForm({ ...settingsForm, verificationFee: Number(e.target.value) })}
                            />
                            <span style={{ color: '#64748b', fontWeight: 600 }}>one-time</span>
                        </div>
                    </div>

                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Free Trial Duration</div>
                        <p className="ap-card-sub">Applied to all new user registrations</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                            <input type="number" min="1" max="365" className="ap-settings-input" style={{ width: 100 }}
                                value={settingsForm.trialDays}
                                onChange={e => setSettingsForm({ ...settingsForm, trialDays: Number(e.target.value) })}
                            />
                            <span style={{ color: '#64748b', fontWeight: 600 }}>days</span>
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Check Interval (seconds)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input type="number" min="60" step="30" className="ap-settings-input" style={{ width: 120 }}
                                    value={settingsForm.freeTrialInterval}
                                    onChange={e => setSettingsForm({ ...settingsForm, freeTrialInterval: Number(e.target.value) })}
                                />
                                <span style={{ color: '#64748b', fontSize: 13 }}>
                                    = {Math.floor(settingsForm.freeTrialInterval / 60)} min {settingsForm.freeTrialInterval % 60 > 0 ? `${settingsForm.freeTrialInterval % 60} sec` : ''} per check
                                </span>
                            </div>
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Max Recipients</label>
                            <input type="number" min="1" className="ap-settings-input" style={{ width: 120 }}
                                value={settingsForm.freeTrialRecipientLimit}
                                onChange={e => setSettingsForm({ ...settingsForm, freeTrialRecipientLimit: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Free Trial — Feature List</div>
                        <p className="ap-card-sub">One feature per line.</p>
                        <textarea
                            className="ap-settings-input"
                            style={{ marginTop: 12, width: '100%', minHeight: 130, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }}
                            value={settingsForm.freeTrialFeatures}
                            onChange={e => setSettingsForm({ ...settingsForm, freeTrialFeatures: e.target.value })}
                        />
                    </div>

                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Plan Pricing & Site Limits</div>
                        <p className="ap-card-sub">Changes take effect immediately for new purchases</p>
                        <div className="ap-settings-plans">
                            {['bronze', 'silver', 'gold'].map(p => (
                                <div key={p} className="ap-settings-plan-card" style={{ borderTop: `4px solid ${PLAN_COLORS[p]}` }}>
                                    <div className="ap-settings-plan-name" style={{ color: PLAN_COLORS[p] }}>{PLAN_LABEL[p]}</div>
                                    <div className="form-group">
                                        <label>Price (₹/month)</label>
                                        <input type="number" min="0" className="ap-settings-input" value={settingsForm.plans[p].price} onChange={e => setPlanField(p, 'price', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Sites</label>
                                        <input type="number" min="1" className="ap-settings-input" value={settingsForm.plans[p].sites} onChange={e => setPlanField(p, 'sites', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Check Interval (seconds)</label>
                                        <input type="number" min="30" step="30" className="ap-settings-input" value={settingsForm.plans[p].interval} onChange={e => setPlanField(p, 'interval', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Recipients</label>
                                        <input type="number" min="1" className="ap-settings-input" value={settingsForm.plans[p].recipientLimit} onChange={e => setPlanField(p, 'recipientLimit', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label>Features (one per line)</label>
                                        <textarea className="ap-settings-input" style={{ minHeight: 130, fontFamily: 'monospace', fontSize:12, lineHeight: 1.6, resize: 'vertical' }}
                                            value={settingsForm.plans[p].features} onChange={e => setPlanField(p, 'features', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="btn-submit" onClick={saveSettings} disabled={settingsSaving} style={{ marginTop: 20 }}>
                        {settingsSaving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            )}

            {/* ================================================================
                PROFILE TAB
            ================================================================ */}
            {tab === 'profile' && (
                <div style={{ maxWidth: 520 }}>
                    <div className="ap-card">
                        <div className="ap-card-title">Admin Account</div>
                        <p className="ap-card-sub">Update your admin username, email, or password. Current password is required to save any change.</p>

                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Username</label>
                            <input className="ap-settings-input" type="text" placeholder="Admin username" value={profileForm.username} onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))} />
                        </div>

                        <div className="form-group" style={{ marginTop: 14 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
                            <input className="ap-settings-input" type="email" placeholder="Admin email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} />
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />

                        <div className="ap-card-title" style={{ fontSize: 14 }}>Change Password</div>

                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>New Password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                            <input className="ap-settings-input" type="password" placeholder="Min. 6 characters" value={profileForm.newPassword} onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))} />
                        </div>

                        <div className="form-group" style={{ marginTop: 14 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                            <input className="ap-settings-input" type="password" placeholder="Re-enter new password" value={profileForm.confirmPassword} onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />

                        <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Current Password <span style={{ color: '#ef4444' }}>*</span></label>
                            <input className="ap-settings-input" type="password" placeholder="Required to save changes" value={profileForm.currentPassword} onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))} />
                        </div>

                        {profileMsg.text && (
                            <div style={{
                                marginTop: 14, padding: '10px 14px', borderRadius: 10, fontSize: 13,
                                background: profileMsg.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: profileMsg.type === 'success' ? '#065f46' : '#991b1b',
                            }}>
                                {profileMsg.text}
                            </div>
                        )}

                        <button className="btn-submit" style={{ marginTop: 18 }} disabled={profileSaving}
                            onClick={async () => {
                                if (!profileForm.currentPassword) { setProfileMsg({ text: 'Current password is required', type: 'error' }); return; }
                                if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) { setProfileMsg({ text: 'New passwords do not match', type: 'error' }); return; }
                                setProfileSaving(true);
                                setProfileMsg({ text: '', type: '' });
                                try {
                                    await updateAdminProfile({ username: profileForm.username, email: profileForm.email, currentPassword: profileForm.currentPassword, newPassword: profileForm.newPassword || undefined });
                                    setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
                                    setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
                                } catch (e) {
                                    setProfileMsg({ text: e.response?.data?.error || 'Update failed', type: 'error' });
                                }
                                setProfileSaving(false);
                            }}
                        >
                            {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            )}

            {/* ================================================================
                ASSIGN PLAN MODAL
            ================================================================ */}
            {assignModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.5)',
                    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', padding: 20, zIndex: 500,
                }} onClick={() => setAssignModal(null)}>
                    <div style={{
                        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    }} onClick={e => e.stopPropagation()}>
                        {/* Modal header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            padding: '20px 24px 16px', borderBottom: `1px solid ${T.border}`,
                        }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Assign Plan</div>
                                <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{assignModal.user.name} · {assignModal.user.email}</div>
                            </div>
                            <button onClick={() => setAssignModal(null)} style={{
                                width: 30, height: 30, borderRadius: '50%', border: 'none',
                                background: '#F3F4F6', color: T.sub, fontSize: 16, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✕</button>
                        </div>

                        {/* Modal body */}
                        <div style={{ padding: '20px 24px 24px' }}>
                            {/* Plan selector */}
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Select Plan</div>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                {['bronze', 'silver', 'gold'].map(p => (
                                    <button key={p} onClick={() => setAssignForm(f => ({ ...f, plan: p }))} style={{
                                        flex: 1, padding: '10px', border: `2px solid ${assignForm.plan === p ? PLAN_COLORS[p] : T.border}`,
                                        borderRadius: 8, background: assignForm.plan === p ? PLAN_COLORS[p] : '#fff',
                                        color: assignForm.plan === p ? '#fff' : PLAN_COLORS[p],
                                        fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                                    }}>
                                        {PLAN_LABEL[p]}
                                    </button>
                                ))}
                            </div>

                            {/* Duration presets */}
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Duration</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                                {[
                                    { val: '1m', label: '1 Month' },
                                    { val: '3m', label: '3 Months' },
                                    { val: '6m', label: '6 Months' },
                                    { val: '1y', label: '1 Year' },
                                    { val: 'custom', label: 'Custom Date' },
                                ].map(d => (
                                    <button key={d.val} onClick={() => setAssignForm(f => ({ ...f, duration: d.val }))} style={{
                                        padding: '7px 14px', border: `1px solid ${assignForm.duration === d.val ? T.primary : T.border}`,
                                        borderRadius: 9999, fontSize: 12, fontWeight: 600,
                                        background: assignForm.duration === d.val ? T.primary : '#fff',
                                        color: assignForm.duration === d.val ? '#fff' : T.sub,
                                        cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                                    }}>
                                        {d.label}
                                    </button>
                                ))}
                            </div>

                            {assignForm.duration === 'custom' && (
                                <input type="date" style={{ ...inputSt, marginBottom: 16 }}
                                    value={assignForm.customDate}
                                    onChange={e => setAssignForm(f => ({ ...f, customDate: e.target.value }))}
                                />
                            )}

                            {/* Preview */}
                            <div style={{
                                background: '#F9FAFB', border: `1px solid ${T.border}`, borderRadius: 8,
                                padding: '12px 16px', fontSize: 13, color: T.sub, marginBottom: 20,
                            }}>
                                Plan: <strong style={{ color: PLAN_COLORS[assignForm.plan] }}>{PLAN_LABEL[assignForm.plan]}</strong>
                                &nbsp;·&nbsp;
                                Expires: <strong style={{ color: T.text }}>{calcEndsAt() || '—'}</strong>
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button style={{ ...btnPrimary, flex: 1 }} onClick={saveAssign}>Assign Plan</button>
                                <button style={btnSecondary} onClick={() => setAssignModal(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
