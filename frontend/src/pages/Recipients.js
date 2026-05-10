import React, { useEffect, useState } from 'react';
import { getRecipients, addRecipient, deleteRecipient, updateRecipient, getServers } from '../api';

const empty = { name: '', phone: '', email: '', servers: [] };

export default function Recipients() {
  const [recipients, setRecipients] = useState([]);
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editServers, setEditServers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => getRecipients().then(r => setRecipients(r.data));

  useEffect(() => {
    load();
    getServers().then(r => setServers(r.data));
  }, []);

  const handlePhoneChange = (val) => {
    setForm({ ...form, phone: val.replace(/\D/g, '') });
    setError('');
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Please enter a name';
    if (!form.phone && !form.email) return 'Enter at least WhatsApp number or Email';
    if (form.phone && form.phone.length < 10) return 'Enter valid 10-digit number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter valid email address';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validateForm();
    if (err) { setError(err); return; }
    const phone = form.phone ? (form.phone.startsWith('91') ? form.phone : '91' + form.phone) : null;
    const email = form.email.trim() || null;
    setSaving(true);
    try {
      await addRecipient({ name: form.name.trim(), phone, email, servers: form.servers });
      setForm(empty);
      load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to add recipient');
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove ${name} from alerts?`)) return;
    await deleteRecipient(id);
    load();
  };

  const toggleActive = async (r) => {
    await updateRecipient(r._id, { active: !r.active });
    load();
  };

  const startEdit = (r) => {
    setEditId(r._id);
    const raw = r.phone ? (r.phone.startsWith('91') ? r.phone.slice(2) : r.phone) : '';
    setEditForm({ name: r.name, phone: raw, email: r.email || '' });
    setExpandedId(null);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const phone = editForm.phone ? (editForm.phone.startsWith('91') ? editForm.phone : '91' + editForm.phone) : null;
    const email = editForm.email?.trim() || null;
    await updateRecipient(editId, { name: editForm.name.trim(), phone, email });
    setEditId(null);
    load();
  };

  const openSites = (r) => {
    if (expandedId === r._id) { setExpandedId(null); return; }
    setExpandedId(r._id);
    setEditId(null);
    setEditServers(r.servers?.map(s => s._id || s) || []);
  };

  const saveSites = async (r) => {
    await updateRecipient(r._id, { servers: editServers });
    setExpandedId(null);
    load();
  };

  const toggleEditServer = (id) => {
    setEditServers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const formatPhone = (phone) => {
    if (!phone) return null;
    const p = phone.startsWith('91') ? phone.slice(2) : phone;
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  };

  const getSiteLabel = (r) => {
    if (!r.servers || r.servers.length === 0) return 'All Sites';
    return r.servers.map(s => s.name || servers.find(sv => sv._id === (s._id || s))?.name || '').filter(Boolean).join(', ');
  };

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Alert Recipients</h1>
          <p className="pg-sub">People who will receive WhatsApp alerts when a site goes down</p>
        </div>
        <div className="recipient-count">
          <span>{recipients.filter(r => r.active).length}</span> active
        </div>
      </div>

      {/* Add Form */}
      <div className="add-recipient-card">
        <div className="add-card-title">➕ Add New Recipient</div>
        <form onSubmit={handleSubmit}>
          <div className="add-form-row">
            <div className="add-field">
              <label>Full Name</label>
              <input type="text" placeholder="Enter full name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="add-field">
              <label>WhatsApp Number <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span></label>
              <div className="phone-input-wrap">
                <span className="phone-prefix">🇮🇳 +91</span>
                <input type="tel" placeholder="98765 43210"
                  value={form.phone.startsWith('91') ? form.phone.slice(2) : form.phone}
                  onChange={e => handlePhoneChange(e.target.value)} maxLength={10} />
              </div>
              <span className="field-hint">10-digit mobile number</span>
            </div>
            <div className="add-field">
              <label>Email <span style={{color:'#94a3b8',fontWeight:400}}>(optional)</span></label>
              <input type="email" placeholder="name@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} />
              <span className="field-hint">Alert email address</span>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn-add" disabled={saving}>
              {saving ? 'Adding...' : 'Add Recipient'}
            </button>
          </div>
          {error && <div className="form-error">⚠️ {error}</div>}
        </form>
      </div>

      {/* Search + Filter */}
      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="filter-tabs">
          {[{ key: 'all', label: 'All' }, { key: 'active', label: '✅ Active' }, { key: 'inactive', label: '⏸ Paused' }].map(f => (
            <button key={f.key} className={`filter-tab ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Recipients List */}
      <div className="recipients-list">
        {recipients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📱</div>
            <h3>No recipients yet</h3>
            <p>Add phone numbers above to start receiving WhatsApp alerts</p>
          </div>
        ) : (
          recipients.filter(r => {
            const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search);
            const matchFilter = filter === 'all' || (filter === 'active' ? r.active : !r.active);
            return matchSearch && matchFilter;
          }).map(r => (
            <div key={r._id} className={`recipient-card ${!r.active ? 'inactive' : ''}`}>
              <div className="recipient-item">
                <div className="recipient-avatar">{r.name.charAt(0).toUpperCase()}</div>
                <div className="recipient-info">
                  <div className="recipient-name">{r.name}</div>
                  {r.phone && <div className="recipient-phone">📱 {formatPhone(r.phone)}</div>}
                  {r.email && <div className="recipient-phone">✉️ {r.email}</div>}
                  <div className="recipient-sites">🌐 {getSiteLabel(r)}</div>
                </div>
                <span className={`status-pill ${r.active ? 'active' : 'paused'}`}>
                  {r.active ? 'Active' : '⏸ Paused'}
                </span>
                <div className="recipient-actions">
                  <button className="btn-action edit" onClick={() => startEdit(r)}>✏️ Edit</button>
                  <button className="btn-edit-sites" onClick={() => openSites(r)}>
                    🌐 Sites {expandedId === r._id ? '▲' : '▼'}
                  </button>
                  <button className={`btn-toggle ${r.active ? 'pause' : 'resume'}`} onClick={() => toggleActive(r)}>
                    {r.active ? 'Pause' : 'Resume'}
                  </button>
                  <button className="btn-remove" onClick={() => handleDelete(r._id, r.name)}>🗑</button>
                </div>
              </div>

              {/* Edit name/phone panel */}
              {editId === r._id && (
                <div className="inline-edit-panel">
                  <div className="inline-edit-title">✏️ Edit — <strong>{r.name}</strong></div>
                  <div className="inline-edit-row">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input value={editForm.name}
                        onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>WhatsApp Number</label>
                      <div className="phone-input-wrap">
                        <span className="phone-prefix">🇮🇳 +91</span>
                        <input type="tel" maxLength={10} value={editForm.phone || ''}
                          onChange={e => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" placeholder="name@example.com" value={editForm.email || ''}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Site selector panel */}
              {expandedId === r._id && (
                <div className="site-edit-panel">
                  <div className="site-edit-label">
                    Select sites for <strong>{r.name}</strong>:
                    <span className="site-select-hint">
                      {editServers.length === 0 ? '(All sites)' : `${editServers.length} selected`}
                    </span>
                  </div>
                  <div className="site-chips">
                    {servers.map(s => (
                      <button key={s._id} type="button"
                        className={`site-chip ${editServers.includes(s._id) ? 'selected' : ''}`}
                        onClick={() => toggleEditServer(s._id)}>
                        <span className={`chip-dot ${s.status}`}></span>
                        {s.name}
                        {editServers.includes(s._id) && <span className="chip-check">✓</span>}
                      </button>
                    ))}
                  </div>
                  {editServers.length > 0 && (
                    <button type="button" className="clear-sites" onClick={() => setEditServers([])}>
                      Clear — alert for all sites
                    </button>
                  )}
                  <div className="site-edit-actions">
                    <button className="btn-save-sites" onClick={() => saveSites(r)}>Save</button>
                    <button className="btn-cancel-sites" onClick={() => setExpandedId(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
