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
  return p >= 90 ? '#EF4444' : p >= 70 ? '#F59E0B' : '#10B981';
}

function MiniBar({ value, color }) {
  return (
    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 10, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 10, transition: 'width 0.5s' }} />
    </div>
  );
}

// TailAdmin-style info card
function InfoBox({ icon, title, children, accent = '#4F46E5' }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 10,
      border: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        background: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderLeft: `3px solid ${accent}`,
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 0',
      borderBottom: '1px solid #F9FAFB',
      gap: 8,
    }}>
      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#111827',
        fontFamily: mono ? 'monospace' : 'inherit',
        textAlign: 'right',
        wordBreak: 'break-all',
      }}>
        {value || '—'}
      </span>
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
      const res = await axios.get(`${API_URL}/api/metrics/latest`, { withCredentials: true });
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
      const res = await axios.get(`${API_URL}/api/metrics/${serverId}/history`, { withCredentials: true });
      setHistory(res.data.map(h => ({
        time: new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cpu: h.cpu || 0,
        ram: pct(h.ramUsed, h.ramTotal),
        disk: pct(h.diskUsed, h.diskTotal),
      })));
    } catch (_) { }
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
      <div style={{
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: 12,
      }}>
        <p style={{ fontWeight: 700, color: '#374151', marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, margin: '2px 0' }}>{p.name}: {p.value}%</p>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="pg-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p style={{ fontSize: 14 }}>Loading metrics...</p>
      </div>
    </div>
  );

  const s = selected;
  const ramPct  = s ? pct(s.ramUsed,  s.ramTotal)  : 0;
  const diskPct = s ? pct(s.diskUsed, s.diskTotal) : 0;
  const swapPct = s ? pct(s.swapUsed, s.swapTotal) : 0;
  const isOnline = s ? (Date.now() - new Date(s.timestamp).getTime()) < 60000 : false;

  return (
    <div className="pg-wrap">
      {/* Page Header */}
      <div className="pg-header">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
            Infra Monitor
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
            Real-time server resource monitoring
          </p>
        </div>
        {/* Live badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 20,
          fontSize: 13,
          fontWeight: 600,
          color: '#15803D',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Live {secondsAgo > 0 && `— ${secondsAgo}s ago`}
        </span>
      </div>

      {servers.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: 10,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: 48,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 8 }}>No agents connected</div>
          <code style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: '6px 12px', borderRadius: 8, fontSize: 13, color: '#374151' }}>
            git clone https://github.com/narendrachauhan01/Agent-collect-server-resource.git
          </code>
        </div>
      ) : (
        <>
          {/* Server selector tabs */}
          {servers.length > 1 && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}>
              {servers.map(sv => {
                const svOnline = (Date.now() - new Date(sv.timestamp).getTime()) < 60000;
                const active = selected?.serverId === sv.serverId;
                return (
                  <button
                    key={sv.serverId}
                    onClick={() => { setSelected(sv); loadHistory(sv.serverId); }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: active ? '1px solid #4F46E5' : '1px solid #E5E7EB',
                      background: active ? '#4F46E5' : '#fff',
                      color: active ? '#fff' : '#374151',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: svOnline ? '#10B981' : '#9CA3AF',
                      display: 'inline-block',
                      flexShrink: 0,
                    }} />
                    {sv.serverName}
                  </button>
                );
              })}
            </div>
          )}

          {s && (
            <>
              {/* Server header card */}
              <div style={{
                background: '#fff',
                borderRadius: 10,
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: isOnline ? '#10B981' : '#EF4444',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>{s.serverName}</div>
                    <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                      {s.hostname} &bull; {s.platform} &bull; {s.uptimeStr || formatUptime(s.uptime)}
                    </div>
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  background: isOnline ? '#D1FAE5' : '#FEE2E2',
                  color: isOnline ? '#065F46' : '#991B1B',
                  border: `1px solid ${isOnline ? '#A7F3D0' : '#FECDD3'}`,
                }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Quick metric cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}>
                {[
                  { label: 'CPU', value: `${s.cpu || 0}%`, pctVal: s.cpu || 0 },
                  { label: 'RAM', value: `${ramPct}%`, pctVal: ramPct },
                  { label: 'Disk', value: `${diskPct}%`, pctVal: diskPct },
                  ...(s.swapTotal > 0 ? [{ label: 'Swap', value: `${swapPct}%`, pctVal: swapPct }] : []),
                  ...(s.cpuTemp ? [{ label: 'CPU Temp', value: `${s.cpuTemp}°C`, pctVal: s.cpuTemp, tempMode: true }] : []),
                  { label: 'Load (1m)', value: `${s.load1 || 0}`, fixed: true, accent: '#4F46E5' },
                ].map((m, idx) => {
                  const color = m.fixed ? m.accent : m.tempMode
                    ? (m.pctVal >= 80 ? '#EF4444' : m.pctVal >= 60 ? '#F59E0B' : '#10B981')
                    : colorByPct(m.pctVal);
                  return (
                    <div key={idx} style={{
                      background: '#fff',
                      borderRadius: 10,
                      border: '1px solid #E5E7EB',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      padding: '16px 16px 14px',
                      borderTop: `3px solid ${color}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 6 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color }}>
                        {m.value}
                      </div>
                      {!m.fixed && !m.tempMode && (
                        <MiniBar value={m.pctVal} color={color} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Info boxes grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 16,
                marginBottom: 20,
              }}>
                <InfoBox icon="🖥️" title="System" accent="#4F46E5">
                  <InfoRow label="Hostname"   value={s.hostname} />
                  <InfoRow label="Platform"   value={s.platform} />
                  <InfoRow label="Uptime"     value={s.uptimeStr || formatUptime(s.uptime)} />
                  <InfoRow label="Users"      value={s.users ? `${s.users} logged in` : null} />
                  <InfoRow label="Last check" value={new Date(s.timestamp).toLocaleTimeString('en-IN')} />
                </InfoBox>

                <InfoBox icon="⚙️" title="CPU" accent="#4F46E5">
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
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF', marginBottom: 8 }}>
                        Routes (ip r)
                      </div>
                      {s.networkRoutes.map((r, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '4px 0',
                          borderBottom: '1px solid #F9FAFB',
                          fontSize: 12,
                        }}>
                          <span style={{
                            fontWeight: 700,
                            color: r.isDefault ? '#4F46E5' : '#374151',
                            fontFamily: 'monospace',
                          }}>{r.dev}</span>
                          <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{r.network || 'default'}</span>
                          {r.src && <span style={{ color: '#9CA3AF', fontFamily: 'monospace' }}>{r.src}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </InfoBox>
              </div>

              {/* Active SSH Sessions table */}
              {s.activeSessions && (
                <div style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  marginBottom: 20,
                }}>
                  <div style={{
                    padding: '14px 20px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>👥</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                      Active SSH Sessions
                    </span>
                    <span style={{
                      marginLeft: 'auto',
                      padding: '3px 10px',
                      borderRadius: 20,
                      background: '#D1FAE5',
                      color: '#065F46',
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #A7F3D0',
                    }}>
                      {s.activeSessions.length} online
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB' }}>
                          {['User', 'TTY', 'IP Address', 'Login', 'Idle', 'Command'].map(h => (
                            <th key={h} style={{
                              padding: '12px 16px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#6B7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              textAlign: 'left',
                              borderBottom: '1px solid #E5E7EB',
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {s.activeSessions.map((u, i) => (
                          <tr
                            key={i}
                            style={{ borderBottom: '1px solid #F3F4F6' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                          >
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#4F46E5', fontSize: 13 }}>{u.user}</td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{u.tty}</td>
                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: '#10B981' }}>{u.from}</td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#374151' }}>{u.loginTime}</td>
                            <td style={{ padding: '14px 16px', fontSize: 13, color: '#F59E0B', fontWeight: 600 }}>{u.idle}</td>
                            <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{u.what}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SSH Sessions info box (summary card) */}
              <div style={{ marginBottom: 20 }}>
                <InfoBox icon="🔐" title="SSH Active Sessions" accent="#EF4444">
                  {s.activeSessions && s.activeSessions.length > 0 ? (
                    <>
                      {s.activeSessions.map((l, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 0',
                          borderBottom: '1px solid #F3F4F6',
                          flexWrap: 'wrap',
                          fontSize: 13,
                        }}>
                          <span style={{ fontWeight: 700, color: '#4F46E5' }}>{l.user}</span>
                          <span style={{ color: '#10B981', fontFamily: 'monospace' }}>{l.from !== '-' ? l.from : l.tty}</span>
                          <span style={{ color: '#6B7280' }}>Login: {l.loginTime} · Idle: {l.idle}</span>
                          <span style={{
                            marginLeft: 'auto',
                            padding: '2px 8px',
                            borderRadius: 20,
                            background: '#D1FAE5',
                            color: '#065F46',
                            fontSize: 11,
                            fontWeight: 600,
                          }}>Connected</span>
                        </div>
                      ))}
                      {s.lastSsh && s.lastSsh.filter(l => !l.active).length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF', marginBottom: 8 }}>
                            Recent Sessions
                          </div>
                          {s.lastSsh.filter(l => !l.active).slice(0, 3).map((l, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '7px 0',
                              borderBottom: '1px solid #F3F4F6',
                              flexWrap: 'wrap',
                              fontSize: 13,
                            }}>
                              <span style={{ fontWeight: 700, color: '#374151' }}>{l.user}</span>
                              <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{l.ip}</span>
                              <span style={{ color: '#9CA3AF' }}>{l.time}</span>
                              <span style={{
                                marginLeft: 'auto',
                                padding: '2px 8px',
                                borderRadius: 20,
                                background: '#F3F4F6',
                                color: '#6B7280',
                                fontSize: 11,
                                fontWeight: 600,
                              }}>Ended</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>
                      No active sessions
                      {s.lastSsh && s.lastSsh.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          {s.lastSsh.slice(0, 3).map((l, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              padding: '7px 0',
                              borderBottom: '1px solid #F3F4F6',
                              flexWrap: 'wrap',
                              fontSize: 13,
                            }}>
                              <span style={{ fontWeight: 700, color: '#374151' }}>{l.user}</span>
                              <span style={{ color: '#6B7280', fontFamily: 'monospace' }}>{l.ip}</span>
                              <span style={{ color: '#9CA3AF' }}>{l.time}</span>
                              <span style={{
                                marginLeft: 'auto',
                                padding: '2px 8px',
                                borderRadius: 20,
                                background: l.active ? '#D1FAE5' : '#F3F4F6',
                                color: l.active ? '#065F46' : '#6B7280',
                                fontSize: 11,
                                fontWeight: 600,
                              }}>
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
                <div style={{
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  padding: 24,
                  marginBottom: 24,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9CA3AF', marginBottom: 16 }}>
                    {s.serverName} — Last 1 Hour
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
                    {[
                      { key: 'cpu',  name: 'CPU %',  color: '#4F46E5' },
                      { key: 'ram',  name: 'RAM %',  color: '#10B981' },
                      { key: 'disk', name: 'Disk %', color: '#06B6D4' },
                    ].map(({ key, name, color }) => (
                      <div key={key}>
                        <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 10 }}>{name}</div>
                        <ResponsiveContainer width="100%" height={140}>
                          <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9CA3AF' }} interval="preserveStartEnd" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} unit="%" />
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
