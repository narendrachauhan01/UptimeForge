import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

export default function PlanCanceling() {
    const [payments, setPayments] = useState([]);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/api/admin/payments`, { withCredentials: true })
            .then(r => {
                setPayments(r.data.filter(p => p.status === 'refunded'));
                setLoading(false);
            }).catch(() => setLoading(false));
    }, []);

    const totalRefunded = payments.reduce((s, p) => s + (p.amount || 0), 0);

    return (
        <div className="pg-wrap">
            <div className="pg-header">
                <div>
                    <h1 className="pg-title">Plan Canceling <span style={{color:'#ef4444'}}>.</span></h1>
                    <p className="pg-sub">All refunded & cancelled plans</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
                {[
                    { label:'Total Cancelled', value: payments.length, icon:'❌', color:'#ef4444', bg:'#fef2f2', border:'#fecdd3' },
                    { label:'Total Refunded',  value: `₹${totalRefunded}`, icon:'💸', color:'#dc2626', bg:'#fff1f2', border:'#fca5a5' },
                    { label:'Plan Revenue Lost', value: `₹${payments.filter(p=>p.type!=='verification').reduce((s,p)=>s+(p.amount||0),0)}`, icon:'📉', color:'#b91c1c', bg:'#fef2f2', border:'#fecdd3' },
                ].map(c => (
                    <div key={c.label} style={{ background:c.bg, border:`1.5px solid ${c.border}`, borderRadius:14, padding:'18px 20px' }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>{c.icon}</div>
                        <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
                        <div style={{ fontSize:12, color:c.color, fontWeight:600, opacity:0.8, marginTop:4 }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #fecdd3', overflow:'hidden' }}>
                <div style={{ background:'#fef2f2', padding:'14px 20px', borderBottom:'1px solid #fecdd3', display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:16 }}>↩</span>
                    <span style={{ fontWeight:700, color:'#dc2626', fontSize:14 }}>Cancelled Plans ({payments.length})</span>
                </div>

                {loading ? (
                    <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>Loading...</div>
                ) : payments.length === 0 ? (
                    <div style={{ padding:40, textAlign:'center', color:'#94a3b8' }}>
                        <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                        <div style={{ fontWeight:700, color:'#16a34a' }}>No cancelled plans</div>
                        <div style={{ fontSize:13, marginTop:6 }}>All plans are active</div>
                    </div>
                ) : (
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                            <thead>
                                <tr style={{ background:'#fff5f5' }}>
                                    {['#','Date','User','Plan','Amount','Razorpay ID','Note'].map(h => (
                                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#b91c1c', fontSize:12, borderBottom:'1px solid #fecdd3', whiteSpace:'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p, i) => (
                                    <tr key={p._id} style={{ borderBottom:'1px solid #fff1f2', background: i%2===0 ? '#fff':'#fff5f5' }}>
                                        <td style={{ padding:'12px 16px', color:'#ef4444', fontWeight:700 }}>{i+1}</td>
                                        <td style={{ padding:'12px 16px', color:'#475569', whiteSpace:'nowrap' }}>
                                            {new Date(p.reviewedAt || p.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </td>
                                        <td style={{ padding:'12px 16px' }}>
                                            <div style={{ fontWeight:700, color:'#1e1b4b' }}>{p.userName || '—'}</div>
                                            <div style={{ fontSize:11, color:'#94a3b8' }}>{p.userEmail || ''}</div>
                                        </td>
                                        <td style={{ padding:'12px 16px' }}>
                                            <span style={{ padding:'3px 12px', borderRadius:20, fontSize:12, fontWeight:700,
                                                background: p.plan==='gold'?'#fef9c3': p.plan==='silver'?'#f1f5f9': p.plan==='bronze'?'#fef3c7':'#fee2e2',
                                                color: p.plan==='gold'?'#b45309': p.plan==='silver'?'#475569': p.plan==='bronze'?'#92400e':'#dc2626' }}>
                                                {p.plan ? p.plan.charAt(0).toUpperCase()+p.plan.slice(1) : 'Verification'}
                                            </span>
                                        </td>
                                        <td style={{ padding:'12px 16px' }}>
                                            <s style={{ color:'#dc2626', fontWeight:700, fontSize:15 }}>₹{p.amount}</s>
                                        </td>
                                        <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:11, color:'#94a3b8' }}>
                                            {p.razorpay_payment_id || p.utr || '—'}
                                        </td>
                                        <td style={{ padding:'12px 16px', fontSize:12, color:'#ef4444', maxWidth:200 }}>
                                            {p.adminNote || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop:'2px solid #fecdd3', background:'#fff1f2' }}>
                                    <td colSpan={4} style={{ padding:'12px 16px', fontWeight:700, color:'#dc2626' }}>Total Refunded Amount</td>
                                    <td style={{ padding:'12px 16px', fontWeight:800, color:'#dc2626', fontSize:16 }}>
                                        <s>₹{totalRefunded}</s>
                                    </td>
                                    <td colSpan={2}/>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
