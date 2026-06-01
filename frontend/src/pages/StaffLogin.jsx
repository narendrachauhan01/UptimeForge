import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffLogin } from '../api';
import UWLogo from '../components/UWLogo';

export default function StaffLogin() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await staffLogin({ email, password });
            navigate('/staff');
        } catch(err) {
            setError(err.response?.data?.error || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1e1b4b,#312e81)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:400, padding:36, boxShadow:'0 24px 80px rgba(0,0,0,0.3)' }}>
                <div style={{ textAlign:'center', marginBottom:28 }}>
                    <UWLogo size={44} />
                    <h1 style={{ fontSize:22, fontWeight:800, color:'#1e1b4b', margin:'12px 0 4px' }}>Staff Login</h1>
                    <p style={{ fontSize:13, color:'#6B7280', margin:0 }}>UptimeForge Staff Panel</p>
                </div>

                {error && (
                    <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#DC2626', marginBottom:16 }}>{error}</div>
                )}

                <form onSubmit={submit}>
                    <div style={{ marginBottom:16 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}
                            placeholder="staff@example.com" />
                    </div>
                    <div style={{ marginBottom:24 }}>
                        <label style={{ fontSize:12, fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Password</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                            style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}
                            placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={loading}
                        style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer' }}>
                        {loading ? 'Logging in...' : 'Login →'}
                    </button>
                </form>
                <div style={{ display:'flex', gap:10, marginTop:20 }}>
                    <a href="/" style={{ flex:1, display:'block', textAlign:'center', padding:'10px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', textDecoration:'none', background:'#F9FAFB' }}>
                        ← Back
                    </a>
                    <a href="/login" style={{ flex:1, display:'block', textAlign:'center', padding:'10px', border:'1px solid #7c3aed', borderRadius:10, fontSize:13, fontWeight:600, color:'#7c3aed', textDecoration:'none', background:'#ede9fe' }}>
                        Admin Login
                    </a>
                </div>
            </div>
        </div>
    );
}
