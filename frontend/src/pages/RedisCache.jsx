import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';


export default function RedisCache() {
    const [msg,     setMsg]     = useState('');
    const [loading, setLoading] = useState(false);

    const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 5000); };

    const clearAll = async () => {
        if (!window.confirm('Clear all SSL & Domain cache? Fresh data will be fetched on next check.')) return;
        setLoading(true);
        try {
            const r = await axios.post(`${API_URL}/api/admin/clear-cache`, {}, { withCredentials: true });
            showMsg(`✅ Cleared ${r.data.cleared} cached entries. Next SSL/Domain check will fetch fresh data.`);
        } catch { showMsg('❌ Failed — Redis may not be running'); }
        setLoading(false);
    };

    const isSuccess = msg.startsWith('✅');

    return (
        <div className="pg-wrap">
            {/* Page Header */}
            <div className="pg-header">
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                        Redis Cache
                    </h1>
                    <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
                        Manage SSL &amp; Domain expiry cache (30 min TTL)
                    </p>
                </div>
            </div>

            {/* Toast */}
            {msg && (
                <div style={{
                    background: isSuccess ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${isSuccess ? '#BBF7D0' : '#FECDD3'}`,
                    color: isSuccess ? '#15803D' : '#DC2626',
                    borderRadius: 10,
                    padding: '12px 18px',
                    marginBottom: 20,
                    fontWeight: 600,
                    fontSize: 14,
                }}>
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
                    <div key={s.label} style={{
                        background: '#fff',
                        borderRadius: 10,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        padding: '20px 20px 18px',
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 8 }}>
                            {s.label}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>
                            {s.desc}
                        </div>
                    </div>
                ))}
            </div>

            {/* Clear Cache card */}
            <div style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: 24,
                marginBottom: 20,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 12 }}>
                    Cache Actions
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>
                    Clear SSL &amp; Domain Cache
                </div>
                <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.7 }}>
                    Clears all cached SSL certificate and domain expiry data from Redis.<br />
                    Fresh data will be fetched from WHOIS API on next check (every 6 hours or manual "Check" click).<br />
                    <strong style={{ color: '#374151' }}>When to clear:</strong> After renewing SSL, after renewing domain, or if wrong data is showing.
                </div>
                <button
                    onClick={clearAll}
                    disabled={loading}
                    style={{
                        padding: '9px 18px',
                        background: loading ? '#9CA3AF' : '#EF4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'background 0.15s',
                    }}
                >
                    {loading ? 'Clearing...' : 'Clear All Cache'}
                </button>
            </div>

            {/* How it works */}
            <div style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: 24,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 16 }}>
                    How It Works
                </div>
                {[
                    { n: '1', t: 'First request', d: 'SSL/Domain check → WHOIS API called (3–8 seconds) → result saved to Redis' },
                    { n: '2', t: 'Next 30 minutes', d: 'Same domain requested → Redis cache hit → instant response (< 5ms)' },
                    { n: '3', t: 'After 30 min', d: 'Cache expires automatically → WHOIS API called again → Redis updated' },
                    { n: '4', t: 'Manual clear', d: 'Click "Clear All Cache" → next check fetches fresh data immediately' },
                ].map((s, idx) => (
                    <div key={s.n} style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'flex-start',
                        paddingBottom: idx < 3 ? 14 : 0,
                        marginBottom: idx < 3 ? 14 : 0,
                        borderBottom: idx < 3 ? '1px solid #F3F4F6' : 'none',
                    }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: '#EEF2FF',
                            color: '#4F46E5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 13,
                            flexShrink: 0,
                            border: '1px solid #C7D2FE',
                        }}>
                            {s.n}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 2 }}>{s.t}</div>
                            <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5 }}>{s.d}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
