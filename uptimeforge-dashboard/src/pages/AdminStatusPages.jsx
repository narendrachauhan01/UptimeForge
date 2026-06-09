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

  return (
    <div>
      <style>{`
        .asp-topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:28px; flex-wrap:wrap; }
        .asp-page-title { font-family:'Outfit',sans-serif; font-size:26px; font-weight:800; color:var(--text-primary); letter-spacing:-0.5px; margin:0 0 4px; }
        .asp-page-sub { font-size:13px; color:var(--text-muted); margin:0; }
        .asp-btn-new { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 16px rgba(124,58,237,0.35); font-family:'Plus Jakarta Sans',sans-serif; white-space:nowrap; }
        .asp-btn-new:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(124,58,237,0.45); }

        .asp-stats { display:flex; gap:14px; margin-bottom:24px; flex-wrap:wrap; }
        .asp-stat { flex:1; min-width:120px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; padding:16px 18px; display:flex; align-items:center; gap:14px; }
        .asp-stat-ico { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .asp-stat-val { font-family:'Outfit',sans-serif; font-size:22px; font-weight:800; color:var(--text-primary); line-height:1; margin-bottom:3px; }
        .asp-stat-lbl { font-size:11px; color:var(--text-muted); font-weight:600; }

        .asp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(310px,1fr)); gap:16px; }
        .asp-card { background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; padding:20px 22px; display:flex; flex-direction:column; gap:14px; transition:all 0.2s; }
        .asp-card:hover { box-shadow:0 4px 24px rgba(139,92,246,0.1); border-color:rgba(139,92,246,0.25); }
        .asp-card-top { display:flex; align-items:flex-start; gap:12px; }
        .asp-card-ico { width:42px; height:42px; border-radius:12px; background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.15)); border:1px solid rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .asp-card-info { flex:1; min-width:0; }
        .asp-card-name { font-size:15px; font-weight:800; color:var(--text-primary); margin:0 0 3px; }
        .asp-card-desc { font-size:12px; color:var(--text-muted); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .asp-badge { padding:3px 10px; border-radius:20px; font-size:10px; font-weight:800; white-space:nowrap; flex-shrink:0; }
        .asp-badge-pub  { background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.2); }
        .asp-badge-priv { background:rgba(239,68,68,0.1);  color:#ef4444; border:1px solid rgba(239,68,68,0.2); }
        .asp-card-url { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#8b5cf6; font-weight:700; background:rgba(139,92,246,0.08); padding:6px 12px; border-radius:8px; text-decoration:none; border:1px solid rgba(139,92,246,0.15); transition:background 0.15s; }
        .asp-card-url:hover { background:rgba(139,92,246,0.14); }
        .asp-card-meta { font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px; }
        .asp-card-actions { display:flex; gap:8px; border-top:1px solid var(--card-border); padding-top:14px; }
        .asp-act-btn { flex:1; padding:8px 0; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; border:1.5px solid var(--card-border); background:transparent; color:var(--text-primary); transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; }
        .asp-act-btn:hover { background:rgba(139,92,246,0.08); border-color:rgba(139,92,246,0.4); color:#8b5cf6; }
        .asp-act-btn.copy-btn { background:rgba(16,185,129,0.07); border-color:rgba(16,185,129,0.2); color:#10b981; }
        .asp-act-btn.del-btn:hover { background:rgba(239,68,68,0.08); border-color:rgba(239,68,68,0.35); color:#ef4444; }
        .asp-empty-box { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:70px 20px; text-align:center; }

        /* Drawer */
        .asp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:1000; display:flex; align-items:center; justify-content:flex-end; backdrop-filter:blur(3px); }
        .asp-drawer { background:var(--card-bg); border-left:1px solid var(--card-border); width:100%; max-width:480px; height:100%; display:flex; flex-direction:column; animation:aspSlide 0.25s ease; }
        @keyframes aspSlide { from { transform:translateX(100%); } to { transform:translateX(0); } }
        .asp-dhead { padding:22px 28px 18px; border-bottom:1px solid var(--card-border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
        .asp-dtitle { font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:var(--text-primary); margin:0; }
        .asp-dclose { width:32px; height:32px; border-radius:8px; border:1.5px solid var(--card-border); background:transparent; color:var(--text-muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .asp-dclose:hover { background:rgba(239,68,68,0.08); border-color:#ef4444; color:#ef4444; }
        .asp-dbody { flex:1; overflow-y:auto; padding:22px 28px; }
        .asp-dfoot { padding:16px 28px; border-top:1px solid var(--card-border); display:flex; gap:10px; flex-shrink:0; }

        .asp-field { margin-bottom:18px; }
        .asp-label { display:block; font-size:11px; font-weight:800; color:var(--text-muted); margin-bottom:7px; text-transform:uppercase; letter-spacing:0.5px; }
        .asp-input { width:100%; padding:11px 14px; border:1.5px solid var(--card-border); border-radius:12px; background:var(--bg-primary); color:var(--text-primary); font-size:13px; font-weight:600; outline:none; box-sizing:border-box; transition:border-color 0.2s; font-family:'Plus Jakarta Sans',sans-serif; }
        .asp-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .asp-slug-wrap { display:flex; align-items:center; border:1.5px solid var(--card-border); border-radius:12px; overflow:hidden; background:var(--bg-primary); transition:border-color 0.2s; }
        .asp-slug-wrap:focus-within { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .asp-slug-pre { padding:11px 12px; font-size:11px; color:var(--text-muted); background:rgba(139,92,246,0.05); border-right:1.5px solid var(--card-border); white-space:nowrap; font-weight:700; }
        .asp-slug-inp { flex:1; padding:11px 14px; border:none; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; outline:none; font-family:'Plus Jakarta Sans',sans-serif; }

        .asp-sec-lbl { font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; margin:0 0 10px; display:flex; align-items:center; gap:8px; }
        .asp-sec-lbl::after { content:''; flex:1; height:1px; background:var(--card-border); }

        .asp-mon-search { width:100%; padding:9px 14px; border:1.5px solid var(--card-border); border-radius:10px; background:var(--bg-primary); color:var(--text-primary); font-size:12px; font-weight:600; outline:none; box-sizing:border-box; margin-bottom:10px; font-family:'Plus Jakarta Sans',sans-serif; }
        .asp-mon-search:focus { border-color:#8b5cf6; }
        .asp-mons-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; max-height:200px; overflow-y:auto; padding-right:2px; }
        .asp-mon-item { display:flex; align-items:center; gap:8px; padding:9px 11px; border-radius:10px; border:1.5px solid var(--card-border); cursor:pointer; transition:all 0.15s; user-select:none; }
        .asp-mon-item.sel { border-color:#8b5cf6; background:rgba(139,92,246,0.08); }
        .asp-mon-item:hover:not(.sel) { border-color:rgba(139,92,246,0.3); }
        .asp-mon-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .asp-mon-name { font-size:12px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
        .asp-mon-check { flex-shrink:0; }

        .asp-toggle { display:flex; align-items:center; gap:12px; padding:12px 14px; background:rgba(139,92,246,0.04); border:1.5px solid rgba(139,92,246,0.12); border-radius:12px; cursor:pointer; }
        .asp-trk { width:42px; height:24px; border-radius:12px; background:var(--card-border); position:relative; transition:background 0.2s; flex-shrink:0; }
        .asp-trk.on { background:#7c3aed; }
        .asp-tmb { width:18px; height:18px; border-radius:9px; background:#fff; position:absolute; top:3px; left:3px; transition:transform 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.2); }
        .asp-trk.on .asp-tmb { transform:translateX(18px); }

        .asp-err { display:flex; align-items:center; gap:8px; color:#ef4444; font-size:12px; font-weight:700; margin-bottom:14px; padding:10px 14px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:10px; }

        .asp-btn-cancel { flex:1; padding:11px 0; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; }
        .asp-btn-save { flex:2; padding:11px 0; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; box-shadow:0 4px 14px rgba(124,58,237,0.3); }
        .asp-btn-save:disabled { opacity:0.55; cursor:not-allowed; }

        .del-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1100; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .del-box { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:36px 28px; max-width:360px; width:100%; text-align:center; }
        .del-ico { width:52px; height:52px; border-radius:14px; background:rgba(239,68,68,0.1); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; }
        .del-box h3 { font-size:18px; font-weight:800; color:var(--text-primary); margin:0 0 8px; }
        .del-box p { font-size:13px; color:var(--text-muted); margin:0 0 26px; line-height:1.6; }
        .del-btns { display:flex; gap:10px; }
        .del-cancel { flex:1; padding:11px 0; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-weight:700; font-size:13px; cursor:pointer; }
        .del-confirm { flex:1; padding:11px 0; background:#ef4444; color:#fff; border:none; border-radius:12px; font-weight:700; font-size:13px; cursor:pointer; }
      `}</style>

      {/* Top */}
      <div className="asp-topbar">
        <div>
          <h1 className="asp-page-title">Status Pages</h1>
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
          { val: pages.length, label: 'Total Pages', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg> },
          { val: publicCount, label: 'Public',  color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
          { val: pages.length - publicCount, label: 'Private', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
          { val: servers.length, label: 'All Monitors', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg> },
        ].map(s => (
          <div key={s.label} className="asp-stat">
            <div className="asp-stat-ico" style={{ background: s.bg }}>{s.icon}</div>
            <div><div className="asp-stat-val">{s.val}</div><div className="asp-stat-lbl">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="asp-empty-box"><div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div></div>
      ) : pages.length === 0 ? (
        <div className="asp-empty-box">
          <div style={{ fontSize: 52, marginBottom: 14 }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>No status pages yet</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 340, margin: '0 auto 24px' }}>Create a public page to share live uptime with your clients.</div>
          <button className="asp-btn-new" onClick={openCreate}>Create first status page</button>
        </div>
      ) : (
        <div className="asp-grid">
          {pages.map(page => (
            <div key={page._id} className="asp-card">
              <div className="asp-card-top">
                <div className="asp-card-ico">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div className="asp-card-info">
                  <p className="asp-card-name">{page.title}</p>
                  <p className="asp-card-desc">{page.description || 'No description'}</p>
                </div>
                <span className={`asp-badge ${page.isPublic !== false ? 'asp-badge-pub' : 'asp-badge-priv'}`}>
                  {page.isPublic !== false ? '● Public' : '● Private'}
                </span>
              </div>

              <a className="asp-card-url" href={`${BASE}/${page.slug}`} target="_blank" rel="noreferrer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                {BASE}/{page.slug}
              </a>

              <div className="asp-card-meta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
                <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{page.monitors?.length || 0}</strong>
                &nbsp;monitor{page.monitors?.length !== 1 ? 's' : ''} selected
              </div>

              <div className="asp-card-actions">
                <button className="asp-act-btn copy-btn" onClick={() => copy(`${BASE}/${page.slug}`, page._id)}>
                  {copied === page._id ? '✓ Copied' : 'Copy Link'}
                </button>
                <button className="asp-act-btn" onClick={() => openEdit(page)}>Edit</button>
                <button className="asp-act-btn del-btn" onClick={() => setDelConfirm(page._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <input className="asp-input" placeholder="e.g. UptimeForge Status" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
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

              <div className="asp-field">
                <input
                  className="asp-mon-search"
                  placeholder="Search monitors..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {filteredServers.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No monitors found.</div>
                ) : (
                  <div className="asp-mons-grid">
                    {filteredServers.map(s => {
                      const sel = form.monitors.includes(s._id);
                      return (
                        <div key={s._id} className={`asp-mon-item ${sel ? 'sel' : ''}`} onClick={() => toggleMonitor(s._id)}>
                          <div className="asp-mon-dot" style={{ background: s.status === 'up' ? '#10b981' : '#ef4444' }} />
                          <span className="asp-mon-name">{s.name}</span>
                          {sel && <svg className="asp-mon-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{form.isPublic ? 'Publicly accessible' : 'Private (hidden)'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{form.isPublic ? 'Anyone with the link can view this page' : 'Not visible to the public'}</div>
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
