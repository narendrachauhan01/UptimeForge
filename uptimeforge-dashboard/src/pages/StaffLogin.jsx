import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { staffLogin } from '../api';
import UWLogo from '../components/UWLogo';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://uptimeforge.narendrasingh.site';

export default function StaffLogin() {
    const [email,    setEmail]    = useState(''); // used as username
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
            await staffLogin({ username: email, password });
            navigate('/staff');
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
                    <a href={LANDING_URL} className="login-left-brand">
                        <UWLogo size={42} />
                        <span>UptimeForge</span>
                    </a>
                    <div className="login-left-body">
                        <h2 className="login-left-h2">Staff Panel.<br />Your assigned access.</h2>
                        <p className="login-left-p">Log in to manage the sections assigned to you by the admin. Your access is role-based and controlled.</p>
                        <div className="login-left-features">
                            {[
                                ['⚡','Access control mapped by administration'],
                                ['🎫','Support tickets desk for customer queries'],
                                ['📈','View real-time status of client monitors'],
                            ].map(([icon,text]) => (
                                <div key={text} className="login-left-feat">
                                    <div className="login-left-feat-icon">{icon}</div>
                                    <span>{text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="login-left-preview">
                            <div className="login-preview-row up"><div className="login-preview-dot green"/><span>Users Management</span><span className="login-preview-badge up">Read</span></div>
                            <div className="login-preview-row up"><div className="login-preview-dot green"/><span>Support Tickets</span><span className="login-preview-badge up">Write</span></div>
                            <div className="login-preview-row down"><div className="login-preview-dot red"/><span>Plan Settings</span><span className="login-preview-badge down">No Access</span></div>
                        </div>
                    </div>
                    <div className="login-left-footer">© 2026 UptimeForge.in</div>
                </div>
            </div>

            {/* Right Panel */}
            <div className="login-right">
                <div className="login-form-wrap">
                    <a href={LANDING_URL} className="login-back">← Back to home</a>

                    <a href={LANDING_URL} style={{ display: 'inline-block', marginTop: 24, textDecoration: 'none' }}>
                        <UWLogo size={44} />
                    </a>
                    <h1 className="login-right-h1">Staff Login</h1>
                    <p className="login-right-sub">Sign in to your staff panel</p>

                    {/* Tab buttons */}
                    <div style={{ display:'flex', gap:8, marginBottom:24, background:'rgba(255,255,255,0.06)', borderRadius:12, padding:5 }}>
                        <span style={{ flex:1, textAlign:'center', padding:'10px', borderRadius:8, fontSize:14, fontWeight:700, background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', cursor:'default' }}>
                            👥 Staff
                        </span>
                        <Link to="/admin-login" style={{ flex:1, textAlign:'center', padding:'10px', borderRadius:8, fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.6)', textDecoration:'none', background:'transparent', transition:'all 0.2s' }}
                            onMouseEnter={e=>{ e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.08)'; }}
                            onMouseLeave={e=>{ e.currentTarget.style.color='rgba(255,255,255,0.6)'; e.currentTarget.style.background='transparent'; }}>
                            ⚡ Admin
                        </Link>
                    </div>

                    {error && <div className="login-error-box">{error}</div>}

                    <form onSubmit={submit}>
                        <div className="login-field">
                            <label className="login-label">Username</label>
                            <input className="login-input" type="text" placeholder="Enter username" value={email} onChange={e=>setEmail(e.target.value)} required />
                        </div>
                        <div className="login-field" style={{ position:'relative' }}>
                            <label className="login-label">Password</label>
                            <input className="login-input" type={showPw?'text':'password'} placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required />
                            <button type="button" onClick={()=>setShowPw(p=>!p)} style={{ position:'absolute', right:14, top:34, background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16 }}>
                                {showPw ? '🙈' : '👁'}
                            </button>
                        </div>
                        <button type="submit" className="login-submit" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
