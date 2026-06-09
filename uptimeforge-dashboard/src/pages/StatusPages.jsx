import React, { useEffect, useState, useCallback } from 'react';
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage, getServers } from '../api';
import axios from 'axios';
import { API_URL } from '../api';

const BASE = window.location.origin;

export default function StatusPages() {
  const [pages, setPages]       = useState([]);
  const [servers, setServers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | {page}
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [copied, setCopied]     = useState('');

  const [form, setForm] = useState({ slug: '', title: '', description: '', monitors: [], isPublic: true });

  const authCfg = { withCredentials: true };

  const load = useCallback(() => {
    Promise.all([getStatusPages(), getServers()])
      .then(([p, s]) => { setPages(p.data); setServers(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ slug: '', title: '', description: '', monitors: [], isPublic: true });
    setErr('');
    setModal('create');
  };

  const openEdit = (page) => {
    setForm({ slug: page.slug, title: page.title, description: page.description || '', monitors: page.monitors.map(m => m._id || m), isPublic: page.isPublic !== false });
    setErr('');
    setModal(page);
  };

  const toggleMonitor = (id) => {
    setForm(f => ({
      ...f,
      monitors: f.monitors.includes(id) ? f.monitors.filter(m => m !== id) : [...f.monitors, id],
    }));
  };

  const save = async () => {
    if (!form.slug || !form.title) return setErr('Slug and title are required.');
    if (!/^[a-z0-9-]+$/.test(form.slug)) return setErr('Slug can only contain lowercase letters, numbers, and hyphens.');
    setSaving(true); setErr('');
    try {
      if (modal === 'create') await createStatusPage(form);
      else await updateStatusPage(modal._id, form);
      setModal(null);
      load();
    } catch (e) {
      setErr(e.response?.data?.error || 'Something went wrong.');
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    await deleteStatusPage(id);
    setDelConfirm(null);
    load();
  };

  const copy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const statusColor = { operational: '#10b981', degraded: '#f59e0b', outage: '#ef4444' };

  return (
    <div style={{ padding: '0 4px' }}>
      <style>{`
        .sp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
        .sp-title { font-family:'Outfit',sans-serif; font-size:28px; font-weight:800; color:var(--text-primary); letter-spacing:-0.8px; margin:0 0 4px; }
        .sp-sub { font-size:13px; color:var(--text-muted); margin:0; }
        .sp-btn-new { display:flex; align-items:center; gap:8px; padding:10px 20px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; box-shadow:0 4px 14px rgba(124,58,237,0.3); }
        .sp-btn-new:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(124,58,237,0.4); }
        .sp-empty { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:60px 20px; text-align:center; }
        .sp-empty-icon { font-size:48px; margin-bottom:12px; }
        .sp-card { background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; padding:22px 24px; margin-bottom:16px; display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
        .sp-card-main { flex:1; min-width:0; }
        .sp-card-name { font-family:'Plus Jakarta Sans',sans-serif; font-size:16px; font-weight:800; color:var(--text-primary); margin:0 0 4px; }
        .sp-card-desc { font-size:12px; color:var(--text-muted); margin:0 0 8px; }
        .sp-card-url { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#8b5cf6; font-weight:600; text-decoration:none; background:rgba(139,92,246,0.08); padding:4px 10px; border-radius:8px; }
        .sp-card-url:hover { background:rgba(139,92,246,0.15); }
        .sp-card-meta { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:8px; }
        .sp-badge { padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .sp-badge.pub { background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.25); }
        .sp-badge.priv { background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.2); }
        .sp-card-actions { display:flex; gap:8px; flex-shrink:0; }
        .sp-btn-act { display:flex; align-items:center; gap:5px; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1px solid var(--card-border); background:var(--card-bg); color:var(--text-primary); font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.15s; }
        .sp-btn-act:hover { background:rgba(139,92,246,0.1); border-color:#8b5cf6; color:#8b5cf6; }
        .sp-btn-act.del:hover { background:rgba(239,68,68,0.1); border-color:#ef4444; color:#ef4444; }
        .sp-btn-act.copy-btn { background:rgba(16,185,129,0.08); border-color:rgba(16,185,129,0.25); color:#10b981; }
        /* Modal */
        .sp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .sp-modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:28px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; }
        .sp-modal-title { font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:var(--text-primary); margin:0 0 20px; }
        .sp-field { margin-bottom:16px; }
        .sp-label { display:block; font-size:12px; font-weight:700; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
        .sp-input { width:100%; padding:10px 14px; border:1.5px solid var(--card-border); border-radius:12px; background:var(--bg-primary); color:var(--text-primary); font-size:13px; font-weight:600; font-family:'Plus Jakarta Sans',sans-serif; outline:none; box-sizing:border-box; transition:all 0.2s; }
        .sp-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .sp-slug-wrap { display:flex; align-items:center; border:1.5px solid var(--card-border); border-radius:12px; overflow:hidden; background:var(--bg-primary); transition:all 0.2s; }
        .sp-slug-wrap:focus-within { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .sp-slug-prefix { padding:10px 12px; font-size:12px; color:var(--text-muted); background:rgba(139,92,246,0.06); border-right:1px solid var(--card-border); white-space:nowrap; font-weight:600; }
        .sp-slug-input { flex:1; padding:10px 14px; border:none; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; font-family:'Plus Jakarta Sans',sans-serif; outline:none; }
        .sp-monitors-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:200px; overflow-y:auto; }
        .sp-mon-item { display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:10px; border:1.5px solid var(--card-border); cursor:pointer; transition:all 0.15s; }
        .sp-mon-item.sel { border-color:#8b5cf6; background:rgba(139,92,246,0.08); }
        .sp-mon-item:hover { border-color:#8b5cf6; }
        .sp-mon-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .sp-mon-name { font-size:12px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sp-modal-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:24px; }
        .sp-btn-cancel { padding:10px 20px; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .sp-btn-save { padding:10px 24px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.2s; }
        .sp-btn-save:disabled { opacity:0.6; cursor:not-allowed; }
        .sp-err { color:#ef4444; font-size:12px; font-weight:600; margin-bottom:12px; padding:8px 12px; background:rgba(239,68,68,0.08); border-radius:8px; }
        /* del modal */
        .del-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1100; display:flex; align-items:center; justify-content:center; }
        .del-modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:32px 28px; max-width:360px; width:90%; text-align:center; }
        .del-icon-wrap { width:56px; height:56px; border-radius:16px; background:rgba(239,68,68,0.1); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; }
        .del-modal h3 { font-size:18px; font-weight:800; color:var(--text-primary); margin:0 0 8px; font-family:'Outfit',sans-serif; }
        .del-modal p { font-size:13px; color:var(--text-muted); margin:0 0 24px; }
        .del-modal-btns { display:flex; gap:10px; justify-content:center; }
        .del-btn-cancel { padding:10px 22px; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-weight:700; font-size:13px; cursor:pointer; }
        .del-btn-confirm { padding:10px 22px; background:#ef4444; color:#fff; border:none; border-radius:12px; font-weight:700; font-size:13px; cursor:pointer; }
      `}</style>

      <div className="sp-header">
        <div>
          <h1 className="sp-title">Status Pages</h1>
          <p className="sp-sub">Public pages to show your clients the live status of their services</p>
        </div>
        <button className="sp-btn-new" onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Status Page
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading...</div>
      ) : pages.length === 0 ? (
        <div className="sp-empty">
          <div className="sp-empty-icon">📡</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>No status pages yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Create a public status page to share live uptime with your clients.</div>
          <button className="sp-btn-new" onClick={openCreate}>Create your first status page</button>
        </div>
      ) : (
        pages.map(page => (
          <div key={page._id} className="sp-card">
            <div className="sp-card-main">
              <p className="sp-card-name">{page.title}</p>
              {page.description && <p className="sp-card-desc">{page.description}</p>}
              <a className="sp-card-url" href={`/status/${page.slug}`} target="_blank" rel="noreferrer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                /status/{page.slug}
              </a>
              <div className="sp-card-meta">
                <span className={`sp-badge ${page.isPublic !== false ? 'pub' : 'priv'}`}>{page.isPublic !== false ? '🌐 Public' : '🔒 Private'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(page.monitors?.length || 0)} monitor{page.monitors?.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="sp-card-actions">
              <button className="sp-btn-act copy-btn" onClick={() => copy(`${BASE}/status/${page.slug}`, page._id)}>
                {copied === page._id ? '✓ Copied' : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Link</>
                )}
              </button>
              <button className="sp-btn-act" onClick={() => openEdit(page)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button className="sp-btn-act del" onClick={() => setDelConfirm(page._id)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                Delete
              </button>
            </div>
          </div>
        ))
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="sp-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="sp-modal">
            <h3 className="sp-modal-title">{modal === 'create' ? 'Create Status Page' : 'Edit Status Page'}</h3>
            {err && <div className="sp-err">{err}</div>}

            <div className="sp-field">
              <label className="sp-label">Page Title</label>
              <input className="sp-input" placeholder="e.g. Acme Corp Status" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="sp-field">
              <label className="sp-label">Public URL Slug</label>
              <div className="sp-slug-wrap">
                <span className="sp-slug-prefix">{BASE}/status/</span>
                <input className="sp-slug-input" placeholder="acme-corp" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">Description (optional)</label>
              <input className="sp-input" placeholder="Live status for all Acme services" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="sp-field">
              <label className="sp-label">Select Monitors to Show ({form.monitors.length} selected)</label>
              <div className="sp-monitors-grid">
                {servers.map(s => (
                  <div key={s._id} className={`sp-mon-item ${form.monitors.includes(s._id) ? 'sel' : ''}`} onClick={() => toggleMonitor(s._id)}>
                    <div className="sp-mon-dot" style={{ background: s.status === 'up' ? '#10b981' : '#ef4444' }} />
                    <span className="sp-mon-name">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sp-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="sp-pub" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#7c3aed' }} />
              <label htmlFor="sp-pub" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Make this page publicly accessible</label>
            </div>

            <div className="sp-modal-footer">
              <button className="sp-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="sp-btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Page'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delConfirm && (
        <div className="del-overlay" onClick={e => e.target === e.currentTarget && setDelConfirm(null)}>
          <div className="del-modal">
            <div className="del-icon-wrap">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </div>
            <h3>Delete Status Page?</h3>
            <p>This action cannot be undone. The public link will stop working.</p>
            <div className="del-modal-btns">
              <button className="del-btn-cancel" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="del-btn-confirm" onClick={() => del(delConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
