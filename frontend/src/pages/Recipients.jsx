import React, { useEffect, useState } from 'react';
import { getRecipients, addRecipient, deleteRecipient, updateRecipient, getServers } from '../api';

const empty = { name: '', phone: '', email: '', channels: [] };

const CHANNEL_OPTIONS = [
  { val: 'email',    icon: '✉️', label: 'Email only',         color: '#7c3aed' },
  { val: 'whatsapp', icon: '💬', label: 'WhatsApp only',       color: '#16a34a' },
  { val: 'both',     icon: '🔔', label: 'Email & WhatsApp',    color: '#0369a1' },
];

function ChannelToggle({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const val = value.includes('whatsapp') && value.includes('email') ? 'both'
    : value.includes('whatsapp') ? 'whatsapp'
    : value.includes('email') ? 'email' : '';
  const selected = CHANNEL_OPTIONS.find(o => o.val === val);

  const select = (v) => {
    setOpen(false);
    if (v === 'both')          onChange(['whatsapp', 'email']);
    else if (v === 'whatsapp') onChange(['whatsapp']);
    else if (v === 'email')    onChange(['email']);
  };

  return (
    <div style={{ position:'relative' }} onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'10px 14px', border:`1.5px solid ${selected ? selected.color : '#e2e8f0'}`, borderRadius:10, fontSize:14, color: selected ? selected.color : '#94a3b8', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', fontWeight: selected ? 600 : 400, transition:'all 0.15s' }}>
        <span>{selected ? `${selected.icon}  ${selected.label}` : '— Select alert method —'}</span>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition:'0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#fff', borderRadius:12, boxShadow:'0 8px 30px rgba(0,0,0,0.12)', border:'1px solid #e2e8f0', zIndex:999, overflow:'hidden' }}>
          {CHANNEL_OPTIONS.map(o => (
            <button key={o.val} type="button" onClick={() => select(o.val)}
              style={{ width:'100%', padding:'12px 16px', border:'none', background: val === o.val ? `${o.color}10` : 'transparent', display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:14, color: val === o.val ? o.color : '#374151', fontWeight: val === o.val ? 700 : 400, textAlign:'left', borderBottom:'1px solid #f1f5f9', transition:'background 0.1s' }}>
              <span style={{ fontSize:16 }}>{o.icon}</span>
              <span>{o.label}</span>
              {val === o.val && <span style={{ marginLeft:'auto', color: o.color, fontSize:16 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Recipients() {
  const [recipients, setRecipients] = useState([]);
  const [recipientLimit, setRecipientLimit] = useState(null);
  const [servers, setServers] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId]       = useState(null);
  const [editForm, setEditForm]   = useState({ name: '', phone: '', email: '', channels: [] });
  const [sitesId, setSitesId]     = useState(null);
  const [editServers, setEditServers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const load = () => getRecipients().then(r => {
    setRecipients(r.data.recipients ?? r.data);
    if (r.data.limit !== undefined) setRecipientLimit(r.data.limit);
  });

  useEffect(() => { load(); getServers().then(r => setServers(r.data)); }, []);

  const validateForm = () => {
    if (!form.name.trim()) return 'Please enter a name';
    if (form.channels.length === 0) return 'Select at least one alert channel (WhatsApp or Email)';
    if (form.channels.includes('whatsapp') && form.phone.length < 10) return 'Enter valid 10-digit WhatsApp number';
    if (form.channels.includes('email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter valid email address';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = validateForm();
    if (err) { setError(err); return; }
    const phone = form.channels.includes('whatsapp') && form.phone
      ? (form.phone.startsWith('91') ? form.phone : '91' + form.phone) : null;
    const email = form.channels.includes('email') ? form.email.trim() || null : null;
    setSaving(true);
    try {
      await addRecipient({ name: form.name.trim(), phone, email, servers: [] });
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
    setSitesId(null);
    setEditId(editId === r._id ? null : r._id);
    const raw = r.phone ? (r.phone.startsWith('91') ? r.phone.slice(2) : r.phone) : '';
    const channels = [];
    if (r.phone) channels.push('whatsapp');
    if (r.email) channels.push('email');
    setEditForm({ name: r.name, phone: raw, email: r.email || '', channels });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) return;
    const phone = editForm.channels.includes('whatsapp') && editForm.phone
      ? (editForm.phone.startsWith('91') ? editForm.phone : '91' + editForm.phone) : null;
    const email = editForm.channels.includes('email') ? editForm.email?.trim() || null : null;
    await updateRecipient(editId, { name: editForm.name.trim(), phone, email });
    setEditId(null);
    load();
  };

  const openSites = (r) => {
    setEditId(null);
    setSitesId(sitesId === r._id ? null : r._id);
    setEditServers(r.servers?.map(s => s._id || s) || []);
  };

  const saveSites = async (r) => {
    await updateRecipient(r._id, { servers: editServers });
    setSitesId(null);
    load();
  };

  const toggleSiteChip = (id) =>
    setEditServers(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

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
          <p className="pg-sub">People who will receive alerts when a site goes down</p>
        </div>
        <div className="recipient-count">
          <span>{recipients.filter(r => r.active).length}</span> active
        </div>
      </div>

      {/* Recipient usage bar */}
      {recipientLimit !== null && (
        <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 18px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Recipients used</span>
              <span style={{ fontSize:13, fontWeight:700, color: recipients.length >= recipientLimit ? '#ef4444' : '#7c3aed' }}>
                {recipients.length} / {recipientLimit}
              </span>
            </div>
            <div style={{ height:6, background:'#e2e8f0', borderRadius:10, overflow:'hidden' }}>
              <div style={{ width:`${Math.min((recipients.length/recipientLimit)*100,100)}%`, height:'100%', background: recipients.length >= recipientLimit ? '#ef4444' : '#7c3aed', borderRadius:10, transition:'width 0.4s' }} />
            </div>
          </div>
          {recipients.length >= recipientLimit && (
            <span style={{ fontSize:12, color:'#ef4444', fontWeight:600, whiteSpace:'nowrap' }}>Limit reached — upgrade to add more</span>
          )}
        </div>
      )}

      {/* Add Form */}
      <div className="add-recipient-card">
        <div className="add-card-title">➕ Add New Recipient</div>
        <form onSubmit={handleSubmit}>
          <div className="add-form-row" style={{ marginBottom: 16 }}>
            <div className="add-field">
              <label>Full Name</label>
              <input type="text" placeholder="Enter full name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="add-field">
              <label>Alert via</label>
              <ChannelToggle value={form.channels}
                onChange={v => setForm({ ...form, channels: v, phone: '', email: '' })} />
              <span className="field-hint">Select how this person receives alerts</span>
            </div>
          </div>

          {form.channels.length > 0 && (
            <div className="add-form-row" style={{ marginBottom: 16 }}>
              {form.channels.includes('whatsapp') && (
                <div className="add-field">
                  <label>WhatsApp Number</label>
                  <div className="phone-input-wrap">
                    <span className="phone-prefix">🇮🇳 +91</span>
                    <input type="tel" placeholder="98765 43210"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                      maxLength={10} />
                  </div>
                  <span className="field-hint">10-digit mobile number</span>
                </div>
              )}
              {form.channels.includes('email') && (
                <div className="add-field">
                  <label>Email Address</label>
                  <input type="email" placeholder="name@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} />
                  <span className="field-hint">Alert email address</span>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn-add" disabled={saving || (recipientLimit !== null && recipients.length >= recipientLimit)}>
              {saving ? 'Adding...' : recipientLimit !== null && recipients.length >= recipientLimit ? `Limit reached (${recipientLimit}/${recipientLimit})` : 'Add Recipient'}
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
            <p>Add recipients above to start receiving alerts</p>
          </div>
        ) : (
          recipients.filter(r => {
            const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || (r.phone || '').includes(search);
            const matchFilter = filter === 'all' || (filter === 'active' ? r.active : !r.active);
            return matchSearch && matchFilter;
          }).map(r => (
            <div key={r._id} className={`recipient-card ${!r.active ? 'inactive' : ''}`}>
              <div className="recipient-item">
                <div className="recipient-avatar" style={{ background: `hsl(${(r.name.charCodeAt(0)*37)%360},60%,50%)` }}>
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <div className="recipient-info">
                  <div className="recipient-name">{r.name}</div>
                  {r.email && <div className="recipient-phone"><span style={{color:'#94a3b8',fontSize:11}}>✉️</span> {r.email}</div>}
                  {r.phone && <div className="recipient-phone"><span style={{color:'#94a3b8',fontSize:11}}>💬</span> {formatPhone(r.phone)}</div>}
                  <div className="recipient-sites">
                    <span style={{fontSize:11,color:'#94a3b8'}}>🌐</span>
                    <span style={{color: r.servers?.length===0?'#10b981':'#7c3aed', fontWeight:600, fontSize:12}}>
                      {getSiteLabel(r)}
                    </span>
                  </div>
                </div>
                <div className="recipient-actions">
                  <span className={`status-pill ${r.active ? 'active' : 'paused'}`}>{r.active ? 'Active' : 'Paused'}</span>
                  <button className="rcp-btn rcp-edit" onClick={() => startEdit(r)}>✏️ Edit</button>
                  <button className="rcp-btn rcp-sites" onClick={() => openSites(r)}>
                    🌐 Sites {sitesId === r._id ? '▲' : '▼'}
                  </button>
                  <button className={`rcp-btn ${r.active ? 'rcp-pause' : 'rcp-resume'}`} onClick={() => toggleActive(r)}>
                    {r.active ? 'Pause' : 'Resume'}
                  </button>
                  <button className="rcp-btn rcp-del" onClick={() => handleDelete(r._id, r.name)}>🗑</button>
                </div>
              </div>

              {/* Edit name/contact panel */}
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
                      <label>Alert via</label>
                      <ChannelToggle value={editForm.channels}
                        onChange={v => setEditForm({ ...editForm, channels: v })} />
                    </div>
                    {editForm.channels.includes('whatsapp') && (
                      <div className="form-group">
                        <label>WhatsApp Number</label>
                        <div className="phone-input-wrap">
                          <span className="phone-prefix">🇮🇳 +91</span>
                          <input type="tel" maxLength={10} value={editForm.phone || ''}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '') })} />
                        </div>
                      </div>
                    )}
                    {editForm.channels.includes('email') && (
                      <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" placeholder="name@example.com" value={editForm.email || ''}
                          onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Sites panel */}
              {sitesId === r._id && (
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
                        onClick={() => toggleSiteChip(s._id)}>
                        <span className={`chip-dot ${s.status || 'unknown'}`}></span>
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
                    <button className="btn-cancel-sites" onClick={() => setSitesId(null)}>Cancel</button>
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
