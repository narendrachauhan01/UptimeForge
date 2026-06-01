import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../api';
import UWLogo from '../components/UWLogo';

export default function ConfirmDelete() {
    const [params] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [msg, setMsg]       = useState('');

    useEffect(() => {
        const token = params.get('token');
        const uid   = params.get('uid');
        if (!token || !uid) { setStatus('error'); setMsg('Invalid deletion link.'); return; }

        axios.get(`${API_URL}/api/users/confirm-delete?token=${token}&uid=${uid}`)
            .then(() => { setStatus('success'); setMsg('Your account has been permanently deleted.'); })
            .catch(e => { setStatus('error'); setMsg(e.response?.data?.error || 'Failed to delete account.'); });
    }, []);

    return (
        <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#1e1b4b,#312e81)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
            <div style={{ background:'#fff', borderRadius:20, maxWidth:460, width:'100%', padding:40, textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ marginBottom:20 }}><UWLogo size={44} /></div>

                {status === 'loading' && (
                    <>
                        <div style={{ width:44, height:44, borderRadius:'50%', border:'4px solid #e2e8f0', borderTop:'4px solid #dc2626', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        <p style={{ color:'#6B7280', fontSize:15 }}>Verifying deletion request...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{ fontSize:56, marginBottom:16 }}>🗑️</div>
                        <h2 style={{ fontSize:22, fontWeight:800, color:'#111827', marginBottom:12 }}>Account Deleted</h2>
                        <p style={{ color:'#6B7280', fontSize:14, lineHeight:1.7, marginBottom:28 }}>
                            {msg} All your data, monitors, logs and settings have been permanently removed from UptimeForge.
                        </p>
                        <Link to="/register" style={{ display:'inline-block', padding:'12px 28px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', color:'#fff', borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none' }}>
                            Create New Account
                        </Link>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={{ fontSize:56, marginBottom:16 }}>⚠️</div>
                        <h2 style={{ fontSize:22, fontWeight:800, color:'#DC2626', marginBottom:12 }}>Deletion Failed</h2>
                        <p style={{ color:'#6B7280', fontSize:14, lineHeight:1.7, marginBottom:28 }}>{msg}</p>
                        <Link to="/account" style={{ display:'inline-block', padding:'12px 28px', border:'1.5px solid #7c3aed', color:'#7c3aed', borderRadius:10, fontWeight:700, fontSize:14, textDecoration:'none' }}>
                            Back to Account
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
