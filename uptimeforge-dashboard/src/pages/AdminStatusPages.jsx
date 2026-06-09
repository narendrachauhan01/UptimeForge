import React, { useEffect, useState, useCallback } from 'react';
import { getStatusPages, createStatusPage, updateStatusPage, deleteStatusPage, getStatusPageUsers, getStatusPageServers } from '../api';

const BASE = 'https://status.narendrasingh.site';

export default function AdminStatusPages() {
  const [pages, setPages]     = useState([]);
  const [users, setUsers]     = useState([]);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | {page}
  const [delConfirm, setDelConfirm] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const [copied, setCopied]   = useState('');

  const [form, setForm] = useState({ userId: '', slug: '', title: '', description: '', monitors: [], isPublic: true });

  const load = useCallback(() => {
    Promise.all([getStatusPages(), getStatusPageUsers()])
      .then(([p, u]) => { setPages(p.data); setUsers(u.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onUserChange = async (uid) => {
    setForm(f => ({ ...f, userId: uid, monitors: [] }));
    if (!uid) { setServers([]); return; }
    try {
      const r = await getStatusPageServers(uid);
      setServers(r.data);
    } catch { setServers([]); }
  };

  const openCreate = () => {
    setForm({ userId: '', slug: '', title: '', description: '', monitors: [], isPublic: true });
    setServers([]);
    setErr('');
    setModal('create');
  };

  const openEdit = async (page) => {
    setForm({
      userId: page.userId?._id || page.userId || '',
      slug: page.slug,
      title: page.title,
      description: page.description || '',
      monitors: page.monitors.map(m => m._id || m),
      isPublic: page.isPublic !== false,
    });
    setErr('');
    const uid = page.userId?._id || page.userId;
    if (uid) {
      try { const r = await getStatusPageServers(uid); setServers(r.data); } catch { setServers([]); }
    } else { setServers([]); }
    setModal(page);
  };

  const toggleMonitor = (id) => setForm(f => ({
    ...f,
    monitors: f.monitors.includes(id) ? f.monitors.filter(m => m !== id) : [...f.monitors, id],
  }));

  const save = async () => {
    if (!form.userId) return setErr('Select a user.');
    if (!form.slug || !form.title) return setErr('Slug and title are required.');
    if (!/^[a-z0-9-]+$/.test(form.slug)) return setErr('Slug: lowercase letters, numbers, hyphens only.');
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

  return (
    <div style={{ padding: '0 4px' }}>
      <style>{`
        .asp-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
        .asp-title { font-family:'Outfit',sans-serif; font-size:26px; font-weight:800; color:var(--text-primary); letter-spacing:-0.6px; margin:0 0 4px; }
        .asp-sub { font-size:13px; color:var(--text-muted); margin:0; }
        .asp-btn-new { display:flex; align-items:center; gap:8px; padding:10px 20px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 14px rgba(124,58,237,0.3); }
        .asp-btn-new:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(124,58,237,0.4); }
        .asp-table-wrap { background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; overflow:hidden; }
        .asp-table { width:100%; border-collapse:collapse; }
        .asp-table th { padding:12px 18px; text-align:left; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid var(--card-border); background:rgba(139,92,246,0.04); }
        .asp-table td { padding:14px 18px; font-size:13px; color:var(--text-primary); border-bottom:1px solid var(--card-border); vertical-align:middle; }
        .asp-table tr:last-child td { border-bottom:none; }
        .asp-table tr:hover td { background:rgba(139,92,246,0.03); }
        .asp-slug-link { color:#8b5cf6; font-weight:700; text-decoration:none; font-size:12px; }
        .asp-slug-link:hover { text-decoration:underline; }
        .asp-badge { padding:3px 9px; border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }
        .asp-badge-pub  { background:rgba(16,185,129,0.12); color:#10b981; }
        .asp-badge-priv { background:rgba(239,68,68,0.1); color:#ef4444; }
        .asp-btn-sm { padding:6px 12px; border-radius:8px; font-size:11px; font-weight:700; cursor:pointer; border:1px solid var(--card-border); background:var(--card-bg); color:var(--text-primary); transition:all 0.15s; }
        .asp-btn-sm:hover { background:rgba(139,92,246,0.1); border-color:#8b5cf6; color:#8b5cf6; }
        .asp-btn-sm.del:hover { background:rgba(239,68,68,0.1); border-color:#ef4444; color:#ef4444; }
        .asp-btn-sm.copy { background:rgba(16,185,129,0.08); border-color:rgba(16,185,129,0.2); color:#10b981; }
        .asp-empty { padding:60px 20px; text-align:center; color:var(--text-muted); }
        /* Modal */
        .asp-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .asp-modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:28px; width:100%; max-width:540px; max-height:90vh; overflow-y:auto; }
        .asp-modal-title { font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:var(--text-primary); margin:0 0 20px; }
        .asp-field { margin-bottom:16px; }
        .asp-label { display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px; }
        .asp-input { width:100%; padding:10px 14px; border:1.5px solid var(--card-border); border-radius:12px; background:var(--bg-primary); color:var(--text-primary); font-size:13px; font-weight:600; outline:none; box-sizing:border-box; transition:all 0.2s; }
        .asp-input:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,0.1); }
        .asp-select { width:100%; padding:10px 14px; border:1.5px solid var(--card-border); border-radius:12px; background:var(--bg-primary); color:var(--text-primary); font-size:13px; font-weight:600; outline:none; box-sizing:border-box; cursor:pointer; }
        .asp-slug-wrap { display:flex; align-items:center; border:1.5px solid var(--card-border); border-radius:12px; overflow:hidden; background:var(--bg-primary); transition:all 0.2s; }
        .asp-slug-wrap:focus-within { border-color:#8b5cf6; }
        .asp-slug-prefix { padding:10px 12px; font-size:11px; color:var(--text-muted); background:rgba(139,92,246,0.06); border-right:1px solid var(--card-border); white-space:nowrap; font-weight:700; }
        .asp-slug-input { flex:1; padding:10px 14px; border:none; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; outline:none; }
        .asp-monitors-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; max-height:180px; overflow-y:auto; }
        .asp-mon-item { display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:10px; border:1.5px solid var(--card-border); cursor:pointer; transition:all 0.15s; }
        .asp-mon-item.sel { border-color:#8b5cf6; background:rgba(139,92,246,0.08); }
        .asp-mon-item:hover { border-color:#8b5cf6; }
        .asp-mon-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
        .asp-mon-name { font-size:12px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .asp-modal-footer { display:flex; gap:10px; justify-content:flex-end; margin-top:24px; }
        .asp-btn-cancel { padding:10px 20px; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-size:13px; font-weight:700; cursor:pointer; }
        .asp-btn-save { padding:10px 24px; background:linear-gradient(135deg,#7c3aed,#4f46e5); color:#fff; border:none; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; }
        .asp-btn-save:disabled { opacity:0.6; cursor:not-allowed; }
        .asp-err { color:#ef4444; font-size:12px; font-weight:600; margin-bottom:12px; padding:8px 12px; background:rgba(239,68,68,0.08); border-radius:8px; }
        .del-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:1100; display:flex; align-items:center; justify-content:center; }
        .del-modal { background:var(--card-bg); border:1px solid var(--card-border); border-radius:20px; padding:32px 28px; max-width:360px; width:90%; text-align:center; }
        .del-modal h3 { font-size:18px; font-weight:800; color:var(--text-primary); margin:0 0 8px; }
        .del-modal p { font-size:13px; color:var(--text-muted); margin:0 0 24px; }
        .del-modal-btns { display:flex; gap:10px; justify-content:center; }
        .del-btn-cancel { padding:10px 22px; border:1.5px solid var(--card-border); border-radius:12px; background:transparent; color:var(--text-primary); font-weight:700; font-size:13px; cursor:pointer; }
        .del-btn-confirm { padding:10px 22px; background:#ef4444; color:#fff; border:none; border-radius:12px; font-weight:700; font-size:13px; cursor:pointer; }
      `}</style>

      <div className="asp-header">
        <div>
          <h1 className="asp-title">Status Pages</h1>
          <p className="asp-sub">Manage public status pages for each client</p>
        </div>
        <button className="asp-btn-new" onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Status Page
        </button>
      </div>

      <div className="asp-table-wrap">
        {loading ? (
          <div className="asp-empty">Loading...</div>
        ) : pages.length === 0 ? (
          <div className="asp-empty">
            <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No status pages yet</div>
            <button className="asp-btn-new" onClick={openCreate}>Create first status page</button>
          </div>
        ) : (
          <table className="asp-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Public URL</th>
                <th>Monitors</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page._id}>
                  <td style={{ fontWeight: 800 }}>{page.title}</td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{page.userId?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{page.userId?.email || ''}</div>
                  </td>
                  <td>
                    <a className="asp-slug-link" href={`${BASE}/${page.slug}`} target="_blank" rel="noreferrer">
                      /{page.slug}
                    </a>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{page.monitors?.length || 0} monitor{page.monitors?.length !== 1 ? 's' : ''}</td>
                  <td><span className={`asp-badge ${page.isPublic !== false ? 'asp-badge-pub' : 'asp-badge-priv'}`}>{page.isPublic !== false ? 'Public' : 'Private'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="asp-btn-sm copy" onClick={() => copy(`${BASE}/${page.slug}`, page._id)}>
                        {copied === page._id ? '✓' : 'Copy'}
                      </button>
                      <button className="asp-btn-sm" onClick={() => openEdit(page)}>Edit</button>
                      <button className="asp-btn-sm del" onClick={() => setDelConfirm(page._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="asp-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="asp-modal">
            <h3 className="asp-modal-title">{modal === 'create' ? 'Create Status Page' : 'Edit Status Page'}</h3>
            {err && <div className="asp-err">{err}</div>}

            <div className="asp-field">
              <label className="asp-label">Client / User</label>
              <select className="asp-select" value={form.userId} onChange={e => onUserChange(e.target.value)}>
                <option value="">— Select user —</option>
                {users.map(u => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
              </select>
            </div>

            <div className="asp-field">
              <label className="asp-label">Page Title</label>
              <input className="asp-input" placeholder="e.g. Acme Corp Status" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>

            <div className="asp-field">
              <label className="asp-label">Public URL Slug</label>
              <div className="asp-slug-wrap">
                <span className="asp-slug-prefix">{BASE}/</span>
                <input className="asp-slug-input" placeholder="acme-corp" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
              </div>
            </div>

            <div className="asp-field">
              <label className="asp-label">Description (optional)</label>
              <input className="asp-input" placeholder="Live status for all Acme services" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="asp-field">
              <label className="asp-label">Monitors to Show ({form.monitors.length} selected)</label>
              {!form.userId ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>Select a user first to see their monitors.</div>
              ) : servers.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>This user has no monitors.</div>
              ) : (
                <div className="asp-monitors-grid">
                  {servers.map(s => (
                    <div key={s._id} className={`asp-mon-item ${form.monitors.includes(s._id) ? 'sel' : ''}`} onClick={() => toggleMonitor(s._id)}>
                      <div className="asp-mon-dot" style={{ background: s.status === 'up' ? '#10b981' : '#ef4444' }} />
                      <span className="asp-mon-name">{s.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="asp-field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="asp-pub" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#7c3aed' }} />
              <label htmlFor="asp-pub" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Publicly accessible</label>
            </div>

            <div className="asp-modal-footer">
              <button className="asp-btn-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="asp-btn-save" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {delConfirm && (
        <div className="del-overlay" onClick={e => e.target === e.currentTarget && setDelConfirm(null)}>
          <div className="del-modal">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
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
