import React from 'react';
import { Link } from 'react-router-dom';
import UWLogo from '../components/UWLogo';

export default function AccountSuspended({ user, onLogout }) {
    return (
        <div style={{ minHeight:'100vh', background:'#0f0e1a', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div style={{ maxWidth:520, width:'100%', textAlign:'center' }}>
                <div style={{ marginBottom:24 }}>
                    <UWLogo size={48} />
                </div>
                <div style={{ fontSize:72, marginBottom:16 }}>🚫</div>
                <h1 style={{ fontSize:28, fontWeight:900, color:'#fff', margin:'0 0 12px' }}>Account Suspended</h1>
                <p style={{ fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.7, margin:'0 0 8px' }}>
                    Your subscription expired more than <strong style={{ color:'#f87171' }}>30 days ago</strong>.
                </p>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:32 }}>
                    All monitoring, alerts, and dashboard access has been paused.
                </p>

                <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:320, margin:'0 auto 32px' }}>
                    <Link to="/pay?plan=select" style={{ display:'block', padding:'14px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:12, fontWeight:700, fontSize:15, textDecoration:'none', boxShadow:'0 4px 20px rgba(124,58,237,0.4)' }}>
                        ⬆️ Upgrade Plan
                    </Link>
                    <Link to="/support" style={{ display:'block', padding:'14px', border:'1.5px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.7)', borderRadius:12, fontWeight:600, fontSize:14, textDecoration:'none' }}>
                        📩 Contact Support
                    </Link>
                </div>

                {user?.accountId && (
                    <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:10, padding:'12px 20px', marginBottom:20, display:'inline-block' }}>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontWeight:700, textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Account ID</div>
                        <div style={{ fontSize:15, fontWeight:800, color:'#a78bfa', fontFamily:'monospace', letterSpacing:2 }}>{user.accountId}</div>
                    </div>
                )}

                <div>
                    <button onClick={onLogout} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
