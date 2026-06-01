import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api';
import axios from 'axios';
import UWLogo from '../components/UWLogo';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPw,   setShowPw]   = useState(false);
    const [error,    setError]    = useState('');
    const [loading,  setLoading]  = useState(false);
    const navigate = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/login`, { username, password }, { withCredentials: true });
            navigate('/admin');
        } catch(err) {
            setError(err.response?.data?.error || 'Invalid credentials');
        }
        setLoading(false);
    };

    return (
        <div className="login-split">
            {/* Left Panel */}
            <div className="login-left">
                <div className="login-left-orb login-orb-1" />
                <div className="login-left-orb login-orb-2" />
                <div className="login-left-content">
                    <Link to="/" className="login-left-brand">
                        <UWLogo size={42} />
                        <span>UptimeForge</span>
                    </Link>
                    <div className="login-left-body">
                        <h2 className="login-left-h2">Monitor your sites.<br />Sleep peacefully.</h2>
                        <p className="login-left-p">24/7 uptime monitoring with instant alerts via WhatsApp and Email.</p>
                        <div className="login-left-features">
                            {[
                                ['🔔','Instant down alerts — WhatsApp & Email'],
                                ['🔒','SSL & Domain expiry warnings'],
                                ['📊','Performance charts & history'],
                                ['⚡','Checks every 30s – 5min (plan-based)'],
                            ].map(([icon,text]) => (
                                <div key={text} className="login-left-feat">
                                    <div className="login-left-feat-icon">{icon}</div>
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="login-left-preview">
                            <div className="login-preview-row up"><div className="login-preview-dot green"/><span>myshop.com</span><span className="login-preview-ms">⚡ 234ms</span><span className="login-preview-badge up">Online</span></div>
                            <div className="login-preview-row down"><div className="login-preview-dot red pulse"/><span>api.staging.com</span><span className="login-preview-ms" style={{color:'#fca5a5'}}>Alert sent!</span><span className="login-preview-badge down">Down</span></div>
                            <div className="login-preview-row up"><div className="login-preview-dot green"/><span>blog.example.com</span><span className="login-preview-ms">⚡ 512ms</span><span className="login-preview-badge up">Online</span></div>
                        </div>
                    </div>
                    <div className="login-left-footer">© 2026 UptimeForge</div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="login-right">
                <div className="login-form-wrap">
                    <Link to="/" className="login-back">← Back to home</Link>

                    <UWLogo size={44} />
                    <h1 className="login-title">Admin Login</h1>
                    <p className="login-sub">Sign in to the admin panel</p>

                    {error && <div className="login-error-box">{error}</div>}

                    <form onSubmit={submit}>
                        <div className="login-field">
                            <label className="login-label">Username</label>
                            <input className="login-input" type="text" placeholder="Admin username" value={username} onChange={e=>setUsername(e.target.value)} required />
                        </div>
                        <div className="login-field" style={{ position:'relative' }}>
                            <label className="login-label">Password</label>
                            <input className="login-input" type={showPw?'text':'password'} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required />
                            <button type="button" onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:14, top:34, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16 }}>
                                {showPw ? '🙈' : '👁'}
                            </button>
                        </div>
                        <button type="submit" className="login-btn-main" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In as Admin'}
                        </button>
                    </form>

                    <div style={{ display:'flex', gap:10, marginTop:16 }}>
                        <Link to="/login" style={{ flex:1, textAlign:'center', padding:'10px', border:'1px solid #E5E7EB', borderRadius:10, fontSize:13, fontWeight:600, color:'#374151', textDecoration:'none', background:'#F9FAFB' }}>
                            User Login
                        </Link>
                        <Link to="/staff-login" style={{ flex:1, textAlign:'center', padding:'10px', border:'1px solid #7c3aed', borderRadius:10, fontSize:13, fontWeight:600, color:'#7c3aed', textDecoration:'none', background:'#ede9fe' }}>
                            Staff Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
