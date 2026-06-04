let _loaded_Staff = false;
import { useConfirm } from '../components/ConfirmDialog';
import React, { useEffect, useState } from 'react';
import { staffList, staffCreate, staffUpdate, staffDelete } from '../api';

const SECTIONS = [
    { key: 'dashboard',          label: 'Payment Admin Panel', group: 'MENU' },
    { key: 'planSettings',       label: 'Plan Settings',       group: 'MANAGEMENT' },
    { key: 'annualPlans',        label: 'Annual Plans',        group: 'MANAGEMENT' },
    { key: 'featureAccess',      label: 'Feature Access',      group: 'MANAGEMENT' },
    { key: 'integrationBackend', label: 'Integration Backend', group: 'SETTINGS' },
    { key: 'redisCache',         label: 'Redis Cache',         group: 'SETTINGS' },
    { key: 'deletedUsers',       label: 'Deleted Users',       group: 'RECORDS' },
    { key: 'supportTickets',     label: 'Support Tickets',     group: 'SUPPORT' },
];
const GROUPS = ['MENU', 'MANAGEMENT', 'SETTINGS', 'RECORDS', 'SUPPORT'];

// Parse permissions array into {key: 'read'|'write'|null}
function parsePerms(arr) {
    const map = {};
    (arr || []).forEach(p => {
        const [key, access] = p.split(':');
        if (access === 'write') map[key] = 'write';
        else if (access === 'read' && map[key] !== 'write') map[key] = 'read';
    });
    return map;
}

// Convert map back to array
function mapToPerms(map) {
    const arr = [];
    Object.entries(map).forEach(([key, access]) => {
        if (access === 'write') { arr.push(`${key}:read`); arr.push(`${key}:write`); }
        else if (access === 'read') arr.push(`${key}:read`);
    });
    return arr;
}

function StaffModal({ staff, onClose, onSaved, isDark }) {
    const [form, setForm] = useState({
        name:     staff?.name || '',
        email:    staff?.email || '',
        password: '',
        isActive: staff?.isActive !== false,
    });
    const [permMap, setPermMap] = useState(() => parsePerms(staff?.permissions));
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    const setAccess = (key, access) => {
        setPermMap(prev => {
            const next = { ...prev };
            if (access === null) delete next[key];
            else next[key] = access;
            return next;
        });
    };

    const selectAll = (access) => {
        const next = {};
        SECTIONS.forEach(s => { next[s.key] = access; });
        setForm(f => ({ ...f }));
        setPermMap(next);
    };

    const save = async () => {
        if (!form.name.trim()) { setError('Username is required'); return; }
        if (!staff && !form.password.trim()) { setError('Password is required'); return; }
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address'); return; }
        setSaving(true);
        try {
            const payload = {
                name: form.name, email: form.email,
                permissions: mapToPerms(permMap),
                isActive: form.isActive,
            };
            if (form.password.trim()) payload.password = form.password;
            if (staff) await staffUpdate(staff._id, payload);
            else       await staffCreate(payload);
            onSaved();
            onClose();
        } catch(e) { setError(e.response?.data?.error || 'Save failed'); }
        setSaving(false);
    };

    const AccessBtn = ({ sKey, access, label, activeColor, activeBg, activeBorder }) => {
        const active = permMap[sKey] === access;
        return (
            <button type="button" onClick={() => setAccess(sKey, active ? null : access)}
                style={{
                    padding: '5px 12px',
                    borderRadius: 6,
                    border: active ? `1.5px solid ${activeBorder}` : '1.5px solid var(--border-color)',
                    background: active ? activeBg : 'var(--bg-card)',
                    color: active ? activeColor : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                }}>
                {label}
            </button>
        );
    };

    return (
        <div style={{ position:'fixed', inset:0, background:'var(--modal-overlay-bg)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            onClick={e => e.target===e.currentTarget && onClose()}>
            <div className="modal-container">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                    <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'var(--text-main)', fontFamily:'Outfit, sans-serif' }}>
                        {staff ? 'Edit Staff User' : 'Add Staff User'}
                    </h2>
                    <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--text-muted)' }}>✕</button>
                </div>

                {error && (
                    <div style={{ background:'rgba(239, 68, 68, 0.08)', border:'1px solid rgba(239, 68, 68, 0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--danger)', marginBottom:16 }}>
                        {error}
                    </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }} className="modal-form-grid">
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Name *</label>
                        <input className="custom-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="Full name" />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>Email <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span></label>
                        <input className="custom-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="staff@example.com" />
                    </div>
                    <div>
                        <label style={{ fontSize:12, fontWeight:600, color:'var(--text-muted)', display:'block', marginBottom:4 }}>
                            {staff ? 'New Password (blank = keep)' : 'Password *'}
                        </label>
                        <input className="custom-input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder={staff ? 'Leave blank to keep' : 'Min 6 characters'} />
                    </div>
                    <div style={{ display:'flex', alignItems:'center', paddingBottom:6, paddingTop:16 }}>
                        <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, fontWeight:600, color:'var(--text-main)' }}>
                            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f=>({...f,isActive:e.target.checked}))} style={{ accentColor:'var(--primary)', width:16, height:16 }} />
                            Account Active
                        </label>
                    </div>
                </div>

                {/* Permissions */}
                <div style={{ marginBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'var(--text-main)', textTransform:'uppercase', letterSpacing:0.5 }}>Permissions</label>
                        <div style={{ display:'flex', gap:6 }}>
                            <button type="button" onClick={() => selectAll('read')}  style={{ fontSize:11, fontWeight:600, color:isDark?'#60a5fa':'#2563eb', background:isDark?'rgba(96,165,250,0.08)':'#eff6ff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>All Read</button>
                            <button type="button" onClick={() => selectAll('write')} style={{ fontSize:11, fontWeight:600, color:isDark?'#a78bfa':'#7c3aed', background:isDark?'rgba(167,139,250,0.08)':'#ede9fe', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>All Write</button>
                            <button type="button" onClick={() => setPermMap({})}     style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', background:'var(--bg-input)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Clear</button>
                        </div>
                    </div>

                    {/* Header */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 140px', gap:8, padding:'6px 12px', background:'var(--table-header-bg)', borderRadius:8, marginBottom:8 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Section</div>
                        <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', textAlign:'center' }}>Access</div>
                    </div>

                    <div style={{ maxHeight:'32vh', overflowY:'auto', paddingRight:4 }}>
                        {GROUPS.map(grp => {
                            const items = SECTIONS.filter(s => s.group === grp);
                            return (
                                <div key={grp} style={{ marginBottom:8 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8, padding:'4px 12px 2px', opacity:0.75 }}>{grp}</div>
                                    {items.map(s => {
                                        const hasVal = permMap[s.key];
                                        return (
                                            <div key={s.key}
                                                style={{
                                                    display:'grid',
                                                    gridTemplateColumns:'1fr 140px',
                                                    gap:8,
                                                    alignItems:'center',
                                                    padding:'7px 12px',
                                                    borderRadius:8,
                                                    background: hasVal ? (hasVal==='write'?'var(--write-bg)':'var(--read-bg)') : 'var(--bg-card)',
                                                    border: `1px solid ${hasVal ? (hasVal==='write'?'var(--write-border)':'var(--read-border)') : 'var(--border-color)'}`,
                                                    marginBottom:3
                                                }}>
                                                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-main)' }}>{s.label}</span>
                                                <div style={{ display:'flex', gap:4, justifyContent:'center' }}>
                                                    <AccessBtn sKey={s.key} access="read"  label="Read"  activeColor={isDark?'#60a5fa':'#2563eb'} activeBg={isDark?'rgba(96,165,250,0.08)':'#eff6ff'} activeBorder={isDark?'rgba(96, 165, 250, 0.3)':'#bfdbfe'} />
                                                    <AccessBtn sKey={s.key} access="write" label="Write" activeColor={isDark?'#a78bfa':'#7c3aed'} activeBg={isDark?'rgba(167,139,250,0.08)':'#ede9fe'} activeBorder={isDark?'rgba(167, 139, 250, 0.3)':'#d8b4fe'} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)', background:'var(--bg-input)', borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:6 }}>
                        <span>💡</span>
                        <span><strong>Read</strong> = view only &nbsp;|&nbsp; <strong>Write</strong> = view + edit/create/delete</span>
                    </div>
                </div>

                <div style={{ display:'flex', gap:10, marginTop:24 }}>
                    <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                        {saving ? 'Saving...' : staff ? 'Update Staff' : 'Create Staff'}
                    </button>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '10px 20px', fontSize: 13.5 }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

const STAFF_MANAGEMENT_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
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
    --hover-row-bg: rgba(124, 58, 237, 0.04);
    
    --table-header-bg: #f8fafc;
    --modal-overlay-bg: rgba(15, 23, 42, 0.6);
    
    --read-bg: #eff6ff;
    --read-border: #bfdbfe;
    --write-bg: #faf5ff;
    --write-border: #e9d5ff;
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
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    
    --table-header-bg: #101622;
    --modal-overlay-bg: rgba(0, 0, 0, 0.65);
    
    --read-bg: rgba(96, 165, 250, 0.04);
    --read-border: rgba(96, 165, 250, 0.15);
    --write-bg: rgba(167, 139, 250, 0.04);
    --write-border: rgba(167, 139, 250, 0.15);
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }

  .perf-page-container .staff-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: flex-start;
    gap: 16px;
    box-shadow: var(--card-shadow);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .perf-page-container .staff-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 22px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.15);
    transition: all 0.2s ease;
  }
  .perf-page-container .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
  }

  .perf-page-container .btn-secondary {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 6px 14px;
    font-weight: 600;
    font-size: 12.5px;
    cursor: pointer;
    font-family: inherit;
    color: var(--text-main);
    transition: all 0.2s ease;
  }
  .perf-page-container .btn-secondary:hover:not(:disabled) {
    background: var(--bg-input);
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
    box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.15) !important;
  }

  .perf-page-container .modal-container {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    width: 100%;
    max-width: 620px;
    max-height: 92vh;
    overflow: auto;
    padding: 28px;
    box-shadow: var(--card-shadow);
  }

  @media (max-width: 600px) {
    .perf-page-container .modal-form-grid {
      grid-template-columns: 1fr !important;
    }
  }
`;

export default function StaffManagement() {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [staff, setStaff]             = useState([]);
    const [modal, setModal]             = useState(null);
    const [pageLoading, setPageLoading] = useState(!_loaded_Staff);
    const [deleting, setDeleting]       = useState(null);

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

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

    const load = () => staffList().then(r => { setStaff(r.data); setPageLoading(false); _loaded_Staff = true; }).catch(() => setPageLoading(false));
    useEffect(() => { load(); }, []);

    const del = async (s) => {
        const ok = await confirm(
            `Deactivate "${s.name}"?\n\nAccount disabled — support ticket history preserved.`,
            { title: 'Deactivate Staff', confirmText: 'Deactivate', danger: true }
        );
        if (!ok) return;
        setDeleting(s._id);
        await staffUpdate(s._id, { isActive: false }).catch(() => {});
        load();
        setDeleting(null);
    };

    const permanentDelete = async (s) => {
        const ok = await confirm(
            `Permanently delete "${s.name}"? This cannot be undone.`,
            { title: 'Delete Staff Permanently', confirmText: 'Delete Permanently', danger: true }
        );
        if (!ok) return;
        setDeleting(s._id);
        await staffDelete(s._id).catch(() => {});
        load();
        setDeleting(null);
    };

    const permSummary = (perms) => {
        const map = parsePerms(perms);
        const r = Object.values(map).filter(v => v === 'read').length;
        const w = Object.values(map).filter(v => v === 'write').length;
        return `${r + w} sections (${w} write)`;
    };

    const isDark = localTheme === 'dark';

    if (pageLoading) return (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:350 }}>
            <div style={{ width:40, height:40, borderRadius:'50%', border:'4px solid var(--border-color)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{STAFF_MANAGEMENT_STYLES}</style>
            <div className="pg-wrap">
                <ConfirmDialog />
                {modal && <StaffModal staff={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={load} isDark={isDark} />}

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:16 }}>
                    <div>
                        <h1 style={{ fontSize:28, fontWeight:900, color:'var(--text-main)', margin:0, fontFamily:'Outfit, sans-serif' }}>
                            Staff Management <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p style={{ fontSize:14, color:'var(--text-muted)', margin:'4px 0 0 0', fontWeight:500 }}>Create staff accounts with Read / Write access per section</p>
                    </div>
                    <button onClick={() => setModal('new')} className="btn-primary">
                        + Add Staff User
                    </button>
                </div>

                {staff.length === 0 ? (
                    <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border-color)', padding:'60px 20px', textAlign:'center', boxShadow:'var(--card-shadow)' }}>
                        <div style={{ fontSize:48, marginBottom:16 }}>👥</div>
                        <div style={{ fontWeight:800, fontSize:17, color:'var(--text-main)', marginBottom:6 }}>No staff users yet</div>
                        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Create staff with specific Read/Write permissions</div>
                        <button onClick={() => setModal('new')} className="btn-primary">
                            + Add First Staff
                        </button>
                    </div>
                ) : (
                    <div style={{ display:'grid', gap:12 }}>
                        {staff.map(s => {
                            const map = parsePerms(s.permissions);
                            return (
                                <div key={s._id} className="staff-card">
                                    <div style={{ width:44, height:44, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:18, flexShrink:0 }}>
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                                            <span style={{ fontWeight:700, fontSize:15, color:'var(--text-main)' }}>{s.name}</span>
                                            <span style={{
                                                fontSize:11,
                                                fontWeight:700,
                                                padding:'2px 8px',
                                                borderRadius:20,
                                                background: s.isActive ? (isDark ? 'rgba(16, 185, 129, 0.08)' : '#dcfce7') : 'var(--bg-input)',
                                                color: s.isActive ? (isDark ? '#4ade80' : '#16a34a') : 'var(--text-muted)'
                                            }}>
                                                {s.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                            <span style={{
                                                fontSize:11,
                                                fontWeight:700,
                                                padding:'2px 8px',
                                                borderRadius:20,
                                                background: isDark ? 'rgba(167, 139, 250, 0.08)' : '#ede9fe',
                                                color: isDark ? '#a78bfa' : '#7c3aed'
                                            }}>
                                                {permSummary(s.permissions)}
                                            </span>
                                        </div>
                                        <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:10 }}>{s.email}</div>
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                            {SECTIONS.filter(sec => map[sec.key]).map(sec => (
                                                <span key={sec.key} style={{
                                                    fontSize:11,
                                                    fontWeight:700,
                                                    padding:'2px 8px',
                                                    borderRadius:20,
                                                    background: map[sec.key]==='write' ? (isDark ? 'rgba(167, 139, 250, 0.08)' : '#ede9fe') : (isDark ? 'rgba(96, 165, 250, 0.08)' : '#eff6ff'),
                                                    color: map[sec.key]==='write' ? (isDark ? '#a78bfa' : '#7c3aed') : (isDark ? '#60a5fa' : '#2563eb')
                                                }}>
                                                    {sec.label} ({map[sec.key]})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                                        <button onClick={() => setModal(s)} className="btn-secondary">Edit</button>
                                        <button onClick={() => del(s)} disabled={deleting===s._id} className="btn-secondary" style={{ color: s.isActive ? 'var(--danger)' : 'var(--success)', borderColor: s.isActive ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }}
                                            title={s.isActive ? 'Deactivate staff account' : 'Reactivate staff account'}
                                            onClick={async () => {
                                                if (s.isActive) { del(s); }
                                                else {
                                                    setDeleting(s._id);
                                                    await staffUpdate(s._id, { isActive: true }).catch(() => {});
                                                    load(); setDeleting(null);
                                                }
                                            }}>
                                            {deleting===s._id ? '...' : s.isActive ? 'Deactivate' : 'Reactivate'}
                                        </button>
                                        <button onClick={() => permanentDelete(s)} disabled={deleting===s._id} className="btn-secondary"
                                            style={{ color:'var(--danger)', borderColor:'rgba(239,68,68,0.2)' }}
                                            title="Permanently delete staff account">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
