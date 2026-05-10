import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { getServers, getAlerts, API_URL } from '../api';
import axios from 'axios';

const COLORS = ['#7c3aed', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export default function Charts() {
  const [servers, setServers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    getServers().then(r => {
      setServers(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0]._id);
    });
    getAlerts().then(r => setAlerts(r.data));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    axios.get(`${API_URL}/api/servers/${selectedId}/history`)
      .then(r => setHistory(r.data?.history || []));
  }, [selectedId]);

  const chartData = history.map(h => ({
    time: new Date(h.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    responseTime: h.responseTime,
    status: h.status === 'up' ? 1 : 0,
  }));

  // Uptime % per server
  const uptimeData = servers.map(s => {
    const total = s.history?.length || 0;
    const upCount = s.history?.filter(h => h.status === 'up').length || 0;
    const pct = total > 0 ? Math.round((upCount / total) * 100) : 100;
    return { name: s.name, uptime: pct, downtime: 100 - pct };
  });

  // Alert frequency last 7 days
  const alertMap = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    alertMap[key] = { date: key, down: 0, recovered: 0 };
  }
  alerts.forEach(a => {
    const key = new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (alertMap[key]) {
      if (a.type === 'down') alertMap[key].down++;
      else alertMap[key].recovered++;
    }
  });
  const alertData = Object.values(alertMap);

  // Pie chart data
  const up = servers.filter(s => s.status === 'up').length;
  const down = servers.filter(s => s.status === 'down').length;
  const unknown = servers.filter(s => s.status === 'unknown').length;
  const pieData = [
    { name: 'Online', value: up, color: '#10b981' },
    { name: 'Offline', value: down, color: '#ef4444' },
    { name: 'Unknown', value: unknown, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}{p.name === 'Response Time' ? 'ms' : '%'}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Analytics</h1>
          <p className="pg-sub">Response time, uptime and alert trends</p>
        </div>
      </div>

      {/* Stats overview row */}
      <div className="chart-overview-row">
        <div className="chart-stat-box">
          <div className="chart-stat-label">Total Sites</div>
          <div className="chart-stat-value" style={{ color: '#7c3aed' }}>{servers.length}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Online Now</div>
          <div className="chart-stat-value" style={{ color: '#10b981' }}>{up}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Offline Now</div>
          <div className="chart-stat-value" style={{ color: '#ef4444' }}>{down}</div>
        </div>
        <div className="chart-stat-box">
          <div className="chart-stat-label">Total Alerts</div>
          <div className="chart-stat-value" style={{ color: '#f59e0b' }}>{alerts.length}</div>
        </div>
      </div>

      <div className="charts-grid">

        {/* Response Time Chart */}
        <div className="chart-card wide">
          <div className="chart-card-header">
            <div className="chart-card-title">⚡ Response Time</div>
            <div className="site-search-wrap" onBlur={() => setTimeout(() => setShowDropdown(false), 150)}>
              <div className="site-search-input-box" onClick={() => setShowDropdown(true)}>
                <span className="site-search-icon">🔍</span>
                <input
                  className="site-search-input"
                  placeholder="Search site..."
                  value={siteSearch || servers.find(s => s._id === selectedId)?.name || ''}
                  onChange={e => { setSiteSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { setSiteSearch(''); setShowDropdown(true); }}
                />
              </div>
              {showDropdown && (
                <div className="site-search-dropdown">
                  {servers
                    .filter(s => s.name.toLowerCase().includes(siteSearch.toLowerCase()) || s.url.toLowerCase().includes(siteSearch.toLowerCase()))
                    .map(s => (
                      <div key={s._id}
                        className={`site-search-option ${selectedId === s._id ? 'active' : ''}`}
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
            <div className="chart-empty">No data yet — checks run every 60 seconds</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="ms" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="responseTime" name="Response Time"
                  stroke="#7c3aed" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Site Status Pie */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">🟢 Site Status</div>
          </div>
          {pieData.length === 0 ? (
            <div className="chart-empty">No sites</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pieData.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color }}></div>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{d.name}</span>
                    <span style={{ color: d.color, fontWeight: 800 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Uptime % Bar */}
        <div className="chart-card wide">
          <div className="chart-card-header">
            <div className="chart-card-title">📊 Uptime % (Last 50 checks)</div>
          </div>
          {uptimeData.length === 0 ? (
            <div className="chart-empty">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={uptimeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`]} />
                <Bar dataKey="uptime" name="Uptime" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="downtime" name="Downtime" fill="#ef4444" radius={[6, 6, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alert History Bar */}
        <div className="chart-card wide">
          <div className="chart-card-header">
            <div className="chart-card-title">🔔 Alerts — Last 7 Days</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={alertData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip />
              <Bar dataKey="down" name="Down" fill="#ef4444" radius={[6, 6, 0, 0]} />
              <Bar dataKey="recovered" name="Recovered" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
