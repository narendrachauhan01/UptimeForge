import React, { useEffect, useState } from 'react';
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getSlug() {
  const parts = window.location.pathname.replace(/^\//, '').split('/').filter(Boolean);
  return parts[0] || '';
}

function UptimeBar({ bars }) {
  const show = (bars || []).slice(-90);
  if (!show.length) return null;
  return (
    <div style={{ display: 'flex', gap: 2, height: 28, alignItems: 'center' }}>
      {show.map((v, i) => (
        <div key={i} title={v === 1 ? 'Up' : 'Down'} style={{ flex: 1, height: '100%', borderRadius: 2, minWidth: 3, background: v === 1 ? '#10b981' : '#ef4444', opacity: 0.6 + (i / show.length) * 0.4 }} />
      ))}
    </div>
  );
}

export default function App() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const slug = getSlug();

    const fetchPage = (s) =>
      axios.get(`${BASE_URL}/api/public/status/${s}`)
        .then(r => setData(r.data))
        .catch(e => { if (e.response?.status === 404) setNotFound(true); })
        .finally(() => setLoading(false));

    if (slug) {
      // Direct slug URL like /sas
      fetchPage(slug);
    } else {
      // Root domain — auto-load the first public status page
      axios.get(`${BASE_URL}/api/public/statuses`)
        .then(r => {
          if (r.data?.length) {
            fetchPage(r.data[0].slug);
          } else {
            setNotFound(true);
            setLoading(false);
          }
        })
        .catch(() => { setNotFound(true); setLoading(false); });
    }
  }, []);

  useEffect(() => { if (data) document.title = `${data.title} — Status`; }, [data]);

  const sm = {
    operational: { label: 'All Systems Operational', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '✓' },
    degraded:    { label: 'Partial Outage',           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '!' },
    outage:      { label: 'Major Outage',             color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✕' },
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0b0b14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0b0b14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>📡</div>
      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>No Status Page Found</h1>
      <p style={{ color: '#6b7280', fontSize: 13 }}>No public status pages have been published yet.</p>
    </div>
  );

  const s = sm[data.overallStatus] || sm.operational;

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b14', fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif", color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap');
        *{box-sizing:border-box}
        .ps-card{background:#13131f;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px 22px;margin-bottom:12px}
        .ps-card:last-child{margin-bottom:0}
        .ps-row{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}
        .ps-name{font-size:14px;font-weight:800;color:#f1f5f9;flex:1}
        .ps-status{font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px}
        .ps-up{background:rgba(16,185,129,.12);color:#10b981}
        .ps-down{background:rgba(239,68,68,.12);color:#ef4444}
        .ps-meta{display:flex;gap:16px;margin-top:10px;flex-wrap:wrap}
        .ps-mi{font-size:12px;color:#6b7280}
        .ps-mi span{color:#94a3b8;font-weight:700}
        .ps-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
        .ps-inc-row{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04)}
        .ps-inc-row:last-child{border-bottom:none;padding-bottom:0}
        .ps-sec{font-family:'Outfit',sans-serif;font-size:13px;font-weight:800;color:#4b5563;letter-spacing:1px;text-transform:uppercase;margin:0 0 14px}
      `}</style>

      {/* Header */}
      <div style={{ background: '#0f0f1a', borderBottom: '1px solid rgba(255,255,255,.06)', padding: '28px 20px 22px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 22, fontWeight: 800, margin: 0, color: '#f1f5f9' }}>{data.title}</h1>
          </div>
          {data.description && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 0 42px' }}>{data.description}</p>}
        </div>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '30px 20px 60px' }}>

        {/* Status banner */}
        <div style={{ background: s.bg, border: `1px solid ${s.color}40`, borderRadius: 16, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{s.icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Last updated: {data.lastUpdated}</div>
          </div>
        </div>

        {/* Monitors */}
        {data.monitors?.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p className="ps-sec">Services</p>
            {data.monitors.map(m => (
              <div key={m._id} className="ps-card">
                <div className="ps-row">
                  <div className="ps-dot" style={{ background: m.status === 'up' ? '#10b981' : '#ef4444', boxShadow: m.status === 'up' ? '0 0 0 3px rgba(16,185,129,.2)' : '0 0 0 3px rgba(239,68,68,.2)' }} />
                  <span className="ps-name">{m.name}</span>
                  {m.url && <span style={{ fontSize: 11, color: '#374151', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.url}</span>}
                  <span className={`ps-status ${m.status === 'up' ? 'ps-up' : 'ps-down'}`}>{m.status === 'up' ? 'Operational' : 'Outage'}</span>
                </div>
                {m.uptimeBars?.length > 0 && <UptimeBar bars={m.uptimeBars} />}
                <div className="ps-meta">
                  <div className="ps-mi">Uptime <span>{m.uptime?.toFixed(2) ?? '—'}%</span></div>
                  {m.responseTime && <div className="ps-mi">Response <span>{m.responseTime}ms</span></div>}
                  {m.sslDaysLeft != null && <div className="ps-mi">SSL <span>{m.sslDaysLeft}d left</span></div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Incidents */}
        <div>
          <p className="ps-sec">Recent Incidents (30 days)</p>
          {!data.incidents?.length ? (
            <div className="ps-card" style={{ textAlign: 'center', padding: '32px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>No incidents reported</div>
              <div style={{ fontSize: 12, color: '#4b5563' }}>All systems have been running smoothly for the last 30 days.</div>
            </div>
          ) : (
            <div className="ps-card">
              {data.incidents.map((inc, i) => (
                <div key={i} className="ps-inc-row">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{inc.name}</div>
                    {inc.url && <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 2 }}>{inc.url}</div>}
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{inc.at}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center', fontSize: 12, color: '#374151' }}>
          Powered by <span style={{ color: '#7c3aed', fontWeight: 700 }}>UptimeForge</span>
        </div>
      </div>
    </div>
  );
}
