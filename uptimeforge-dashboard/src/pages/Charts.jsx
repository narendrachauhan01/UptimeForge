let _loaded_Charts = false;
import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
  ReferenceLine,
} from 'recharts';
import { getServers, getAlerts, API_URL } from '../api';
import axios from 'axios';

export default function Charts() {
  const [servers, setServers]       = useState([]);
  const [alerts, setAlerts]         = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory]       = useState([]);
  const [siteSearch, setSiteSearch]     = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [uptimeSearch, setUptimeSearch] = useState('');
  const [pageLoading, setPageLoading]   = useState(false);

  useEffect(() => {
    getServers().then(r => {
      setServers(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0]._id);
      setPageLoading(false); _loaded_Charts = true;
    }).catch(()=>setPageLoading(false));
    getAlerts().then(r => setAlerts(r.data));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    
    axios.get(`${API_URL}/api/servers/${selectedId}/history`, { withCredentials: true })
      .then(r => setHistory(r.data?.history || []));
  }, [selectedId]);

  const selectedServer = servers.find(s => s._id === selectedId);

  const chartData = history.slice(-60).map(h => ({
    time: new Date(h.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    responseTime: h.responseTime || 0,
    status: h.status === 'up' ? 1 : 0,
  }));

  const avgResponseTime = chartData.length
    ? Math.round(chartData.reduce((s, d) => s + d.responseTime, 0) / chartData.length)
    : 0;

  const uptimeData = servers.map(s => {
    const hist      = s.history || [];
    const total     = hist.length;
    const upCount   = hist.filter(h => h.status === 'up').length;
    const downCount = total - upCount;
    const pct       = total > 0 ? parseFloat(((upCount / total) * 100).toFixed(2)) : 100;
    const rtValues  = hist.map(h => h.responseTime).filter(Boolean);
    const avgRt     = rtValues.length ? Math.round(rtValues.reduce((a, b) => a + b, 0) / rtValues.length) : null;
    const minRt     = rtValues.length ? Math.min(...rtValues) : null;
    const maxRt     = rtValues.length ? Math.max(...rtValues) : null;
    return { id: s._id, name: s.name, url: s.url, status: s.status, uptime: pct, total, upCount, downCount, avgRt, minRt, maxRt };
  }).sort((a, b) => b.uptime - a.uptime);

  const filteredUptimeData = uptimeSearch.trim() === ''
    ? uptimeData
    : uptimeData.filter(s =>
        s.name.toLowerCase().includes(uptimeSearch.toLowerCase()) ||
        s.url.toLowerCase().includes(uptimeSearch.toLowerCase())
      );

  const alertMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    alertMap[key] = { date: key, down: 0, recovered: 0 };
  }
  alerts.forEach(a => {
    const key = new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (alertMap[key]) { if (a.type === 'down') alertMap[key].down++; else alertMap[key].recovered++; }
  });
  const alertData = Object.values(alertMap);

  const up      = servers.filter(s => s.status === 'up').length;
  const down    = servers.filter(s => s.status === 'down').length;
  const unknown = servers.filter(s => s.status === 'unknown').length;
  const pieData = [
    { name: 'Online',  value: up,      color: '#10b981' },
    { name: 'Offline', value: down,    color: '#ef4444' },
    { name: 'Unknown', value: unknown, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const uptimeColor = v => v >= 99 ? '#10b981' : v >= 95 ? '#f59e0b' : '#ef4444';
  const rtColor     = v => !v ? '#94a3b8' : v > 2000 ? '#ef4444' : v > 800 ? '#f59e0b' : '#10b981';

  const RtTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        <p style={{ color: '#a78bfa', fontWeight: 700, fontSize: 15 }}>{payload[0]?.value} ms</p>
        {payload[0]?.payload?.status === 0 && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 2 }}>⚠ Site was DOWN</p>}
      </div>
    );
  };

  if (pageLoading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:400,gap:14}}>
      <div style={{width:44,height:44,borderRadius:'50%',border:'4px solid #e2e8f0',borderTop:'4px solid #7c3aed',animation:'spin 0.8s linear infinite'}}/>
      <div style={{fontSize:13,color:'#94a3b8',fontWeight:500}}>Loading...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Performance</h1>
          <p className="pg-sub">Response time · Uptime · Alert trends · 1 check/min</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="chart-overview-row">
        <div className="chart-stat-box">
          <div className="chart-stat-label">Total Sites</div>
          <div className="chart-stat-value" style={{ color: '#7c3aed' }}>{servers.length}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Online</div>
          <div className="chart-stat-value" style={{ color: '#10b981' }}>{up}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Offline</div>
          <div className="chart-stat-value" style={{ color: '#ef4444' }}>{down}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Avg RT</div>
          <div className="chart-stat-value" style={{ color: rtColor(avgResponseTime), fontSize: 22 }}>
            {selectedServer ? `${avgResponseTime}ms` : '—'}
          </div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Alerts</div>
          <div className="chart-stat-value" style={{ color: '#f59e0b' }}>{alerts.length}</div>
        </div>
      </div>

      {/* Row 1: Response Time (full width) */}
      <div className="perf-section">
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">⚡ Response Time</div>
              {selectedServer && (
                <div className="chart-card-sub">{selectedServer.url} · last 1hr · avg {avgResponseTime}ms</div>
              )}
            </div>
            <div className="site-search-wrap" onBlur={() => setTimeout(() => setShowDropdown(false), 150)}>
              <div className="site-search-input-box" onClick={() => setShowDropdown(true)}>
                <span className="site-search-icon">🔍</span>
                <input className="site-search-input" placeholder="Select site..."
                  value={siteSearch || selectedServer?.name || ''}
                  onChange={e => { setSiteSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { setSiteSearch(''); setShowDropdown(true); }}
                />
              </div>
              {showDropdown && (
                <div className="site-search-dropdown">
                  {servers
                    .filter(s => s.name.toLowerCase().includes(siteSearch.toLowerCase()) || s.url.toLowerCase().includes(siteSearch.toLowerCase()))
                    .map(s => (
                      <div key={s._id} className={`site-search-option ${selectedId === s._id ? 'active' : ''}`}
                        onMouseDown={() => { setSelectedId(s._id); setSiteSearch(''); setShowDropdown(false); }}>
                        <span className={`site-search-dot ${s.status}`}></span>
                        <div>
                          <div className="site-search-name">{s.name}</div>
                          <div className="site-search-url">{s.url}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="chart-empty">No data yet — first check in under 1 minute</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="ms" tickLine={false} axisLine={false} width={46} />
                <Tooltip content={<RtTooltip />} />
                {avgResponseTime > 0 && (
                  <ReferenceLine y={avgResponseTime} stroke="#c4b5fd" strokeDasharray="4 4"
                    label={{ value: `avg ${avgResponseTime}ms`, position: 'insideTopRight', fontSize: 10, fill: '#a78bfa' }} />
                )}
                <Area type="monotone" dataKey="responseTime" stroke="#7c3aed" strokeWidth={2.5}
                  fill="url(#rtGrad)" dot={false} activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Site Status + Alert History side by side */}
      <div className="perf-row-2">
        {/* Pie */}
        <div className="chart-card perf-pie-card">
          <div className="chart-card-title" style={{ marginBottom: 12 }}>🟢 Site Status</div>
          {pieData.length === 0 ? (
            <div className="chart-empty">No sites</div>
          ) : (
            <div className="pie-wrap">
              <div className="pie-chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={42} outerRadius={72}
                      dataKey="value" paddingAngle={4}>
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="pie-legend-row">
                    <span className="pie-dot" style={{ background: d.color }} />
                    <span className="pie-label">{d.name}</span>
                    <span className="pie-val" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
                <div className="pie-total">{servers.length} total sites</div>
              </div>
            </div>
          )}
        </div>

        {/* Alert 7-day bar */}
        <div className="chart-card perf-alert-card">
          <div className="chart-card-title" style={{ marginBottom: 16 }}>🔔 Alerts — Last 7 Days</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={alertData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="down"      name="Down"      fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recovered" name="Recovered" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Uptime Table (desktop) / Cards (mobile) */}
      <div className="chart-card">
        <div className="chart-card-header" style={{ marginBottom: 14 }}>
          <div>
            <div className="chart-card-title">📊 Uptime & Response — All Sites</div>
            <div className="chart-card-sub">Last 24 hours · 1 check/min · {uptimeData.length} sites total</div>
          </div>
          {/* Uptime search */}
          <div className="uptime-search-wrap">
            <svg width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              className="uptime-search-input"
              placeholder={`Search from ${uptimeData.length} sites...`}
              value={uptimeSearch}
              onChange={e => setUptimeSearch(e.target.value)}
            />
            {uptimeSearch && <button className="uptime-search-clear" onClick={() => setUptimeSearch('')}>✕</button>}
          </div>
        </div>

        {uptimeData.length === 0 ? (
          <div className="chart-empty">No data yet</div>
        ) : filteredUptimeData.length === 0 ? (
          <div className="chart-empty">No site found for "{uptimeSearch}"</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="uptime-table-wrap uptime-desktop" style={{ maxHeight: 380, overflowY: 'auto' }}>
              <table className="uptime-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Status</th>
                    <th>Uptime %</th>
                    <th style={{ width: 140 }}>Bar</th>
                    <th>Checks</th>
                    <th>Up</th>
                    <th>Down</th>
                    <th>Avg RT</th>
                    <th>Min RT</th>
                    <th>Max RT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUptimeData.map(s => {
                    const uc = uptimeColor(s.uptime);
                    const rc = rtColor(s.avgRt);
                    return (
                      <tr key={s.id}>
                        <td><div className="uptime-site-name">{s.name}</div><div className="uptime-site-url">{s.url}</div></td>
                        <td>
                          <span className={`uptime-status-dot ${s.status}`} />
                          <span className="uptime-status-text" style={{ color: s.status === 'up' ? '#10b981' : s.status === 'down' ? '#ef4444' : '#f59e0b' }}>
                            {s.status === 'up' ? 'Online' : s.status === 'down' ? 'Offline' : 'Unknown'}
                          </span>
                        </td>
                        <td><span className="uptime-pct" style={{ color: uc }}>{s.uptime}%</span></td>
                        <td><div className="uptime-bar-track"><div className="uptime-bar-fill" style={{ width: `${s.uptime}%`, background: uc }} /></div></td>
                        <td className="uptime-num">{s.total}</td>
                        <td className="uptime-num" style={{ color: '#10b981', fontWeight: 700 }}>{s.upCount}</td>
                        <td className="uptime-num" style={{ color: s.downCount > 0 ? '#ef4444' : '#94a3b8', fontWeight: s.downCount > 0 ? 700 : 400 }}>{s.downCount}</td>
                        <td className="uptime-num" style={{ color: rc }}>{s.avgRt ? `${s.avgRt}ms` : '—'}</td>
                        <td className="uptime-num" style={{ color: '#10b981' }}>{s.minRt ? `${s.minRt}ms` : '—'}</td>
                        <td className="uptime-num" style={{ color: s.maxRt > 2000 ? '#ef4444' : '#475569' }}>{s.maxRt ? `${s.maxRt}ms` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — 3 visible, rest scroll */}
            <div className="uptime-mobile" style={{ maxHeight: 'calc(3 * 180px)', overflowY: 'auto', paddingRight: 2 }}>
              {filteredUptimeData.map(s => {
                const uc = uptimeColor(s.uptime);
                const rc = rtColor(s.avgRt);
                return (
                  <div key={s.id} className="uptime-mob-card">
                    {/* Header */}
                    <div className="uptime-mob-top">
                      <div className="uptime-mob-left">
                        <span className={`uptime-status-dot ${s.status}`} />
                        <div>
                          <div className="uptime-site-name">{s.name}</div>
                          <div className="uptime-site-url">{s.url}</div>
                        </div>
                      </div>
                      <span className="uptime-pct" style={{ color: uc, fontSize: 18 }}>{s.uptime}%</span>
                    </div>
                    {/* Bar */}
                    <div className="uptime-bar-track" style={{ margin: '8px 0' }}>
                      <div className="uptime-bar-fill" style={{ width: `${s.uptime}%`, background: uc }} />
                    </div>
                    {/* Stats grid */}
                    <div className="uptime-mob-stats">
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Checks</span>
                        <span className="uptime-mob-stat-val">{s.total || '—'}</span>
                      </div>
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Up</span>
                        <span className="uptime-mob-stat-val" style={{ color: '#10b981' }}>{s.upCount}</span>
                      </div>
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Down</span>
                        <span className="uptime-mob-stat-val" style={{ color: s.downCount > 0 ? '#ef4444' : '#94a3b8' }}>{s.downCount}</span>
                      </div>
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Avg RT</span>
                        <span className="uptime-mob-stat-val" style={{ color: rc }}>{s.avgRt ? `${s.avgRt}ms` : '—'}</span>
                      </div>
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Min RT</span>
                        <span className="uptime-mob-stat-val" style={{ color: '#10b981' }}>{s.minRt ? `${s.minRt}ms` : '—'}</span>
                      </div>
                      <div className="uptime-mob-stat">
                        <span className="uptime-mob-stat-label">Max RT</span>
                        <span className="uptime-mob-stat-val" style={{ color: s.maxRt > 2000 ? '#ef4444' : '#475569' }}>{s.maxRt ? `${s.maxRt}ms` : '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
