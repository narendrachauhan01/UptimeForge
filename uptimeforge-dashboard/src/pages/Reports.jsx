import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const STYLES = `
  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
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
    position: relative;
  }

  /* Ambient background glow */
  .perf-bg-glow-1 {
    position: absolute;
    top: -150px;
    right: 5%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(124, 58, 237, 0.05) 0%, rgba(124, 58, 237, 0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  .rpt-page.dark .perf-bg-glow-1 {
    background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0) 70%);
  }

  /* Light Theme */
  .rpt-page.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-card-sub: #f1f5f9;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --table-header-bg: #f8fafc;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
    --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --primary-glow: rgba(124, 58, 237, 0.05);
    --primary-glow-30: rgba(124, 58, 237, 0.2);
    --primary-glow-border: rgba(124, 58, 237, 0.3);
    --active-bg: rgba(124, 58, 237, 0.04);
    --active-shadow: 0 4px 15px rgba(124, 58, 237, 0.08);
    --icon-bg: #f8fafc;
    --icon-active-bg: rgba(124, 58, 237, 0.05);
    --modal-shadow: 0 24px 60px rgba(15, 23, 42, 0.15);
  }

  /* Dark Theme */
  .rpt-page.dark {
    --bg-primary: #0b0f19;
    --bg-card: #0d121f;
    --bg-card-sub: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.06);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --table-header-bg: #131a26;
    --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
    --primary: #a78bfa;
    --primary-hover: #8b5cf6;
    --primary-glow: rgba(139, 92, 246, 0.1);
    --primary-glow-30: rgba(139, 92, 246, 0.3);
    --primary-glow-border: rgba(139, 92, 246, 0.4);
    --active-bg: rgba(139, 92, 246, 0.06);
    --active-shadow: 0 4px 25px rgba(139, 92, 246, 0.15);
    --icon-bg: #0b0f19;
    --icon-active-bg: rgba(139, 92, 246, 0.08);
    --modal-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  }

  .rpt-wrap {
    padding: 28px 24px;
    max-width: 960px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .rpt-head {
    margin-bottom: 28px;
  }

  .rpt-title {
    font-family: 'Outfit', sans-serif;
    font-size: 32px;
    font-weight: 900;
    letter-spacing: -0.8px;
    margin: 0;
  }

  .rpt-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 8px 0 0;
    line-height: 1.5;
  }

  .rpt-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 24px;
    box-shadow: var(--card-shadow);
    transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
  }
  .rpt-card:hover {
    box-shadow: var(--card-hover-shadow);
  }

  .rpt-card-head {
    padding: 18px 24px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .rpt-card-title {
    font-family: 'Outfit', sans-serif;
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
  }

  .rpt-body {
    padding: 24px;
  }

  /* How it works grid */
  .how-work-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .how-work-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border-radius: 14px;
    background: var(--bg-card-sub);
    border: 1px solid var(--border-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .how-work-card:hover {
    transform: translateY(-2px);
    border-color: var(--primary);
    box-shadow: var(--card-hover-shadow);
  }
  .how-work-num-badge {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%);
    border: 1px solid rgba(124, 58, 237, 0.25);
    color: var(--primary);
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .how-work-card-title {
    font-size: 13.5px;
    font-weight: 700;
    color: var(--text-main);
    margin: 0 0 6px 0;
  }
  .how-work-card-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0;
  }

  .schedule-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
    margin-bottom: 24px;
  }

  .sch-btn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 20px;
    border-radius: 16px;
    border: 1.5px solid var(--border-color);
    background: var(--bg-card);
    cursor: pointer;
    text-align: left;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }
  .sch-btn:hover:not(:disabled) {
    border-color: var(--primary-glow-border);
    transform: translateY(-3px);
    box-shadow: var(--card-hover-shadow);
  }
  .sch-btn.active {
    border-color: var(--primary);
    background: var(--active-bg);
    box-shadow: var(--active-shadow);
  }

  .sch-icon-svg {
    width: 36px;
    height: 36px;
    stroke: var(--text-muted);
    margin-bottom: 16px;
    transition: stroke 0.3s, transform 0.3s;
  }
  .sch-btn:hover .sch-icon-svg {
    transform: scale(1.08) rotate(2deg);
  }
  .sch-btn.active .sch-icon-svg {
    stroke: var(--primary);
  }

  .sch-btn-label {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-main);
  }
  .sch-btn-desc {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
  }
  .sch-btn.active .sch-btn-label {
    color: var(--primary);
  }

  .sch-active-dot {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px var(--primary-glow-30);
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
    border-radius: 10px;
    padding: 12px 24px;
    font-weight: 700;
    font-size: 13.5px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.25s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.35);
  }
  .btn-primary:active:not(:disabled) {
    transform: translateY(0);
  }
  .btn-primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
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
    padding: 16px 20px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.6;
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.3s;
  }

  .report-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
  }

  .report-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-radius: 14px;
    border: 1px solid var(--border-color);
    background: var(--bg-card-sub);
    gap: 16px;
    flex-wrap: wrap;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }
  .report-item::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 4px;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s;
  }
  .report-item.weekly::before {
    background: #3b82f6;
  }
  .report-item.monthly::before {
    background: #a78bfa;
  }
  .report-item:hover {
    border-color: var(--primary-glow-border);
    transform: translateX(3px);
    box-shadow: var(--card-hover-shadow);
  }
  .report-item:hover::before {
    top: 0;
    bottom: 0;
    border-radius: 0;
  }

  .report-doc-icon {
    width: 20px;
    height: 20px;
    stroke: var(--text-muted);
    flex-shrink: 0;
    background: var(--icon-bg);
    padding: 10px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    transition: all 0.3s;
  }
  .report-item:hover .report-doc-icon {
    stroke: var(--primary);
    background: var(--icon-active-bg);
    border-color: var(--primary-glow-30);
  }

  .report-info {
    flex: 1;
    min-width: 0;
  }

  .report-title-txt {
    font-size: 14.5px;
    font-weight: 700;
    color: var(--text-main);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .report-meta-txt {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.4;
  }

  .badge-type {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-weekly {
    background: rgba(59, 130, 246, 0.1);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }
  .badge-monthly {
    background: rgba(167, 139, 250, 0.1);
    color: #c084fc;
    border: 1px solid rgba(167, 139, 250, 0.2);
  }
  .rpt-page.light .badge-weekly {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }
  .rpt-page.light .badge-monthly {
    background: #f5f3ff;
    color: #7c3aed;
    border: 1px solid #ddd6fe;
  }

  .report-actions {
    display: flex;
    gap: 10px;
    flex-shrink: 0;
  }

  .btn-download {
    background: var(--bg-card);
    color: var(--text-main);
    border: 1.5px solid var(--border-color);
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s;
  }
  .btn-download:hover:not(:disabled) {
    border-color: var(--primary);
    color: var(--primary);
    background: var(--icon-active-bg);
  }
  .btn-download:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-del {
    background: rgba(239, 68, 68, 0.05);
    color: #ef4444;
    border: 1.5px solid rgba(239, 68, 68, 0.15);
    border-radius: 10px;
    padding: 10px;
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
    transform: scale(1.05);
  }

  .empty-state {
    text-align: center;
    padding: 60px 24px;
    color: var(--text-muted);
  }
  .empty-icon-svg {
    width: 48px;
    height: 48px;
    stroke: var(--text-muted);
    opacity: 0.5;
    margin-bottom: 16px;
  }
  .empty-txt {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-main);
  }
  .empty-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 8px;
    max-width: 340px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
  }

  .toast-container {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast-box {
    pointer-events: auto;
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 600;
    font-size: 13.5px;
    border: 1px solid transparent;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes slideInRight {
    from { transform: translateX(100%) translateY(-10px); opacity: 0; }
    to { transform: translateX(0) translateY(0); opacity: 1; }
  }

  /* Delete Confirm Modal */
  .del-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 15, 25, 0.65);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  .del-modal {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 36px 32px 28px;
    width: 100%;
    max-width: 400px;
    box-shadow: var(--modal-shadow);
    text-align: center;
    animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    overflow: hidden;
  }
  @keyframes slideUp { from { opacity:0; transform:translateY(18px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }

  .del-icon-wrap {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: rgba(239, 68, 68, 0.1);
    border: 1.5px solid rgba(239, 68, 68, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
  }

  .del-modal-title {
    font-family: 'Outfit', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: var(--text-main);
    margin: 0 0 10px;
    letter-spacing: -0.3px;
  }

  .del-modal-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 28px;
    line-height: 1.5;
  }

  .del-modal-actions {
    display: flex;
    gap: 12px;
  }

  .del-btn-cancel {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1.5px solid var(--border-color);
    background: var(--bg-card-sub);
    color: var(--text-main);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
  }
  .del-btn-cancel:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  .del-btn-confirm {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(239,68,68,0.25);
  }
  .del-btn-confirm:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(239,68,68,0.35);
  }
`;

export default function Reports() {
    const [reports,  setReports]  = useState([]);
    const [schedule, setSchedule] = useState('none');
    const [loading,  setLoading]  = useState(true);
    const [genLoading, setGenLoading] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [downloading, setDownloading] = useState(null);
    const [toast,    setToast]    = useState('');
    const [delConfirm, setDelConfirm] = useState(null); // report id to delete

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
        if (localTheme === 'dark') {
            document.body.classList.add('charts-dark-theme');
        } else {
            document.body.classList.remove('charts-dark-theme');
        }
        return () => {
            const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
            const currentTheme = match ? match[1] : 'dark';
            if (currentTheme !== 'dark') {
                document.body.classList.remove('charts-dark-theme');
            }
        };
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

    // Auto-refresh every 30s to pick up cron-generated reports
    useEffect(() => {
        const iv = setInterval(load, 30000);
        return () => clearInterval(iv);
    }, [load]);

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

    const download = async (id, title) => {
        setDownloading(id);
        try {
            const res = await axios.get(`${API_URL}/api/reports/${id}/pdf`, {
                withCredentials: true,
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${title || 'report'}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('✅ PDF downloaded!');
        } catch {
            showToast('❌ PDF generation failed. Please try again.');
        }
        setDownloading(null);
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
        ? { background: toastOk ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', border: `1px solid ${toastOk ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`, color: toastOk ? '#34d399' : '#f87171' }
        : { background: toastOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toastOk ? '#bbf7d0' : '#fecdd3'}`, color: toastOk ? '#16a34a' : '#dc2626' }
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
            
            {/* Background glows for premium ambient feel */}
            <div className="perf-bg-glow-1" />

            {delConfirm && (
                <div className="del-overlay" onClick={() => setDelConfirm(null)}>
                    <div className="del-modal" onClick={e => e.stopPropagation()}>
                        <div className="del-icon-wrap">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </div>
                        <h3 className="del-modal-title">Delete Report?</h3>
                        <p className="del-modal-sub">This report will be permanently deleted.<br />This action cannot be undone.</p>
                        <div className="del-modal-actions">
                            <button className="del-btn-cancel" onClick={() => setDelConfirm(null)}>Cancel</button>
                            <button className="del-btn-confirm" onClick={() => { remove(delConfirm); setDelConfirm(null); }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="toast-container">
                {toast && <div className="toast-box" style={toastStyle}>{toast}</div>}
            </div>

            <div className="rpt-wrap">
                <div className="rpt-head">
                    <h1 className="rpt-title" style={{ color: 'var(--text-main)' }}>Reports<span style={{ color:'#7c3aed' }}>.</span></h1>
                    <p className="rpt-sub">Generate and download weekly or monthly monitoring reports</p>
                </div>

                {/* How it works */}
                <div className="rpt-card" style={{ marginBottom: 24 }}>
                    <div className="rpt-card-head"><span className="rpt-card-title">How Reports Work</span></div>
                    <div className="rpt-body">
                        <div className="how-work-grid">
                            {[
                                { num: '01', title: 'Choose a Schedule', desc: 'Select Weekly or Monthly. Your choice is saved instantly.' },
                                { num: '02', title: 'Auto-Generates', desc: 'Weekly on Mondays at 8:00 AM. Monthly on the 1st at 8:00 AM.' },
                                { num: '03', title: 'Always Fresh', desc: 'Keeps only the latest report per type, replacing the old one automatically.' },
                                { num: '04', title: 'Generate Anytime', desc: 'Click "Generate Now" to instantly create a new report on-demand.' },
                            ].map(s => (
                                <div key={s.title} className="how-work-card">
                                    <div className="how-work-num-badge">{s.num}</div>
                                    <div className="how-work-content">
                                        <h4 className="how-work-card-title">{s.title}</h4>
                                        <p className="how-work-card-desc">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Schedule selector */}
                <div className="rpt-card">
                    <div className="rpt-card-head"><span className="rpt-card-title">Report Schedule</span></div>
                    <div className="rpt-body">
                        <div className="schedule-row">
                            {SCHEDULE_OPTIONS.map(opt => (
                                <button key={opt.key} className={`sch-btn${schedule === opt.key ? ' active' : ''}`} onClick={() => handleSchedule(opt.key)} disabled={savingSchedule}>
                                    {schedule === opt.key && (
                                        <div className="sch-active-dot">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        </div>
                                    )}
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
                                <span style={{ fontSize:13.5, color:'var(--text-muted)', fontWeight: 500 }}>Select Weekly or Monthly schedule to enable</span>
                            )}
                        </div>

                        {schedule !== 'none' && (
                            <div className="info-banner" style={{ background: isDark ? 'rgba(124,58,237,.07)' : 'rgba(124,58,237,.06)', border:'1px solid rgba(124,58,237,.15)', color: isDark ? '#a78bfa' : '#6d28d9' }}>
                                <div>
                                    {schedule === 'weekly'
                                        ? '📅 Weekly reports auto-generate every Monday at 8:00 AM. Only the latest 1 report is kept.'
                                        : '🗓️ Monthly reports auto-generate on the 1st of each month at 8:00 AM. Only the latest 1 report is kept.'}
                                </div>
                                <div style={{ fontSize:12, opacity:.8, marginTop: 4, fontWeight: 500 }}>
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
                            <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 24, height: 24, margin: '0 auto 16px' }} />
                            <div style={{ fontSize:13.5, color:'var(--text-muted)' }}>Loading reports...</div>
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
                                <div key={r._id} className={`report-item ${r.type}`}>
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
                                        <button className="btn-download" onClick={() => download(r._id, r.title)} disabled={downloading === r._id}>
                                            {downloading === r._id ? (
                                                <>
                                                    <div className="spinner" style={{ width:12, height:12, borderWidth:2, borderColor:'rgba(0,0,0,0.15)', borderTopColor:'currentColor' }} />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 2 }}>
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="7 10 12 15 17 10" />
                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                    </svg>
                                                    Download PDF
                                                </>
                                            )}
                                        </button>
                                        <button className="btn-del" onClick={() => setDelConfirm(r._id)} aria-label="Delete report">
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
