import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const STYLES = `
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  .rpt-page {
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  /* Light Theme */
  .rpt-page.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --table-header-bg: #f8fafc;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06);
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
  }

  /* Dark Theme */
  .rpt-page.dark {
    --bg-primary: #0b0f19;
    --bg-card: #0d121f;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.06);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --table-header-bg: #131a26;
    --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --primary: #a78bfa;
    --primary-hover: #8b5cf6;
  }

  .rpt-wrap {
    padding: 28px 24px;
    max-width: 960px;
    margin: 0 auto;
  }

  .rpt-head {
    margin-bottom: 28px;
  }

  .rpt-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin: 0;
  }

  .rpt-sub {
    font-size: 13.5px;
    color: var(--text-muted);
    margin: 6px 0 0;
  }

  .rpt-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: var(--card-shadow);
  }

  .rpt-card-head {
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rpt-card-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }

  .rpt-body {
    padding: 20px;
  }

  .schedule-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .sch-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 16px;
    border-radius: 12px;
    border: 1.5px solid var(--border-color);
    background: var(--bg-card);
    cursor: pointer;
    text-align: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .sch-btn:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
  }
  .sch-btn.active {
    border-color: var(--primary);
    background: rgba(124, 58, 237, 0.04);
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.08);
  }

  .sch-icon-svg {
    width: 32px;
    height: 32px;
    stroke: var(--text-muted);
    margin-bottom: 10px;
    transition: stroke 0.25s, transform 0.25s;
  }
  .sch-btn:hover .sch-icon-svg {
    transform: scale(1.08);
  }
  .sch-btn.active .sch-icon-svg {
    stroke: #7c3aed;
  }

  .sch-btn-label {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
  }
  .sch-btn-desc {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 4px;
  }
  .sch-btn.active .sch-btn-label {
    color: #7c3aed;
  }

  .gen-row {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
  }
  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .info-banner {
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.5;
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .report-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
  }

  .report-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    gap: 12px;
    flex-wrap: wrap;
    transition: all 0.2s;
  }
  .report-item:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  }

  .report-doc-icon {
    width: 24px;
    height: 24px;
    stroke: var(--text-muted);
    flex-shrink: 0;
  }

  .report-info {
    flex: 1;
    min-width: 0;
  }

  .report-title-txt {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .report-meta-txt {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  .badge-type {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
  }
  .badge-weekly {
    background: rgba(59, 130, 246, 0.08);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.15);
  }
  .badge-monthly {
    background: rgba(124, 58, 237, 0.08);
    color: #7c3aed;
    border: 1px solid rgba(124, 58, 237, 0.15);
  }

  .report-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn-download {
    background: var(--bg-card);
    color: var(--text-main);
    border: 1.5px solid var(--border-color);
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }
  .btn-download:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .btn-del {
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
    border: 1.5px solid rgba(239, 68, 68, 0.15);
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .btn-del:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.35);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-muted);
  }
  .empty-icon-svg {
    width: 44px;
    height: 44px;
    stroke: var(--text-muted);
    opacity: 0.6;
    margin-bottom: 12px;
  }
  .empty-txt {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-main);
  }
  .empty-sub {
    font-size: 12.5px;
    margin-top: 6px;
  }

  .toast-box {
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 20px;
    font-weight: 700;
    font-size: 13px;
    border: 1px solid transparent;
  }
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

    const toastOk = toast.startsWith('✅') || toast.startsWith('🗑️');
    const toastStyle = toast ? (isDark
        ? { background: toastOk ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${toastOk ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`, color: toastOk ? '#10b981' : '#ef4444' }
        : { background: toastOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toastOk ? '#bbf7d0' : '#fecdd3'}`, color: toastOk ? '#15803d' : '#dc2626' }
    ) : {};

    const SCHEDULE_OPTIONS = [
        {
            key: 'none',
            icon: (
                <svg className="sch-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
                    <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
                    <path d="M18 8a6 6 0 0 0-9.33-5" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
            ),
            label: 'No Auto-Report',
            desc: 'Generate manually only'
        },
        {
            key: 'weekly',
            icon: (
                <svg className="sch-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M9 16l2 2 4-4" />
                </svg>
            ),
            label: 'Weekly Report',
            desc: 'Auto-generate every Monday'
        },
        {
            key: 'monthly',
            icon: (
                <svg className="sch-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </svg>
            ),
            label: 'Monthly Report',
            desc: 'Auto-generate on 1st of month'
        }
    ];

    return (
        <div className={`rpt-page ${localTheme}`}>
            <style>{STYLES}</style>
            <div className="rpt-wrap">
                <div className="rpt-head">
                    <h1 className="rpt-title" style={{ color: 'var(--text-main)' }}>Reports <span style={{ color:'#7c3aed' }}>.</span></h1>
                    <p className="rpt-sub">Generate and download weekly or monthly monitoring reports</p>
                </div>

                {toast && <div className="toast-box" style={toastStyle}>{toast}</div>}

                {/* Schedule selector */}
                <div className="rpt-card">
                    <div className="rpt-card-head"><span className="rpt-card-title">Report Schedule</span></div>
                    <div className="rpt-body">
                        <div className="schedule-row">
                            {SCHEDULE_OPTIONS.map(opt => (
                                <button key={opt.key} className={`sch-btn${schedule === opt.key ? ' active' : ''}`} onClick={() => handleSchedule(opt.key)} disabled={savingSchedule}>
                                    {opt.icon}
                                    <div className="sch-btn-label">{opt.label}</div>
                                    <div className="sch-btn-desc">{opt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="gen-row">
                            <button className="btn-primary" onClick={generate} disabled={genLoading || schedule === 'none'}>
                                {genLoading ? (
                                    <>
                                        <div className="spinner" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: 2 }}>
                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                        </svg>
                                        Generate Now
                                    </>
                                )}
                            </button>
                            {schedule === 'none' && (
                                <span style={{ fontSize:13, color:'var(--text-muted)' }}>Select Weekly or Monthly to enable</span>
                            )}
                        </div>

                        {schedule !== 'none' && (
                            <div className="info-banner" style={{ background: isDark ? 'rgba(124,58,237,.07)' : 'rgba(124,58,237,.06)', border:'1px solid rgba(124,58,237,.15)', color: isDark ? '#a78bfa' : '#6d28d9' }}>
                                <div>
                                    {schedule === 'weekly'
                                        ? '📅 Weekly reports auto-generate every Monday at 8:00 AM. Only the latest 1 report is kept.'
                                        : '🗓️ Monthly reports auto-generate on the 1st of each month at 8:00 AM. Only the latest 1 report is kept.'}
                                </div>
                                <div style={{ fontSize:11.5, opacity:.8, marginTop: 4 }}>
                                    Note: Weekly and Monthly reports cannot be enabled simultaneously. Switching clears the other schedule.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Report history */}
                <div className="rpt-card">
                    <div className="rpt-card-head">
                        <span className="rpt-card-title">Report History</span>
                        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>Max 1 report per type</span>
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 20, height: 20, margin: '0 auto 10px' }} />
                            <div style={{ fontSize:13, color:'var(--text-muted)' }}>Loading reports...</div>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="empty-state">
                            <svg className="empty-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            <div className="empty-txt">No reports yet</div>
                            <div className="empty-sub">Select a schedule above and click "Generate Now" to create your first report</div>
                        </div>
                    ) : (
                        <div className="report-list">
                            {reports.map(r => (
                                <div key={r._id} className="report-item">
                                    <svg className="report-doc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" y1="13" x2="8" y2="13" />
                                        <line x1="16" y1="17" x2="8" y2="17" />
                                        <polyline points="10 9 9 9 8 9" />
                                    </svg>
                                    <div className="report-info">
                                        <div className="report-title-txt">
                                            <span className={`badge-type badge-${r.type}`}>{r.type === 'weekly' ? 'Weekly' : 'Monthly'}</span>
                                            {r.title || `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} Report`}
                                        </div>
                                        <div className="report-meta-txt">
                                            Generated: {new Date(r.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })} &nbsp;|&nbsp;
                                            Period: {new Date(r.periodStart).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} – {new Date(r.periodEnd).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </div>
                                    </div>
                                    <div className="report-actions">
                                        <button className="btn-download" onClick={() => download(r._id)}>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 2 }}>
                                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                <polyline points="15 3 21 3 21 9" />
                                                <line x1="10" y1="14" x2="21" y2="3" />
                                            </svg>
                                            View / Download
                                        </button>
                                        <button className="btn-del" onClick={() => remove(r._id)} aria-label="Delete report">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
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
