import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const PLAN_CANCELING_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
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
    
    --cancel-badge-bg: #fef2f2;
    --cancel-badge-border: #fecdd3;
    --cancel-badge-text: #ef4444;
    
    --table-header-bg: #f8fafc;
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
    
    --cancel-badge-bg: rgba(239, 68, 68, 0.08);
    --cancel-badge-border: rgba(239, 68, 68, 0.25);
    --cancel-badge-text: #f43f5e;
    
    --table-header-bg: #101622;
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
  
  /* Summary Cards Grid */
  .perf-page-container .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }
  
  .perf-page-container .stat-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--card-shadow);
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  
  .perf-page-container .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--card-hover-shadow);
    border-color: rgba(124, 58, 237, 0.15) !important;
  }
  
  .perf-page-container .stat-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin-bottom: 16px;
  }
  
  .perf-page-container .stat-val {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 800;
    color: var(--text-main);
    line-height: 1.2;
  }
  
  .perf-page-container .stat-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 700;
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Table Container */
  .perf-page-container .table-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 20px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 24px;
  }
  
  .perf-page-container .table-header-bar {
    padding: 18px 24px;
    border-bottom: 1px solid var(--border-color) !important;
    background: var(--table-header-bg);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .perf-page-container .table-header-title {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    color: var(--text-main);
    font-size: 16px;
  }

  .perf-page-container .table-wrap {
    overflow-x: auto;
  }

  .perf-page-container .custom-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  
  .perf-page-container .custom-table th {
    padding: 12px 20px;
    text-align: left;
    font-weight: 700;
    color: var(--text-muted);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    border-bottom: 2px solid var(--border-color) !important;
    background: var(--table-header-bg);
    white-space: nowrap;
  }
  
  .perf-page-container .custom-table td {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color) !important;
    color: var(--text-main);
    vertical-align: middle;
    transition: background-color 0.15s ease;
  }
  
  .perf-page-container .custom-table tbody tr:last-child td {
    border-bottom: none !important;
  }
  
  .perf-page-container .custom-table tbody tr {
    background: transparent !important;
  }

  .perf-page-container .custom-table tbody tr:hover td {
    background: var(--hover-row-bg) !important;
  }

  /* Badge styling */
  .perf-page-container .plan-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    display: inline-block;
  }
  
  .perf-page-container .plan-badge.gold {
    background: rgba(202, 138, 4, 0.08);
    color: #ca8a04;
    border: 1px solid rgba(202, 138, 4, 0.2);
  }
  .perf-page-container .plan-badge.silver {
    background: rgba(71, 85, 105, 0.08);
    color: #475569;
    border: 1px solid rgba(71, 85, 105, 0.2);
  }
  .perf-page-container .plan-badge.bronze {
    background: rgba(180, 83, 9, 0.08);
    color: #b45309;
    border: 1px solid rgba(180, 83, 9, 0.2);
  }
  .perf-page-container .plan-badge.trial {
    background: rgba(124, 58, 237, 0.08);
    color: #7c3aed;
    border: 1px solid rgba(124, 58, 237, 0.2);
  }
  .perf-page-container .plan-badge.verification {
    background: rgba(239, 68, 68, 0.08);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }
  
  .perf-page-container .refund-strike {
    text-decoration: line-through;
    color: #ef4444;
    font-weight: 700;
  }
  
  .perf-page-container .btn-theme-toggle {
    background: var(--bg-card);
    border: 1.5px solid var(--border-color);
    color: var(--text-main);
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--card-shadow);
  }
  
  .perf-page-container .btn-theme-toggle:hover {
    background: var(--bg-input);
    border-color: var(--primary);
    transform: translateY(-1px);
  }

  /* Table cards for mobile layout */
  @media (max-width: 768px) {
    .perf-page-container .custom-table thead { display: none; }
    .perf-page-container .custom-table tbody,
    .perf-page-container .custom-table tr,
    .perf-page-container .custom-table td { display: block; width: 100%; box-sizing: border-box; }
    .perf-page-container .custom-table tr { border-bottom: 2px solid var(--border-color) !important; padding: 16px; position: relative; }
    .perf-page-container .custom-table td { padding: 8px 0; border: none !important; font-size: 13px; display: flex; justify-content: space-between; align-items: center; text-align: right; }
    .perf-page-container .custom-table td::before { content: attr(data-label); font-weight: 700; color: var(--text-muted); font-size: 11px; text-transform: uppercase; float: left; text-align: left; }
    .perf-page-container .custom-table tbody tr:hover td { background: transparent !important; }
    .perf-page-container .custom-table tbody tr:hover { background: var(--hover-row-bg) !important; }
  }
`;

export default function PlanCanceling() {
    const [payments, setPayments] = useState([]);
    const [loading,  setLoading]  = useState(true);
    
    const [localTheme, setLocalTheme] = useState(() => {
        const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
        return match ? match[1] : 'dark';
    });

    useEffect(() => {
        axios.get(`${API_URL}/api/admin/payments`, { withCredentials: true })
            .then(r => {
                setPayments(r.data.filter(p => p.status === 'refunded'));
                setLoading(false);
            }).catch(() => setLoading(false));
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

    const toggleTheme = () => {
        const next = localTheme === 'dark' ? 'light' : 'dark';
        document.cookie = `charts_theme=${next}; path=/; max-age=31536000`;
        setLocalTheme(next);
    };

    const totalRefunded = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const revenueLost = payments.filter(p => p.type !== 'verification').reduce((s, p) => s + (p.amount || 0), 0);

    const isDark = localTheme === 'dark';
    
    const summaryCards = [
        { 
            label: 'Total Cancelled', 
            value: payments.length, 
            icon: '❌', 
            style: isDark 
                ? { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.06)', border: 'rgba(244, 63, 94, 0.15)' }
                : { color: '#ef4444', bg: '#fef2f2', border: '#fecdd3' }
        },
        { 
            label: 'Total Refunded',  
            value: `₹${totalRefunded}`, 
            icon: '💸', 
            style: isDark 
                ? { color: '#fb7185', bg: 'rgba(251, 113, 133, 0.06)', border: 'rgba(251, 113, 133, 0.15)' }
                : { color: '#dc2626', bg: '#fff1f2', border: '#fca5a5' }
        },
        { 
            label: 'Plan Revenue Lost', 
            value: `₹${revenueLost}`, 
            icon: '📉', 
            style: isDark 
                ? { color: '#fda4af', bg: 'rgba(253, 164, 175, 0.06)', border: 'rgba(253, 164, 175, 0.15)' }
                : { color: '#b91c1c', bg: '#fef2f2', border: '#fecdd3' }
        },
    ];

    return (
        <div className={`perf-page-container ${localTheme}`}>
            <style>{PLAN_CANCELING_STYLES}</style>
            
            <div className="pg-wrap">
                <div className="pg-header">
                    <div>
                        <h1 className="pg-title">Plan Canceling <span style={{color:'var(--primary)'}}>.</span></h1>
                        <p className="pg-sub">All refunded & cancelled plans</p>
                    </div>
                    <button 
                        onClick={toggleTheme} 
                        className="btn-theme-toggle"
                        title={`Switch to ${localTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    >
                        {localTheme === 'dark' ? '☀️' : '🌙'}
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="summary-grid">
                    {summaryCards.map(c => (
                        <div 
                            key={c.label} 
                            className="stat-card" 
                            style={{ 
                                background: c.style.bg, 
                                borderColor: c.style.border 
                            }}
                        >
                            <div className="stat-icon-wrap" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                {c.icon}
                            </div>
                            <div className="stat-val" style={{ color: c.style.color }}>{c.value}</div>
                            <div className="stat-label" style={{ color: c.style.color }}>{c.label}</div>
                        </div>
                    ))}
                </div>

                {/* Table Container */}
                <div className="table-card">
                    <div className="table-header-bar">
                        <span style={{ fontSize: 18, color: 'var(--cancel-badge-text)' }}>↩</span>
                        <span className="table-header-title" style={{ color: 'var(--cancel-badge-text)' }}>
                            Cancelled Plans ({payments.length})
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div className="spin" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--border-color)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                            <div>Loading records...</div>
                        </div>
                    ) : payments.length === 0 ? (
                        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                            <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: 18 }}>No cancelled plans</div>
                            <div style={{ fontSize: 14, marginTop: 6 }}>All subscription plans are currently active</div>
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="custom-table">
                                <thead>
                                    <tr>
                                        {['#', 'Date', 'User', 'Plan', 'Amount', 'Razorpay ID / UTR', 'Admin Note'].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p, i) => (
                                        <tr key={p._id}>
                                            <td data-label="#">
                                                <span style={{ color: 'var(--cancel-badge-text)', fontWeight: 800 }}>{i + 1}</span>
                                            </td>
                                            <td data-label="Date" style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                {new Date(p.reviewedAt || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td data-label="User">
                                                <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{p.userName || '—'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.userEmail || ''}</div>
                                            </td>
                                            <td data-label="Plan">
                                                <span className={`plan-badge ${p.plan ? p.plan.toLowerCase() : 'verification'}`}>
                                                    {p.plan ? p.plan.charAt(0).toUpperCase() + p.plan.slice(1) : 'Verification'}
                                                </span>
                                            </td>
                                            <td data-label="Amount">
                                                <span className="refund-strike">₹{p.amount}</span>
                                            </td>
                                            <td data-label="Razorpay ID / UTR" style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                                                {p.razorpay_payment_id || p.utr || '—'}
                                            </td>
                                            <td data-label="Admin Note" style={{ fontSize: 12, color: 'var(--cancel-badge-text)', fontWeight: 500, maxWidth: 240, wordBreak: 'break-word' }}>
                                                {p.adminNote || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--border-color)', background: isDark ? 'rgba(239, 68, 68, 0.04)' : '#fff1f2' }}>
                                        <td colSpan={4} style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--cancel-badge-text)' }}>
                                            Total Refunded Revenue
                                        </td>
                                        <td style={{ padding: '16px 20px', fontWeight: 900, color: 'var(--cancel-badge-text)', fontSize: 16 }}>
                                            <span className="refund-strike">₹{totalRefunded}</span>
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
