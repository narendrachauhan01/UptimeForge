import React, { useEffect, useState } from 'react';
import { getServers, addServer, deleteServer, updateServer } from '../api';

const empty = { name: '', url: '', checkInterval: 60, domainExpiry: '' };

export default function Servers() {
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);

  const load = () => getServers().then(r => setServers(r.data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    await addServer(form);
    setForm(empty);
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    await deleteServer(id);
    load();
  };

  const toggleActive = async (s) => {
    await updateServer(s._id, { active: !s.active });
    load();
  };

  const startEdit = (s) => {
    setEditId(s._id);
    const de = s.domainExpiry ? new Date(s.domainExpiry).toISOString().split('T')[0] : '';
    setEditForm({ name: s.name, url: s.url, checkInterval: s.checkInterval, domainExpiry: de });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.url) return;
    await updateServer(editId, editForm);
    setEditId(null);
    load();
  };

  const filtered = servers.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  const statusColor = { up: '#10b981', down: '#ef4444', unknown: '#f59e0b' };

  return (
    <div className="pg-wrap">
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Servers</h1>
          <p className="pg-sub">{servers.length} site{servers.length !== 1 ? 's' : ''} being monitored</p>
        </div>
        <button className="btn-primary-pill" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancel' : '+ Add Server'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="form-card">
          <h3 className="form-card-title">Add New Server</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Site Name</label>
                <input placeholder="e.g. K&B Website" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Site URL</label>
                <input placeholder="https://yoursite.com" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
              </div>
              <div className="form-group" style={{ maxWidth: 160 }}>
                <label>Check Interval (sec)</label>
                <input type="number" value={form.checkInterval} onChange={e => setForm({ ...form, checkInterval: parseInt(e.target.value) })} />
              </div>
            </div>
            <button type="submit" className="btn-submit">Add Server</button>
          </form>
        </div>
      )}

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-wrap">
          <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className="search-input" placeholder="Search sites..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="filter-pills">
          {[['all','All'], ['up','Online'], ['down','Offline']].map(([k, l]) => (
            <button key={k} className={`filter-pill ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="data-card">
        {filtered.length === 0 ? (
          <div className="empty-msg">{servers.length === 0 ? 'No servers added yet.' : 'No results found.'}</div>
        ) : (
          <>
            {filtered.map(s => (
              <React.Fragment key={s._id}>
                <div className="server-row">
                  <div className="server-row-left">
                    <div className="server-status-dot" style={{ background: statusColor[s.status] || '#94a3b8' }} />
                    <div className="server-info">
                      <div className="server-name">{s.name}</div>
                      <div className="server-url">{s.url}</div>
                    </div>
                  </div>
                  <div className="server-row-right">
                    <div className="server-meta">
                      <span className={`pill pill-${s.status}`}>{s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}</span>
                      <span className="meta-txt">{s.checkInterval}s</span>
                      {s.responseTime && <span className="meta-txt">⚡ {s.responseTime}ms</span>}
                    </div>
                    <div className="server-actions">
                      <button className="icon-btn edit" onClick={() => startEdit(s)} title="Edit">✏️</button>
                      <button className={`icon-btn ${!s.active ? 'resume' : ''}`} onClick={() => toggleActive(s)} title={s.active ? 'Pause' : 'Resume'}>{s.active ? '⏸' : '▶️'}</button>
                      <button className="icon-btn del" onClick={() => handleDelete(s._id, s.name)} title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
                {editId === s._id && (
                  <div className="edit-panel">
                    <div className="form-grid">
                      <div className="form-group"><label>Site Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div className="form-group"><label>Site URL</label><input value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} /></div>
                      <div className="form-group" style={{ maxWidth: 140 }}><label>Interval (sec)</label><input type="number" value={editForm.checkInterval} onChange={e => setEditForm({ ...editForm, checkInterval: parseInt(e.target.value) })} /></div>
                      <div className="form-group" style={{ maxWidth: 180 }}><label>Domain Expiry</label><input type="date" value={editForm.domainExpiry || ''} onChange={e => setEditForm({ ...editForm, domainExpiry: e.target.value })} /></div>
                    </div>
                    <div className="edit-btns">
                      <button className="btn-save" onClick={saveEdit}>Save Changes</button>
                      <button className="btn-cancel" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
