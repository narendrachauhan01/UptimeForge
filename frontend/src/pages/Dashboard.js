import React, { useEffect, useState } from 'react';
import { getServers, checkNow, API_URL } from '../api';
import axios from 'axios';

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [checking, setChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selected, setSelected] = useState(null);
  const [siteChecking, setSiteChecking] = useState(false);
  const [siteResult, setSiteResult] = useState(null);

  const load = () => getServers().then(r => { setServers(r.data); setLastUpdated(new Date()); });

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const getExpiryClass = (days) => {
    if (days == null) return 'expiry-na';
    if (days <= 7) return 'expiry-critical';
    if (days <= 30) return 'expiry-warn';
    return 'expiry-ok';
  };

  const domainDaysLeft = (s) => {
    if (!s.domainExpiry) return null;
    return Math.floor((new Date(s.domainExpiry) - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const up = servers.filter(s => s.status === 'up').length;
  const down = servers.filter(s => s.status === 'down').length;
  const unknown = servers.filter(s => s.status === 'unknown').length;

  const handleCheckNow = async () => {
    setChecking(true);
    await checkNow();
    setTimeout(() => { load(); setChecking(false); }, 3000);
  };

  const openSite = async (s) => {
    setSelected(s);
    setSiteResult(null);
    setSiteChecking(true);
    try {
      const res = await axios.get(`${API_URL}/api/expiry/${s._id}`);
      setSiteResult({ ssl: res.data.ssl, domain: res.data.domain });
      load();
    } catch (e) {
      setSiteResult({ error: 'Check failed' });
    }
    setSiteChecking(false);
  };

  const closeSite = () => { setSelected(null); setSiteResult(null); };


  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Dashboard</h1>
          {lastUpdated && <p className="pg-sub">Last updated: {lastUpdated.toLocaleTimeString('en-IN')}</p>}
        </div>
        <button className={`btn-refresh ${checking ? 'checking' : ''}`} onClick={handleCheckNow} disabled={checking}>
          {checking ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-box total">
          <div className="stat-icon">🖥️</div>
          <div className="stat-info">
            <div className="stat-value">{servers.length}</div>
            <div className="stat-name">Total Sites</div>
          </div>
        </div>
        <div className="stat-box online">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{up}</div>
            <div className="stat-name">Online</div>
          </div>
        </div>
        <div className="stat-box offline">
          <div className="stat-icon">🔴</div>
          <div className="stat-info">
            <div className="stat-value">{down}</div>
            <div className="stat-name">Offline</div>
          </div>
        </div>
        {unknown > 0 && (
          <div className="stat-box unknown">
            <div className="stat-icon">❓</div>
            <div className="stat-info">
              <div className="stat-value">{unknown}</div>
              <div className="stat-name">Unknown</div>
            </div>
          </div>
        )}
      </div>

      <div className="sites-grid">
        {servers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🖥️</div>
            <h3>No sites added yet</h3>
            <p>Go to <strong>Servers</strong> page to add your first site</p>
          </div>
        ) : (
          servers.map(s => (
            <div key={s._id} className={`site-card ${s.status}`} onClick={() => openSite(s)} style={{ cursor: 'pointer' }}>
              <div className="site-card-header">
                <div className="site-status-dot" data-status={s.status}></div>
                <span className={`site-badge ${s.status}`}>
                  {s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}
                </span>
              </div>
              <div className="site-name">{s.name}</div>
              <a href={s.url} target="_blank" rel="noreferrer" className="site-url"
                onClick={e => e.stopPropagation()}>{s.url}</a>
              <div className="site-meta">
                <span className="meta-item">⚡ {s.responseTime ? `${s.responseTime}ms` : '—'}</span>
                <span className="meta-item">🕐 {s.lastChecked ? new Date(s.lastChecked).toLocaleTimeString('en-IN') : 'Never'}</span>
              </div>
              <div className="expiry-row">
                <div className={`expiry-badge ${getExpiryClass(s.sslDaysLeft)}`}>
                  🔒 SSL: {s.sslExpiry ? `${s.sslDaysLeft}d — ${new Date(s.sslExpiry).toLocaleDateString('en-IN')}` : 'Not checked'}
                </div>
                <div className={`expiry-badge ${getExpiryClass(domainDaysLeft(s))}`}>
                  🌐 Domain: {s.domainExpiry ? `${domainDaysLeft(s)}d — ${new Date(s.domainExpiry).toLocaleDateString('en-IN')}` : 'Not set'}
                </div>
              </div>
              <div className="card-click-hint">Click for details</div>
            </div>
          ))
        )}
      </div>

      {/* Site Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeSite}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{selected.name}</div>
                <a href={selected.url} target="_blank" rel="noreferrer" className="modal-url">{selected.url}</a>
              </div>
              <button className="modal-close" onClick={closeSite}>✕</button>
            </div>

            <div className="modal-status-row">
              <div className={`modal-status ${selected.status}`}>
                <span className="site-status-dot" data-status={selected.status}></span>
                {selected.status === 'up' ? 'Online' : selected.status === 'down' ? 'Offline' : 'Unknown'}
              </div>
              <span className="modal-meta">⚡ {selected.responseTime || '—'}ms</span>
              <span className="modal-meta">🕐 {selected.lastChecked ? new Date(selected.lastChecked).toLocaleString('en-IN') : 'Never'}</span>
            </div>

            <div className="modal-expiry-grid">
              <div className="modal-expiry-box">
                <div className="modal-expiry-label">🔒 SSL Certificate</div>
                {siteChecking ? (
                  <div className="expiry-badge expiry-na">Checking...</div>
                ) : siteResult?.ssl ? (
                  <>
                    <div className={`expiry-badge ${getExpiryClass(siteResult.ssl.daysLeft)}`}>
                      {siteResult.ssl.daysLeft} days left
                    </div>
                    <div className="ssl-date">Expires: {new Date(siteResult.ssl.expiry).toLocaleDateString('en-IN')}</div>
                  </>
                ) : selected.sslExpiry ? (
                  <>
                    <div className={`expiry-badge ${getExpiryClass(selected.sslDaysLeft)}`}>
                      {selected.sslDaysLeft} days left
                    </div>
                    <div className="ssl-date">Expires: {new Date(selected.sslExpiry).toLocaleDateString('en-IN')}</div>
                  </>
                ) : (
                  <div className="expiry-badge expiry-na">Click Manual Check</div>
                )}
              </div>

              <div className="modal-expiry-box">
                <div className="modal-expiry-label">🌐 Domain Expiry</div>
                {siteChecking ? (
                  <div className="expiry-badge expiry-na">Checking...</div>
                ) : siteResult?.domain ? (
                  <>
                    <div className={`expiry-badge ${getExpiryClass(siteResult.domain.daysLeft)}`}>
                      {siteResult.domain.daysLeft} days left
                    </div>
                    <div className="ssl-date">Expires: {new Date(siteResult.domain.expiry).toLocaleDateString('en-IN')}</div>
                    {siteResult.domain.registrar && <div className="ssl-date" style={{color:'#7c3aed'}}>🏢 {siteResult.domain.registrar}</div>}
                  </>
                ) : selected.domainExpiry ? (
                  <>
                    <div className={`expiry-badge ${getExpiryClass(domainDaysLeft(selected))}`}>
                      {domainDaysLeft(selected)} days left
                    </div>
                    <div className="ssl-date">Expires: {new Date(selected.domainExpiry).toLocaleDateString('en-IN')}</div>
                  </>
                ) : (
                  <div className="expiry-badge expiry-na">Not available</div>
                )}
              </div>
            </div>

            {siteResult?.error && (
              <div className="form-error" style={{marginTop:0}}>⚠️ Could not fetch expiry info</div>
            )}

            {siteChecking && (
              <div className="modal-checking">⏳ Fetching SSL & Domain info...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
