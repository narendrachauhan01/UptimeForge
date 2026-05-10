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

function colorByPct(p) {
  return p >= 90 ? '#ef4444' : p >= 70 ? '#f59e0b' : '#10b981';
}

function MiniBar({ value, color }) {
  return (
    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} />
    </div>
  );
}

function InfoBox({ icon, title, children, accent = '#7c3aed' }) {
  return (
    <div className="res-info-box">
      <div className="res-info-box-header" style={{ borderLeft: `3px solid ${accent}` }}>
        <span>{icon}</span>
        <span className="res-info-box-title">{title}</span>
      </div>
      <div className="res-info-box-body">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="res-info-item">
      <span className="res-info-key">{label}</span>
      <span className={`res-info-val ${mono ? 'mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

export default function Resources() {
  const [servers, setServers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const tickRef = useRef(null);

  const loadLatest = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/latest`);
      // filter out test/empty entries
      const real = res.data.filter(s => s.ramTotal > 0);
      setServers(real);
      setSecondsAgo(0);
      if (real.length > 0 && !selected) setSelected(real[0]);
    } catch (e) { console.error(e.message); }
    setLoading(false);
  }, [selected]);

  const loadHistory = useCallback(async (serverId) => {
    try {
      const res = await axios.get(`${API_URL}/api/metrics/${serverId}/history`);
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {p.value}%</p>)}
      </div>
    );
  };

  if (loading) return (
    <div className="pg-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading metrics...</p>
      </div>
    </div>
  );

  const s = selected;
  const ramPct = s ? pct(s.ramUsed, s.ramTotal) : 0;
  const diskPct = s ? pct(s.diskUsed, s.diskTotal) : 0;
  const swapPct = s ? pct(s.swapUsed, s.swapTotal) : 0;
  const isOnline = s ? (Date.now() - new Date(s.timestamp).getTime()) < 60000 : false;

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Infra Monitor</h1>
          <p className="pg-sub">Real-time server resource monitoring</p>
        </div>
        <span className="res-live-badge">🟢 Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}</span>
      </div>

      {servers.length === 0 ? (
        <div className="data-card">
          <div className="empty-msg">
            <div style={{ fontSize: 48, marginBottom: 14 }}>📡</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#475569', marginBottom: 8 }}>No agents connected</div>
            <code style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: 8, fontSize: 13 }}>
              git clone https://github.com/narendrachauhan01/Agent-collect-server-resource.git
            </code>
          </div>
        </div>
      ) : (
        <>
          {/* Server selector tabs */}
          {servers.length > 1 && (
            <div className="res-server-tabs">
              {servers.map(sv => (
                <button key={sv.serverId}
                  className={`res-server-tab ${selected?.serverId === sv.serverId ? 'active' : ''}`}
                  onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}>
                  <span className={`res-online-dot ${(Date.now() - new Date(sv.timestamp).getTime()) < 60000 ? 'online' : 'offline'}`} style={{ width: 8, height: 8 }} />
                  {sv.serverName}
                </button>
              ))}
            </div>
          )}

          {s && (
            <>
              {/* Server header */}
              <div className="res-server-header">
                <div className="res-server-header-left">
                  <div className={`res-online-dot ${isOnline ? 'online' : 'offline'}`} />
                  <div>
                    <div className="res-server-name">{s.serverName}</div>
                    <div className="res-server-meta">{s.hostname} • {s.platform} • {s.uptimeStr || formatUptime(s.uptime)}</div>
                  </div>
                </div>
                <span className={`pill ${isOnline ? 'pill-up' : 'pill-down'}`}>{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Quick metrics row */}
              <div className="res-quick-row">
                <div className="res-quick-box" style={{ borderTop: `3px solid ${colorByPct(s.cpu)}` }}>
                  <div className="res-quick-val" style={{ color: colorByPct(s.cpu) }}>{s.cpu || 0}%</div>
                  <div className="res-quick-label">CPU</div>
                  <MiniBar value={s.cpu || 0} color={colorByPct(s.cpu)} />
                </div>
                <div className="res-quick-box" style={{ borderTop: `3px solid ${colorByPct(ramPct)}` }}>
                  <div className="res-quick-val" style={{ color: colorByPct(ramPct) }}>{ramPct}%</div>
                  <div className="res-quick-label">RAM</div>
                  <MiniBar value={ramPct} color={colorByPct(ramPct)} />
                </div>
                <div className="res-quick-box" style={{ borderTop: `3px solid ${colorByPct(diskPct)}` }}>
                  <div className="res-quick-val" style={{ color: colorByPct(diskPct) }}>{diskPct}%</div>
                  <div className="res-quick-label">Disk</div>
                  <MiniBar value={diskPct} color={colorByPct(diskPct)} />
                </div>
                {s.swapTotal > 0 && (
                  <div className="res-quick-box" style={{ borderTop: `3px solid ${colorByPct(swapPct)}` }}>
                    <div className="res-quick-val" style={{ color: colorByPct(swapPct) }}>{swapPct}%</div>
                    <div className="res-quick-label">Swap</div>
                    <MiniBar value={swapPct} color={colorByPct(swapPct)} />
                  </div>
                )}
                {s.cpuTemp && (
                  <div className="res-quick-box" style={{ borderTop: `3px solid ${s.cpuTemp >= 80 ? '#ef4444' : s.cpuTemp >= 60 ? '#f59e0b' : '#10b981'}` }}>
                    <div className="res-quick-val" style={{ color: s.cpuTemp >= 80 ? '#ef4444' : s.cpuTemp >= 60 ? '#f59e0b' : '#10b981' }}>{s.cpuTemp}°C</div>
                    <div className="res-quick-label">CPU Temp</div>
                  </div>
                )}
                <div className="res-quick-box" style={{ borderTop: '3px solid #7c3aed' }}>
                  <div className="res-quick-val" style={{ color: '#7c3aed' }}>{s.load1 || 0}</div>
                  <div className="res-quick-label">Load (1m)</div>
                </div>
              </div>

              {/* Info boxes grid */}
              <div className="res-boxes-grid">

                {/* System */}
                <InfoBox icon="🖥️" title="System" accent="#7c3aed">
                  <InfoRow label="Hostname" value={s.hostname} />
                  <InfoRow label="Platform" value={s.platform} />
                  <InfoRow label="Uptime" value={s.uptimeStr || formatUptime(s.uptime)} />
                  <InfoRow label="Users" value={s.users ? `${s.users} logged in` : null} />
                  <InfoRow label="Last check" value={new Date(s.timestamp).toLocaleTimeString('en-IN')} />
                </InfoBox>

                {/* CPU */}
                <InfoBox icon="⚙️" title="CPU" accent="#7c3aed">
                  <InfoRow label="Usage" value={`${s.cpu || 0}%`} />
                  <InfoRow label="Cores" value={s.cpuCores ? `${s.cpuCores} cores` : null} />
                  <InfoRow label="Architecture" value={s.cpuArch} />
                  {s.cpuTemp && <InfoRow label="Temperature" value={`${s.cpuTemp}°C`} />}
                  <InfoRow label="Model" value={s.cpuModel ? s.cpuModel.substring(0, 35) : null} />
                  <InfoRow label="Load avg" value={s.load1 !== undefined ? `${s.load1} · ${s.load5} · ${s.load15}` : null} />
                </InfoBox>

                {/* Memory */}
                <InfoBox icon="🧠" title="Memory" accent="#10b981">
                  <InfoRow label="RAM Used" value={formatBytes(s.ramUsed)} />
                  <InfoRow label="RAM Free" value={formatBytes(s.ramTotal - s.ramUsed)} />
                  <InfoRow label="RAM Total" value={formatBytes(s.ramTotal)} />
                  {s.swapTotal > 0 && <>
                    <InfoRow label="Swap Used" value={formatBytes(s.swapUsed)} />
                    <InfoRow label="Swap Total" value={formatBytes(s.swapTotal)} />
                  </>}
                </InfoBox>

                {/* Disk */}
                <InfoBox icon="💾" title="Storage" accent="#06b6d4">
                  <InfoRow label="Used" value={formatBytes(s.diskUsed)} />
                  <InfoRow label="Free" value={formatBytes(s.diskTotal - s.diskUsed)} />
                  <InfoRow label="Total" value={formatBytes(s.diskTotal)} />
                  <InfoRow label="Usage" value={`${diskPct}%`} />
                </InfoBox>

                {/* Network */}
                <InfoBox icon="🌐" title="Network" accent="#f59e0b">
                  <InfoRow label="Local IP" value={s.localIp} mono />
                  <InfoRow label="Public IP" value={s.publicIp} mono />
                  {s.networkRoutes && s.networkRoutes.length > 0 && (
                    <div className="res-routes">
                      <div className="res-routes-title">Routes (ip r)</div>
                      {s.networkRoutes.map((r, i) => (
                        <div key={i} className="res-route-item">
                          <span className={`res-route-dev ${r.isDefault ? 'default' : ''}`}>{r.dev}</span>
                          <span className="res-route-net">{r.network || 'default'}</span>
                          {r.src && <span className="res-route-src">{r.src}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </InfoBox>

                {/* Active Sessions (w command) */}
                <InfoBox icon="🔐" title="Who is Logged In (SSH)" accent="#ef4444">
                  {s.activeSessions && s.activeSessions.length > 0 ? (
                    <>
                      {s.activeSessions.map((l, i) => (
                        <div key={i} className="res-ssh-entry">
                          <span className="res-ssh-user">{l.user}</span>
                          <span className="res-ssh-ip">{l.from !== '-' ? l.from : l.tty}</span>
                          <span className="res-ssh-time">Login: {l.loginTime} · Idle: {l.idle}</span>
                          <span className="res-ssh-status active">🟢 Connected</span>
                        </div>
                      ))}
                      {s.lastSsh && s.lastSsh.filter(l => !l.active).length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recent Sessions</div>
                          {s.lastSsh.filter(l => !l.active).slice(0, 3).map((l, i) => (
                            <div key={i} className="res-ssh-entry">
                              <span className="res-ssh-user">{l.user}</span>
                              <span className="res-ssh-ip">{l.ip}</span>
                              <span className="res-ssh-time">{l.time}</span>
                              <span className="res-ssh-status">⚫ Ended</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 13, padding: '8px 0' }}>
                      🔴 No active sessions
                      {s.lastSsh && s.lastSsh.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          {s.lastSsh.slice(0, 3).map((l, i) => (
                            <div key={i} className="res-ssh-entry">
                              <span className="res-ssh-user">{l.user}</span>
                              <span className="res-ssh-ip">{l.ip}</span>
                              <span className="res-ssh-time">{l.time}</span>
                              <span className={`res-ssh-status ${l.active ? 'active' : ''}`}>{l.active ? '🟢 Active' : '⚫ Ended'}</span>
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
                <div className="res-charts-section">
                  <div className="res-charts-title">📊 {s.serverName} — Last 1 Hour</div>
                  <div className="res-charts-grid">
                    {[{ key: 'cpu', name: 'CPU %', color: '#7c3aed' }, { key: 'ram', name: 'RAM %', color: '#10b981' }, { key: 'disk', name: 'Disk %', color: '#06b6d4' }].map(({ key, name, color }) => (
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
        </>
      )}
    </div>
  );
}
