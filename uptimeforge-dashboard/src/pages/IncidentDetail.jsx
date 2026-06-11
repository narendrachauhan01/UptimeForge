import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServerIncident, endServerIncident } from '../api';

function fmtDuration(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function IncidentDetail() {
    const { serverId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ending, setEnding] = useState(false);

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

    const loadData = () => {
        setLoading(true);
        getServerIncident(serverId)
            .then(r => { setData(r.data); setLoading(false); })
            .catch(e => { setError(e.response?.data?.error || 'Failed to load'); setLoading(false); });
    };

    useEffect(() => { loadData(); }, [serverId]);

    const handleEndIncident = async () => {
        if (!window.confirm('Mark this incident as resolved? This will reset alert state so future downtime triggers a fresh notification.')) return;
        setEnding(true);
        try {
            await endServerIncident(serverId);
            loadData();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to end incident');
        } finally { setEnding(false); }
    };

    const ongoing = data?.incident?.status === 'ongoing';

    return (
        <div className={`inc-page-container ${localTheme}`}>
            <style>{`
                .inc-page-container {
                    --primary: #7c3aed;
                    --primary-hover: #6d28d9;
                    --success: #10b981;
                    --danger: #f43f5e;
                    --warning: #f59e0b;
                    min-height: calc(100vh - 200px);
                    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                    transition: background-color 0.3s ease, color 0.3s ease;
                }

                .inc-page-container.light {
                    --bg-card: #ffffff;
                    --border-color: rgba(226, 232, 240, 0.8);
                    --text-main: #0f172a;
                    --text-muted: #64748b;
                    --text-muted-darker: #475569;
                    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
                    --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
                    --btn-sec-bg: rgba(124, 58, 237, 0.06);
                    --btn-sec-border: rgba(124, 58, 237, 0.2);
                    --btn-sec-text: #7c3aed;
                    --spinner-track: rgba(0, 0, 0, 0.06);
                }

                .inc-page-container.dark {
                    --bg-card: #131a26;
                    --border-color: rgba(255, 255, 255, 0.07);
                    --text-main: #f8fafc;
                    --text-muted: #94a3b8;
                    --text-muted-darker: #cbd5e1;
                    --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
                    --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
                    --btn-sec-bg: rgba(124, 58, 237, 0.12);
                    --btn-sec-border: rgba(124, 58, 237, 0.3);
                    --btn-sec-text: #a78bfa;
                    --spinner-track: rgba(255, 255, 255, 0.06);
                }

                .inc-wrap {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 8px 10px;
                }

                .inc-back-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 13.5px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 24px;
                    padding: 0;
                    transition: color 0.2s ease;
                }
                .inc-back-btn:hover {
                    color: var(--text-main);
                }

                .inc-spinner-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 80px 0;
                    gap: 12px;
                }
                .inc-spinner {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 4px solid var(--spinner-track);
                    border-top: 4px solid var(--primary);
                    animation: spin 0.8s linear infinite;
                }

                .inc-header {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                    margin-bottom: 28px;
                }
                .inc-title-block {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }
                .inc-indicator-dot {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    margin-top: 3px;
                }
                .inc-indicator-dot.ongoing {
                    background: var(--danger);
                    box-shadow: 0 0 12px var(--danger);
                }
                .inc-indicator-dot.resolved {
                    background: var(--success);
                    box-shadow: 0 0 12px var(--success);
                }

                .inc-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--text-main);
                    margin: 0;
                }
                .inc-subtitle {
                    font-size: 13.5px;
                    color: var(--text-muted);
                    margin-top: 4px;
                }
                .inc-subtitle a {
                    color: var(--primary);
                    text-decoration: none;
                    font-weight: 600;
                }
                .inc-subtitle a:hover {
                    text-decoration: underline;
                }

                .inc-btn-group {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .inc-btn-end {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 18px;
                    background: rgba(16, 185, 129, 0.12);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--success);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .inc-btn-end:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
                }
                .inc-btn-end:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .inc-btn-monitor {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 18px;
                    background: var(--btn-sec-bg);
                    border: 1px solid var(--btn-sec-border);
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--btn-sec-text);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .inc-btn-monitor:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
                }

                .inc-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 22px 24px;
                    margin-bottom: 16px;
                    box-shadow: var(--card-shadow);
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .inc-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--card-hover-shadow);
                }
                .inc-card.cause-card {
                    border-left: 4px solid var(--danger);
                }

                .inc-card-lbl {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 6px;
                }
                .inc-card-val {
                    font-size: 16px;
                    font-weight: 700;
                    color: var(--text-main);
                }

                .inc-stats-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                @media (max-width: 600px) {
                    .inc-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }

                .inc-status-val {
                    font-size: 18px;
                    font-weight: 800;
                    margin-bottom: 6px;
                }
                .inc-status-val.ongoing {
                    color: var(--danger);
                }
                .inc-status-val.resolved {
                    color: var(--success);
                }

                .inc-status-meta {
                    font-size: 12px;
                    color: var(--text-muted-darker);
                    margin-top: 4px;
                }

                .inc-duration-val {
                    font-family: 'Outfit', sans-serif;
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--text-main);
                }
                .inc-duration-meta {
                    font-size: 12px;
                    color: var(--warning);
                    margin-top: 6px;
                    font-weight: 600;
                }

                .inc-log-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--text-main);
                    margin-bottom: 20px;
                }

                .inc-activity-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 16px;
                }
                .inc-activity-item:last-child {
                    padding-bottom: 0;
                    border-bottom: none;
                    margin-bottom: 0;
                }

                .inc-activity-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .inc-activity-icon.down {
                    background: rgba(244, 63, 94, 0.12);
                    border: 1.5px solid rgba(244, 63, 94, 0.25);
                }
                .inc-activity-icon.up {
                    background: rgba(16, 185, 129, 0.12);
                    border: 1.5px solid rgba(16, 185, 129, 0.25);
                }

                .inc-activity-content {
                    flex: 1;
                    min-width: 0;
                }
                .inc-activity-title {
                    font-size: 13.5px;
                    font-weight: 600;
                    color: var(--text-main);
                    margin-bottom: 3px;
                }
                .inc-activity-notified {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .inc-activity-time {
                    font-size: 11.5px;
                    color: var(--text-muted-darker);
                    white-space: nowrap;
                    flex-shrink: 0;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            <div className="inc-wrap">
                {/* Back */}
                <button onClick={() => navigate('/monitoring')} className="inc-back-btn">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                    Back to Monitors
                </button>

                {loading && (
                    <div className="inc-spinner-wrap">
                        <div className="inc-spinner" />
                    </div>
                )}
                
                {error && <div style={{ color:'#f43f5e', fontSize:14, fontWeight:600, padding:'20px 0' }}>{error}</div>}

                {data && !data.incident && (
                    <div style={{ textAlign:'center', padding:'80px 0' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                        <div style={{ fontSize:18, fontWeight:700, color:'var(--text-main)', marginBottom:8 }}>No active incident</div>
                        <div style={{ fontSize:14, color:'var(--text-muted)' }}>No downtime recorded for <strong style={{color:'var(--primary)'}}>{data.server?.name}</strong> in the last 90 days.</div>
                    </div>
                )}

                {data?.incident && (
                    <>
                        {/* Header */}
                        <div className="inc-header">
                            <div className="inc-title-block">
                                <div className={`inc-indicator-dot ${ongoing ? 'ongoing' : 'resolved'}`} />
                                <div>
                                    <h1 className="inc-title">
                                        {ongoing ? 'Ongoing incident on' : 'Resolved incident on'} <span style={{ color:'var(--primary)' }}>{data.server.name}</span>
                                    </h1>
                                    <div className="inc-subtitle">
                                        <a href={data.server.url} target="_blank" rel="noreferrer">{data.server.url}</a>
                                    </div>
                                </div>
                            </div>
                            <div className="inc-btn-group">
                                {ongoing && (
                                    <button onClick={handleEndIncident} disabled={ending} className="inc-btn-end">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                        {ending ? 'Ending…' : 'End Incident'}
                                    </button>
                                )}
                                <button onClick={() => navigate(`/site/${data.server._id}`)} className="inc-btn-monitor">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
                                    Go to monitor
                                </button>
                            </div>
                        </div>

                        {/* Root cause */}
                        <div className="inc-card cause-card">
                            <div className="inc-card-lbl">Root cause</div>
                            <div className="inc-card-val">{data.incident.rootCause}</div>
                        </div>

                        {/* Status + Duration */}
                        <div className="inc-stats-grid">
                            <div className="inc-card">
                                <div className="inc-card-lbl">Status</div>
                                <div className={`inc-status-val ${ongoing ? 'ongoing' : 'resolved'}`}>
                                    {ongoing ? '● Ongoing' : '● Resolved'}
                                </div>
                                <div className="inc-status-meta">Started {fmtDate(data.incident.startedAt)}</div>
                                {data.incident.resolvedAt && (
                                    <div className="inc-status-meta" style={{ marginTop: 2 }}>Resolved {fmtDate(data.incident.resolvedAt)}</div>
                                )}
                            </div>
                            <div className="inc-card">
                                <div className="inc-card-lbl">Duration</div>
                                <div className="inc-duration-val">{fmtDuration(data.incident.durationMs)}</div>
                                {ongoing && <div className="inc-duration-meta">⏱ Still ongoing</div>}
                            </div>
                        </div>

                        {/* Activity log */}
                        <div className="inc-card">
                            <div className="inc-log-title">Activity log</div>
                            {data.activity.length === 0 ? (
                                <div style={{ fontSize:13, color:'var(--text-muted)' }}>No activity recorded.</div>
                            ) : (
                                <div className="activity-list">
                                    {data.activity.map((a, i) => (
                                        <div key={a._id} className="inc-activity-item">
                                            {/* Icon */}
                                            <div className={`inc-activity-icon ${a.type === 'down' ? 'down' : 'up'}`}>
                                                {a.type === 'down'
                                                    ? <svg width="14" height="14" fill="none" stroke="#f43f5e" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                    : <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                                }
                                            </div>
                                            <div className="inc-activity-content">
                                                <div className="inc-activity-title">
                                                    {a.type === 'down' ? '🔴 Site went down' : '🟢 Site recovered'}
                                                    {a.message && <span style={{ color:'var(--text-muted)', fontWeight:400 }}> — {a.message}</span>}
                                                </div>
                                                {a.sentTo?.length > 0 && (
                                                    <div className="inc-activity-notified">
                                                        Notified: {a.sentTo.map(r => r.name || r.email || r.phone).filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="inc-activity-time">
                                                {fmtDate(a.createdAt)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
