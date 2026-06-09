import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const STYLES = `
.rpt-page { font-family:'Plus Jakarta Sans',sans-serif; min-height:100vh; background:var(--bg-primary); color:var(--text-main); }
.rpt-wrap { padding:24px; max-width:900px; }
.rpt-head { margin-bottom:28px; }
.rpt-title { font-family:'Outfit',sans-serif; font-size:28px; font-weight:900; color:var(--text-main); margin:0; }
.rpt-sub   { font-size:14px; color:var(--text-muted); margin:4px 0 0; }
.rpt-card  { background:var(--bg-card); border:1px solid var(--border-color); border-radius:20px; overflow:hidden; margin-bottom:22px; box-shadow:var(--card-shadow); }
.rpt-card-head { padding:14px 20px; background:var(--table-header-bg); border-bottom:1px solid var(--border-color); }
.rpt-card-title { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:var(--text-muted); }
.rpt-body { padding:24px; }
.schedule-row { display:flex; gap:12px; flex-wrap:wrap; }
.sch-btn { flex:1; min-width:140px; padding:18px 16px; border-radius:14px; border:2px solid var(--border-color); background:var(--bg-card); cursor:pointer; text-align:center; transition:all .2s; }
.sch-btn:hover { border-color:#7c3aed; }
.sch-btn.active { border-color:#7c3aed; background:rgba(124,58,237,.08); }
.sch-btn-icon { font-size:26px; margin-bottom:8px; }
.sch-btn-label { font-size:14px; font-weight:700; color:var(--text-main); }
.sch-btn-desc  { font-size:12px; color:var(--text-muted); margin-top:3px; }
.sch-btn.active .sch-btn-label { color:#7c3aed; }
.gen-row { display:flex; gap:12px; align-items:center; margin-top:20px; flex-wrap:wrap; }
.btn-primary { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; border:none; border-radius:9px; padding:11px 22px; font-weight:700; font-size:13.5px; cursor:pointer; font-family:inherit; transition:all .2s; }
.btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 12px rgba(124,58,237,.3); }
.btn-primary:disabled { opacity:.55; cursor:not-allowed; transform:none; }
.btn-outline { background:transparent; color:#7c3aed; border:1.5px solid #7c3aed; border-radius:9px; padding:10px 20px; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit; transition:all .2s; }
.btn-outline:hover { background:rgba(124,58,237,.07); }
.report-list { display:flex; flex-direction:column; gap:14px; padding:20px; }
.report-item { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-input); gap:12px; flex-wrap:wrap; }
.report-info { flex:1; min-width:0; }
.report-title-txt { font-size:14.5px; font-weight:700; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.report-meta-txt  { font-size:12px; color:var(--text-muted); margin-top:3px; }
.badge-type { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; margin-right:6px; }
.badge-weekly  { background:rgba(59,130,246,.1);  color:#3b82f6; }
.badge-monthly { background:rgba(124,58,237,.1); color:#7c3aed; }
.report-actions { display:flex; gap:8px; flex-shrink:0; }
.btn-download { background:linear-gradient(135deg,#7c3aed,#6d28d9); color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
.btn-download:hover { transform:translateY(-1px); box-shadow:0 3px 10px rgba(124,58,237,.3); }
.btn-del { background:rgba(239,68,68,.08); color:#ef4444; border:1px solid rgba(239,68,68,.2); border-radius:8px; padding:8px 12px; font-size:13px; cursor:pointer; font-family:inherit; }
.btn-del:hover { background:rgba(239,68,68,.15); }
.empty-state { text-align:center; padding:40px 20px; color:var(--text-muted); }
.empty-icon { font-size:44px; margin-bottom:12px; }
.empty-txt { font-size:15px; font-weight:600; color:var(--text-main); }
.empty-sub { font-size:13px; margin-top:6px; }
.toast-box { border-radius:10px; padding:12px 18px; margin-bottom:20px; font-weight:700; font-size:14px; }
.info-banner { padding:13px 18px; border-radius:12px; font-size:13px; font-weight:500; line-height:1.6; margin-top:14px; }
`;

export default function Reports() {
    const [reports,  setReports]  = useState([]);
    const [schedule, setSchedule] = useState('none');
    const [loading,  setLoading]  = useState(true);
    const [genLoading, setGenLoading] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [toast,    setToast]    = useState('');

    const [localTheme, setLocalTheme] = useState(() => {
        const m = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return m ? m[1] : 'dark';
    });
    useEffect(() => {
        const check = () => {
            const m = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const t = m ? m[1] : 'dark';
            if (t !== localTheme) setLocalTheme(t);
        };
        check();
        const iv = setInterval(check, 1000);
        return () => clearInterval(iv);
    }, [localTheme]);
    useEffect(() => {
        if (localTheme === 'dark') document.body.classList.add('charts-dark-theme');
        else document.body.classList.remove('charts-dark-theme');
        return () => document.body.classList.remove('charts-dark-theme');
    }, [localTheme]);

    const isDark = localTheme === 'dark';

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

    const load = useCallback(async () => {
        try {
            const r = await axios.get(`${API_URL}/api/reports`, { withCredentials: true });
            setReports(r.data.reports || []);
            setSchedule(r.data.schedule || 'none');
        } catch { showToast('❌ Failed to load reports'); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSchedule = async (val) => {
        if (val === schedule) return;
        setSavingSchedule(true);
        try {
            await axios.put(`${API_URL}/api/reports/schedule`, { schedule: val }, { withCredentials: true });
            setSchedule(val);
            showToast(val === 'none' ? '✅ Auto-reports disabled' : `✅ ${val === 'weekly' ? 'Weekly' : 'Monthly'} reports enabled`);
        } catch { showToast('❌ Failed to save schedule'); }
        setSavingSchedule(false);
    };

    const generate = async () => {
        const type = schedule !== 'none' ? schedule : null;
        if (!type) { showToast('⚠️ Select Weekly or Monthly first'); return; }
        setGenLoading(true);
        try {
            await axios.post(`${API_URL}/api/reports/generate`, { type }, { withCredentials: true });
            showToast('✅ Report generated!');
            await load();
        } catch (e) { showToast('❌ ' + (e.response?.data?.error || 'Generation failed')); }
        setGenLoading(false);
    };

    const download = (id) => {
        window.open(`${API_URL}/api/reports/${id}/view`, '_blank');
    };

    const remove = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/reports/${id}`, { withCredentials: true });
            setReports(p => p.filter(r => r._id !== id));
            showToast('🗑️ Report deleted');
        } catch { showToast('❌ Delete failed'); }
    };

    const toastOk = toast.startsWith('✅');
    const toastStyle = toast ? (isDark
        ? { background: toastOk ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${toastOk ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`, color: toastOk ? '#10b981' : '#ef4444' }
        : { background: toastOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toastOk ? '#bbf7d0' : '#fecdd3'}`, color: toastOk ? '#15803d' : '#dc2626' }
    ) : {};

    const themeVars = isDark ? {
        '--bg-primary':'#0b0f19','--bg-card':'#131a26','--bg-input':'#1b2535',
        '--border-color':'rgba(255,255,255,.07)','--text-main':'#f8fafc','--text-muted':'#94a3b8',
        '--card-shadow':'0 4px 25px -2px rgba(0,0,0,.35)','--table-header-bg':'#101622',
    } : {
        '--bg-primary':'#f8fafc','--bg-card':'#ffffff','--bg-input':'#f1f5f9',
        '--border-color':'rgba(226,232,240,.8)','--text-main':'#0f172a','--text-muted':'#64748b',
        '--card-shadow':'0 4px 20px -2px rgba(148,163,184,.06)','--table-header-bg':'#f8fafc',
    };

    const cssVars = Object.entries(themeVars).map(([k,v]) => `${k}:${v}`).join(';');

    return (
        <div className="rpt-page" style={{ [cssVars.split(';').reduce ? '--x':'--x']:'', ...Object.fromEntries(Object.entries(themeVars)) }}>
            <style>{STYLES}</style>
            <div className="rpt-wrap">
                <div className="rpt-head">
                    <h1 className="rpt-title">Reports <span style={{ color:'#7c3aed' }}>.</span></h1>
                    <p className="rpt-sub">Generate and download weekly or monthly monitoring reports</p>
                </div>

                {toast && <div className="toast-box" style={toastStyle}>{toast}</div>}

                {/* Schedule selector */}
                <div className="rpt-card">
                    <div className="rpt-card-head"><span className="rpt-card-title">Report Schedule</span></div>
                    <div className="rpt-body">
                        <div className="schedule-row">
                            {[
                                { key:'none',    icon:'🔕', label:'No Auto-Report', desc:'Generate manually only' },
                                { key:'weekly',  icon:'📅', label:'Weekly Report',  desc:'Auto-generate every Monday' },
                                { key:'monthly', icon:'🗓️', label:'Monthly Report', desc:'Auto-generate on 1st of month' },
                            ].map(opt => (
                                <button key={opt.key} className={`sch-btn${schedule === opt.key ? ' active' : ''}`} onClick={() => handleSchedule(opt.key)} disabled={savingSchedule}>
                                    <div className="sch-btn-icon">{opt.icon}</div>
                                    <div className="sch-btn-label">{opt.label}</div>
                                    <div className="sch-btn-desc">{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="gen-row">
                            <button className="btn-primary" onClick={generate} disabled={genLoading || schedule === 'none'}>
                                {genLoading ? '⏳ Generating...' : '⚡ Generate Now'}
                            </button>
                            {schedule === 'none' && (
                                <span style={{ fontSize:13, color:'var(--text-muted)' }}>Select Weekly or Monthly to enable</span>
                            )}
                        </div>

                        {schedule !== 'none' && (
                            <div className="info-banner" style={{ background: isDark ? 'rgba(124,58,237,.07)' : 'rgba(124,58,237,.06)', border:'1px solid rgba(124,58,237,.15)', color: isDark ? '#a78bfa' : '#6d28d9' }}>
                                {schedule === 'weekly'
                                    ? '📅 Weekly reports auto-generate every Monday at 8:00 AM. Only the 2 most recent reports are kept.'
                                    : '🗓️ Monthly reports auto-generate on the 1st of each month at 8:00 AM. Only the 2 most recent reports are kept.'}
                                <br />
                                <span style={{ fontSize:12, opacity:.8 }}>Note: Weekly and Monthly reports cannot be enabled simultaneously. Switching clears the other schedule.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Report history */}
                <div className="rpt-card">
                    <div className="rpt-card-head" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span className="rpt-card-title">Report History</span>
                        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Max 2 reports kept</span>
                    </div>

                    {loading ? (
                        <div className="empty-state"><div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading...</div></div>
                    ) : reports.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <div className="empty-txt">No reports yet</div>
                            <div className="empty-sub">Select a schedule above and click "Generate Now" to create your first report</div>
                        </div>
                    ) : (
                        <div className="report-list">
                            {reports.map(r => (
                                <div key={r._id} className="report-item">
                                    <div className="report-info">
                                        <div className="report-title-txt">
                                            <span className={`badge-type badge-${r.type}`}>{r.type === 'weekly' ? '📅 Weekly' : '🗓️ Monthly'}</span>
                                            {r.title || `${r.type} Report`}
                                        </div>
                                        <div className="report-meta-txt">
                                            Generated: {new Date(r.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })} &nbsp;|&nbsp;
                                            Period: {new Date(r.periodStart).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} – {new Date(r.periodEnd).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </div>
                                    </div>
                                    <div className="report-actions">
                                        <button className="btn-download" onClick={() => download(r._id)}>⬇️ View / Download</button>
                                        <button className="btn-del" onClick={() => remove(r._id)}>🗑</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
