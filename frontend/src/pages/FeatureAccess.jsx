import React, { useEffect, useState } from 'react';
import { adminGetSettings, adminUpdateSettings } from '../api';

function Toggle({ checked, onChange, disabled }) {
    return (
        <div
            onClick={() => !disabled && onChange(!checked)}
            style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                background: checked ? '#4F46E5' : '#D1D5DB',
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
                flexShrink: 0,
            }}
        >
            <div style={{
                position: 'absolute',
                top: 3,
                left: checked ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'left 0.2s',
            }} />
        </div>
    );
}

const FEATURES = [
    { key: 'domainSsl',   label: 'Domain & SSL Monitoring', desc: 'View SSL certificate expiry and domain expiry dates', icon: '🔒' },
    { key: 'charts',      label: 'Performance Charts',       desc: 'View response time charts, uptime stats and alert history', icon: '📊' },
    { key: 'pingMonitor', label: 'Ping Monitor',             desc: 'Monitor connectivity for any host, IP or URL with live ping', icon: '📡' },
];

export default function FeatureAccess() {
    const [access, setAccess] = useState({ domainSsl: true, charts: true });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    useEffect(() => {
        adminGetSettings().then(r => {
            if (r.data.freeTrialAccess) setAccess(r.data.freeTrialAccess);
        }).catch(() => showToast('Failed to load settings'));
    }, []);

    const toggle = (key) => setAccess(prev => ({ ...prev, [key]: !prev[key] }));

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateSettings({ freeTrialAccess: access });
            showToast('✅ Saved!');
        } catch { showToast('❌ Save failed'); }
        setSaving(false);
    };

    const isSuccess = toast.startsWith('✅');

    return (
        <div className="pg-wrap">
            {/* Page Header */}
            <div className="pg-header">
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                        Free Trial Feature Access
                    </h1>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
                        Control which features Free Trial users can access
                    </p>
                </div>
                <button
                    onClick={save}
                    disabled={saving}
                    style={{
                        background: saving ? '#9CA3AF' : '#4F46E5',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '9px 18px',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: saving ? 'not-allowed' : 'pointer',
                    }}
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    background: isSuccess ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECDD3'}`,
                    color: isSuccess ? '#15803D' : '#DC2626',
                    borderRadius: 10,
                    padding: '10px 16px',
                    marginBottom: 20,
                    fontWeight: 600,
                    fontSize: 14,
                }}>
                    {toast}
                </div>
            )}

            {/* Features table card */}
            <div style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                marginBottom: 16,
            }}>
                {/* Table header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'center',
                    padding: '12px 20px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                }}>
                    <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Feature
                    </span>
                    <span style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Access
                    </span>
                </div>

                {/* Feature rows */}
                {FEATURES.map((f, i) => (
                    <div
                        key={f.key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 20px',
                            borderBottom: i < FEATURES.length - 1 ? '1px solid #F3F4F6' : 'none',
                            gap: 16,
                        }}
                    >
                        {/* Icon + label */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background: access[f.key] ? '#EEF2FF' : '#F9FAFB',
                                border: `1px solid ${access[f.key] ? '#C7D2FE' : '#E5E7EB'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                                flexShrink: 0,
                            }}>
                                {f.icon}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                                    {f.label}
                                </div>
                                <div style={{ fontSize: 13, color: '#6B7280' }}>
                                    {f.desc}
                                </div>
                            </div>
                        </div>

                        {/* Status badge + toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                            <span style={{
                                fontSize: 12,
                                fontWeight: 600,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background: access[f.key] ? '#EEF2FF' : '#F3F4F6',
                                color: access[f.key] ? '#4F46E5' : '#6B7280',
                                border: `1px solid ${access[f.key] ? '#C7D2FE' : '#E5E7EB'}`,
                            }}>
                                {access[f.key] ? 'Allowed' : 'Blocked'}
                            </span>
                            <Toggle checked={!!access[f.key]} onChange={() => toggle(f.key)} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Info note */}
            <div style={{
                padding: '12px 16px',
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 10,
                fontSize: 13,
                color: '#92400E',
                lineHeight: 1.5,
            }}>
                Changes take effect immediately for all Free Trial users. Paid plan users always have full access.
            </div>
        </div>
    );
}
