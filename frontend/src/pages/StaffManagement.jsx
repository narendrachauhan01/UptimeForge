let _loaded_Staff = false;
import React, { useEffect, useState } from 'react';
import { staffList, staffCreate, staffUpdate, staffDelete } from '../api';

const ALL_PERMISSIONS = [
    { key: 'dashboard',          label: 'Dashboard Overview',   group: 'Main' },
    { key: 'users',              label: 'Users',                group: 'Main' },
    { key: 'payments',           label: 'Payments',             group: 'Main' },
    { key: 'planCanceling',      label: 'Plan Canceling',       group: 'Main' },
    { key: 'planSettings',       label: 'Plan Settings',        group: 'Management' },
    { key: 'annualPlans',        label: 'Annual Plans',         group: 'Management' },
    { key: 'featureAccess',      label: 'Feature Access',       group: 'Management' },
    { key: 'infra',              label: 'Infra',                group: 'Management' },
    { key: 'integrationBackend', label: 'Integration Backend',  group: 'Settings' },
    { key: 'redisCache',         label: 'Redis Cache',          group: 'Settings' },
    { key: 'deletedUsers',       label: 'Deleted Users',        group: 'Records' },
    { key: 'supportTickets',     label: 'Support Tickets',      group: 'Support' },
];

const GROUPS = ['Main', 'Management', 'Settings', 'Records', 'Support'];

const inputStyle = { width:'100%', padding:'9px 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:13, color:'#111827', background:'#fff', boxSizing:'border-box', outline:'none' };

function StaffModal({ staff, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: staff?.name || '',
        email: staff?.email || '',
        password: '',
        permissions: staff?.permissions || [],
        isActive: staff?.isActive !== false,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggle = (key) => setForm(f => ({
        ...f,
        permissions: f.permissions.includes(key) ? f.permissions.filter(p => p !== key) : [...f.permissions, key],
    }));

    const selectAll = () => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }));
    const clearAll  = () => setForm(f => ({ ...f, permissions: [] }));

    const save = async () => {
        if (!form.name.trim() || !form.email.trim()) { setError('Name and email required'); return; }
        if (!staff && !form.password.trim()) { setError('Password required'); return; }
        setSaving(true);
        try {
            const payload = { name: form.name, email: form.email, permissions: form.permissions, isActive: form.isActive };
            if (form.password.trim()) payload.password = form.password;
            if (staff) await staffUpdate(staff._id, payload);
            else       await staffCreate(payload);
            onSaved();
            onClose();
        } catch(e) { setError(e.response?.data?.error || 'Save failed'); }
        setSaving(false);
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:580, maxHeight:'90vh', overflow:'auto', padding:28, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#111827' }}>{staff ? 'Edit Staff' : 'Create Staff User'}</h2>
                    <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#6B7280' }}>✕</button>
                </div>

                {error && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#DC2626', marginBottom:16 }}>{error}</div>}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Name *</label>
                        <input style={inputStyle} value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>Email *</label>
                        <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="staff@example.com" />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:4 }}>{staff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                        <input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder={staff ? 'Leave blank to keep' : 'Min 6 characters'} />
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:2 }}>
                        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'#374151' }}>
                            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f=>({...f,isActive:e.target.checked}))} />
                            Account Active
                        </label>
                    </div>
                </div>

                {/* Permissions */}
                <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:0.5 }}>Permissions</label>
                        <div style={{ display:'flex', gap:8 }}>
                            <button onClick={selectAll} style={{ fontSize:11, fontWeight:600, color:'#7c3aed', background:'#ede9fe', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}>Select All</button>
                            <button onClick={clearAll}  style={{ fontSize:11, fontWeight:600, color:'#6B7280', background:'#F3F4F6', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}>Clear All</button>
                        </div>
                    </div>
                    {GROUPS.map(grp => {
                        const items = ALL_PERMISSIONS.filter(p => p.group === grp);
                        return (
                            <div key={grp} style={{ marginBottom:12 }}>
                                <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', marginBottom:6 }}>{grp}</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                                    {items.map(p => {
                                        const on = form.permissions.includes(p.key);
                                        return (
                                            <button key={p.key} onClick={() => toggle(p.key)}
                                                style={{ padding:'5px 12px', borderRadius:20, border:`1.5px solid ${on?'#7c3aed':'#E5E7EB'}`, background: on?'#ede9fe':'#fff', color: on?'#7c3aed':'#6B7280', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}>
                                                {on ? '✓ ' : ''}{p.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display:'flex', gap:10 }}>
                    <button onClick={save} disabled={saving}
                        style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        {saving ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
                    </button>
                    <button onClick={onClose} style={{ padding:'11px 20px', border:'1px solid #E5E7EB', borderRadius:10, background:'#fff', color:'#374151', fontWeight:600, fontSize:14, cursor:'pointer' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

export default function StaffManagement() {
    const [staff, setStaff]           = useState([]);
    const [modal, setModal]           = useState(null);
    const [pageLoading, setPageLoading] = useState(!_loaded_Staff);
    const [deleting, setDeleting]     = useState(null);

    const load = () => staffList().then(r => { setStaff(r.data); setPageLoading(false); _loaded_Staff = true; }).catch(() => setPageLoading(false));

    useEffect(() => { load(); }, []);

    const del = async (s) => {
        if (!window.confirm(`Delete ${s.name}?`)) return;
        setDeleting(s._id);
        await staffDelete(s._id).catch(() => {});
        load();
        setDeleting(null);
    };

    const PERM_LABELS = Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, p.label]));

    if (pageLoading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div className="pg-wrap">
            {modal && <StaffModal staff={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} />}

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
                <div>
                    <h1 style={{ fontSize:22, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>Staff Management</h1>
                    <p style={{ fontSize:14, color:'#6B7280', margin:0 }}>Create staff accounts with specific panel access</p>
                </div>
                <button onClick={() => setModal('new')}
                    style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, padding:'10px 22px', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                    + Add Staff
                </button>
            </div>

            {staff.length === 0 ? (
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'60px 20px', textAlign:'center' }}>
                    <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
                    <div style={{ fontWeight:700, fontSize:16, color:'#374151', marginBottom:6 }}>No staff users yet</div>
                    <div style={{ fontSize:13, color:'#9CA3AF', marginBottom:20 }}>Create staff accounts to delegate admin panel access</div>
                    <button onClick={() => setModal('new')} style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, padding:'10px 24px', fontWeight:700, fontSize:14, cursor:'pointer' }}>
                        + Add First Staff
                    </button>
                </div>
            ) : (
                <div style={{ display:'grid', gap:12 }}>
                    {staff.map(s => (
                        <div key={s._id} style={{ background:'#fff', borderRadius:12, border:'1px solid #E5E7EB', padding:'16px 20px', display:'flex', alignItems:'flex-start', gap:16, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                            <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, flexShrink:0 }}>
                                {s.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                                    <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>{s.name}</span>
                                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background: s.isActive?'#dcfce7':'#f3f4f6', color: s.isActive?'#16a34a':'#6B7280' }}>
                                        {s.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#ede9fe', color:'#7c3aed' }}>
                                        {s.permissions.length} permissions
                                    </span>
                                </div>
                                <div style={{ fontSize:13, color:'#6B7280', marginBottom:8 }}>{s.email}</div>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                    {s.permissions.map(p => (
                                        <span key={p} style={{ fontSize:11, fontWeight:600, background:'#F3F4F6', color:'#374151', padding:'2px 8px', borderRadius:20 }}>
                                            {PERM_LABELS[p] || p}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                                <button onClick={() => setModal(s)} style={{ padding:'6px 14px', border:'1px solid #E5E7EB', borderRadius:8, background:'#fff', color:'#374151', fontWeight:600, fontSize:12, cursor:'pointer' }}>Edit</button>
                                <button onClick={() => del(s)} disabled={deleting===s._id} style={{ padding:'6px 14px', border:'1px solid #FECDD3', borderRadius:8, background:'#FEF2F2', color:'#DC2626', fontWeight:600, fontSize:12, cursor:'pointer' }}>
                                    {deleting===s._id ? '...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
