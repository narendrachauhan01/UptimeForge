import React, { useEffect, useState } from 'react';
import { useConfirm } from '../components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';
import { getServers, deleteServer, updateServer, getPlans } from '../api';

export default function Servers({ user, isAdmin, onNotify }) {
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [planInterval, setPlanInterval] = useState(60);

  const load = () => getServers().then(r => setServers(r.data));
  useEffect(() => {
    load();
    // Fetch plan interval for display
    if (!isAdmin) {
      getPlans().then(r => {
        const plan = user?.plan || 'free_trial';
        const settings = r.data;
        let interval = 60;
        if (plan === 'free_trial') interval = settings.freeTrialInterval || 300;
        else interval = settings.plans?.[plan]?.interval || 60;
        setPlanInterval(interval);
      }).catch(() => {});
    }
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteServer(id);
    load();
    onNotify?.();
  };

  const toggleActive = async (s) => {
    await updateServer(s._id, { active: !s.active });
    load();
  };

  const startEdit = (s) => {
    setEditId(s._id);
    const de = s.domainExpiry ? new Date(s.domainExpiry).toISOString().split('T')[0] : '';
    setEditForm({ name: s.name, url: s.url, domainExpiry: de });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.url) return;
    await updateServer(editId, editForm);
    setEditId(null);
    load();
    onNotify?.();
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
      <ConfirmDialog />
      {/* Header */}
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Sites</h1>
          <p className="pg-sub">{servers.length} site{servers.length !== 1 ? 's' : ''} being monitored
            {!isAdmin && user && <span style={{color:'#94a3b8'}}> · {user.siteLimit} max on {user.plan} plan</span>}
          </p>
        </div>
        <button className="btn-primary-pill" onClick={() => navigate('/add-monitor')}>
          + Add Site
        </button>
      </div>

      {/* Plan usage bar (for users) */}
      {!isAdmin && user && (
        <div className="plan-usage-bar">
          <div className="plan-usage-track">
            <div
              className="plan-usage-fill"
              style={{
                width: `${Math.min(100, (servers.length / user.siteLimit) * 100)}%`,
                background: servers.length >= user.siteLimit ? '#ef4444' : 'linear-gradient(90deg,#7c3aed,#a78bfa)',
              }}
            />
          </div>
          <span className="plan-usage-label">
            {servers.length} / {user.siteLimit} sites used
            {servers.length >= user.siteLimit && (
              <button className="plan-upgrade-inline" onClick={() => navigate('/account')}>Upgrade</button>
            )}
          </span>
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
                      {!isAdmin && <span className="meta-txt" title="Check interval set by your plan">⏱ {planInterval >= 60 ? `${planInterval/60}m` : `${planInterval}s`}</span>}
                      {isAdmin && <span className="meta-txt">{s.checkInterval}s</span>}
                      {s.responseTime && <span className="meta-txt">⚡ {s.responseTime}ms</span>}
                    </div>
                    <div className="server-actions">
                      <button className="act-btn edit" onClick={() => navigate('/add-monitor', { state: { editServer: s } })}>Edit</button>
                      <button className={`act-btn ${s.active ? 'pause' : 'resume'}`} onClick={() => toggleActive(s)}>{s.active ? 'Pause' : 'Resume'}</button>
                      <button className="act-btn del" onClick={() => handleDelete(s._id, s.name)}>Delete</button>
                    </div>
                  </div>
                </div>
                {editId === s._id && (
                  <div className="edit-panel">
                    <div className="form-grid">
                      <div className="form-group"><label>Site Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
                      <div className="form-group"><label>Site URL</label><input value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} /></div>
                      {!isAdmin && (
                        <div className="form-group" style={{ maxWidth: 180 }}>
                          <label>Check Interval</label>
                          <div style={{ padding:'8px 12px', background:'#f1f5f9', borderRadius:8, fontSize:13, color:'#475569', fontWeight:600, border:'1px solid #e2e8f0' }}>
                            ⏱ {planInterval >= 60 ? `${planInterval/60} min` : `${planInterval} sec`} <span style={{fontWeight:400,color:'#94a3b8'}}>(set by your plan)</span>
                          </div>
                        </div>
                      )}
                      {isAdmin && <div className="form-group" style={{ maxWidth: 140 }}><label>Interval (sec)</label><input type="number" value={editForm.checkInterval || 60} onChange={e => setEditForm({ ...editForm, checkInterval: parseInt(e.target.value) })} /></div>}
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
