import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`switch-btn ${checked ? "checked" : ""}`}
            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
        >
            <span className="switch-btn-circle" />
        </button>
    );
}

const FEATURES = [
    { key: 'domainSsl',   label: 'Domain & SSL Monitoring', desc: 'View SSL certificate expiry and domain expiry dates', icon: '🔒' },
    { key: 'charts',      label: 'Performance Charts',       desc: 'View response time charts, uptime stats and alert history', icon: '📊' },
    { key: 'pingMonitor', label: 'Ping Monitor',             desc: 'Monitor connectivity for any host, IP or URL with live ping', icon: '📡' },
    { key: 'whatsapp',    label: 'WhatsApp Alerts',          desc: 'Send downtime and recovery alerts via WhatsApp', icon: '💬' },
    { key: 'telegram',    label: 'Telegram Alerts',          desc: 'Send downtime and recovery alerts via Telegram bot', icon: '✈️' },
    { key: 'webhook',     label: 'Webhook Integration',      desc: 'Send alert payloads to custom webhook URLs', icon: '🔗' },
    { key: 'rocketChat',  label: 'Rocket.Chat Integration',  desc: 'Send alerts to Rocket.Chat channels', icon: '🚀' },
];

const BRONZE_FEATURES = [
    { key: 'pingMonitor', label: 'Ping Monitor',             desc: 'Monitor connectivity for any host, IP or URL with live ping', icon: '📡' },
    { key: 'whatsapp',    label: 'WhatsApp Alerts',          desc: 'Send downtime and recovery alerts via WhatsApp', icon: '💬' },
    { key: 'telegram',    label: 'Telegram Alerts',          desc: 'Send downtime and recovery alerts via Telegram bot', icon: '✈️' },
    { key: 'webhook',     label: 'Webhook Integration',      desc: 'Send alert payloads to custom webhook URLs', icon: '🔗' },
    { key: 'rocketChat',  label: 'Rocket.Chat Integration',  desc: 'Send alerts to Rocket.Chat channels', icon: '🚀' },
];

const FEATURE_ACCESS_STYLES = `
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
    
    --blocked-bg: #f3f4f6;
    --blocked-border: #e5e7eb;
    --blocked-text: #6b7280;
    
    --table-header-bg: #f8fafc;
    
    --warning-card-bg: #fffbeb;
    --warning-card-border: #fde68a;
    --warning-card-text: #92400e;
    
    --bronze-badge-bg: #fef3c7;
    --bronze-badge-border: #fde68a;
    --bronze-badge-text: #b45309;
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
    
    --blocked-bg: rgba(255, 255, 255, 0.02);
    --blocked-border: rgba(255, 255, 255, 0.08);
    --blocked-text: #94a3b8;
    
    --table-header-bg: #101622;
    
    --warning-card-bg: rgba(245, 158, 11, 0.06);
    --warning-card-border: rgba(245, 158, 11, 0.15);
    --warning-card-text: #f59e0b;
    
    --bronze-badge-bg: rgba(180, 83, 9, 0.08);
    --bronze-badge-border: rgba(180, 83, 9, 0.2);
    --bronze-badge-text: #b45309;
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

  .perf-page-container .form-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 24px;
  }
  
  .perf-page-container .form-card-title-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color) !important;
  }
  
  .perf-page-container .form-card-title-lbl {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .perf-page-container .feature-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color) !important;
    gap: 16px;
    transition: background-color 0.15s ease;
  }
  
  .perf-page-container .feature-row:last-child {
    border-bottom: none !important;
  }
  
  .perf-page-container .feature-row:hover {
    background-color: var(--hover-row-bg) !important;
  }
  
  .perf-page-container .feature-icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  
  .perf-page-container .feature-label {
    font-weight: 700;
    font-size: 14.5px;
    color: var(--text-main);
    margin-bottom: 2px;
  }
  
  .perf-page-container .feature-desc {
    font-size: 13px;
    color: var(--text-muted);
  }
  
  .perf-page-container .status-badge {
    font-size: 11.5px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    border-width: 1px;
    border-style: solid;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  
  .perf-page-container .warning-banner {
    padding: 14px 20px;
    background: var(--warning-card-bg) !important;
    border: 1px solid var(--warning-card-border) !important;
    border-radius: 14px;
    font-size: 13.5px;
    color: var(--warning-card-text) !important;
    line-height: 1.6;
    margin-top: 12px;
    font-weight: 500;
  }

  .perf-page-container .btn-primary {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 24px;
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
  
  .perf-page-container .btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
  
  .perf-page-container .toast-box {
    border-radius: 10px;
    padding: 12px 18px;
    margin-bottom: 24px;
    font-weight: 700;
    font-size: 14px;
  }

  /* Custom toggle switch */
  .perf-page-container .switch-btn {
    width: 48px;
    height: 26px;
    border-radius: 13px;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
    position: relative;
    flex-shrink: 0;
  }
  .perf-page-container.light .switch-btn {
    background: #e2e8f0;
  }
  .perf-page-container.dark .switch-btn {
    background: #374151;
  }
  .perf-page-container .switch-btn.checked {
    background: var(--primary);
  }
  
  .perf-page-container .switch-btn-circle {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }
  .perf-page-container .switch-btn.checked .switch-btn-circle {
    left: 25px;
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

export default function FeatureAccess({ readOnly = false }) {
    const [access, setAccess]       = useState({ domainSsl: true, charts: true, pingMonitor: true, whatsapp: true, telegram: true, webhook: true, rocketChat: true });
    const [bronzeAcc, setBronzeAcc] = useState({ pingMonitor: true, whatsapp: true, telegram: true, webhook: true, rocketChat: true });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    useEffect(() => {
        adminGetSettings().then(r => {
            if (r.data.freeTrialAccess) setAccess(r.data.freeTrialAccess);
            if (r.data.bronzeAccess)    setBronzeAcc(r.data.bronzeAccess);
        }).catch(() => showToast('Failed to load settings'));
    }, []);

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

    const toggle       = (key) => { if (!readOnly) setAccess(prev => ({ ...prev, [key]: !prev[key] })); };
    const toggleBronze = (key) => { if (!readOnly) setBronzeAcc(prev => ({ ...prev, [key]: !prev[key] })); };

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateSettings({ freeTrialAccess: access, bronzeAccess: bronzeAcc });
            showToast('✅ Saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    const isDark = localTheme === 'dark';
    const isSuccess = toast.startsWith('✅');

    const getToastStyle = () => {
        if (!toast) return {};
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
            <style>{FEATURE_ACCESS_STYLES}</style>
            
            <div className="pg-wrap">
                {/* Page Header */}
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">
                            Free Trial Feature Access <span style={{ color: 'var(--primary)' }}>.</span>
                        </h1>
                        <p className="pg-sub">
                            Control which features Free Trial users can access
                        </p>
                    </div>
                    {readOnly
                        ? <span className="readonly-badge">👁 Read Only</span>
                        : <button onClick={save} disabled={saving} className="btn-primary">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                    }
                </div>

                {/* Toast */}
                {toast && (
                    <div className="toast-box" style={getToastStyle()}>
                        {toast}
                    </div>
                )}

                {/* Features table card */}
                <div className="form-card">
                    {/* Table header */}
                    <div className="form-card-title-row">
                        <span className="form-card-title-lbl">Feature</span>
                        <span className="form-card-title-lbl">Access</span>
                    </div>

                    {/* Feature rows */}
                    {FEATURES.map((f, i) => {
                        const allowed = !!access[f.key];
                        return (
                            <div key={f.key} className="feature-row">
                                {/* Icon + label */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div 
                                        className="feature-icon-box"
                                        style={{
                                            background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)',
                                            border: `1px solid ${allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'}`
                                        }}
                                    >
                                        {f.icon}
                                    </div>
                                    <div>
                                        <div className="feature-label">
                                            {f.label}
                                        </div>
                                        <div className="feature-desc">
                                            {f.desc}
                                        </div>
                                    </div>
                                </div>

                                {/* Status badge + toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                    <span 
                                        className="status-badge"
                                        style={{
                                            background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)',
                                            color: allowed ? 'var(--allowed-text)' : 'var(--blocked-text)',
                                            borderColor: allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'
                                        }}
                                    >
                                        {allowed ? 'Allowed' : 'Blocked'}
                                    </span>
                                    <Toggle checked={allowed} onChange={() => toggle(f.key)} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info note */}
                <div className="warning-banner">
                    Changes take effect immediately for all Free Trial users.
                </div>

                {/* ── Bronze Plan Access ── */}
                <div style={{ marginTop: 32 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px', fontFamily: 'Outfit, sans-serif' }}>
                            🥉 Bronze Plan Feature Access
                        </h2>
                        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>
                            Control which features Bronze plan users can access
                        </p>
                    </div>
                    
                    <div className="form-card">
                        <div className="form-card-title-row">
                            <span className="form-card-title-lbl">Feature</span>
                            <span className="form-card-title-lbl">Access</span>
                        </div>
                        {BRONZE_FEATURES.map((f, i) => {
                            const allowed = !!bronzeAcc[f.key];
                            return (
                                <div key={f.key} className="feature-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div 
                                            className="feature-icon-box"
                                            style={{ 
                                                background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', 
                                                border: `1px solid ${allowed ? 'var(--allowed-border)' : 'var(--blocked-border)'}` 
                                            }}
                                        >
                                            {f.icon}
                                        </div>
                                        <div>
                                            <div className="feature-label">{f.label}</div>
                                            <div className="feature-desc">{f.desc}</div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                        <span 
                                            className="status-badge"
                                            style={{ 
                                                background: allowed ? 'var(--allowed-bg)' : 'var(--blocked-bg)', 
                                                color: allowed ? 'var(--allowed-text)' : 'var(--blocked-text)', 
                                                borderColor: allowed ? 'var(--allowed-border)' : 'var(--blocked-border)' 
                                            }}
                                        >
                                            {allowed ? 'Allowed' : 'Blocked'}
                                        </span>
                                        <Toggle checked={allowed} onChange={() => toggleBronze(f.key)} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="warning-banner">
                        Changes take effect immediately for all Bronze plan users.
                    </div>
                </div>
            </div>
        </div>
    );
}
