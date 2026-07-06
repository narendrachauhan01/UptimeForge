import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_URL } from '../api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return gb.toFixed(1) + ' GB';
  return (bytes / (1024 ** 2)).toFixed(0) + ' MB';
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pct(used, total) {
  return total ? Math.min(Math.round((used / total) * 100), 100) : 0;
}

function colorByPct(p) {
  return p >= 90 ? '#EF4444' : p >= 70 ? '#F59E0B' : '#10B981';
}

function MiniBar({ value, color }) {
  return (
    <div style={{ height: 5, borderRadius: 10, overflow: 'hidden', background: 'rgba(148,163,184,0.15)', marginTop: 4 }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} />
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)', gap: 8 }}>
      <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', textAlign: 'right', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</span>
    </div>
  );
}

const STYLES = `
  .res-page {
    --primary: #7c3aed;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
  }
  .res-page.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226,232,240,0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-shadow: 0 2px 12px rgba(148,163,184,0.1);
    --table-header-bg: #f8fafc;
    --tooltip-bg: #ffffff;
    --tooltip-border: #e2e8f0;
    --recharts-grid: #f1f5f9;
    --recharts-text: #94a3b8;
    --hover-row-bg: rgba(124,58,237,0.04);
  }
  .res-page.dark {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255,255,255,0.07);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --card-shadow: 0 4px 24px rgba(0,0,0,0.35);
    --table-header-bg: #101622;
    --tooltip-bg: #172130;
    --tooltip-border: rgba(255,255,255,0.08);
    --recharts-grid: rgba(255,255,255,0.05);
    --recharts-text: #64748b;
    --hover-row-bg: rgba(124,58,237,0.08);
  }
  body.charts-dark-theme { background-color: #0b0f19 !important; }
  body.charts-dark-theme .app-main, body.charts-dark-theme .content { background-color: #0b0f19 !important; }

  .res-wrap { padding: 24px; }

  /* Server list cards */
  .server-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }
  .server-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 20px;
    cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
    position: relative;
  }
  .server-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 28px rgba(124,58,237,0.12);
    border-color: rgba(124,58,237,0.35);
  }

  /* Install card */
  .install-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    margin-bottom: 20px;
    overflow: hidden;
  }
  .install-cmd-box {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 14px 16px;
    font-family: monospace;
    font-size: 13px;
    color: var(--text-main);
    word-break: break-all;
    line-height: 1.6;
    flex: 1;
  }
  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    white-space: nowrap;
    transition: all 0.2s;
  }
  .copy-btn:hover { border-color: var(--primary); color: var(--primary); }
  .name-input {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    font-size: 13px;
    font-family: inherit;
    outline: none;
  }
  .name-input:focus { border-color: var(--primary); }

  /* Detail view */
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 20px;
  }
  .back-btn:hover { border-color: var(--primary); color: var(--primary); }
  .info-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
  }
  .info-box-header {
    padding: 12px 16px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .info-box-body { padding: 14px 16px; }
  .info-box-body .info-row:last-child { border-bottom: none !important; }

  .metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 16px;
  }
  .minibar-bg {
    height: 6px;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 8px;
    background: var(--bg-input);
  }
  .sessions-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 20px;
  }
  .sessions-th {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }
  .session-row { border-bottom: 1px solid var(--border-color); transition: background 0.15s; }
  .session-row:last-child { border-bottom: none; }
  .session-row:hover { background: var(--hover-row-bg); }
  .session-td { padding: 12px 16px; font-size: 13px; color: var(--text-main); }
  .session-item {
    display: flex; align-items: center; gap: 12px;
    padding: 8px 0; border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap; font-size: 13px;
  }
  .session-item:last-child { border-bottom: none; }
  .badge-online { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .res-page.light .badge-online { background: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0; }
  .res-page.dark  .badge-online { background: rgba(16,185,129,0.08); color: #10B981; border: 1px solid rgba(16,185,129,0.2); }
  .badge-offline { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .res-page.light .badge-offline { background: #FEE2E2; color: #991B1B; border: 1px solid #FECDD3; }
  .res-page.dark  .badge-offline { background: rgba(239,68,68,0.08); color: #EF4444; border: 1px solid rgba(239,68,68,0.2); }
`;

const STALE_MS = 90 * 1000;
const isServerOnline = (sv) => sv?.timestamp && (Date.now() - new Date(sv.timestamp).getTime()) < STALE_MS;

export default function Resources() {
  const [servers, setServers]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const tickRef    = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const [agentKey, setAgentKey]     = useState('');
  const [agentApiUrl, setAgentApiUrl] = useState('');
  const [agentLimit, setAgentLimit] = useState(0);
  const [showInstall, setShowInstall] = useState(false);
  const [serverName, setServerName] = useState('');
  const [copied, setCopied]         = useState(false);
  const [keyCopied, setKeyCopied]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [regenerating, setRegenerating] = useState(false);

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
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [localTheme]);

  useEffect(() => {
    if (localTheme === 'dark') document.body.classList.add('charts-dark-theme');
    else document.body.classList.remove('charts-dark-theme');
    return () => document.body.classList.remove('charts-dark-theme');
  }, [localTheme]);

  useEffect(() => {
    axios.get(`${API_URL}/api/agent/key`, { withCredentials: true })
      .then(r => { setAgentKey(r.data.agentKey); setAgentApiUrl(r.data.apiUrl); setAgentLimit(r.data.limit); })
      .catch(() => {});
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/latest`, { withCredentials: true });
      const real = res.data.filter(s => s.ramTotal > 0);
      setServers(real);
      setSecondsAgo(0);
      // Keep selected in sync with fresh data
      if (selectedRef.current) {
        const fresh = real.find(s => s.serverId === selectedRef.current.serverId);
        if (fresh) setSelected(fresh);
      }
    } catch (e) { console.error(e.message); }
    setLoading(false);
  }, []);

  const loadHistory = useCallback(async (serverId) => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/${serverId}/history`, { withCredentials: true });
      setHistory(res.data.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cpu: h.cpu || 0,
        ram: pct(h.ramUsed, h.ramTotal),
        disk: pct(h.diskUsed, h.diskTotal),
      })));
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadLatest();
    const t = setInterval(loadLatest, 5000);
    return () => clearInterval(t);
  }, [loadLatest]);

  useEffect(() => {
    tickRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    if (selected) loadHistory(selected.serverId);
  }, [selected, loadHistory]);

  const installCmd = agentKey && agentApiUrl
    ? `curl -fsSL "${agentApiUrl}/api/agent/install" | bash -s -- "${agentKey}" "${serverName || 'my-server'}"`
    : '';

  const handleCopy    = () => { if (!installCmd) return; navigator.clipboard.writeText(installCmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const handleCopyKey = () => { navigator.clipboard.writeText(agentKey).then(() => { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }); };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate key? All existing agents will stop reporting until reinstalled.')) return;
    setRegenerating(true);
    try { const r = await axios.post(`${API_URL}/api/agent/regenerate`, {}, { withCredentials: true }); setAgentKey(r.data.agentKey); } catch (_) {}
    setRegenerating(false);
  };

  const handleDeleteServer = async (serverId) => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/metrics/${serverId}`, { withCredentials: true });
      setServers(prev => prev.filter(sv => sv.serverId !== serverId));
      if (selected?.serverId === serverId) { setSelected(null); setHistory([]); }
    } catch (_) {}
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <p style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {p.value}%</p>)}
      </div>
    );
  };

  if (loading) return (
    <div className={`res-page ${localTheme}`}>
      <style>{STYLES}</style>
      <div className="res-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: 14 }}>Loading metrics...</p>
        </div>
      </div>
    </div>
  );

  const atLimit = agentLimit > 0 && servers.length >= agentLimit;

  const installPanel = (
    <div className="install-card">
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(124,58,237,0.03))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📡</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>Install Agent on Your Server</span>
        </div>
        {servers.length > 0 && (
          <button onClick={() => setShowInstall(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        )}
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Step 1 — Name your server (optional)</div>
          <input
            className="name-input"
            type="text"
            placeholder="e.g. prod-web-01"
            value={serverName}
            onChange={e => setServerName(e.target.value)}
            style={{ width: 220 }}
          />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>Leave blank to use hostname</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Step 2 — Run on your Linux server</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
            <div className="install-cmd-box">{installCmd || 'Loading...'}</div>
            <button className="copy-btn" onClick={handleCopy}>{copied ? '✓ Copied!' : '⎘ Copy'}</button>
          </div>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          ✓ Ubuntu · Debian · RHEL · CentOS · Arch · Alpine · openSUSE &nbsp;|&nbsp; ✓ Root &amp; non-root &nbsp;|&nbsp; ✓ Auto-installs Node.js &nbsp;|&nbsp; ✓ Appears in ~30s
        </div>
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your key:</span>
          <code style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: 'var(--text-main)', letterSpacing: '1px' }}>{agentKey || '...'}</code>
          <button className="copy-btn" onClick={handleCopyKey}>{keyCopied ? '✓' : 'Copy Key'}</button>
          <button className="copy-btn" onClick={handleRegenerate} disabled={regenerating} style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}>
            {regenerating ? 'Regenerating...' : '↺ Regenerate'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Delete modal ──────────────────────────────────────
  const DeleteModal = () => deleteConfirm ? (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>Remove Server</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Remove <strong style={{ color: 'var(--text-main)' }}>{servers.find(sv => sv.serverId === deleteConfirm)?.serverName || deleteConfirm}</strong> and all its data?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button onClick={() => handleDeleteServer(deleteConfirm)} disabled={deleting}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            {deleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ══════════════════════════════════════════════════════
  // ── LIST VIEW (no server selected) ───────────────────
  // ══════════════════════════════════════════════════════
  if (!selected) {
    return (
      <div className={`res-page ${localTheme}`}>
        <style>{STYLES}</style>
        <DeleteModal />
        <div className="res-wrap">

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'Outfit,sans-serif', fontSize: 28, fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                Infra Monitor <span style={{ color: 'var(--primary)' }}>.</span>
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                Real-time server resource monitoring
                {agentLimit > 0 && (
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: atLimit ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)', color: atLimit ? '#EF4444' : 'var(--primary)', border: `1px solid ${atLimit ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)'}` }}>
                    {servers.length}/{agentLimit} servers
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setShowInstall(o => !o)} disabled={atLimit}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: atLimit ? 'not-allowed' : 'pointer', border: 'none', background: atLimit ? 'rgba(156,163,175,0.15)' : 'var(--primary)', color: atLimit ? 'var(--text-muted)' : '#fff', opacity: atLimit ? 0.7 : 1 }}
              title={atLimit ? `Plan limit reached (${agentLimit} servers)` : 'Add a new server'}>
              ＋ Add Server
            </button>
          </div>

          {/* Install panel */}
          {showInstall && installPanel}

          {/* Empty state / Server grid — hidden when install panel is open */}
          {!showInstall && (servers.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: 'var(--card-shadow)', padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📡</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>No servers connected yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>Install the agent on any Linux server to start monitoring</div>
              {installPanel}
            </div>
          ) : (
            /* Server grid */
            <div className="server-grid">
              {servers.map(sv => {
                const online  = isServerOnline(sv);
                const cpuPct  = sv.cpu || 0;
                const ramPct  = pct(sv.ramUsed, sv.ramTotal);
                const diskPct = pct(sv.diskUsed, sv.diskTotal);
                return (
                  <div key={sv.serverId} className="server-card" onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}>
                    {/* Delete button */}
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(sv.serverId); }}
                      style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#EF4444', fontSize: 11, padding: '2px 8px', cursor: 'pointer', fontWeight: 700, opacity: 0.7, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                      title="Remove server"
                    >✕</button>

                    {/* Name + status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingRight: 36 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: online ? '#10B981' : '#EF4444', flexShrink: 0, boxShadow: online ? '0 0 6px #10B981' : 'none' }} />
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sv.serverName}</div>
                    </div>

                    {/* Sub info */}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                      {sv.hostname} &bull; {sv.platform} &bull; {formatUptime(sv.uptime)}
                    </div>

                    {/* Mini metric bars */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                      {[
                        { label: 'CPU', val: cpuPct },
                        { label: 'RAM', val: ramPct },
                        { label: 'Disk', val: diskPct },
                      ].map(m => (
                        <div key={m.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>{m.label}</span>
                            <span style={{ color: colorByPct(m.val) }}>{m.val}%</span>
                          </div>
                          <MiniBar value={m.val} color={colorByPct(m.val)} />
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={online ? 'badge-online' : 'badge-offline'}>{online ? 'Online' : 'Offline'}</span>
                      <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>View Details →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  // ── DETAIL VIEW (server selected) ────────────────────
  // ══════════════════════════════════════════════════════
  const s        = selected;
  const online   = isServerOnline(s);
  const dataAge  = Date.now() - new Date(s.timestamp).getTime();
  const ramPct   = pct(s.ramUsed, s.ramTotal);
  const diskPct  = pct(s.diskUsed, s.diskTotal);
  const swapPct  = pct(s.swapUsed, s.swapTotal);

  return (
    <div className={`res-page ${localTheme}`}>
      <style>{STYLES}</style>
      <DeleteModal />
      <div className="res-wrap">

        {/* Back + header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <button className="back-btn" onClick={() => { setSelected(null); setHistory([]); }}>
            ← All Servers
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {online && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', color: '#10B981' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}
              </span>
            )}
            <button onClick={() => setDeleteConfirm(s.serverId)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              🗑 Remove
            </button>
          </div>
        </div>

        {/* Server header card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: 'var(--card-shadow)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: online ? '#10B981' : '#EF4444', flexShrink: 0, boxShadow: online ? '0 0 8px #10B981' : 'none' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-main)' }}>{s.serverName}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{s.hostname} &bull; {s.platform} &bull; {formatUptime(s.uptime)}</div>
            </div>
          </div>
          <span className={online ? 'badge-online' : 'badge-offline'} style={{ fontSize: 13, padding: '5px 14px' }}>{online ? 'Online' : 'Offline'}</span>
        </div>

        {/* Offline banner */}
        {!online && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
            🔴 Offline — last seen {dataAge < 60000 ? `${Math.round(dataAge/1000)}s` : `${Math.round(dataAge/60000)} min`} ago
          </div>
        )}

        {/* Metric cards */}
        {online && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'CPU',       value: `${s.cpu || 0}%`, pctVal: s.cpu || 0 },
              { label: 'RAM',       value: `${ramPct}%`,     pctVal: ramPct },
              { label: 'Disk',      value: `${diskPct}%`,    pctVal: diskPct },
              ...(s.swapTotal > 0 ? [{ label: 'Swap', value: `${swapPct}%`, pctVal: swapPct }] : []),
              { label: 'Load (1m)', value: `${s.load1 || 0}`, fixed: true },
            ].map((m, idx) => {
              const color = m.fixed ? '#7c3aed' : colorByPct(m.pctVal);
              return (
                <div key={idx} className="metric-card" style={{ borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 6 }}>{m.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color }}>{m.value}</div>
                  {!m.fixed && (
                    <div className="minibar-bg"><div style={{ width: `${m.pctVal}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} /></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info boxes */}
        {online && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
            {[
              { icon: '🖥️', title: 'System', accent: '#7c3aed', rows: [
                { label: 'Hostname', value: s.hostname },
                { label: 'Platform', value: s.platform },
                { label: 'Uptime',   value: formatUptime(s.uptime) },
                { label: 'Last check', value: new Date(s.timestamp).toLocaleTimeString('en-IN') },
              ]},
              { icon: '⚙️', title: 'CPU', accent: '#7c3aed', rows: [
                { label: 'Usage',        value: `${s.cpu || 0}%` },
                { label: 'Cores',        value: s.cpuCores ? `${s.cpuCores} cores` : null },
                { label: 'Architecture', value: s.cpuArch },
                { label: 'Model',        value: s.cpuModel ? s.cpuModel.substring(0, 35) : null },
                { label: 'Load avg',     value: s.load1 !== undefined ? `${s.load1} · ${s.load5} · ${s.load15}` : null },
              ]},
              { icon: '🧠', title: 'Memory', accent: '#10B981', rows: [
                { label: 'RAM Used',   value: formatBytes(s.ramUsed) },
                { label: 'RAM Free',   value: formatBytes(s.ramTotal - s.ramUsed) },
                { label: 'RAM Total',  value: formatBytes(s.ramTotal) },
                ...(s.swapTotal > 0 ? [{ label: 'Swap Used', value: formatBytes(s.swapUsed) }, { label: 'Swap Total', value: formatBytes(s.swapTotal) }] : []),
              ]},
              { icon: '💾', title: 'Storage', accent: '#06B6D4', rows: [
                { label: 'Used',  value: formatBytes(s.diskUsed) },
                { label: 'Free',  value: formatBytes(s.diskTotal - s.diskUsed) },
                { label: 'Total', value: formatBytes(s.diskTotal) },
                { label: 'Usage', value: `${diskPct}%` },
              ]},
              { icon: '🌐', title: 'Network', accent: '#F59E0B', rows: [
                { label: 'Local IP',  value: s.localIp,  mono: true },
                { label: 'Public IP', value: s.publicIp, mono: true },
              ]},
            ].map(box => (
              <div key={box.title} className="info-box">
                <div className="info-box-header" style={{ borderLeft: `3px solid ${box.accent}` }}>
                  <span style={{ fontSize: 16 }}>{box.icon}</span>{box.title}
                </div>
                <div className="info-box-body">
                  {box.rows.map(r => <InfoRow key={r.label} label={r.label} value={r.value} mono={r.mono} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active SSH Sessions */}
        {s.activeSessions && s.activeSessions.length > 0 && (
          <div className="sessions-card">
            <div style={{ padding: '14px 20px', background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>👥</span>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>Active SSH Sessions</span>
              <span className="badge-online" style={{ marginLeft: 'auto' }}>{s.activeSessions.length} online</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header-bg)' }}>
                    {['User', 'TTY', 'IP Address', 'Login', 'Idle', 'Command'].map(h => <th key={h} className="sessions-th">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {s.activeSessions.map((u, i) => (
                    <tr key={i} className="session-row">
                      <td className="session-td" style={{ fontWeight: 700, color: 'var(--primary)' }}>{u.user}</td>
                      <td className="session-td" style={{ color: 'var(--text-muted)' }}>{u.tty}</td>
                      <td className="session-td" style={{ fontFamily: 'monospace', color: '#10B981' }}>{u.from}</td>
                      <td className="session-td" style={{ color: 'var(--text-muted)' }}>{u.loginTime}</td>
                      <td className="session-td" style={{ color: '#F59E0B', fontWeight: 600 }}>{u.idle}</td>
                      <td className="session-td" style={{ fontFamily: 'monospace', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{u.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent SSH logins */}
        {s.lastSsh && s.lastSsh.length > 0 && (
          <div className="info-box" style={{ marginBottom: 20 }}>
            <div className="info-box-header" style={{ borderLeft: '3px solid #EF4444' }}>
              <span style={{ fontSize: 16 }}>🔐</span>Recent SSH Logins
            </div>
            <div className="info-box-body">
              {s.lastSsh.slice(0, 5).map((l, i) => (
                <div key={i} className="session-item">
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{l.user}</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip}</span>
                  <span style={{ color: 'var(--text-muted)', opacity: 0.8, fontSize: 12 }}>{l.time}</span>
                  <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.active ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', color: l.active ? '#10B981' : '#94a3b8' }}>
                    {l.active ? 'Active' : 'Ended'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Charts */}
        {history.length > 0 && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: 'var(--card-shadow)', padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 16 }}>
              {s.serverName} — Last 2 Hours
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {[{ key: 'cpu', name: 'CPU %', color: '#7c3aed' }, { key: 'ram', name: 'RAM %', color: '#10B981' }, { key: 'disk', name: 'Disk %', color: '#06B6D4' }].map(({ key, name, color }) => (
                <div key={key}>
                  <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{name}</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={history} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--recharts-text)' }} interval="preserveStartEnd" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--recharts-text)' }} unit="%" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
