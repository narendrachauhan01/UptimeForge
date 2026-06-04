import React, { useState, useEffect } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import axios from 'axios';
import { API_URL } from '../api';

const REDIS_CACHE_STYLES = `
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
    
    --allowed-bg: #eef2ff;
    --allowed-border: #c7d2fe;
    --allowed-text: #4f46e5;
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
    
    --allowed-bg: rgba(124, 58, 237, 0.08);
    --allowed-border: rgba(124, 58, 237, 0.25);
    --allowed-text: #a78bfa;
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  /* Layout and elements */
  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }

  .perf-page-container .pg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .perf-page-container .pg-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
  }
  
  .perf-page-container .pg-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  .perf-page-container .info-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 20px 20px 18px;
  }

  .perf-page-container .action-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 24px;
    margin-bottom: 24px;
  }

  .perf-page-container .toast-box {
    border-radius: 10px;
    padding: 12px 18px;
    margin-bottom: 24px;
    font-weight: 700;
    font-size: 14px;
    border-width: 1px;
    border-style: solid;
  }

  .perf-page-container .btn-danger {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .perf-page-container .btn-danger:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
  }
  .perf-page-container .btn-danger:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .perf-page-container .step-row {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    padding-bottom: 14px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--border-color);
  }
  .perf-page-container .step-row:last-child {
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: none;
  }

  .perf-page-container .step-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--allowed-bg);
    color: var(--allowed-text);
    border: 1px solid var(--allowed-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 13px;
    flex-shrink: 0;
  }

  /* Read Only Badge */
  .perf-page-container .readonly-badge {
    font-size: 12px;
    font-weight: 700;
    border-radius: 8px;
    padding: 7px 14px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .perf-page-container.light .readonly-badge {
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fde68a;
  }
  .perf-page-container.dark .readonly-badge {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
  }
`;

export default function RedisCache({ readOnly = false }) {
    const { confirm, Dialog: ConfirmDialog } = useConfirm();
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);

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

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

    const clearAll = async () => {
        const ok = await confirm('Clear all SSL & Domain cache? Fresh data will be fetched on next check.', { title: 'Clear Cache', confirmText: 'Clear All', danger: true });
        if (!ok) return;
        setLoading(true);
        try {
            const r = await axios.post(`${API_URL}/api/admin/clear-cache`, {}, { withCredentials: true });
            showMsg(`✅ Cleared ${r.data.cleared} cached entries. Next SSL/Domain check will fetch fresh data.`);
        } catch { showMsg('❌ Failed — Redis may not be running'); }
        setLoading(false);
    };

    const isSuccess = msg.startsWith('✅');
    const isDark = localTheme === 'dark';

    const getToastStyle = () => {
        if (!msg) return {};
        if (isSuccess) {
            return isDark
                ? { background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10B981' }
                : { background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' };
        } else {
            return isDark
                ? { background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', color: '#F43F5E' }
                : { background: '#FEF2F2', border: '1px solid #FECDD3', color: '#DC2626' };
        }
    };

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{REDIS_CACHE_STYLES}</style>
            <div className="pg-wrap">
                <ConfirmDialog />
                {/* Page Header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Redis Cache <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">
                            Manage SSL &amp; Domain expiry cache (30 min TTL)
                        </p>
                    </div>
                </div>

                {/* Toast */}
                {msg && (
                    <div className="toast-box" style={getToastStyle()}>
                        {msg}
                    </div>
                )}

                {/* Info cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 20 }}>
                    {[
                        { icon: '⏱', label: 'Cache TTL', value: '30 minutes', desc: 'Data refreshed every 30 min automatically' },
                        { icon: '🔒', label: 'SSL Cache', value: 'ssl:hostname', desc: 'One entry per domain' },
                        { icon: '🌐', label: 'Domain Cache', value: 'domain:rootdomain', desc: 'One entry per root domain' },
                        { icon: '⚡', label: 'Speed Gain', value: '~5ms vs 3–8s', desc: 'Cache hit vs WHOIS API call' },
                    ].map(s => (
                        <div key={s.label} className="info-card">
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>
                                {s.label}
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {s.desc}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Clear Cache card */}
                <div className="action-card">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Cache Actions
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', marginBottom: 6 }}>
                        Clear SSL &amp; Domain Cache
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.7 }}>
                        Clears all cached SSL certificate and domain expiry data from Redis.<br />
                        Fresh data will be fetched from WHOIS API on next check (every 6 hours or manual "Check" click).<br />
                        <strong style={{ color: 'var(--text-main)' }}>When to clear:</strong> After renewing SSL, after renewing domain, or if wrong data is showing.
                    </div>
                    {readOnly
                        ? <span className="readonly-badge">👁 Read Only</span>
                        : <button onClick={clearAll} disabled={loading} className="btn-danger">
                            {loading ? 'Clearing...' : 'Clear All Cache'}
                          </button>
                    }
                </div>

                {/* How it works */}
                <div className="action-card">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 16 }}>
                        How It Works
                    </div>
                    {[
                        { n: '1', t: 'First request', d: 'SSL/Domain check → WHOIS API called (3–8 seconds) → result saved to Redis' },
                        { n: '2', t: 'Next 30 minutes', d: 'Same domain requested → Redis cache hit → instant response (< 5ms)' },
                        { n: '3', t: 'After 30 min', d: 'Cache expires automatically → WHOIS API called again → Redis updated' },
                        { n: '4', t: 'Manual clear', d: 'Click "Clear All Cache" → next check fetches fresh data immediately' },
                    ].map((s, idx) => (
                        <div key={s.n} className="step-row">
                            <div className="step-num">
                                {s.n}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 2 }}>{s.t}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.d}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
