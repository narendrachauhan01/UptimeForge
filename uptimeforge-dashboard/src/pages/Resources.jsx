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
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function pct(used, total) {
  return total ? Math.min(Math.round((used / total) * 100), 100) : 0;
}

function InfoBox({ icon, title, children, accent = '#4F46E5' }) {
  return (
    <div className="info-box">
      <div className="info-box-header" style={{ borderLeft: `3px solid ${accent}` }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span className="info-box-title">{title}</span>
      </div>
      <div className="info-box-body">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="info-row">
      <span className="info-row-lbl">{label}</span>
      <span className="info-row-val" style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>
        {value || '—'}
      </span>
    </div>
  );
}

function MiniBar({ value, color }) {
  return (
    <div className="minibar-bg">
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} />
    </div>
  );
}

function colorByPct(p) {
  return p >= 90 ? '#EF4444' : p >= 70 ? '#F59E0B' : '#10B981';
}

const RESOURCES_STYLES = `
  .perf-page-container {
    --primary: #7c3aed;
    --primary-hover: #6d28d9;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
    font-family: 'Plus Jakarta Sans', sans-serif;
    min-height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-main);
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .perf-page-container.light {
    --bg-primary: #f8fafc;
    --bg-card: #ffffff;
    --bg-input: #f1f5f9;
    --border-color: rgba(226, 232, 240, 0.8);
    --text-main: #0f172a;
    --text-muted: #64748b;
    --card-shadow: 0 4px 20px -2px rgba(148, 163, 184, 0.06), 0 2px 8px -1px rgba(148, 163, 184, 0.04);
    --card-hover-shadow: 0 12px 30px -4px rgba(148, 163, 184, 0.12), 0 4px 12px -2px rgba(148, 163, 184, 0.06);
    --hover-row-bg: rgba(124, 58, 237, 0.04);
    --table-header-bg: #f8fafc;
    --recharts-grid: #f1f5f9;
    --recharts-text: #94a3b8;
    --tooltip-bg: #ffffff;
    --tooltip-border: #e2e8f0;
  }

  .perf-page-container.dark {
    --bg-primary: #0b0f19;
    --bg-card: #131a26;
    --bg-input: #1b2535;
    --border-color: rgba(255, 255, 255, 0.07);
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
    --card-shadow: 0 4px 25px -2px rgba(0, 0, 0, 0.35), 0 2px 10px -1px rgba(0, 0, 0, 0.2);
    --card-hover-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.55), 0 6px 16px -2px rgba(0, 0, 0, 0.3);
    --hover-row-bg: rgba(124, 58, 237, 0.08);
    --table-header-bg: #101622;
    --recharts-grid: rgba(255, 255, 255, 0.05);
    --recharts-text: #64748b;
    --tooltip-bg: #172130;
    --tooltip-border: rgba(255, 255, 255, 0.08);
  }

  body.charts-dark-theme {
    background-color: #0b0f19 !important;
  }
  body.charts-dark-theme .app-main,
  body.charts-dark-theme .content {
    background-color: #0b0f19 !important;
    transition: background-color 0.3s ease;
  }

  .perf-page-container .pg-wrap {
    padding: 24px;
    background: transparent !important;
  }

  .perf-page-container .pg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .perf-page-container .pg-title {
    font-family: 'Outfit', sans-serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-main);
    margin: 0;
  }

  .perf-page-container .pg-sub {
    font-size: 14px;
    color: var(--text-muted);
    margin: 4px 0 0 0;
    font-weight: 500;
  }

  .perf-page-container .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .perf-page-container.light .live-badge {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    color: #15803D;
  }
  .perf-page-container.dark .live-badge {
    background: rgba(16, 185, 129, 0.06);
    border: 1px solid rgba(16, 185, 129, 0.15);
    color: #10B981;
  }

  .perf-page-container .info-box {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .perf-page-container .info-box-header {
    padding: 12px 16px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color) !important;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .perf-page-container .info-box-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .perf-page-container .info-box-body {
    padding: 14px 16px;
  }

  .perf-page-container .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
    gap: 8px;
  }
  .perf-page-container .info-row:last-child { border-bottom: none; }
  .perf-page-container .info-row-lbl {
    font-size: 12.5px;
    color: var(--text-muted);
    font-weight: 500;
    flex-shrink: 0;
  }
  .perf-page-container .info-row-val {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-main);
    text-align: right;
    word-break: break-all;
  }

  .perf-page-container .server-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--border-color);
  }
  .perf-page-container.light .server-btn { background: #ffffff; color: #374151; }
  .perf-page-container.dark .server-btn { background: var(--bg-card); color: var(--text-main); }
  .perf-page-container .server-btn.active {
    border-color: var(--primary) !important;
    background: var(--primary) !important;
    color: #ffffff !important;
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
  }

  .perf-page-container .card-header-panel {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .perf-page-container .card-status-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    border-width: 1px;
    border-style: solid;
  }
  .perf-page-container.light .card-status-badge.online { background: #D1FAE5; color: #065F46; border-color: #A7F3D0; }
  .perf-page-container.dark .card-status-badge.online { background: rgba(16,185,129,0.08); color: #10B981; border-color: rgba(16,185,129,0.2); }
  .perf-page-container.light .card-status-badge.offline { background: #FEE2E2; color: #991B1B; border-color: #FECDD3; }
  .perf-page-container.dark .card-status-badge.offline { background: rgba(239,68,68,0.08); color: #EF4444; border-color: rgba(239,68,68,0.2); }

  .perf-page-container .metric-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 16px;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s;
  }

  .perf-page-container .minibar-bg {
    height: 6px;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 8px;
  }
  .perf-page-container.light .minibar-bg { background: #E2E8F0; }
  .perf-page-container.dark .minibar-bg { background: var(--bg-input); }

  .perf-page-container .sessions-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    overflow: hidden;
    margin-bottom: 20px;
  }
  .perf-page-container .sessions-header {
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color) !important;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .perf-page-container .sessions-th {
    padding: 12px 16px;
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    border-bottom: 1px solid var(--border-color) !important;
  }
  .perf-page-container .session-row {
    border-bottom: 1px solid var(--border-color);
    transition: background-color 0.15s ease;
  }
  .perf-page-container .session-row:last-child { border-bottom: none; }
  .perf-page-container .session-row:hover { background-color: var(--hover-row-bg) !important; }
  .perf-page-container .session-td { padding: 14px 16px; font-size: 13px; color: var(--text-main); }
  .perf-page-container .session-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color);
    flex-wrap: wrap;
    font-size: 13px;
  }
  .perf-page-container .session-item:last-child { border-bottom: none; }

  .perf-page-container .recent-badge {
    padding: 2px 8px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
  }
  .perf-page-container.light .recent-badge.active { background: #D1FAE5; color: #065F46; }
  .perf-page-container.dark .recent-badge.active { background: rgba(16,185,129,0.08); color: #10B981; }
  .perf-page-container.light .recent-badge.ended { background: #F3F4F6; color: #6B7280; }
  .perf-page-container.dark .recent-badge.ended { background: rgba(255,255,255,0.04); color: #94a3b8; }

  .perf-page-container .history-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 24px;
    margin-bottom: 24px;
  }

  .perf-page-container .install-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    margin-bottom: 20px;
    overflow: hidden;
  }
  .perf-page-container .install-header {
    padding: 14px 20px;
    background: var(--table-header-bg);
    border-bottom: 1px solid var(--border-color) !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
  }
  .perf-page-container .install-body {
    padding: 20px;
  }
  .perf-page-container .install-cmd-box {
    background: var(--bg-input) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 10px;
    padding: 14px 16px;
    font-family: monospace;
    font-size: 13px;
    color: var(--text-main);
    word-break: break-all;
    position: relative;
    line-height: 1.6;
  }
  .perf-page-container .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    white-space: nowrap;
  }
  .perf-page-container .copy-btn:hover { border-color: var(--primary); color: var(--primary); }
  .perf-page-container .delete-server-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid rgba(239,68,68,0.3);
    background: transparent;
    color: #EF4444;
  }
  .perf-page-container .delete-server-btn:hover { background: rgba(239,68,68,0.08); }
  .perf-page-container .name-input {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    width: 220px;
  }
  .perf-page-container .name-input:focus { border-color: var(--primary); }

  .perf-page-container .no-agent-card {
    background: var(--bg-card) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px;
    box-shadow: var(--card-shadow);
    padding: 40px 32px;
  }
`;

export default function Resources() {
  const [servers, setServers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const tickRef = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const [agentKey, setAgentKey] = useState('');
  const [agentApiUrl, setAgentApiUrl] = useState('');
  const [agentLimit, setAgentLimit] = useState(0);
  const [showInstall, setShowInstall] = useState(false);
  const [serverName, setServerName] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // serverId
  const [deleting, setDeleting] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const [localTheme, setLocalTheme] = useState(() => {
    const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
    return match ? match[1] : 'dark';
  });

  useEffect(() => {
    const checkThemeCookie = () => {
      const match = document.cookie.match(/(?:^| )charts_theme=([^;]+)/);
      const current = match ? match[1] : 'dark';
      if (current !== localTheme) setLocalTheme(current);
    };
    checkThemeCookie();
    const interval = setInterval(checkThemeCookie, 1000);
    return () => clearInterval(interval);
  }, [localTheme]);

  useEffect(() => {
    if (localTheme === 'dark') document.body.classList.add('charts-dark-theme');
    else document.body.classList.remove('charts-dark-theme');
    return () => document.body.classList.remove('charts-dark-theme');
  }, [localTheme]);

  // Load agent key
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
      if (real.length > 0 && !selectedRef.current) setSelected(real[0]);
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
    const t = setInterval(loadLatest, 10000);
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

  const handleCopy = () => {
    if (!installCmd) return;
    navigator.clipboard.writeText(installCmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(agentKey).then(() => { setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); });
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate agent key? All existing agents will stop reporting until you reinstall them with the new key.')) return;
    setRegenerating(true);
    try {
      const r = await axios.post(`${API_URL}/api/agent/regenerate`, {}, { withCredentials: true });
      setAgentKey(r.data.agentKey);
    } catch (_) {}
    setRegenerating(false);
  };

  const handleDeleteServer = async (serverId) => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/metrics/${serverId}`, { withCredentials: true });
      setServers(prev => prev.filter(sv => sv.serverId !== serverId));
      if (selected?.serverId === serverId) setSelected(null);
      setHistory([]);
    } catch (_) {}
    setDeleteConfirm(null);
    setDeleting(false);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--card-shadow)', fontSize: 12 }}>
        <p style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {p.value}%</p>)}
      </div>
    );
  };

  if (loading) return (
    <div className={`perf-page-container ${localTheme}`}>
      <style>{RESOURCES_STYLES}</style>
      <div className="pg-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
          <p style={{ fontSize: 14 }}>Loading metrics...</p>
        </div>
      </div>
    </div>
  );

  const s = selected;
  const ramPct  = s ? pct(s.ramUsed,  s.ramTotal)  : 0;
  const diskPct = s ? pct(s.diskUsed, s.diskTotal) : 0;
  const swapPct = s ? pct(s.swapUsed, s.swapTotal) : 0;
  const STALE_MS = 60 * 1000;
  const dataAge = s ? (Date.now() - new Date(s.timestamp).getTime()) : Infinity;
  const isOnline = dataAge < STALE_MS;
  const atLimit = agentLimit > 0 && servers.length >= agentLimit;

  return (
    <div className={`perf-page-container ${localTheme}`}>
      <style>{RESOURCES_STYLES}</style>
      <div className="pg-wrap">

        {/* Page Header */}
        <div className="pg-header">
          <div>
            <h1 className="pg-title">
              Infra Monitor <span style={{ color: 'var(--primary)' }}>.</span>
            </h1>
            <p className="pg-sub">
              Real-time server resource monitoring
              {agentLimit > 0 && (
                <span style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: servers.length >= agentLimit ? 'rgba(239,68,68,0.1)' : 'rgba(124,58,237,0.1)', color: servers.length >= agentLimit ? '#EF4444' : 'var(--primary)', border: `1px solid ${servers.length >= agentLimit ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.2)'}` }}>
                  {servers.length}/{agentLimit} servers
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {servers.length > 0 && (
              <span className="live-badge">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}
              </span>
            )}
            <button
              onClick={() => setShowInstall(o => !o)}
              disabled={atLimit}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: atLimit ? 'not-allowed' : 'pointer', border: 'none',
                background: atLimit ? 'rgba(156,163,175,0.15)' : 'var(--primary)',
                color: atLimit ? 'var(--text-muted)' : '#fff',
                opacity: atLimit ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              title={atLimit ? `Plan limit reached (${agentLimit} servers max)` : 'Add a new server'}
            >
              ＋ Add Server
            </button>
          </div>
        </div>

        {/* Add Server / Install Section */}
        {showInstall && (
          <div className="install-card">
            <div className="install-header" onClick={() => setShowInstall(false)}
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.04) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>📡</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>Install Agent on Your Server</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>×</span>
            </div>
            <div className="install-body">
              {/* Step 1 */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Step 1 — Name your server (optional)
                </div>
                <input
                  className="name-input"
                  type="text"
                  placeholder="e.g. prod-web-01"
                  value={serverName}
                  onChange={e => setServerName(e.target.value.replace(/[^a-zA-Z0-9\-_. ]/g, ''))}
                />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Leave blank to use hostname automatically
                </div>
              </div>

              {/* Step 2 — install command */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Step 2 — Run this on your Linux server (as any user)
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div className="install-cmd-box" style={{ flex: 1, minWidth: 0 }}>
                    {installCmd || 'Loading...'}
                  </div>
                  <button className="copy-btn" onClick={handleCopy} style={{ marginTop: 0 }}>
                    {copied ? '✓ Copied!' : '⎘ Copy'}
                  </button>
                </div>
              </div>

              {/* What happens */}
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginBottom: 8 }}>What this installs:</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  ✓ Auto-detects OS (Ubuntu/Debian/RHEL/CentOS/Arch/Alpine/openSUSE)<br/>
                  ✓ Installs Node.js if not present<br/>
                  ✓ Downloads and configures the monitoring agent<br/>
                  ✓ Sets up systemd service for auto-start (falls back to nohup)<br/>
                  ✓ Server appears in dashboard within ~30 seconds
                </div>
              </div>

              {/* Agent key + regenerate */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Your Agent Key
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <code style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: 8, fontSize: 13, color: 'var(--text-main)', letterSpacing: '1px' }}>
                    {agentKey || '...'}
                  </code>
                  <button className="copy-btn" onClick={handleCopyKey}>{keyCopied ? '✓ Copied' : 'Copy Key'}</button>
                  <button className="copy-btn" onClick={handleRegenerate} disabled={regenerating}
                    style={{ color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}>
                    {regenerating ? 'Regenerating...' : '↺ Regenerate'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Keep this key private — it authenticates all your servers.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No servers — full install instructions */}
        {servers.length === 0 ? (
          <div className="no-agent-card">
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📡</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>No servers connected yet</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Install the agent on any Linux server to start monitoring</div>
            </div>

            {/* Inline install for empty state */}
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Server name (optional)
                </div>
                <input
                  className="name-input"
                  type="text"
                  placeholder="e.g. prod-web-01"
                  value={serverName}
                  onChange={e => setServerName(e.target.value.replace(/[^a-zA-Z0-9\-_. ]/g, ''))}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Run this command on your Linux server
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div className="install-cmd-box" style={{ flex: 1 }}>{installCmd || 'Loading...'}</div>
                  <button className="copy-btn" onClick={handleCopy}>{copied ? '✓ Copied!' : '⎘ Copy'}</button>
                </div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  ✓ Works on Ubuntu · Debian · RHEL · CentOS · Arch · Alpine · openSUSE<br/>
                  ✓ Root and non-root users · Installs Node.js if needed<br/>
                  ✓ Server appears in dashboard within ~30 seconds
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your key:</span>
                <code style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: 'var(--text-main)', letterSpacing: '1px' }}>{agentKey || '...'}</code>
                <button className="copy-btn" onClick={handleCopyKey}>{keyCopied ? '✓' : 'Copy Key'}</button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Server selector tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {servers.map(sv => {
                const svOnline = (Date.now() - new Date(sv.timestamp).getTime()) < STALE_MS;
                const active = selected?.serverId === sv.serverId;
                return (
                  <div key={sv.serverId} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <button
                      onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}
                      className={`server-btn ${active ? 'active' : ''}`}
                      style={{ borderRadius: '8px 0 0 8px', borderRight: 'none' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: svOnline ? '#10B981' : '#9CA3AF', display: 'inline-block', flexShrink: 0 }} />
                      {sv.serverName}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(sv.serverId)}
                      className="delete-server-btn"
                      style={{ borderRadius: '0 8px 8px 0', borderLeft: 'none', padding: '8px 10px' }}
                      title="Remove server"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Delete confirmation */}
            {deleteConfirm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 28, maxWidth: 380, width: '90%', boxShadow: 'var(--card-shadow)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', marginBottom: 8 }}>Remove Server</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                    This will remove <strong style={{ color: 'var(--text-main)' }}>{servers.find(sv => sv.serverId === deleteConfirm)?.serverName || deleteConfirm}</strong> and all its historical data. The agent will continue running on the server until you stop it.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-main)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      Cancel
                    </button>
                    <button onClick={() => handleDeleteServer(deleteConfirm)} disabled={deleting}
                      style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#EF4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                      {deleting ? 'Removing...' : 'Remove Server'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {s && (
              <>
                {/* Server header card */}
                <div className="card-header-panel">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: isOnline ? '#10B981' : '#EF4444', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>{s.serverName}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.hostname} &bull; {s.platform} &bull; {s.uptimeStr || formatUptime(s.uptime)}
                      </div>
                    </div>
                  </div>
                  <span className={`card-status-badge ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Offline banner */}
                {!isOnline && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                    🔴 Server offline — last seen {dataAge < 60000 ? `${Math.round(dataAge/1000)}s` : `${Math.round(dataAge/60000)} min`} ago. Showing SSH &amp; Network history only.
                  </div>
                )}

                {/* Quick metric cards */}
                {isOnline && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'CPU', value: `${s.cpu || 0}%`, pctVal: s.cpu || 0 },
                      { label: 'RAM', value: `${ramPct}%`, pctVal: ramPct },
                      { label: 'Disk', value: `${diskPct}%`, pctVal: diskPct },
                      ...(s.swapTotal > 0 ? [{ label: 'Swap', value: `${swapPct}%`, pctVal: swapPct }] : []),
                      ...(s.cpuTemp ? [{ label: 'CPU Temp', value: `${s.cpuTemp}°C`, pctVal: s.cpuTemp, tempMode: true }] : []),
                      { label: 'Load (1m)', value: `${s.load1 || 0}`, fixed: true, accent: '#7c3aed' },
                    ].map((m, idx) => {
                      const color = m.fixed ? m.accent : m.tempMode
                        ? (m.pctVal >= 80 ? '#EF4444' : m.pctVal >= 60 ? '#F59E0B' : '#10B981')
                        : colorByPct(m.pctVal);
                      return (
                        <div key={idx} className="metric-card" style={{ borderTop: `3px solid ${color}` }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 6 }}>{m.label}</div>
                          <div style={{ fontSize: 22, fontWeight: 800, color }}>{m.value}</div>
                          {!m.fixed && !m.tempMode && <MiniBar value={m.pctVal} color={color} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Info boxes grid */}
                {isOnline && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <InfoBox icon="🖥️" title="System" accent="#7c3aed">
                      <InfoRow label="Hostname"   value={s.hostname} />
                      <InfoRow label="Platform"   value={s.platform} />
                      <InfoRow label="Uptime"     value={s.uptimeStr || formatUptime(s.uptime)} />
                      <InfoRow label="Users"      value={s.users ? `${s.users} logged in` : null} />
                      <InfoRow label="Last check" value={new Date(s.timestamp).toLocaleTimeString('en-IN')} />
                    </InfoBox>

                    <InfoBox icon="⚙️" title="CPU" accent="#7c3aed">
                      <InfoRow label="Usage"        value={`${s.cpu || 0}%`} />
                      <InfoRow label="Cores"        value={s.cpuCores ? `${s.cpuCores} cores` : null} />
                      <InfoRow label="Architecture" value={s.cpuArch} />
                      {s.cpuTemp && <InfoRow label="Temperature" value={`${s.cpuTemp}°C`} />}
                      <InfoRow label="Model"        value={s.cpuModel ? s.cpuModel.substring(0, 35) : null} />
                      <InfoRow label="Load avg"     value={s.load1 !== undefined ? `${s.load1} · ${s.load5} · ${s.load15}` : null} />
                    </InfoBox>

                    <InfoBox icon="🧠" title="Memory" accent="#10B981">
                      <InfoRow label="RAM Used"   value={formatBytes(s.ramUsed)} />
                      <InfoRow label="RAM Free"   value={formatBytes(s.ramTotal - s.ramUsed)} />
                      <InfoRow label="RAM Total"  value={formatBytes(s.ramTotal)} />
                      {s.swapTotal > 0 && <>
                        <InfoRow label="Swap Used"  value={formatBytes(s.swapUsed)} />
                        <InfoRow label="Swap Total" value={formatBytes(s.swapTotal)} />
                      </>}
                    </InfoBox>

                    <InfoBox icon="💾" title="Storage" accent="#06B6D4">
                      <InfoRow label="Used"  value={formatBytes(s.diskUsed)} />
                      <InfoRow label="Free"  value={formatBytes(s.diskTotal - s.diskUsed)} />
                      <InfoRow label="Total" value={formatBytes(s.diskTotal)} />
                      <InfoRow label="Usage" value={`${diskPct}%`} />
                    </InfoBox>

                    <InfoBox icon="🌐" title="Network" accent="#F59E0B">
                      <InfoRow label="Local IP"  value={s.localIp}  mono />
                      <InfoRow label="Public IP" value={s.publicIp} mono />
                      {s.networkRoutes && s.networkRoutes.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Routes (ip r)</div>
                          {s.networkRoutes.map((r, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border-color)', fontSize: 12 }}>
                              <span style={{ fontWeight: 700, color: r.isDefault ? 'var(--primary)' : 'var(--text-main)', fontFamily: 'monospace' }}>{r.dev}</span>
                              <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.network || 'default'}</span>
                              {r.src && <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.8 }}>{r.src}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </InfoBox>
                  </div>
                )}

                {/* Active SSH Sessions table */}
                {s.activeSessions && (
                  <div className="sessions-card">
                    <div className="sessions-header">
                      <span style={{ fontSize: 16 }}>👥</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>Active SSH Sessions</span>
                      <span className="card-status-badge online" style={{ marginLeft: 'auto' }}>{s.activeSessions.length} online</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--table-header-bg)' }}>
                            {['User', 'TTY', 'IP Address', 'Login', 'Idle', 'Command'].map(h => (
                              <th key={h} className="sessions-th">{h}</th>
                            ))}
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

                {/* SSH Sessions summary */}
                <div style={{ marginBottom: 20 }}>
                  <InfoBox icon="🔐" title="SSH Active Sessions" accent="#EF4444">
                    {s.activeSessions && s.activeSessions.length > 0 ? (
                      <>
                        {s.activeSessions.map((l, i) => (
                          <div key={i} className="session-item">
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{l.user}</span>
                            <span style={{ color: '#10B981', fontFamily: 'monospace' }}>{l.from !== '-' ? l.from : l.tty}</span>
                            <span style={{ color: 'var(--text-muted)' }}>Login: {l.loginTime} · Idle: {l.idle}</span>
                            <span className="recent-badge active" style={{ marginLeft: 'auto' }}>Connected</span>
                          </div>
                        ))}
                        {s.lastSsh && s.lastSsh.filter(l => !l.active).length > 0 && (
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 8 }}>Recent Sessions</div>
                            {s.lastSsh.filter(l => !l.active).slice(0, 3).map((l, i) => (
                              <div key={i} className="session-item">
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{l.user}</span>
                                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip}</span>
                                <span style={{ color: 'var(--text-muted)', opacity: 0.8 }}>{l.time}</span>
                                <span className="recent-badge ended" style={{ marginLeft: 'auto' }}>Ended</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                        No active sessions
                        {s.lastSsh && s.lastSsh.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            {s.lastSsh.slice(0, 3).map((l, i) => (
                              <div key={i} className="session-item">
                                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{l.user}</span>
                                <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.ip}</span>
                                <span style={{ color: 'var(--text-muted)', opacity: 0.8 }}>{l.time}</span>
                                <span className={`recent-badge ${l.active ? 'active' : 'ended'}`} style={{ marginLeft: 'auto' }}>
                                  {l.active ? 'Active' : 'Ended'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </InfoBox>
                </div>

                {/* History Charts */}
                {history.length > 0 && (
                  <div className="history-card">
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 16 }}>
                      {s.serverName} — Last 2 Hours
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                      {[
                        { key: 'cpu',  name: 'CPU %',  color: '#7c3aed' },
                        { key: 'ram',  name: 'RAM %',  color: '#10B981' },
                        { key: 'disk', name: 'Disk %', color: '#06B6D4' },
                      ].map(({ key, name, color }) => (
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
