import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../api';

const authCfg = { withCredentials: true };

export default function EmailPage() {
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/api/email-config/status`, authCfg).then(r => setStatus(r.data));
  }, []);

  const sendTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await axios.post(`${API_URL}/api/email-config/test`, { to: testTo || undefined }, authCfg);
      setTestResult({ success: true, msg: `Test email sent to ${res.data.sentTo}` });
    } catch (e) {
      setTestResult({ success: false, msg: e.response?.data?.error || 'Failed to send' });
    }
    setTesting(false);
  };

  const steps = [
    { n: 1, title: 'Enable 2-Step Verification', desc: 'Google Account → Security → 2-Step Verification → Turn ON' },
    { n: 2, title: 'Generate App Password', desc: 'Google Account → Security → App Passwords → Mail + Other → Generate' },
    { n: 3, title: 'Update backend/.env', code: 'MAIL_USER=your@gmail.com\nMAIL_PASS=xxxx xxxx xxxx xxxx\nMAIL_FROM=Server Monitor <your@gmail.com>' },
    { n: 4, title: 'Restart Server', code: 'node server.js' },
    { n: 5, title: 'Send Test Email', desc: 'Click the test button above to verify.' },
  ];

  return (
    <div className="pg-wrap">
      <div className="pg-header">
        <div>
          <h1 className="pg-title">Email (SMTP)</h1>
          <p className="pg-sub">Gmail SMTP configuration for email alerts</p>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`email-status-banner ${status?.configured ? 'connected' : 'disconnected'}`}>
        <span className="email-status-icon">{status?.configured ? '✅' : '❌'}</span>
        <div>
          <div className="email-status-title">{status?.configured ? 'Email Connected' : 'Not Configured'}</div>
          <div className="email-status-sub">
            {status?.configured ? status.mailUser : 'Add SMTP credentials to backend/.env'}
          </div>
        </div>
      </div>

      <div className="email-grid">
        {/* Config Info */}
        <div className="email-card">
          <div className="email-card-title">📧 Current Config</div>
          {status?.configured ? (
            <div className="config-rows">
              <div className="config-row"><span className="config-key">Gmail</span><span className="config-val">{status.mailUser}</span></div>
              <div className="config-row"><span className="config-key">From</span><span className="config-val">{status.mailFrom || '—'}</span></div>
              <div className="config-row"><span className="config-key">Password</span><span className="config-val"><span className="pill pill-active">Configured ✓</span></span></div>
              <div className="config-row"><span className="config-key">Provider</span><span className="config-val">Gmail SMTP</span></div>
            </div>
          ) : (
            <div className="email-empty">No SMTP configured yet</div>
          )}
          <div className="config-note">
            📌 To change config, update <strong>backend/.env</strong> and restart server
          </div>
        </div>

        {/* Test Email */}
        <div className="email-card">
          <div className="email-card-title">🧪 Send Test Email</div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Send to (optional)</label>
            <input type="email" placeholder={status?.mailUser || 'your@email.com'}
              value={testTo} onChange={e => setTestTo(e.target.value)} />
          </div>
          <button className="btn-submit" style={{ width: '100%' }}
            onClick={sendTest} disabled={testing || !status?.configured}>
            {testing ? '⏳ Sending...' : '📤 Send Test Email'}
          </button>
          {!status?.configured && (
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 10, textAlign: 'center' }}>Configure SMTP first</p>
          )}
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              {testResult.success ? '✅' : '❌'} {testResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* Setup Guide */}
      <div className="email-card" style={{ marginTop: 18 }}>
        <div className="email-card-title">📖 Gmail Setup Guide</div>
        <div className="setup-steps">
          {steps.map(s => (
            <div key={s.n} className="setup-step">
              <div className="step-num-badge">{s.n}</div>
              <div className="step-body">
                <div className="step-title-txt">{s.title}</div>
                {s.desc && <div className="step-desc-txt">{s.desc}</div>}
                {s.code && <pre className="step-code">{s.code}</pre>}
              </div>
            </div>
          ))}
        </div>
        <div className="setup-note">
          <strong>Note:</strong> Use App Password only — direct Gmail password won't work. Gmail allows 500 emails/day free.
        </div>
      </div>
    </div>
  );
}
