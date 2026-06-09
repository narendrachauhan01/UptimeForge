import React, { useEffect, useState, useCallback } from 'react';
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage, getAllStatusServers } from '../api';

const BASE = 'https://status.narendrasingh.site';

export default function AdminStatusPages() {
  const [pages, setPages]     = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [copied, setCopied]   = useState('');
  const [search, setSearch]   = useState('');

  const [form, setForm] = useState({ slug: '', title: '', description: '', monitors: [], isPublic: true });

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

  const load = useCallback(() => {
    Promise.all([getStatusPages(), getAllStatusServers()])
      .then(([p, s]) => { setPages(p.data); setServers(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleMonitor = (id) => setForm(f => ({
    ...f,
    monitors: f.monitors.includes(id) ? f.monitors.filter(m => m !== id) : [...f.monitors, id],
  }));

  const selectAllMonitors = () => setForm(f => ({
    ...f,
    monitors: servers.map(s => s._id),
  }));

  const clearAllMonitors = () => setForm(f => ({
    ...f,
    monitors: [],
  }));

  const openCreate = () => {
    setForm({ slug: '', title: '', description: '', monitors: [], isPublic: true });
    setSearch(''); setErr(''); setModal('create');
  };

  const openEdit = (page) => {
    setForm({
      slug: page.slug, title: page.title,
      description: page.description || '',
      monitors: page.monitors.map(m => m._id || m),
      isPublic: page.isPublic !== false,
    });
    setSearch(''); setErr(''); setModal(page);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setForm(f => {
      const updated = { ...f, title: val };
      if (modal === 'create') {
        const cleanSlug = val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        updated.slug = cleanSlug;
      }
      return updated;
    });
  };

  const save = async () => {
    if (!form.title) return setErr('Page title is required.');
    if (!form.slug) return setErr('URL slug is required.');
    if (!/^[a-z0-9-]+$/.test(form.slug)) return setErr('Slug: lowercase letters, numbers, hyphens only.');
    setSaving(true); setErr('');
    try {
      if (modal === 'create') await createStatusPage(form);
      else await updateStatusPage(modal._id, form);
      setModal(null); load();
    } catch (e) { setErr(e.response?.data?.error || 'Something went wrong.'); }
    finally { setSaving(false); }
  };

  const del = async (id) => { await deleteStatusPage(id); setDelConfirm(null); load(); };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text); setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const filteredServers = servers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.url || '').toLowerCase().includes(search.toLowerCase())
  );

  const publicCount  = pages.filter(p => p.isPublic !== false).length;

  const STYLES = `
    body.charts-dark-theme {
      background-color: #0b0f19 !important;
    }
    body.charts-dark-theme .app-main,
    body.charts-dark-theme .content {
      background-color: #0b0f19 !important;
      transition: background-color 0.3s ease;
    }

    .asp-page-container {
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
    .asp-page-container.dark .perf-bg-glow-1 {
      background: radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0) 70%);
    }

    .perf-bg-glow-2 {
      position: absolute;
      bottom: -150px;
      left: 5%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, rgba(59, 130, 246, 0) 70%);
      pointer-events: none;
      z-index: 0;
    }
    .asp-page-container.dark .perf-bg-glow-2 {
      background: radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, rgba(59, 130, 246, 0) 70%);
    }

    /* Light Theme Variables */
    .asp-page-container.light {
      --bg-primary: #f8fafc;
      --bg-card: #ffffff;
      --bg-card-sub: #f1f5f9;
      --bg-input: #f1f5f9;
      --border-color: rgba(226, 232, 240, 0.8);
      --text-main: #0f172a;
      --text-muted: #64748b;
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
      --modal-shadow: 0 24px 60px rgba(15, 23, 42, 0.15);
      --input-focus-shadow: rgba(124, 58, 237, 0.08);
      --card-glow-bg: linear-gradient(135deg, rgba(124, 58, 237, 0.02) 0%, rgba(79, 70, 229, 0.02) 100%);
    }

    /* Dark Theme Variables */
    .asp-page-container.dark {
      --bg-primary: #0b0f19;
      --bg-card: #0d121f;
      --bg-card-sub: #131a26;
      --bg-input: #1b2535;
      --border-color: rgba(255, 255, 255, 0.06);
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
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
      --modal-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      --input-focus-shadow: rgba(139, 92, 246, 0.15);
      --card-glow-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(59, 130, 246, 0.03) 100%);
    }

    .asp-wrap {
      padding: 28px 24px;
      max-width: 1140px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .asp-topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }

    .asp-page-title {
      font-family: 'Outfit', sans-serif;
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.8px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .asp-title-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #7c3aed;
      display: inline-block;
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0% { transform: scale(0.9); opacity: 0.6; }
      50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 8px rgba(124, 58, 237, 0.8); }
      100% { transform: scale(0.9); opacity: 0.6; }
    }

    .asp-page-sub {
      font-size: 14px;
      color: var(--text-muted);
      margin: 8px 0 0;
      line-height: 1.5;
    }

    .asp-btn-new {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 4px 16px rgba(124, 58, 237, 0.25);
      font-family: inherit;
      white-space: nowrap;
    }
    .asp-btn-new:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
    }
    .asp-btn-new:active {
      transform: translateY(0);
    }

    .asp-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .asp-stat {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 18px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--card-shadow);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .asp-stat::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--card-glow-bg);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 0;
      pointer-events: none;
    }
    .asp-stat:hover {
      transform: translateY(-3px);
      box-shadow: var(--card-hover-shadow);
      border-color: var(--primary-glow-border);
    }
    .asp-stat:hover::after {
      opacity: 1;
    }
    .asp-stat > * {
      position: relative;
      z-index: 1;
    }

    .asp-stat-ico {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid transparent;
      transition: all 0.3s;
    }
    .asp-stat:hover .asp-stat-ico {
      transform: scale(1.08) rotate(3deg);
    }

    .asp-stat-val {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 900;
      color: var(--text-main);
      line-height: 1.1;
      margin-bottom: 3px;
    }

    .asp-stat-lbl {
      font-size: 11.5px;
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    .asp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }

    .asp-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: var(--card-shadow);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .asp-card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--card-glow-bg);
      opacity: 0;
      transition: opacity 0.3s;
      z-index: 0;
      pointer-events: none;
    }
    .asp-card:hover::after {
      opacity: 1;
    }
    .asp-card > * {
      position: relative;
      z-index: 1;
    }
    .asp-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 24px;
      bottom: 24px;
      width: 4px;
      border-radius: 0 4px 4px 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .asp-card.public::before {
      background: #10b981;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }
    .asp-card.private::before {
      background: #94a3b8;
    }
    .asp-card:hover::before {
      top: 0;
      bottom: 0;
      border-radius: 0;
      width: 5px;
    }
    .asp-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary-glow-border);
      box-shadow: var(--card-hover-shadow);
    }

    .asp-card-top {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .asp-card-ico {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--bg-card-sub);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .asp-card:hover .asp-card-ico {
      border-color: var(--primary-glow-30);
      background: var(--active-bg);
      transform: scale(1.05);
    }
    .asp-card-ico svg {
      stroke: var(--primary);
    }

    .asp-card-info {
      flex: 1;
      min-width: 0;
    }

    .asp-card-name {
      font-size: 17px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 5px;
      font-family: 'Outfit', sans-serif;
      line-height: 1.3;
    }

    .asp-card-desc {
      font-size: 12.5px;
      color: var(--text-muted);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;
    }

    .asp-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .asp-badge-pub {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    .asp-badge-priv {
      background: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .asp-page-container.light .asp-badge-pub {
      background: #ecfdf5;
      color: #059669;
      border-color: #a7f3d0;
    }
    .asp-page-container.light .asp-badge-priv {
      background: #f1f5f9;
      color: #475569;
      border-color: #cbd5e1;
    }

    /* URL Pill style */
    .asp-card-url-section {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card-sub);
      border: 1px solid var(--border-color);
      padding: 10px 14px;
      border-radius: 12px;
      transition: all 0.2s;
    }
    .asp-card-url-section:hover {
      border-color: var(--primary-glow-border);
      background: var(--active-bg);
    }
    .asp-card-url-text {
      flex: 1;
      font-size: 13px;
      color: var(--text-main);
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: color 0.2s;
    }
    .asp-card-url-text:hover {
      color: var(--primary);
    }
    .asp-card-url-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .asp-card-url-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .asp-card-url-btn:hover {
      color: var(--primary);
      background: var(--primary-glow-30);
    }
    .asp-card-url-btn.copy-active {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }

    /* Monitors indicators */
    .asp-card-monitors-box {
      border-top: 1px dashed var(--border-color);
      border-bottom: 1px dashed var(--border-color);
      padding: 14px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .asp-card-monitors-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 700;
    }
    .asp-card-monitors-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .asp-card-mon-dot-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    .asp-card-mon-dot-indicator.up {
      background: #10b981;
      box-shadow: 0 0 4px rgba(16, 185, 129, 0.4);
    }
    .asp-card-mon-dot-indicator.down {
      background: #ef4444;
      box-shadow: 0 0 4px rgba(239, 68, 68, 0.4);
    }
    .asp-card-mon-dot-indicator:hover {
      transform: scale(1.3);
      z-index: 2;
    }
    .asp-card-no-monitors {
      font-size: 12.5px;
      color: var(--text-muted);
      font-style: italic;
    }

    .text-success { color: #10b981 !important; }
    .text-warning { color: #f59e0b !important; }
    .text-danger { color: #ef4444 !important; }

    .asp-card-actions {
      display: flex;
      gap: 10px;
    }

    .asp-act-btn {
      flex: 1;
      padding: 10px 0;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      border: 1.5px solid var(--border-color);
      background: transparent;
      color: var(--text-main);
      transition: all 0.2s;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .asp-act-btn:hover {
      background: var(--active-bg);
      border-color: var(--primary);
      color: var(--primary);
    }
    .asp-act-btn.copy-btn {
      background: rgba(16, 185, 129, 0.03);
      border-color: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }
    .asp-act-btn.copy-btn:hover {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .asp-act-btn.del-btn {
      background: rgba(239, 68, 68, 0.03);
      border-color: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }
    .asp-act-btn.del-btn:hover {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.35);
    }

    .asp-empty-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 70px 20px;
      text-align: center;
      box-shadow: var(--card-shadow);
    }

    /* Drawer Overlay */
    .asp-overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 15, 25, 0.6);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      backdrop-filter: blur(8px);
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .asp-drawer {
      background: var(--bg-card);
      border-left: 1px solid var(--border-color);
      width: 100%;
      max-width: 480px;
      height: 100%;
      display: flex;
      flex-direction: column;
      animation: aspSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.2);
    }
    @keyframes aspSlide {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .asp-dhead {
      padding: 24px 28px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .asp-dtitle {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }

    .asp-dclose {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      border: 1.5px solid var(--border-color);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .asp-dclose:hover {
      background: rgba(239, 68, 68, 0.08);
      border-color: #ef4444;
      color: #ef4444;
    }

    .asp-dbody {
      flex: 1;
      overflow-y: auto;
      padding: 24px 28px;
    }

    .asp-dfoot {
      padding: 20px 28px;
      border-top: 1px solid var(--border-color);
      display: flex;
      gap: 12px;
      flex-shrink: 0;
    }

    .asp-field {
      margin-bottom: 20px;
    }

    .asp-label {
      display: block;
      font-size: 11px;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .asp-input {
      width: 100%;
      padding: 12px 16px;
      border: 1.5px solid var(--border-color);
      border-radius: 12px;
      background: var(--bg-input);
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 600;
      outline: none;
      box-sizing: border-box;
      transition: all 0.2s;
      font-family: inherit;
    }
    .asp-input:focus {
      border-color: var(--primary);
      background: var(--bg-card);
      box-shadow: 0 0 0 4px var(--input-focus-shadow);
    }

    .asp-slug-wrap {
      display: flex;
      align-items: center;
      border: 1.5px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      background: var(--bg-input);
      transition: all 0.2s;
    }
    .asp-slug-wrap:focus-within {
      border-color: var(--primary);
      background: var(--bg-card);
      box-shadow: 0 0 0 4px var(--input-focus-shadow);
    }

    .asp-slug-pre {
      padding: 12px 14px;
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(139, 92, 246, 0.05);
      border-right: 1.5px solid var(--border-color);
      white-space: nowrap;
      font-weight: 700;
    }

    .asp-slug-inp {
      flex: 1;
      padding: 12px 16px;
      border: none;
      background: transparent;
      color: var(--text-main);
      font-size: 13.5px;
      font-weight: 700;
      outline: none;
      font-family: inherit;
    }

    .asp-sec-lbl {
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 12px 0 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .asp-sec-lbl::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-color);
    }

    .asp-batch-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .asp-batch-btn {
      font-size: 11px;
      font-weight: 700;
      background: var(--bg-card-sub);
      color: var(--text-muted);
      border: 1px solid var(--border-color);
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .asp-batch-btn:hover {
      background: var(--active-bg);
      color: var(--primary);
      border-color: var(--primary);
    }

    .asp-mon-search {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-input);
      color: var(--text-main);
      font-size: 12.5px;
      font-weight: 600;
      outline: none;
      box-sizing: border-box;
      margin-bottom: 12px;
      font-family: inherit;
      transition: all 0.2s;
    }
    .asp-mon-search:focus {
      border-color: var(--primary);
      background: var(--bg-card);
    }

    .asp-mons-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .asp-mon-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1.5px solid var(--border-color);
      cursor: pointer;
      transition: all 0.2s;
      user-select: none;
    }
    .asp-mon-item.sel {
      border-color: var(--primary);
      background: var(--active-bg);
    }
    .asp-mon-item:hover:not(.sel) {
      border-color: var(--primary-glow-border);
    }

    .asp-mon-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .asp-mon-name {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .asp-mon-check {
      flex-shrink: 0;
      color: var(--primary);
    }

    .asp-toggle {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--active-bg);
      border: 1.5px solid var(--primary-glow-border);
      border-radius: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .asp-toggle:hover {
      border-color: var(--primary);
    }

    .asp-trk {
      width: 44px;
      height: 24px;
      border-radius: 12px;
      background: var(--border-color);
      position: relative;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .asp-trk.on {
      background: var(--primary);
    }

    .asp-tmb {
      width: 18px;
      height: 18px;
      border-radius: 9px;
      background: #fff;
      position: absolute;
      top: 3px;
      left: 3px;
      transition: transform 0.2s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    .asp-trk.on .asp-tmb {
      transform: translateX(20px);
    }

    .asp-err {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ef4444;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 12px;
    }

    .asp-btn-cancel {
      flex: 1;
      padding: 12px 0;
      border: 1.5px solid var(--border-color);
      border-radius: 12px;
      background: transparent;
      color: var(--text-main);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .asp-btn-cancel:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .asp-btn-save {
      flex: 2;
      padding: 12px 0;
      background: linear-gradient(135deg, #7c3aed, #4f46e5);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
      transition: all 0.25s;
    }
    .asp-btn-save:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
    }
    .asp-btn-save:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }

    .del-overlay {
      position: fixed;
      inset: 0;
      background: rgba(11, 15, 25, 0.65);
      backdrop-filter: blur(8px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }

    .del-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 24px;
      padding: 36px 32px 28px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: var(--modal-shadow);
      animation: slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(18px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }

    .del-ico {
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
    .del-box h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 10px;
      letter-spacing: -0.3px;
    }
    .del-box p {
      font-size: 14px;
      color: var(--text-muted);
      margin: 0 0 28px;
      line-height: 1.5;
    }
    .del-btns {
      display: flex;
      gap: 12px;
    }
    .del-cancel {
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
    .del-cancel:hover {
      border-color: var(--primary);
      color: var(--primary);
    }
    .del-confirm {
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
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }
    .del-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.35);
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
  `;

  return (
    <div className={`asp-page-container ${localTheme}`}>
      <style>{STYLES}</style>
      
      {/* Background glows for premium ambient feel */}
      <div className="perf-bg-glow-1" />
      <div className="perf-bg-glow-2" />

      <div className="asp-wrap">
        {/* Top */}
        <div className="asp-topbar">
          <div>
            <h1 className="asp-page-title" style={{ color: 'var(--text-main)' }}>
              Status Pages<span className="asp-title-dot" />
            </h1>
            <p className="asp-page-sub">Create public status pages — clients can view live uptime at status.narendrasingh.site</p>
          </div>
          <button className="asp-btn-new" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Status Page
          </button>
        </div>

        {/* Stats */}
        <div className="asp-stats">
          {[
            { val: pages.length, label: 'Total Pages', color: '#8b5cf6', bg: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', border: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg> },
            { val: publicCount, label: 'Public Pages',  color: '#10b981', bg: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.06)', border: isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
            { val: pages.length - publicCount, label: 'Private Pages', color: '#f59e0b', bg: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', border: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
            { val: servers.length, label: 'All Monitors', color: '#3b82f6', bg: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.06)', border: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
          ].map(s => (
            <div key={s.label} className="asp-stat" style={{ border: `1px solid ${s.border}` }}>
              <div className="asp-stat-ico" style={{ background: s.bg }}>{s.icon}</div>
              <div>
                <div className="asp-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="asp-stat-lbl">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cards */}
        {loading ? (
          <div className="asp-empty-box">
            <div className="spinner" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--primary)', width: 24, height: 24, margin: '0 auto 16px' }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13.5, fontWeight: 500 }}>Loading status pages...</div>
          </div>
        ) : pages.length === 0 ? (
          <div className="asp-empty-box">
            <div style={{ fontSize: 52, marginBottom: 16 }}>📡</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8, fontFamily: 'Outfit, sans-serif' }}>No status pages yet</h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px', lineHeight: 1.5 }}>Create a public page to share live uptime with your clients.</p>
            <button className="asp-btn-new" onClick={openCreate}>Create first status page</button>
          </div>
        ) : (
          <div className="asp-grid">
            {pages.map(page => {
              const pageMonitors = (page.monitors || []).map(mId => 
                servers.find(s => s._id === (mId._id || mId))
              ).filter(Boolean);

              const totalMonitors = pageMonitors.length;
              const onlineMonitors = pageMonitors.filter(m => m.status === 'up').length;
              const offlineMonitors = totalMonitors - onlineMonitors;

              return (
                <div key={page._id} className={`asp-card ${page.isPublic !== false ? 'public' : 'private'}`}>
                  <div className="asp-card-top">
                    <div className="asp-card-ico">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <div className="asp-card-info">
                      <p className="asp-card-name">{page.title}</p>
                      <p className="asp-card-desc">{page.description || 'No description'}</p>
                    </div>
                    <span className={`asp-badge ${page.isPublic !== false ? 'asp-badge-pub' : 'asp-badge-priv'}`}>
                      {page.isPublic !== false ? '● Public' : '● Private'}
                    </span>
                  </div>

                  {/* URL block */}
                  <div className="asp-card-url-section">
                    <a className="asp-card-url-text" href={`${BASE}/${page.slug}`} target="_blank" rel="noreferrer">
                      {BASE.replace(/^https?:\/\//, '')}/{page.slug}
                    </a>
                    <div className="asp-card-url-actions">
                      <button 
                        className={`asp-card-url-btn ${copied === page._id ? 'copy-active' : ''}`} 
                        onClick={() => copy(`${BASE}/${page.slug}`, page._id)}
                        title="Copy Link"
                      >
                        {copied === page._id ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
                      </button>
                      <a className="asp-card-url-btn" href={`${BASE}/${page.slug}`} target="_blank" rel="noreferrer" title="Open Link">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    </div>
                  </div>

                  {/* Live Monitors indicators */}
                  <div className="asp-card-monitors-box">
                    <div className="asp-card-monitors-header">
                      <span>MONITORS STATUS</span>
                      <span>
                        {totalMonitors > 0 ? (
                          <span>
                            <strong className={offlineMonitors > 0 ? 'text-warning' : 'text-success'}>
                              {onlineMonitors}/{totalMonitors}
                            </strong> Online
                          </span>
                        ) : '0 monitors'}
                      </span>
                    </div>
                    <div className="asp-card-monitors-strip">
                      {pageMonitors.map(m => (
                        <span 
                          key={m._id} 
                          className={`asp-card-mon-dot-indicator ${m.status === 'up' ? 'up' : 'down'}`}
                          title={`${m.name} (${m.status === 'up' ? 'Online' : 'Offline'})`}
                        />
                      ))}
                      {totalMonitors === 0 && (
                        <span className="asp-card-no-monitors">No monitors selected</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="asp-card-actions">
                    <button className="asp-act-btn" onClick={() => openEdit(page)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit Page
                    </button>
                    <button className="asp-act-btn del-btn" onClick={() => setDelConfirm(page._id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      {modal && (
        <div className="asp-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="asp-drawer" onClick={e => e.stopPropagation()}>
            <div className="asp-dhead">
              <h3 className="asp-dtitle">{modal === 'create' ? 'Create Status Page' : 'Edit Status Page'}</h3>
              <button className="asp-dclose" onClick={() => setModal(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="asp-dbody">
              {err && <div className="asp-err"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{err}</div>}

              <p className="asp-sec-lbl">Page Info</p>

              <div className="asp-field">
                <label className="asp-label">Page Title</label>
                <input 
                  className="asp-input" 
                  placeholder="e.g. UptimeForge Status" 
                  value={form.title} 
                  onChange={handleTitleChange} 
                />
              </div>

              <div className="asp-field">
                <label className="asp-label">Public URL Slug</label>
                <div className="asp-slug-wrap">
                  <span className="asp-slug-pre">status.narendrasingh.site/</span>
                  <input className="asp-slug-inp" placeholder="my-status" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
                </div>
              </div>

              <div className="asp-field">
                <label className="asp-label">Description <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                <input className="asp-input" placeholder="Live uptime for all services" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <p className="asp-sec-lbl" style={{ marginTop: 4 }}>
                Select Monitors
                <span style={{ fontWeight: 600, fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>({form.monitors.length}/{servers.length} selected)</span>
              </p>

              <div className="asp-batch-actions">
                <button type="button" className="asp-batch-btn" onClick={selectAllMonitors}>Select All</button>
                <button type="button" className="asp-batch-btn" onClick={clearAllMonitors}>Clear Selection</button>
              </div>

              <div className="asp-field">
                <input
                  className="asp-mon-search"
                  placeholder="Search monitors..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {filteredServers.length === 0 ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '8px 0', fontWeight: 500 }}>No monitors found.</div>
                ) : (
                  <div className="asp-mons-grid">
                    {filteredServers.map(s => {
                      const sel = form.monitors.includes(s._id);
                      return (
                        <div key={s._id} className={`asp-mon-item ${sel ? 'sel' : ''}`} onClick={() => toggleMonitor(s._id)}>
                          <div className="asp-mon-dot" style={{ background: s.status === 'up' ? '#10b981' : '#ef4444' }} />
                          <span className="asp-mon-name">{s.name}</span>
                          {sel && <svg className="asp-mon-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <p className="asp-sec-lbl" style={{ marginTop: 4 }}>Visibility</p>
              <div className="asp-toggle" onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))}>
                <div className={`asp-trk ${form.isPublic ? 'on' : ''}`}><div className="asp-tmb" /></div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{form.isPublic ? 'Publicly accessible' : 'Private (hidden)'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{form.isPublic ? 'Anyone with the link can view this page' : 'Not visible to the public'}</div>
                </div>
              </div>
            </div>

            <div className="asp-dfoot">
              <button className="asp-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="asp-btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : modal === 'create' ? 'Create Page' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {delConfirm && (
        <div className="del-overlay" onClick={e => e.target === e.currentTarget && setDelConfirm(null)}>
          <div className="del-box">
            <div className="del-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></div>
            <h3>Delete Status Page?</h3>
            <p>This cannot be undone. The public link will stop working immediately.</p>
            <div className="del-btns">
              <button className="del-cancel" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="del-confirm" onClick={() => del(delConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
