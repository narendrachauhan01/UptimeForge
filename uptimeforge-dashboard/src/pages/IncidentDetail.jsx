import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getServerIncident } from '../api';

function fmtDuration(ms) {
    if (!ms || ms < 0) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function IncidentDetail() {
    const { serverId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        getServerIncident(serverId)
            .then(r => { setData(r.data); setLoading(false); })
            .catch(e => { setError(e.response?.data?.error || 'Failed to load'); setLoading(false); });
    }, [serverId]);

    const ongoing = data?.incident?.status === 'ongoing';

    return (
        <div style={{ minHeight:'100vh', background:'#0b0f19', color:'#f8fafc', fontFamily:"'Plus Jakarta Sans', system-ui, sans-serif" }}>
            <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>

                {/* Back */}
                <button onClick={() => navigate('/monitoring')} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#94a3b8', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:24, padding:0 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                    Back to Monitors
                </button>

                {loading && (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 0', gap:12 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', border:'4px solid rgba(255,255,255,0.06)', borderTop:'4px solid #7c3aed', animation:'spin 0.8s linear infinite' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                )}
                {error && <div style={{ color:'#f43f5e', fontSize:14, fontWeight:600 }}>{error}</div>}

                {data && !data.incident && (
                    <div style={{ textAlign:'center', padding:'80px 0', color:'#64748b' }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                        <div style={{ fontSize:18, fontWeight:700, color:'#f8fafc', marginBottom:8 }}>No active incident</div>
                        <div style={{ fontSize:14 }}>No downtime recorded for <strong style={{color:'#a78bfa'}}>{data.server?.name}</strong> in the last 90 days.</div>
                    </div>
                )}

                {data?.incident && (
                    <>
                        {/* Header */}
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:28 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                                <div style={{ width:16, height:16, borderRadius:'50%', background: ongoing ? '#f43f5e' : '#10b981', boxShadow:`0 0 12px ${ongoing ? '#f43f5e' : '#10b981'}`, flexShrink:0, marginTop:3 }} />
                                <div>
                                    <h1 style={{ fontSize:22, fontWeight:800, color:'#f8fafc', margin:0 }}>
                                        {ongoing ? 'Ongoing incident on' : 'Resolved incident on'} <span style={{ color:'#a78bfa' }}>{data.server.name}</span>
                                    </h1>
                                    <div style={{ fontSize:13, color:'#64748b', marginTop:4 }}>
                                        <a href={data.server.url} target="_blank" rel="noreferrer" style={{ color:'#6366f1', textDecoration:'none' }}>{data.server.url}</a>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => navigate(`/site/${data.server._id}`)} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:9, fontSize:13, fontWeight:600, color:'#a78bfa', cursor:'pointer' }}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></svg>
                                Go to monitor
                            </button>
                        </div>

                        {/* Root cause */}
                        <div style={{ background:'#131a26', borderRadius:14, padding:'18px 22px', marginBottom:16, border:'1px solid rgba(244,63,94,0.15)' }}>
                            <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Root cause</div>
                            <div style={{ fontSize:16, fontWeight:700, color:'#f8fafc' }}>{data.incident.rootCause}</div>
                        </div>

                        {/* Status + Duration */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                            <div style={{ background:'#131a26', borderRadius:14, padding:'18px 22px', border:'1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Status</div>
                                <div style={{ fontSize:18, fontWeight:800, color: ongoing ? '#f43f5e' : '#10b981', marginBottom:6 }}>
                                    {ongoing ? '● Ongoing' : '● Resolved'}
                                </div>
                                <div style={{ fontSize:12, color:'#64748b' }}>Started {fmtDate(data.incident.startedAt)}</div>
                                {data.incident.resolvedAt && (
                                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>Resolved {fmtDate(data.incident.resolvedAt)}</div>
                                )}
                            </div>
                            <div style={{ background:'#131a26', borderRadius:14, padding:'18px 22px', border:'1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Duration</div>
                                <div style={{ fontSize:24, fontWeight:800, color:'#f8fafc' }}>{fmtDuration(data.incident.durationMs)}</div>
                                {ongoing && <div style={{ fontSize:12, color:'#f59e0b', marginTop:6 }}>⏱ Still ongoing</div>}
                            </div>
                        </div>

                        {/* Activity log */}
                        <div style={{ background:'#131a26', borderRadius:14, padding:'20px 22px', border:'1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ fontSize:15, fontWeight:700, color:'#f8fafc', marginBottom:16 }}>Activity log</div>
                            {data.activity.length === 0 ? (
                                <div style={{ fontSize:13, color:'#64748b' }}>No activity recorded.</div>
                            ) : (
                                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                                    {data.activity.map((a, i) => (
                                        <div key={a._id} style={{ display:'flex', alignItems:'flex-start', gap:14, paddingBottom: i < data.activity.length - 1 ? 16 : 0, borderBottom: i < data.activity.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', marginBottom: i < data.activity.length - 1 ? 16 : 0 }}>
                                            {/* Icon */}
                                            <div style={{ width:32, height:32, borderRadius:'50%', background: a.type === 'down' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)', border:`1.5px solid ${a.type === 'down' ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                                {a.type === 'down'
                                                    ? <svg width="14" height="14" fill="none" stroke="#f43f5e" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                    : <svg width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                                }
                                            </div>
                                            <div style={{ flex:1, minWidth:0 }}>
                                                <div style={{ fontSize:13, fontWeight:600, color:'#f8fafc', marginBottom:3 }}>
                                                    {a.type === 'down' ? '🔴 Site went down' : '🟢 Site recovered'}
                                                    {a.message && <span style={{ color:'#94a3b8', fontWeight:400 }}> — {a.message}</span>}
                                                </div>
                                                {a.sentTo?.length > 0 && (
                                                    <div style={{ fontSize:12, color:'#64748b' }}>
                                                        Notified: {a.sentTo.map(r => r.name || r.email || r.phone).filter(Boolean).join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ fontSize:11, color:'#475569', whiteSpace:'nowrap', flexShrink:0 }}>
                                                {fmtDate(a.createdAt)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
