import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { adminGetUsers, adminUpdateUser, adminDeleteUser, adminGetSettings, adminUpdateSettings, adminGetPayments, adminDeletePayment, adminApprovePayment, adminRejectPayment, adminRefundPayment, getAdminProfile, updateAdminProfile, adminClearCache } from '../api';

const PLAN_OPTIONS = ['free_trial', 'bronze', 'silver', 'gold'];
const PLAN_COLORS  = { free_trial: '#64748b', bronze: '#b45309', silver: '#475569', gold: '#ca8a04' };
const PLAN_BG     = { free_trial: '#f1f5f9', bronze: '#fef3c7', silver: '#f8fafc', gold: '#fefce8' };
const PLAN_LABEL  = { free_trial: 'Free Trial', bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

function Avatar({ name, size = 40 }) {
    const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777'];
    const idx = (name || '').charCodeAt(0) % colors.length;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: colors[idx], color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: size * 0.38, flexShrink: 0,
        }}>{initials}</div>
    );
}

function StatusBadge({ u }) {
    if (u.isBlocked) return <span className="ap-badge ap-badge-blocked">Blocked</span>;
    if (!u.isActive) return <span className="ap-badge ap-badge-expired">Expired</span>;
    if (u.plan === 'free_trial') return <span className="ap-badge ap-badge-trial">Trial</span>;
    return <span className="ap-badge ap-badge-active">Active</span>;
}

function fmt(date) {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
    const [assignModal, setAssignModal] = useState(null); // { user }
    const [assignForm, setAssignForm]   = useState({ plan: 'bronze', duration: '1m', customDate: '' });
    const [profileForm, setProfileForm] = useState({ username: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ text: '', type: '' });

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
        try { await adminRefundPayment(id); showToast('✅ Refund initiated — plan cancelled'); loadPayments(); load(); }
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

    const TABS = [
        { id: 'overview',      label: 'Overview' },
        { id: 'users',         label: `Users (${users.length})` },
        { id: 'payments',      label: `Payments (${payments.length})` },
        { id: 'transactions',  label: `Transactions (${payments.length})` },
    ];

    return (
        <div className="pg-wrap">
            {toast && <div className="ap-toast">{toast}</div>}

            {tab !== 'profile' && (
                <>
                    <div className="pg-header">
                        <div>
                            <h1 className="pg-title">Admin Panel</h1>
                            <p className="pg-sub">Manage users, plans, and settings</p>
                        </div>
                        <button className="btn-refresh" onClick={() => window.location.reload()} style={{ fontSize: 13 }}>Refresh</button>
                    </div>

                    {/* Tabs */}
                    <div className="ap-tabs">
                        {TABS.map(t => (
                            <button key={t.id} className={`ap-tab ${tab === t.id ? 'ap-tab-active' : ''}`} onClick={() => setTab(t.id)}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* ══ OVERVIEW TAB ══ */}
            {tab === 'overview' && (
                <div>
                    {/* Stats */}
                    <div className="ap-stats-grid">
                        {[
                            { label: 'Total Users',  value: users.length,   color: '#7c3aed', icon: '👥' },
                            { label: 'Active',       value: activeUsers,    color: '#10b981', icon: '✅' },
                            { label: 'Paid Users',   value: paidUsers,      color: '#f59e0b', icon: '💰' },
                            { label: 'Total Sites',  value: totalSites,     color: '#3b82f6', icon: '🌐' },
                            { label: 'Free Trial',   value: users.filter(u => u.plan === 'free_trial').length, color: '#64748b', icon: '⏳' },
                            { label: 'Blocked',      value: blockedUsers,   color: '#ef4444', icon: '🚫' },
                        ].map(s => (
                            <div key={s.label} className="ap-stat-card">
                                <div className="ap-stat-icon">{s.icon}</div>
                                <div className="ap-stat-value" style={{ color: s.color }}>{s.value}</div>
                                <div className="ap-stat-label">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Revenue Summary */}
                    <div className="ap-card" style={{ marginTop: 20 }}>
                        <div className="ap-card-title">💰 Revenue Summary</div>
                        <div className="ap-revenue-grid">
                            <div className="ap-rev-box">
                                <div className="ap-rev-label">Total Revenue</div>
                                <div className="ap-rev-value" style={{ color: '#10b981' }}>₹{totalRevenue.toLocaleString('en-IN')}</div>
                                <div className="ap-rev-sub">{payments.length} transactions</div>
                            </div>
                            <div className="ap-rev-box">
                                <div className="ap-rev-label">This Month</div>
                                <div className="ap-rev-value" style={{ color: '#7c3aed' }}>₹{monthRevenue.toLocaleString('en-IN')}</div>
                                <div className="ap-rev-sub">{now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</div>
                            </div>
                            <div className="ap-rev-box">
                                <div className="ap-rev-label">Plan Revenue</div>
                                <div className="ap-rev-value" style={{ color: '#f59e0b' }}>₹{planRevenue.toLocaleString('en-IN')}</div>
                                <div className="ap-rev-sub">Subscriptions only</div>
                            </div>
                            <div className="ap-rev-box">
                                <div className="ap-rev-label">Verification Fees</div>
                                <div className="ap-rev-value" style={{ color: '#64748b' }}>₹{(totalRevenue - planRevenue).toLocaleString('en-IN')}</div>
                                <div className="ap-rev-sub">₹2 trial fees</div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Payments */}
                    {pendingPayments.length > 0 && (
                        <div className="ap-card ap-card-urgent" style={{ marginTop: 16 }}>
                            <div className="ap-card-title">🔔 Pending Payments — Action Required ({pendingPayments.length})</div>
                            <div className="ap-pending-list">
                                {pendingPayments.map(pr => (
                                    <div key={pr._id} className="ap-pending-row">
                                        <div className="ap-pending-info">
                                            <div className="ap-pending-name">{pr.userName}</div>
                                            <div className="ap-pending-email">{pr.userEmail}</div>
                                            <div className="ap-pending-meta">
                                                <span className="ap-plan-pill" style={{ background: '#fef3c7', color: '#b45309' }}>
                                                    {pr.type === 'verification' ? '₹2 Verification' : `${pr.plan?.charAt(0).toUpperCase() + pr.plan?.slice(1)} ₹${pr.amount}`}
                                                </span>
                                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmt(pr.createdAt)}</span>
                                            </div>
                                            <div className="ap-pending-utr">UTR: <strong>{pr.utr}</strong></div>
                                        </div>
                                        <div className="ap-pending-actions">
                                            <button className="ap-btn ap-btn-approve" onClick={() => approvePayment(pr._id)}>✓ Approve</button>
                                            <button className="ap-btn ap-btn-reject"  onClick={() => rejectPayment(pr._id)}>✕ Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring Plans + Trial Expiring side by side */}
                    <div className="ap-alert-row" style={{ marginTop: 16 }}>
                        {/* Plans expiring in 7 days */}
                        <div className={`ap-card ${expiringPlans.length > 0 ? 'ap-card-warn' : ''}`} style={{ flex: 1 }}>
                            <div className="ap-card-title">⚠️ Plans Expiring (7 days) — {expiringPlans.length}</div>
                            {expiringPlans.length === 0 ? (
                                <div className="ap-empty-small">No plans expiring soon</div>
                            ) : expiringPlans.map(u => (
                                <div key={u._id} className="ap-alert-user-row">
                                    <div>
                                        <div className="ap-alert-name">{u.name}</div>
                                        <div className="ap-alert-email">{u.email}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="ap-plan-pill" style={{ background: PLAN_BG[u.plan], color: PLAN_COLORS[u.plan] }}>{PLAN_LABEL[u.plan]}</span>
                                        <div className="ap-alert-date">Ends {fmt(u.planEndsAt)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Trials expiring in 2 days */}
                        <div className={`ap-card ${trialExpiring.length > 0 ? 'ap-card-warn' : ''}`} style={{ flex: 1 }}>
                            <div className="ap-card-title">⏳ Trials Expiring (2 days) — {trialExpiring.length}</div>
                            {trialExpiring.length === 0 ? (
                                <div className="ap-empty-small">No trials expiring soon</div>
                            ) : trialExpiring.map(u => (
                                <div key={u._id} className="ap-alert-user-row">
                                    <div>
                                        <div className="ap-alert-name">{u.name}</div>
                                        <div className="ap-alert-email">{u.email}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="ap-alert-date">Ends {fmt(u.trialEndsAt)}</div>
                                        <button className="ap-btn ap-btn-trial" style={{ marginTop: 4 }} onClick={() => extendTrial(u._id)}>+5 days</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Plan distribution */}
                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Plan Distribution</div>
                        <div className="ap-plan-dist">
                            {PLAN_OPTIONS.map(p => {
                                const count = users.filter(u => u.plan === p).length;
                                const pct = users.length ? Math.round(count / users.length * 100) : 0;
                                return (
                                    <div key={p} className="ap-plan-dist-row">
                                        <div className="ap-plan-dist-label">
                                            <span className="ap-plan-dot" style={{ background: PLAN_COLORS[p] }} />
                                            {PLAN_LABEL[p]}
                                        </div>
                                        <div className="ap-plan-dist-bar-wrap">
                                            <div className="ap-plan-dist-bar" style={{ width: `${pct}%`, background: PLAN_COLORS[p] }} />
                                        </div>
                                        <div className="ap-plan-dist-count">{count} <span>({pct}%)</span></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Users */}
                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Recent Registrations</div>
                        <div className="ap-recent-list">
                            {users.slice(0, 8).map(u => (
                                <div key={u._id} className="ap-recent-row">
                                    <Avatar name={u.name} size={36} />
                                    <div className="ap-recent-info">
                                        <div className="ap-recent-name">{u.name}</div>
                                        <div className="ap-recent-email">{u.email}{u.phone ? ` · ${u.phone}` : ''}</div>
                                    </div>
                                    <div className="ap-recent-meta">
                                        <span className="ap-plan-pill" style={{ background: PLAN_BG[u.plan], color: PLAN_COLORS[u.plan] }}>
                                            {PLAN_LABEL[u.plan]}
                                        </span>
                                        <span className="ap-recent-sites">{u.serverCount || 0} sites</span>
                                    </div>
                                    <div className="ap-recent-date">{fmt(u.createdAt)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ USERS TAB ══ */}
            {tab === 'users' && (
                <div>
                    {/* Export button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        <button className="btn-download" onClick={exportCSV} disabled={users.length === 0}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Export CSV
                        </button>
                    </div>
                    {/* Filter bar */}
                    <div className="ap-filter-bar">
                        <div className="search-wrap" style={{ flex: 1 }}>
                            <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input className="search-input" placeholder="Search name, email, phone..." value={search} onChange={e => setSearch(e.target.value)} />
                            {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
                        </div>
                        <div className="ap-plan-filter">
                            {['all', ...PLAN_OPTIONS].map(p => (
                                <button key={p}
                                    className={`ap-filter-btn ${planFilter === p ? 'ap-filter-active' : ''}`}
                                    style={planFilter === p && p !== 'all' ? { background: PLAN_COLORS[p], color: '#fff' } : {}}
                                    onClick={() => setPlanFilter(p)}>
                                    {p === 'all' ? 'All' : PLAN_LABEL[p]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Users list */}
                    <div className="ap-users-list">
                        {loading ? (
                            <div className="ap-empty">Loading users...</div>
                        ) : filtered.length === 0 ? (
                            <div className="ap-empty">No users found.</div>
                        ) : filtered.map(u => (
                            <div key={u._id} className={`ap-user-card ${u.isBlocked ? 'ap-user-blocked' : ''}`}>

                                {/* Main row */}
                                <div className="ap-user-main" onClick={() => setExpandedId(expandedId === u._id ? null : u._id)}>
                                    <Avatar name={u.name} size={44} />

                                    <div className="ap-user-info">
                                        <div className="ap-user-name">
                                            {u.name}
                                            {u.isBlocked && <span className="ap-badge ap-badge-blocked" style={{ marginLeft: 8 }}>Blocked</span>}
                                        </div>
                                        <div className="ap-user-detail">
                                            <span>✉️ {u.email}</span>
                                            {u.phone && <span>📱 {u.phone}</span>}
                                            {u.state && <span>📍 {u.state}{u.country ? `, ${u.country}` : ''}</span>}
                                        </div>
                                        <div className="ap-user-meta">
                                            <span className="ap-plan-pill" style={{ background: PLAN_BG[u.plan], color: PLAN_COLORS[u.plan] }}>
                                                {PLAN_LABEL[u.plan]}
                                            </span>
                                            <StatusBadge u={u} />
                                            <span className="ap-site-count">🌐 {u.serverCount || 0} sites</span>
                                            <span className="ap-join-date">Joined {fmt(u.createdAt)}</span>
                                        </div>
                                    </div>

                                    <div className="ap-user-actions" onClick={e => e.stopPropagation()}>
                                        <button className="ap-btn ap-btn-assign" onClick={() => openAssign(u)}>Assign Plan</button>
                                        <button className="ap-btn ap-btn-edit" onClick={() => startEdit(u)}>Edit</button>
                                        <button className="ap-btn ap-btn-trial" onClick={() => extendTrial(u._id)}>+Trial</button>
                                        <button className={`ap-btn ${u.isBlocked ? 'ap-btn-unblock' : 'ap-btn-block'}`} onClick={() => toggleBlock(u)}>
                                            {u.isBlocked ? 'Unblock' : 'Block'}
                                        </button>
                                        <button className="ap-btn ap-btn-del" onClick={() => deleteUser(u)}>Delete</button>
                                    </div>
                                </div>

                                {/* Expanded detail */}
                                {expandedId === u._id && (
                                    <div className="ap-user-expanded">
                                        <div className="ap-detail-grid">
                                            <div className="ap-detail-item"><span>Plan</span><strong>{PLAN_LABEL[u.plan]}</strong></div>
                                            <div className="ap-detail-item"><span>Status</span><StatusBadge u={u} /></div>
                                            <div className="ap-detail-item"><span>Sites Created</span><strong>{u.serverCount || 0}</strong></div>
                                            <div className="ap-detail-item"><span>Trial Ends</span><strong>{fmt(u.trialEndsAt)}</strong></div>
                                            <div className="ap-detail-item"><span>Plan Ends</span><strong>{fmt(u.planEndsAt)}</strong></div>
                                            <div className="ap-detail-item"><span>Registered</span><strong>{fmt(u.createdAt)}</strong></div>
                                            {u.address && <div className="ap-detail-item"><span>Address</span><strong>{u.address}</strong></div>}
                                            {u.state && <div className="ap-detail-item"><span>State</span><strong>{u.state}</strong></div>}
                                            {u.country && <div className="ap-detail-item"><span>Country</span><strong>{u.country}</strong></div>}
                                        </div>
                                    </div>
                                )}

                                {/* Edit panel */}
                                {editId === u._id && (
                                    <div className="ap-edit-panel">
                                        <div className="ap-edit-grid">
                                            <div className="form-group">
                                                <label>Plan</label>
                                                <select value={editForm.plan} onChange={e => setEditForm({ ...editForm, plan: e.target.value })}>
                                                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Plan Ends At</label>
                                                <input type="date" value={editForm.planEndsAt} onChange={e => setEditForm({ ...editForm, planEndsAt: e.target.value })} />
                                            </div>
                                            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 22 }}>
                                                    <input type="checkbox" checked={editForm.isBlocked} onChange={e => setEditForm({ ...editForm, isBlocked: e.target.checked })} />
                                                    Block this account
                                                </label>
                                            </div>
                                        </div>
                                        <div className="ap-edit-btns">
                                            <button className="btn-save" onClick={saveEdit}>Save Changes</button>
                                            <button className="btn-cancel" onClick={() => setEditId(null)}>Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ PAYMENTS TAB ══ */}
            {tab === 'payments' && (
                <div>
                    {/* Search filter */}
                    <div className="search-wrap" style={{ marginBottom: 16 }}>
                        <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        <input className="search-input" placeholder="Search by Payment ID, user name or email..." value={paySearch} onChange={e => setPaySearch(e.target.value)} />
                        {paySearch && <button className="search-clear" onClick={() => setPaySearch('')}>✕</button>}
                    </div>

                    <div className="ap-pay-legend">
                        <span className="ap-badge" style={{ background:'#fef9c3',color:'#b45309' }}>Pending — {payments.filter(p=>p.status==='pending').length}</span>
                        <span className="ap-badge ap-badge-active">Approved — {payments.filter(p=>p.status==='approved').length}</span>
                        <span className="ap-badge ap-badge-blocked">Rejected — {payments.filter(p=>p.status==='rejected').length}</span>
                        <span className="ap-badge" style={{background:'#fef2f2',color:'#dc2626'}}>Refunded — {payments.filter(p=>p.status==='refunded').length}</span>
                    </div>

                    {(() => {
                        const q = paySearch.toLowerCase();
                        const filteredPay = q
                            ? payments.filter(p =>
                                p.utr?.toLowerCase().includes(q) ||
                                p.userName?.toLowerCase().includes(q) ||
                                p.userEmail?.toLowerCase().includes(q))
                            : payments;
                        return filteredPay.length === 0 ? (
                            <div className="ap-empty">{paySearch ? 'No payments match your search.' : 'No payments yet.'}</div>
                        ) : <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>{filteredPay.map(pr => {
                        const planColor = { bronze:'#b45309', silver:'#475569', gold:'#ca8a04' }[pr.plan] || '#64748b';
                        return (
                            <div key={pr._id} className="ap-pay-card">
                                <div className="ap-pay-top">
                                    <div className="ap-pay-user">
                                        <div className="ap-user-name">{pr.userName}</div>
                                        <div style={{ fontSize:12, color:'#64748b' }}>{pr.userEmail}</div>
                                    </div>
                                    <div className="ap-pay-meta">
                                        {pr.type === 'verification' ? (
                                            <span className="ap-plan-pill" style={{ background: '#fef3c7', color: '#b45309' }}>₹{pr.amount} Verification</span>
                                        ) : (
                                            <span className="ap-plan-pill" style={{ background: `${planColor}22`, color: planColor }}>
                                                {pr.plan?.charAt(0).toUpperCase() + pr.plan?.slice(1)}
                                            </span>
                                        )}
                                        <strong style={{ fontSize:15 }}>₹{pr.amount}</strong>
                                        <span className="ap-badge ap-badge-active">Paid</span>
                                    </div>
                                </div>
                                <div className="ap-pay-utr">
                                    Razorpay ID: <strong style={{ fontFamily:'monospace' }}>{pr.utr}</strong>
                                    <span style={{ color:'#94a3b8', marginLeft:12, fontSize:12 }}>
                                        {new Date(pr.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                    </span>
                                    <span className={`ap-pay-status ap-pay-status-${pr.status || 'approved'}`}>{pr.status || 'approved'}</span>
                                </div>
                                <div style={{ display:'flex', justifyContent:'flex-end', gap: 8, marginTop: 8 }}>
                                    {(!pr.status || pr.status === 'pending') && (
                                        <>
                                            <button className="ap-btn ap-btn-approve" style={{ fontSize:12 }} onClick={() => approvePayment(pr._id)}>✓ Approve</button>
                                            <button className="ap-btn ap-btn-reject"  style={{ fontSize:12 }} onClick={() => rejectPayment(pr._id)}>✕ Reject</button>
                                        </>
                                    )}
                                    {pr.status === 'approved' && (
                                        <button onClick={() => refundPayment(pr._id)}
                                            style={{ fontSize:12, padding:'4px 14px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:8, color:'#dc2626', fontWeight:700, cursor:'pointer' }}>
                                            💸 Refund
                                        </button>
                                    )}
                                    {pr.status === 'refunded' && (
                                        <span style={{ fontSize:12, padding:'4px 14px', background:'#fef2f2', border:'1.5px solid #fecdd3', borderRadius:8, color:'#dc2626', fontWeight:700 }}>
                                            ↩ Refunded
                                        </span>
                                    )}
                                    <button className="ap-btn ap-btn-del" style={{ fontSize:12, padding:'4px 12px' }} onClick={() => deletePayment(pr._id)}>🗑</button>
                                </div>
                            </div>
                        );
                        })}</div>;
                    })()}
                </div>
            )}

            {/* ══ TRANSACTIONS TAB ══ */}
            {tab === 'transactions' && (
                <div>
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                            <thead>
                                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                                    {['#','Date','User','Type','Plan','Amount','Status','Razorpay ID'].map(h => (
                                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#64748b', fontSize:12, whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding:32, textAlign:'center', color:'#94a3b8' }}>No transactions yet</td></tr>
                                ) : payments.map((p, i) => {
                                    const statusColor = {
                                        approved: { bg:'#dcfce7', color:'#16a34a' },
                                        pending:  { bg:'#fef9c3', color:'#b45309' },
                                        rejected: { bg:'#fee2e2', color:'#dc2626' },
                                        refunded: { bg:'#fef2f2', color:'#dc2626' },
                                    }[p.status] || { bg:'#f1f5f9', color:'#64748b' };
                                    return (
                                        <tr key={p._id} style={{ borderBottom:'1px solid #f1f5f9', background: p.status==='refunded'?'#fff5f5':'#fff' }}>
                                            <td style={{ padding:'10px 14px', color:'#94a3b8', fontWeight:600 }}>{i+1}</td>
                                            <td style={{ padding:'10px 14px', whiteSpace:'nowrap', color:'#475569' }}>
                                                {new Date(p.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                            </td>
                                            <td style={{ padding:'10px 14px' }}>
                                                <div style={{ fontWeight:700, color:'#1e1b4b' }}>{p.userName || '—'}</div>
                                                <div style={{ fontSize:11, color:'#94a3b8' }}>{p.userEmail || ''}</div>
                                            </td>
                                            <td style={{ padding:'10px 14px', color:'#475569', textTransform:'capitalize' }}>{p.type}</td>
                                            <td style={{ padding:'10px 14px' }}>
                                                <span style={{ padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                                                    background: p.plan==='gold'?'#fef9c3': p.plan==='silver'?'#f1f5f9': p.plan==='bronze'?'#fef3c7':'#f1f5f9',
                                                    color: p.plan==='gold'?'#b45309': p.plan==='silver'?'#475569': p.plan==='bronze'?'#92400e':'#64748b' }}>
                                                    {p.plan ? p.plan.charAt(0).toUpperCase()+p.plan.slice(1) : 'Verification'}
                                                </span>
                                            </td>
                                            <td style={{ padding:'10px 14px', fontWeight:700, color: p.status==='refunded'?'#dc2626':'#1e1b4b' }}>
                                                {p.status==='refunded' ? <s>₹{p.amount}</s> : `₹${p.amount}`}
                                            </td>
                                            <td style={{ padding:'10px 14px' }}>
                                                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:statusColor.bg, color:statusColor.color }}>
                                                    {p.status==='refunded'?'↩ Refunded': p.status?.charAt(0).toUpperCase()+p.status?.slice(1)}
                                                </span>
                                            </td>
                                            <td style={{ padding:'10px 14px', fontFamily:'monospace', fontSize:11, color:'#64748b' }}>
                                                {p.razorpay_payment_id || p.utr || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop:'2px solid #e2e8f0', background:'#f8fafc' }}>
                                    <td colSpan={5} style={{ padding:'10px 14px', fontWeight:700, color:'#1e1b4b', fontSize:13 }}>Total Revenue (excl. refunds)</td>
                                    <td style={{ padding:'10px 14px', fontWeight:800, color:'#7c3aed', fontSize:15 }}>₹{totalRevenue}</td>
                                    <td colSpan={2}/>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ══ INTEGRATION BACKEND TAB ══ */}
            {tab === 'integrations' && (
                <div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                        <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
                            Configure backend notification services. These are platform-level settings — users receive alerts automatically.
                        </p>
                        <button onClick={async()=>{
                            try {
                                const r = await adminClearCache();
                                showToast(`✅ Cache cleared — ${r.data.cleared} entries removed`);
                            } catch { showToast('❌ Cache clear failed'); }
                        }} style={{ padding:'8px 18px', background:'#fef3c7', border:'1.5px solid #fde68a', borderRadius:9, fontSize:13, fontWeight:700, color:'#d97706', cursor:'pointer', whiteSpace:'nowrap' }}>
                            🗑 Clear SSL/Domain Cache
                        </button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                        {/* Email */}
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
                                <div>📧 From: <strong>{process.env.MAIL_USER || 'Not set'}</strong></div>
                                <div style={{ marginTop:4 }}>Status: SMTP credentials configured in server .env</div>
                            </div>
                            <a href="/email" style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'10px 20px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:10, fontSize:13, fontWeight:700, textDecoration:'none', width:'fit-content' }}>
                                ✏️ Configure Email →
                            </a>
                        </div>

                        {/* WhatsApp */}
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
                                ✏️ Configure WhatsApp →
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SETTINGS TAB — moved to /plan-settings ══ */}
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
                        <p className="ap-card-sub">One feature per line. Format: <strong>type:Feature text</strong> — types: <code>ok</code> ✓ | <code>no</code> ✕ | <code>limited</code> 😐 | <code>soon</code> 🔜</p>
                        <textarea
                            className="ap-settings-input"
                            style={{ marginTop: 12, width: '100%', minHeight: 130, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }}
                            placeholder={'2 sites monitored\nEmail + WhatsApp alerts\nSSL & Domain expiry checks\n60s uptime checks\n5-day full access'}
                            value={settingsForm.freeTrialFeatures}
                            onChange={e => setSettingsForm({ ...settingsForm, freeTrialFeatures: e.target.value })}
                        />
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                            {settingsForm.freeTrialFeatures.split('\n').filter(s => s.trim()).length} feature{settingsForm.freeTrialFeatures.split('\n').filter(s => s.trim()).length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    <div className="ap-card" style={{ marginTop: 16 }}>
                        <div className="ap-card-title">Plan Pricing & Site Limits</div>
                        <p className="ap-card-sub">Changes take effect immediately for new purchases</p>
                        <div className="ap-settings-plans">
                            {['bronze', 'silver', 'gold'].map(p => (
                                <div key={p} className="ap-settings-plan-card" style={{ borderTop: `4px solid ${PLAN_COLORS[p]}` }}>
                                    <div className="ap-settings-plan-name" style={{ color: PLAN_COLORS[p] }}>
                                        {PLAN_LABEL[p]}
                                    </div>
                                    <div className="form-group">
                                        <label>Price (₹/month)</label>
                                        <input type="number" min="0" className="ap-settings-input"
                                            value={settingsForm.plans[p].price}
                                            onChange={e => setPlanField(p, 'price', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Max Sites</label>
                                        <input type="number" min="1" className="ap-settings-input"
                                            value={settingsForm.plans[p].sites}
                                            onChange={e => setPlanField(p, 'sites', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Check Interval (seconds)</label>
                                        <input type="number" min="30" step="30" className="ap-settings-input"
                                            value={settingsForm.plans[p].interval}
                                            onChange={e => setPlanField(p, 'interval', e.target.value)}
                                        />
                                        <span style={{ fontSize:11, color:'#94a3b8', marginTop:3, display:'block' }}>
                                            {Math.floor(settingsForm.plans[p].interval / 60) > 0 ? `${Math.floor(settingsForm.plans[p].interval / 60)} min` : ''}{settingsForm.plans[p].interval % 60 > 0 ? ` ${settingsForm.plans[p].interval % 60} sec` : ''} per check
                                        </span>
                                    </div>
                                    <div className="form-group">
                                        <label>Max Recipients</label>
                                        <input type="number" min="1" className="ap-settings-input"
                                            value={settingsForm.plans[p].recipientLimit}
                                            onChange={e => setPlanField(p, 'recipientLimit', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Features (one per line · format: type:text)</label>
                                        <textarea
                                            className="ap-settings-input"
                                            style={{ minHeight: 130, fontFamily: 'monospace', fontSize:12, lineHeight: 1.6, resize: 'vertical' }}
                                            placeholder={'ok:5 sites monitored\nlimited:2 min check interval\nok:Email alerts\nsoon:WhatsApp alerts\nno:SSL expiry monitoring'}
                                            value={settingsForm.plans[p].features}
                                            onChange={e => setPlanField(p, 'features', e.target.value)}
                                        />
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                            {settingsForm.plans[p].features.split('\n').filter(s => s.trim()).length} bullet{settingsForm.plans[p].features.split('\n').filter(s => s.trim()).length !== 1 ? 's' : ''}
                                        </div>
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
            {/* ══ PROFILE TAB ══ */}
            {tab === 'profile' && (
                <div style={{ maxWidth: 520 }}>
                    <div className="ap-card">
                        <div className="ap-card-title">👤 Admin Account</div>
                        <p className="ap-card-sub">Update your admin username, email, or password. Current password is required to save any change.</p>

                        <div className="form-group" style={{ marginTop: 16 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Username</label>
                            <input
                                className="ap-settings-input"
                                type="text"
                                placeholder="Admin username"
                                value={profileForm.username}
                                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                            />
                        </div>

                        <div className="form-group" style={{ marginTop: 14 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
                            <input
                                className="ap-settings-input"
                                type="email"
                                placeholder="Admin email"
                                value={profileForm.email}
                                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                            />
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />

                        <div className="ap-card-title" style={{ fontSize: 14 }}>🔑 Change Password</div>

                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>New Password <span style={{ color: '#94a3b8', fontWeight: 400 }}>(leave blank to keep current)</span></label>
                            <input
                                className="ap-settings-input"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={profileForm.newPassword}
                                onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                            />
                        </div>

                        <div className="form-group" style={{ marginTop: 14 }}>
                            <label style={{ fontWeight: 600, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
                            <input
                                className="ap-settings-input"
                                type="password"
                                placeholder="Re-enter new password"
                                value={profileForm.confirmPassword}
                                onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                            />
                        </div>

                        <div style={{ height: 1, background: '#e2e8f0', margin: '20px 0' }} />

                        <div className="form-group">
                            <label style={{ fontWeight: 700, fontSize: 13, color: '#374151', display: 'block', marginBottom: 6 }}>Current Password <span style={{ color: '#ef4444' }}>*</span></label>
                            <input
                                className="ap-settings-input"
                                type="password"
                                placeholder="Required to save changes"
                                value={profileForm.currentPassword}
                                onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                            />
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

                        <button
                            className="btn-submit"
                            style={{ marginTop: 18 }}
                            disabled={profileSaving}
                            onClick={async () => {
                                if (!profileForm.currentPassword) {
                                    setProfileMsg({ text: 'Current password is required', type: 'error' }); return;
                                }
                                if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
                                    setProfileMsg({ text: 'New passwords do not match', type: 'error' }); return;
                                }
                                setProfileSaving(true);
                                setProfileMsg({ text: '', type: '' });
                                try {
                                    await updateAdminProfile({
                                        username: profileForm.username,
                                        email: profileForm.email,
                                        currentPassword: profileForm.currentPassword,
                                        newPassword: profileForm.newPassword || undefined,
                                    });
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

            {/* ══ ASSIGN PLAN MODAL ══ */}
            {assignModal && (
                <div className="ap-modal-overlay" onClick={() => setAssignModal(null)}>
                    <div className="ap-modal" onClick={e => e.stopPropagation()}>
                        <div className="ap-modal-header">
                            <div>
                                <div className="ap-modal-title">Assign Plan</div>
                                <div className="ap-modal-sub">{assignModal.user.name} · {assignModal.user.email}</div>
                            </div>
                            <button className="ap-modal-close" onClick={() => setAssignModal(null)}>✕</button>
                        </div>

                        <div className="ap-modal-body">
                            {/* Plan selector */}
                            <div className="ap-assign-label">Select Plan</div>
                            <div className="ap-assign-plans">
                                {['bronze', 'silver', 'gold'].map(p => (
                                    <button
                                        key={p}
                                        className={`ap-assign-plan-btn ${assignForm.plan === p ? 'ap-assign-plan-active' : ''}`}
                                        style={assignForm.plan === p ? { background: PLAN_COLORS[p], color: '#fff', borderColor: PLAN_COLORS[p] } : { borderColor: PLAN_COLORS[p], color: PLAN_COLORS[p] }}
                                        onClick={() => setAssignForm(f => ({ ...f, plan: p }))}
                                    >
                                        {PLAN_LABEL[p]}
                                    </button>
                                ))}
                            </div>

                            {/* Duration presets */}
                            <div className="ap-assign-label" style={{ marginTop: 20 }}>Duration</div>
                            <div className="ap-assign-durations">
                                {[
                                    { val: '1m',     label: '1 Month' },
                                    { val: '3m',     label: '3 Months' },
                                    { val: '6m',     label: '6 Months' },
                                    { val: '1y',     label: '1 Year' },
                                    { val: 'custom', label: 'Custom Date' },
                                ].map(d => (
                                    <button
                                        key={d.val}
                                        className={`ap-assign-dur-btn ${assignForm.duration === d.val ? 'ap-assign-dur-active' : ''}`}
                                        onClick={() => setAssignForm(f => ({ ...f, duration: d.val }))}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>

                            {assignForm.duration === 'custom' && (
                                <input
                                    type="date"
                                    className="ap-settings-input"
                                    style={{ marginTop: 12 }}
                                    value={assignForm.customDate}
                                    onChange={e => setAssignForm(f => ({ ...f, customDate: e.target.value }))}
                                />
                            )}

                            {/* Preview */}
                            <div className="ap-assign-preview">
                                Plan: <strong style={{ color: PLAN_COLORS[assignForm.plan] }}>{PLAN_LABEL[assignForm.plan]}</strong>
                                &nbsp;·&nbsp;
                                Expires: <strong>{calcEndsAt() || '—'}</strong>
                            </div>

                            <div className="ap-edit-btns" style={{ marginTop: 20 }}>
                                <button className="btn-save" onClick={saveAssign}>Assign Plan</button>
                                <button className="btn-cancel" onClick={() => setAssignModal(null)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
