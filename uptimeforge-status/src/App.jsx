import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getSlug() {
  const parts = window.location.pathname.replace(/^\//, '').split('/').filter(Boolean);
  return parts[0] || '';
}

/* ── 90-day uptime grid (squares like Cloudflare) ── */
function UptimeGrid({ bars, uptime }) {
  const cells = (bars || []).slice(-90);
  const padded = cells.length < 90
    ? [...Array(90 - cells.length).fill(null), ...cells]
    : cells;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'nowrap' }}>
        {padded.map((v, i) => (
          <div
            key={i}
            title={v === null ? 'No data' : v === 1 ? 'Up' : 'Down'}
            style={{
              flex: 1,
              height: 28,
              borderRadius: 3,
              minWidth: 6,
              background: v === null ? 'rgba(255,255,255,0.05)' : v === 1 ? '#3ecf8e' : '#f87171',
              transition: 'opacity .15s',
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>90 days ago</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
          {uptime != null ? `${uptime.toFixed(2)}% uptime` : ''}
        </span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>Today</span>
      </div>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const cfg = {
    up:   { label: 'Operational',    color: '#3ecf8e', bg: 'rgba(62,207,142,0.1)'  },
    down: { label: 'Outage',         color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  };
  const c = cfg[status] || cfg.up;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, whiteSpace: 'nowrap' }}>
      {c.label}
    </span>
  );
}

/* ── Spinner ── */
function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#f6821f', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const slug = getSlug();

    const fetchPage = (s) =>
      axios.get(`${BASE_URL}/api/public/status/${s}`)
        .then(r => setData(r.data))
        .catch(e => { if (e.response?.status === 404) setNotFound(true); })
        .finally(() => setLoading(false));

    if (slug) {
      fetchPage(slug);
    } else {
      axios.get(`${BASE_URL}/api/public/statuses`)
        .then(r => {
          if (r.data?.length) fetchPage(r.data[0].slug);
          else { setNotFound(true); setLoading(false); }
        })
        .catch(() => { setNotFound(true); setLoading(false); });
    }
  }, []);

  useEffect(() => { if (data) document.title = `${data.title} — Status`; }, [data]);

  if (loading) return <Spinner />;

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: 52, marginBottom: 12 }}>📡</div>
      <h2 style={{ color: '#111', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>No Status Page Found</h2>
      <p style={{ color: '#6b7280', fontSize: 13 }}>No public status pages have been published yet.</p>
    </div>
  );

  const overall = data.overallStatus || 'operational';
  const hasOutage   = overall === 'outage';
  const hasDegraded = overall === 'degraded';
  const bannerColor = hasOutage ? '#ef4444' : hasDegraded ? '#f59e0b' : '#3ecf8e';
  const bannerBg    = hasOutage ? '#fef2f2' : hasDegraded ? '#fffbeb' : '#f0fdf4';
  const bannerText  = hasOutage ? 'Major System Outage' : hasDegraded ? 'Partial System Degradation' : 'All Systems Operational';
  const bannerIcon  = hasOutage ? '✕' : hasDegraded ? '!' : '✓';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: "'Inter',system-ui,sans-serif", color: '#111827' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none;color:inherit}
        .comp-row{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:10px;transition:box-shadow .2s}
        .comp-row:hover{box-shadow:0 4px 16px rgba(0,0,0,.06)}
        .inc-row{padding:14px 0;border-bottom:1px solid #f3f4f6}
        .inc-row:last-child{border-bottom:none;padding-bottom:0}
        .section-label{font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:14px}
      `}</style>

      {/* ── Top nav ── */}
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: 'linear-gradient(135deg,#f6821f,#e34c26)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{data.title}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="https://uptimeapi.narendrasingh.site/api-docs" target="_blank" rel="noopener" style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>API</a>
            <span style={{ fontSize: 13, color: '#d1d5db' }}>|</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Updated: {data.lastUpdated}</span>
          </div>
        </div>
      </header>

      {/* ── Overall status banner ── */}
      <div style={{ background: bannerBg, borderBottom: `3px solid ${bannerColor}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: bannerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{bannerIcon}</span>
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: hasOutage ? '#991b1b' : hasDegraded ? '#92400e' : '#14532d', lineHeight: 1.2 }}>
              {bannerText}
            </h1>
            {data.description && (
              <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{data.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* Components / Services */}
        {data.monitors?.length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <p className="section-label">Current Status</p>

            {data.monitors.map(m => (
              <div key={m._id} className="comp-row">
                {/* Row: name + response + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: m.status === 'up' ? '#3ecf8e' : '#f87171',
                    boxShadow: m.status === 'up' ? '0 0 0 3px rgba(62,207,142,.2)' : '0 0 0 3px rgba(248,113,113,.2)',
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{m.name}</span>
                  {m.url && (
                    <span style={{ fontSize: 12, color: '#d1d5db', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.url}
                    </span>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {m.responseTime && (
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{m.responseTime}ms</span>
                    )}
                    {m.sslDaysLeft != null && (
                      <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>SSL {m.sslDaysLeft}d</span>
                    )}
                    <StatusBadge status={m.status} />
                  </div>
                </div>

                {/* Uptime history grid */}
                <UptimeGrid bars={m.uptimeBars} uptime={m.uptime} />
              </div>
            ))}
          </section>
        )}

        {/* ── Incidents ── */}
        <section>
          <p className="section-label">Incidents</p>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '0 22px' }}>
            {!data.incidents?.length ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#3ecf8e', marginBottom: 4 }}>No incidents reported</div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>All systems have been running smoothly.</div>
              </div>
            ) : (
              data.incidents.map((inc, i) => {
                const sc = {
                  investigating: { color: '#ef4444', bg: 'rgba(239,68,68,.1)',  label: 'Investigating' },
                  identified:    { color: '#f59e0b', bg: 'rgba(245,158,11,.1)', label: 'Identified'    },
                  monitoring:    { color: '#3b82f6', bg: 'rgba(59,130,246,.1)', label: 'Monitoring'    },
                  resolved:      { color: '#10b981', bg: 'rgba(16,185,129,.1)', label: 'Resolved'      },
                };
                const s = sc[inc.status] || sc.investigating;
                return (
                  <div key={inc._id || i} className="inc-row">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ marginTop: 5, width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{inc.title}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>
                        </div>
                        {inc.body && <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 6 }}>{inc.body}</div>}
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{inc.at}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Footer */}
        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: '#d1d5db' }}>
            Powered by{' '}
            <a href="https://narendrasingh.site" style={{ color: '#f6821f', fontWeight: 700 }}>UptimeForge</a>
          </div>
        </div>
      </main>
    </div>
  );
}
