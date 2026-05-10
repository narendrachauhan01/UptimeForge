import React, { useEffect, useState, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_URL } from '../api';

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return gb.toFixed(1) + ' GB';
  const mb = bytes / (1024 * 1024);
  return mb.toFixed(0) + ' MB';
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

function UsageBar({ value, color, label }) {
  const pct = Math.min(Math.round(value || 0), 100);
  const getColor = (v) => v >= 90 ? '#ef4444' : v >= 70 ? '#f59e0b' : color;
  const c = getColor(pct);
  return (
    <div className="res-usage-wrap">
      <div className="res-usage-header">
        <span className="res-usage-label">{label}</span>
        <span className="res-usage-pct" style={{ color: c }}>{pct}%</span>
      </div>
      <div className="res-bar-bg">
        <div className="res-bar-fill" style={{ width: `${pct}%`, background: c }} />
      </div>
    </div>
  );
}

function ServerCard({ server, onSelect, selected }) {
  const ramPct = server.ramTotal ? Math.round((server.ramUsed / server.ramTotal) * 100) : 0;
  const diskPct = server.diskTotal ? Math.round((server.diskUsed / server.diskTotal) * 100) : 0;
  const lastSeen = new Date(server.timestamp);
  const isOnline = (Date.now() - lastSeen.getTime()) < 60000;

  return (
    <div className={`res-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(server)}>
      <div className="res-card-header">
        <div className="res-card-left">
          <div className={`res-online-dot ${isOnline ? 'online' : 'offline'}`} />
          <div>
            <div className="res-server-name">{server.serverName}</div>
            <div className="res-server-meta">{server.platform} • up {formatUptime(server.uptime)}</div>
          </div>
        </div>
        <span className={`pill ${isOnline ? 'pill-up' : 'pill-down'}`}>{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      <div className="res-metrics-grid">
        <div className="res-metric-box">
          <div className="res-metric-icon" style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}>⚙️</div>
          <div className="res-metric-val" style={{ color: server.cpu >= 90 ? '#ef4444' : server.cpu >= 70 ? '#f59e0b' : '#7c3aed' }}>{server.cpu || 0}%</div>
          <div className="res-metric-label">CPU</div>
        </div>
        <div className="res-metric-box">
          <div className="res-metric-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>🧠</div>
          <div className="res-metric-val" style={{ color: ramPct >= 90 ? '#ef4444' : ramPct >= 70 ? '#f59e0b' : '#10b981' }}>{ramPct}%</div>
          <div className="res-metric-label">{formatBytes(server.ramUsed)} / {formatBytes(server.ramTotal)}</div>
        </div>
        <div className="res-metric-box">
          <div className="res-metric-icon" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>💾</div>
          <div className="res-metric-val" style={{ color: diskPct >= 90 ? '#ef4444' : diskPct >= 70 ? '#f59e0b' : '#06b6d4' }}>{diskPct}%</div>
          <div className="res-metric-label">{formatBytes(server.diskUsed)} / {formatBytes(server.diskTotal)}</div>
        </div>
      </div>

      <UsageBar value={server.cpu} color="#7c3aed" label="CPU Usage" />
      <UsageBar value={ramPct} color="#10b981" label="RAM Usage" />
      <UsageBar value={diskPct} color="#06b6d4" label="Disk Usage" />

      {/* Swap */}
      {server.swapTotal > 0 && (
        <UsageBar value={server.swapTotal ? Math.round((server.swapUsed / server.swapTotal) * 100) : 0}
          color="#f59e0b" label={`Swap — ${formatBytes(server.swapUsed)} / ${formatBytes(server.swapTotal)}`} />
      )}

      {/* Load Average */}
      {server.load1 !== undefined && (
        <div className="res-info-row">
          <span className="res-info-label">Load Average</span>
          <span className="res-info-val">{server.load1} · {server.load5} · {server.load15}
            <span className="res-info-sub"> (1m · 5m · 15m)</span>
          </span>
        </div>
      )}

      {/* Server Details */}
      <div className="res-details-grid">
        {server.cpuCores && <div className="res-detail"><span>🖥 CPU Cores</span><strong>{server.cpuCores} cores ({server.cpuArch})</strong></div>}
        {server.cpuModel && <div className="res-detail"><span>⚙️ CPU Model</span><strong title={server.cpuModel}>{server.cpuModel.length > 30 ? server.cpuModel.substring(0, 30) + '...' : server.cpuModel}</strong></div>}
        {server.localIp && <div className="res-detail"><span>🔌 Local IP</span><strong>{server.localIp}</strong></div>}
        {server.publicIp && <div className="res-detail"><span>🌐 Public IP</span><strong>{server.publicIp}</strong></div>}
        {server.hostname && <div className="res-detail"><span>💻 Hostname</span><strong>{server.hostname}</strong></div>}
        <div className="res-detail"><span>⏱ Uptime</span><strong>{formatUptime(server.uptime)}</strong></div>
        {server.diskTotal > 0 && <div className="res-detail"><span>💾 Disk Free</span><strong style={{color:'#10b981'}}>{formatBytes(server.diskTotal - server.diskUsed)}</strong></div>}
        {server.diskTotal > 0 && <div className="res-detail"><span>💾 Disk Total</span><strong>{formatBytes(server.diskTotal)}</strong></div>}
        {server.ramTotal > 0 && <div className="res-detail"><span>🧠 RAM Free</span><strong style={{color:'#10b981'}}>{formatBytes(server.ramTotal - server.ramUsed)}</strong></div>}
        {server.ramTotal > 0 && <div className="res-detail"><span>🧠 RAM Total</span><strong>{formatBytes(server.ramTotal)}</strong></div>}
      </div>

      {/* Last SSH */}
      {server.lastSsh && server.lastSsh.length > 0 && (
        <div className="res-ssh-section">
          <div className="res-ssh-title">🔐 Recent SSH Logins</div>
          {server.lastSsh.map((s, i) => (
            <div key={i} className="res-ssh-row">
              <span className="res-ssh-user">{s.user}</span>
              <span className="res-ssh-ip">{s.ip}</span>
              <span className="res-ssh-time">{s.time}</span>
            </div>
          ))}
        </div>
      )}

      <div className="res-last-seen">Last updated: {lastSeen.toLocaleTimeString('en-IN')}</div>
    </div>
  );
}

export default function Resources() {
  const [servers, setServers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const tickRef = useRef(null);

  const loadLatest = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/latest`);
      setServers(res.data);
      setLastUpdated(new Date());
      setSecondsAgo(0);
      if (res.data.length > 0 && !selected) setSelected(res.data[0]);
    } catch (e) {
      console.error('Failed to load metrics:', e.message);
    }
    setLoading(false);
  }, [selected]);

  const loadHistory = useCallback(async (serverId) => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/${serverId}/history`);
      const data = res.data.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cpu: h.cpu,
        ram: h.ramTotal ? Math.round((h.ramUsed / h.ramTotal) * 100) : 0,
        disk: h.diskTotal ? Math.round((h.diskUsed / h.diskTotal) * 100) : 0,
      }));
      setHistory(data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadLatest();
    const t = setInterval(loadLatest, 10000); // poll every 10s
    return () => clearInterval(t);
  }, [loadLatest]);

  // Live seconds counter
  useEffect(() => {
    tickRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    if (selected) loadHistory(selected.serverId);
  }, [selected, loadHistory]);

  const handleSelect = (server) => {
    setSelected(server);
    loadHistory(server.serverId);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="pg-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading server metrics...</p>
      </div>
    </div>
  );

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Infra Monitor</h1>
          <p className="pg-sub">Real-time CPU, RAM & Disk monitoring</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="res-live-badge">
            🟢 Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}
          </span>
        </div>
      </div>

      {servers.length === 0 ? (
        <div className="data-card">
          <div className="empty-msg">
            <div style={{ fontSize: 48, marginBottom: 14 }}>📡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#475569', marginBottom: 8 }}>No agents connected</div>
            <div style={{ fontSize: 14, color: '#94a3b8', maxWidth: 400, margin: '0 auto', lineHeight: 1.8 }}>
              Install the agent on your server:<br />
              <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>
                git clone https://github.com/narendrachauhan01/Agent-collect-server-resource.git
              </code>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Server Cards Grid */}
          <div className="res-cards-grid">
            {servers.map(s => (
              <ServerCard key={s.serverId} server={s} selected={selected?.serverId === s.serverId} onSelect={handleSelect} />
            ))}
          </div>

          {/* History Charts */}
          {selected && history.length > 0 && (
            <div className="res-charts-section">
              <div className="res-charts-title">📊 {selected.serverName} — Last 1 Hour</div>
              <div className="res-charts-grid">
                {[
                  { key: 'cpu', name: 'CPU %', color: '#7c3aed' },
                  { key: 'ram', name: 'RAM %', color: '#10b981' },
                  { key: 'disk', name: 'Disk %', color: '#06b6d4' },
                ].map(({ key, name, color }) => (
                  <div key={key} className="res-chart-card">
                    <div className="res-chart-label" style={{ color }}>{name}</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
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
    </div>
  );
}
