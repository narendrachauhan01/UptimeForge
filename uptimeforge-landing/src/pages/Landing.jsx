import { useState, useEffect } from 'react';
import UWLogo from '../components/UWLogo';

const DASHBOARD = import.meta.env.VITE_DASHBOARD_URL || 'https://servermonitor.narendrasingh.site';
const API_URL   = import.meta.env.VITE_API_URL       || 'https://uptimeapi.narendrasingh.site';

// Fetch plans from backend
const getPlans = () => fetch(`${API_URL}/api/payment/plans`).then(r => r.json()).then(d => ({ data: d }));

// Replace Link with anchor, useNavigate with redirect
const Link = ({ to, children, ...props }) => <a href={to.startsWith('/') ? `${DASHBOARD}${to}` : to} {...props}>{children}</a>;

// Parse "type:label" feature strings from admin settings
function parseFeatures(arr) {
  if (!arr || !arr.length) return [];
  return arr.map(f => {
    const idx = f.indexOf(':');
    if (idx === -1) return { type: 'ok', label: f };
    return { type: f.slice(0, idx), label: f.slice(idx + 1) };
  });
}

const PLAN_META = {
  free_trial: { name: 'Free Trial', emoji: '🆓', period: 'one-time', gradient: 'linear-gradient(135deg,#6366f1,#7c3aed)', cta: 'Start Free Trial', popular: false },
  bronze:     { name: 'Bronze',     emoji: '🥉', period: '/month',   gradient: 'linear-gradient(135deg,#b45309,#d97706)', cta: 'Get Bronze',       popular: false },
  silver:     { name: 'Silver',     emoji: '🥈', period: '/month',   gradient: 'linear-gradient(135deg,#475569,#334155)', cta: 'Get Silver',       popular: true  },
  gold:       { name: 'Gold',       emoji: '🥇', period: '/month',   gradient: 'linear-gradient(135deg,#ca8a04,#eab308)', cta: 'Get Gold',         popular: false },
};

export default function Landing() {
  const navigate = (path) => { window.location.assign(`${DASHBOARD}${path}`); };
  const [menuOpen, setMenuOpen] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [billing, setBilling] = useState('monthly');

  // Interactive Live Demo Dashboard States
  const [activeTab, setActiveTab] = useState('monitoring');
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: true }));
  const [pingLog, setPingLog] = useState([
    'PING 104.24.12.85:443',
    'Reply from 104.24.12.85: seq=1 time=11ms',
    'Reply from 104.24.12.85: seq=2 time=10ms',
    'Reply from 104.24.12.85: seq=3 time=11ms',
    'Reply from 104.24.12.85: seq=4 time=11ms',
  ]);
  const [pingSeq, setPingSeq] = useState(5);
  const [checkedDomains, setCheckedDomains] = useState({});
  const [integrations, setIntegrations] = useState({
    whatsapp: '',
    email: '',
    webhook: '',
    rocketchat: '',
  });
  const [showAddIntegration, setShowAddIntegration] = useState(null);
  const [integrationValue, setIntegrationValue] = useState('');

  // Clock Update Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ping Log Simulation Effect
  useEffect(() => {
    if (activeTab !== 'ping') return;
    const interval = setInterval(() => {
      const latencies = [9, 10, 11, 12, 13, 14, 15, 8, 16];
      const selectedLatency = latencies[Math.floor(Math.random() * latencies.length)];
      setPingLog(prev => {
        const nextLog = [...prev, `Reply from 104.24.12.85: seq=${pingSeq} time=${selectedLatency}ms`];
        return nextLog.slice(-8); // Keep screen size clean
      });
      setPingSeq(prev => prev + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [activeTab, pingSeq]);

  const handleDomainCheck = (domain) => {
    setCheckedDomains(prev => ({ ...prev, [domain]: 'loading' }));
    setTimeout(() => {
      setCheckedDomains(prev => ({ ...prev, [domain]: 'success' }));
    }, 1200);
  };

  const renderMonitorsTab = () => {
    const list = [
      { name: 'acme-api-service', url: 'https://api.acme-corp.com/health', latency: '116ms', uptime: '100%', state: 'up' },
      { name: 'billing-gateway-prod', url: 'https://billing.acme-corp.com', latency: '339ms', uptime: '100%', state: 'up' },
      { name: 'auth-server-main', url: 'https://auth.acme-corp.com', latency: '285ms', uptime: '100%', state: 'up' },
      { name: 'customer-portal-app', url: 'https://portal.acme-corp.com', latency: '226ms', uptime: '100%', state: 'up' },
      { name: 'marketing-website', url: 'https://acme-corp.com', latency: '94ms', uptime: '100%', state: 'up' },
      { name: 'legacy-landing-page', url: 'https://legacy.acme-corp.com', latency: '16ms', uptime: '98%', state: 'warn', hasErr: true },
      { name: 'data-analytics-pipeline', url: 'https://analytics.acme-corp.com', latency: '562ms', uptime: '100%', state: 'up' },
    ];
    return (
      <div className="db-tab-content">
        <div className="db-section-header">
          <div>
            <h4 className="db-section-title">Monitors</h4>
            <span className="db-section-subtitle">Updated {currentTime}</span>
          </div>
          <div className="db-header-actions">
            <button className="db-btn-xs">↓ CSV</button>
            <button className="db-btn-xs db-btn-purple">Check Now</button>
            <button className="db-btn-xs db-btn-blue">+ New</button>
          </div>
        </div>
        <div className="db-search-bar">
          <input type="text" placeholder="Search by name or URL..." className="db-search-input" readOnly value="" />
          <div className="db-search-filters">
            <span className="db-filter-badge active">All 15</span>
            <span className="db-filter-badge up">Online 13</span>
            <span className="db-filter-badge down">Offline 2</span>
          </div>
        </div>
        <div className="db-monitor-list">
          {list.map(item => (
            <div key={item.name} className={`db-monitor-row ${item.state === 'warn' ? 'db-row-warn' : ''}`}>
              <div className={`db-status-dot ${item.state}`}></div>
              <div className="db-monitor-info">
                <span className="db-monitor-name">{item.name}</span>
                <span className="db-monitor-url">HTTPS · <span className="db-green-text">Up</span> · {currentTime.split(' ')[0]} · <span className="db-latency-text">{item.latency}</span></span>
              </div>
              <div className="db-uptime-bar-container">
                <div className="db-uptime-bars">
                  {Array.from({ length: 28 }).map((_, i) => {
                    const isError = item.hasErr && i === 18;
                    return <span key={i} className={`db-uptime-bar ${isError ? 'err' : 'ok'}`}></span>;
                  })}
                </div>
                <span className="db-uptime-pct">{item.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummaryPanel = () => {
    return (
      <div className="db-summary-panel">
        <div className="db-panel-section">
          <span className="db-panel-label">Current status</span>
          <div className="db-status-boxes">
            <div className="db-status-box down">
              <span className="db-status-num">2</span>
              <span className="db-status-text">Down</span>
            </div>
            <div className="db-status-box up">
              <span className="db-status-num">13</span>
              <span className="db-status-text">Up</span>
            </div>
            <div className="db-status-box unknown">
              <span className="db-status-num">0</span>
              <span className="db-status-text">Unknown</span>
            </div>
          </div>
          <span className="db-panel-footer">Monitoring 15 sites</span>
        </div>
        <div className="db-panel-section">
          <span className="db-panel-label">Last 24 hours</span>
          <div className="db-metric-row">
            <div className="db-metric-val red-text">91.1%</div>
            <div className="db-metric-lbl">Overall uptime</div>
          </div>
          <div className="db-metric-row">
            <div className="db-metric-val purple-text">814ms</div>
            <div className="db-metric-lbl">Avg response</div>
          </div>
        </div>
        <div className="db-panel-section">
          <span className="db-panel-label">Sites breakdown</span>
          <div className="db-breakdown-row">
            <div className="db-breakdown-bar-container">
              <div className="db-breakdown-bar green" style={{ width: '86%' }}></div>
            </div>
            <span className="db-breakdown-val">13 Online</span>
          </div>
          <div className="db-breakdown-row">
            <div className="db-breakdown-bar-container">
              <div className="db-breakdown-bar red" style={{ width: '14%' }}></div>
            </div>
            <span className="db-breakdown-val">2 Offline</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPerformanceTab = () => {
    return (
      <div className="db-tab-content full-width">
        <div className="db-section-header">
          <div>
            <h4 className="db-section-title">Performance</h4>
            <span className="db-section-subtitle">Response time · Uptime · Alert trends · 1 check/min</span>
          </div>
        </div>
        
        <div className="db-performance-cards">
          <div className="db-perf-card">
            <span className="db-perf-lbl">Total Sites</span>
            <span className="db-perf-val purple">15</span>
          </div>
          <div className="db-perf-card">
            <span className="db-perf-lbl">Online</span>
            <span className="db-perf-val green">13</span>
          </div>
          <div className="db-perf-card">
            <span className="db-perf-lbl">Offline</span>
            <span className="db-perf-val red">2</span>
          </div>
          <div className="db-perf-card">
            <span className="db-perf-lbl">Avg RT</span>
            <span className="db-perf-val green">101ms</span>
          </div>
          <div className="db-perf-card">
            <span className="db-perf-lbl">Alerts</span>
            <span className="db-perf-val orange">100</span>
          </div>
        </div>

        <div className="db-chart-section">
          <div className="db-chart-header">
            <span className="db-chart-title">⚡ Response Time</span>
            <select className="db-chart-select" disabled><option>acme-api-service</option></select>
          </div>
          <span className="db-chart-sub">https://api.acme-corp.com/health · last 1hr · avg 101ms</span>
          <div className="db-chart-body">
            <svg viewBox="0 0 500 120" className="db-svg-chart">
              <path d="M 0 90 Q 25 85 50 92 T 100 88 T 150 90 T 200 60 T 250 85 T 300 89 T 350 94 T 400 50 T 450 90 T 500 40" fill="none" stroke="#7c3aed" strokeWidth="2.5" />
              <path d="M 0 90 Q 25 85 50 92 T 100 88 T 150 90 T 200 60 T 250 85 T 300 89 T 350 94 T 400 50 T 450 90 T 500 40 L 500 120 L 0 120 Z" fill="url(#purple-grad)" opacity="0.15" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
              <text x="420" y="85" fill="#a78bfa" fontSize="9" fontWeight="bold">avg 101ms</text>
              <defs>
                <linearGradient id="purple-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
            <div className="db-chart-time-labels">
              <span>03:34 pm</span>
              <span>03:49 pm</span>
              <span>04:04 pm</span>
              <span>04:19 pm</span>
              <span>04:28 pm</span>
            </div>
          </div>
        </div>

        <div className="db-perf-footer-grid">
          <div className="db-perf-donut-box">
            <span className="db-chart-title">🟢 Site Status</span>
            <div className="db-donut-content">
              <svg viewBox="0 0 100 100" width="60" height="60">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#10b981" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="33.4" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="12" strokeDasharray="238.7" strokeDashoffset="205.3" transform="rotate(220 50 50)" />
              </svg>
              <div className="db-donut-labels">
                <div><span className="db-donut-dot green"></span><span>Online: 13</span></div>
                <div><span className="db-donut-dot red"></span><span>Offline: 2</span></div>
              </div>
            </div>
          </div>
          <div className="db-perf-alerts-box">
            <span className="db-chart-title">🔔 Alerts — Last 7 Days</span>
            <div className="db-alerts-bar-chart">
              <div className="db-bar-column"><div className="db-bar-fill red" style={{ height: '5px' }}></div><span>27 May</span></div>
              <div className="db-bar-column"><div className="db-bar-fill red" style={{ height: '3px' }}></div><span>28 May</span></div>
              <div className="db-bar-column"><div className="db-bar-fill red" style={{ height: '0px' }}></div><span>29 May</span></div>
              <div className="db-bar-column"><div className="db-bar-fill red" style={{ height: '2px' }}></div><span>30 May</span></div>
              <div className="db-bar-column"><div className="db-bar-fill red" style={{ height: '40px' }}><span className="db-bar-value">92</span></div><span>01 Jun</span></div>
              <div className="db-bar-column"><div className="db-bar-fill-split"><div className="db-bar-fill red" style={{ height: '8px' }}></div><div className="db-bar-fill green" style={{ height: '6px' }}></div></div><span>02 Jun</span></div>
            </div>
            <div className="db-bar-legend">
              <div><span className="db-donut-dot red"></span><span>Down</span></div>
              <div><span className="db-donut-dot green"></span><span>Recovered</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPingTab = () => {
    return (
      <div className="db-tab-content full-width">
        <div className="db-section-header">
          <div>
            <h4 className="db-section-title">Primary Gateway IP</h4>
            <span className="db-section-subtitle">104.24.12.85:443</span>
          </div>
          <span className="db-status-badge-green">● UP</span>
        </div>

        <div className="db-ping-stats">
          <div className="db-ping-stat-card">
            <span className="db-ping-lbl">STATUS</span>
            <span className="db-ping-val green-text">Online</span>
          </div>
          <div className="db-ping-stat-card">
            <span className="db-ping-lbl">LATENCY</span>
            <span className="db-ping-val green-text">11ms</span>
          </div>
          <div className="db-ping-stat-card">
            <span className="db-ping-lbl">UPTIME</span>
            <span className="db-ping-val green-text">100.0%</span>
          </div>
          <div className="db-ping-stat-card">
            <span className="db-ping-lbl">AVG (48H)</span>
            <span className="db-ping-val purple-text">11ms</span>
          </div>
        </div>

        <div className="db-terminal">
          <div className="db-terminal-header">
            <div className="db-terminal-dots">
              <span className="db-term-dot red"></span>
              <span className="db-term-dot yellow"></span>
              <span className="db-term-dot green"></span>
            </div>
            <span className="db-terminal-title">ping 104.24.12.85:443</span>
            <span className="db-terminal-badge">LIVE RUNNING</span>
          </div>
          <div className="db-terminal-body">
            {pingLog.map((line, index) => (
              <div key={index} className="db-term-line">
                {line.startsWith('Reply') ? (
                  <>
                    <span className="db-term-reply">Reply</span> from 104.24.12.85: seq=
                    <span className="db-term-seq">{line.split('seq=')[1].split(' ')[0]}</span> time=
                    <span className="db-term-time">{line.split('time=')[1]}</span>
                  </>
                ) : (
                  line
                )}
              </div>
            ))}
            <div className="db-term-line cursor-line">
              <span className="db-term-cursor">_</span>
            </div>
          </div>
        </div>

        <div className="db-ping-alert-box">
          <span className="db-ping-bell">🔔</span>
          <p className="db-ping-alert-p">
            <strong>Alerts active</strong> — When this target goes DOWN or recovers UP, selected recipients will be notified via Email & WhatsApp. Webhooks also fire automatically.
          </p>
        </div>
      </div>
    );
  };

  const renderSSLTab = () => {
    const domains = [
      { name: 'acme-api-service', url: 'https://api.acme-corp.com/health', ssl: 79, dom: 336, sslDate: '21/8/2026', domDate: '5/5/2027' },
      { name: 'billing-gateway-prod', url: 'https://billing.acme-corp.com', ssl: 79, dom: 336, sslDate: '21/8/2026', domDate: '5/5/2027' },
      { name: 'auth-server-main', url: 'https://auth.acme-corp.com', ssl: 79, dom: 336, sslDate: '21/8/2026', domDate: '5/5/2027' },
      { name: 'customer-portal-app', url: 'https://portal.acme-corp.com', ssl: 45, dom: 320, sslDate: '17/7/2026', domDate: '18/4/2027' },
      { name: 'marketing-website', url: 'https://acme-corp.com', ssl: 45, dom: 320, sslDate: '17/7/2026', domDate: '18/4/2027' },
      { name: 'legacy-landing-page', url: 'https://legacy.acme-corp.com', ssl: 81, dom: 368, sslDate: '21/8/2026', domDate: '6/6/2027' },
    ];
    return (
      <div className="db-tab-content full-width">
        <div className="db-section-header">
          <div>
            <h4 className="db-section-title">Domain & SSL</h4>
            <span className="db-section-subtitle">Monitor SSL certificates and domain expiry</span>
          </div>
          <button className="db-btn-xs db-btn-purple">Check All</button>
        </div>
        
        <div className="db-ssl-grid">
          {domains.map(d => {
            const checkState = checkedDomains[d.name];
            return (
              <div key={d.name} className="db-ssl-card">
                <div className="db-ssl-card-header">
                  <div>
                    <div className="db-ssl-card-name">{d.name}</div>
                    <div className="db-ssl-card-url">{d.url}</div>
                  </div>
                  <button className="db-btn-check" onClick={() => handleDomainCheck(d.name)} disabled={checkState === 'loading'}>
                    {checkState === 'loading' ? '⏳ Checking' : checkState === 'success' ? '✓ Checked' : '🔍 Check'}
                  </button>
                </div>
                <div className="db-ssl-card-body">
                  <div className="db-ssl-card-metric">
                    <span className="db-ssl-metric-title">🔒 SSL Certificate</span>
                    <span className="db-ssl-metric-val green">{d.ssl} days left</span>
                    <span className="db-ssl-metric-date">{d.sslDate}</span>
                  </div>
                  <div className="db-ssl-card-metric">
                    <span className="db-ssl-metric-title">🌐 Domain Expiry</span>
                    <span className="db-ssl-metric-val green">{d.dom} days left</span>
                    <span className="db-ssl-metric-date">{d.domDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderIntegrationsTab = () => {
    const platformAlerts = [
      { id: 'whatsapp', name: 'WhatsApp', desc: 'Receive WhatsApp alerts when your site goes down or recovers.', icon: '💬', color: '#25d366', status: integrations.whatsapp },
      { id: 'email', name: 'Email', desc: 'Receive email alerts when your site goes down or recovers.', icon: '✉', color: '#ea4335', status: integrations.email },
    ];
    const customWebhooks = [
      { id: 'webhook', name: 'Webhook', desc: 'POST to any URL when a monitor status changes.', icon: '🔗', color: '#7c3aed', status: integrations.webhook },
      { id: 'rocketchat', name: 'Rocket.Chat', desc: 'Send alerts to your Rocket.Chat workspace via incoming webhook.', icon: '🚀', color: '#f5455c', status: integrations.rocketchat },
    ];
    const comingSoon = [
      { name: 'Slack', desc: 'Send alerts to your Slack channel via incoming webhook.', icon: '💬' },
      { name: 'Telegram', desc: 'Get instant alerts via Telegram bot messages.', icon: '✈' },
      { name: 'Discord', desc: 'Post status updates to your Discord server.', icon: '👾' },
    ];
    
    const startAdd = (id) => {
      setShowAddIntegration(id);
      setIntegrationValue(integrations[id] || '');
    };
    
    const saveAdd = (id) => {
      setIntegrations(prev => ({ ...prev, [id]: integrationValue }));
      setShowAddIntegration(null);
    };

    return (
      <div className="db-tab-content full-width">
        <h4 className="db-section-title">Integrations</h4>
        <span className="db-section-subtitle">Connect UptimeForge with your tools to get alerts everywhere</span>

        <span className="db-integration-group-title">PLATFORM ALERTS</span>
        <div className="db-integrations-list">
          {platformAlerts.map(item => (
            <div key={item.id} className="db-integration-row">
              <div className="db-integration-left">
                <span className="db-integration-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>{item.icon}</span>
                <div>
                  <div className="db-integration-name">{item.name}</div>
                  <div className="db-integration-desc">{item.desc}</div>
                  {item.status && <div className="db-integration-status">Configured: <strong style={{color:'#10b981'}}>{item.status}</strong></div>}
                </div>
              </div>
              
              {showAddIntegration === item.id ? (
                <div className="db-integration-input-box">
                  <input type="text" className="db-integration-input" placeholder={item.id === 'whatsapp' ? 'Phone number' : 'Email address'} value={integrationValue} onChange={(e) => setIntegrationValue(e.target.value)} />
                  <button className="db-btn-xs db-btn-purple" onClick={() => saveAdd(item.id)}>Save</button>
                  <button className="db-btn-xs" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setShowAddIntegration(null)}>Cancel</button>
                </div>
              ) : (
                <button className={`db-btn-add ${item.status ? 'added' : ''}`} onClick={() => startAdd(item.id)}>
                  {item.status ? '✓ Configured' : '+ Add'}
                </button>
              )}
            </div>
          ))}
        </div>

        <span className="db-integration-group-title" style={{ marginTop: '14px' }}>CUSTOM WEBHOOKS</span>
        <div className="db-integrations-list">
          {customWebhooks.map(item => (
            <div key={item.id} className="db-integration-row">
              <div className="db-integration-left">
                <span className="db-integration-icon" style={{ backgroundColor: `${item.color}15`, color: item.color }}>{item.icon}</span>
                <div>
                  <div className="db-integration-name">{item.name}</div>
                  <div className="db-integration-desc">{item.desc}</div>
                  {item.status && <div className="db-integration-status">Configured: <strong style={{color:'#10b981'}}>{item.status}</strong></div>}
                </div>
              </div>
              
              {showAddIntegration === item.id ? (
                <div className="db-integration-input-box">
                  <input type="text" className="db-integration-input" placeholder="Webhook URL" value={integrationValue} onChange={(e) => setIntegrationValue(e.target.value)} />
                  <button className="db-btn-xs db-btn-purple" onClick={() => saveAdd(item.id)}>Save</button>
                  <button className="db-btn-xs" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} onClick={() => setShowAddIntegration(null)}>Cancel</button>
                </div>
              ) : (
                <button className={`db-btn-add ${item.status ? 'added' : ''}`} onClick={() => startAdd(item.id)}>
                  {item.status ? '✓ Configured' : '+ Add'}
                </button>
              )}
            </div>
          ))}
        </div>

        <span className="db-integration-group-title" style={{ marginTop: '14px' }}>COMING SOON</span>
        <div className="db-integrations-list opacity-60">
          {comingSoon.map(item => (
            <div key={item.name} className="db-integration-row">
              <div className="db-integration-left">
                <span className="db-integration-icon grey">{item.icon}</span>
                <div>
                  <div className="db-integration-name">{item.name}</div>
                  <div className="db-integration-desc">{item.desc}</div>
                </div>
              </div>
              <span className="db-badge-soon">Coming Soon</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDashboardMockup = () => {
    return (
      <div className="lp-dashboard-preview-new">
        <div className="lp-preview-header">
          <div className="lp-preview-dots">
            <div className="lp-preview-dot red" />
            <div className="lp-preview-dot yellow" />
            <div className="lp-preview-dot green" />
          </div>
          <span className="lp-preview-title">UptimeForge — Live Client Demo</span>
          <div className="lp-preview-pulse-badge">
            <span className="lp-pulse-dot-green"></span>
            LIVE RUNNING DEMO
          </div>
        </div>
        <div className="db-app-frame">
          <div className="db-sidebar">
            <div className="db-sidebar-brand">
              <UWLogo size={20} />
              <span className="db-brand-name">UptimeForge</span>
            </div>
            <div className="db-sidebar-nav">
              <button className={`db-nav-item ${activeTab === 'monitoring' ? 'active' : ''}`} onClick={() => setActiveTab('monitoring')}>
                📊 Monitoring
              </button>
              <button className={`db-nav-item ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>
                📈 Performance
              </button>
              <button className={`db-nav-item ${activeTab === 'ping' ? 'active' : ''}`} onClick={() => setActiveTab('ping')}>
                🖥️ Ping Monitor
              </button>
              <button className={`db-nav-item ${activeTab === 'ssl' ? 'active' : ''}`} onClick={() => setActiveTab('ssl')}>
                🔒 Domain & SSL
              </button>
              <button className={`db-nav-item ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => setActiveTab('integrations')}>
                🔌 Integrations
              </button>
            </div>
            <div className="db-sidebar-footer">
              <span className="db-footer-badge">🥇 Gold Plan</span>
              <div className="db-sidebar-user">
                <div className="db-user-avatar">DU</div>
                <div className="db-user-details">
                  <span className="db-user-name">Demo User</span>
                  <span className="db-user-email">demo@uptimeforge.com</span>
                </div>
              </div>
            </div>
          </div>
          <div className="db-content-area">
            <div className="db-main-content">
              {activeTab === 'monitoring' && renderMonitorsTab()}
              {activeTab === 'performance' && renderPerformanceTab()}
              {activeTab === 'ping' && renderPingTab()}
              {activeTab === 'ssl' && renderSSLTab()}
              {activeTab === 'integrations' && renderIntegrationsTab()}
            </div>
            {activeTab === 'monitoring' && renderSummaryPanel()}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    getPlans().then(r => setPlanData(r.data)).catch(() => {});
  }, []);

  // Features come from admin settings — parsed from "type:label" format
  const PLAN_FEATURES = {
    free_trial: parseFeatures(planData?.freeTrialFeatures),
    bronze:     parseFeatures(planData?.plans?.bronze?.features),
    silver:     parseFeatures(planData?.plans?.silver?.features),
    gold:       parseFeatures(planData?.plans?.gold?.features),
  };

  const discPct = planData?.annualDiscount ?? 20;
  const ap = planData?.annualPlans;
  const annualPrice = (key, monthly) => {
    if (billing !== 'annually') return monthly;
    const custom = ap?.[key]?.price;
    if (custom && custom > 0) return custom;
    return Math.round(monthly * (1 - discPct / 100));
  };
  const plans = [
    { key: 'free_trial', ...PLAN_META.free_trial, price: `₹${planData?.verificationFee ?? 2}`, origPrice: null, note: '5-day trial · one-time verification' },
    { key: 'bronze', ...PLAN_META.bronze, price: `₹${annualPrice('bronze', planData?.plans?.bronze?.price ?? 499)}`, origPrice: billing==='annually'?`₹${planData?.plans?.bronze?.price??499}`:null, note: `${planData?.plans?.bronze?.sites ?? 5} sites` },
    { key: 'silver', ...PLAN_META.silver, price: `₹${annualPrice('silver', planData?.plans?.silver?.price ?? 999)}`, origPrice: billing==='annually'?`₹${planData?.plans?.silver?.price??999}`:null, note: `${planData?.plans?.silver?.sites ?? 15} sites` },
    { key: 'gold',   ...PLAN_META.gold,   price: `₹${annualPrice('gold',   planData?.plans?.gold?.price ?? 1499)}`,  origPrice: billing==='annually'?`₹${planData?.plans?.gold?.price??1499}`:null,  note: `${planData?.plans?.gold?.sites ?? 30} sites` },
  ];

  const handlePlan = (key) => {
    if (key !== 'free_trial') localStorage.setItem('sm_intended_plan', key);
    else localStorage.removeItem('sm_intended_plan');
    navigate('/register');
  };

  return (
    <div className="lp">

      {/* ── NAVBAR ── */}
      <nav className="lp-nav">
        <div className="lp-nav-wrap">
          <a href="/" className="lp-brand">
            <UWLogo size={34} />
            <span className="lp-brand-text">UptimeForge</span>
            <div className="lp-status-indicator-mini">
              <span className="lp-status-dot-mini" />
              <span>All Systems Live</span>
            </div>
          </a>
          <div className="lp-nav-center">
            <a href="#">Home</a>
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#reviews">Reviews</a>
          </div>
          <div className="lp-nav-right">
            <Link to="/login" className="lp-nav-login">Login</Link>
            <Link to="/register" className="lp-nav-cta">Get Started Free</Link>
          </div>
          <button className={`lp-burger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)}>
            <span /><span /><span />
          </button>
        </div>
        {menuOpen && (
          <div className="lp-mobile-menu">
            <a href="#" onClick={() => setMenuOpen(false)}>Home</a>
            <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#reviews" onClick={() => setMenuOpen(false)}>Reviews</a>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" className="lp-nav-cta" onClick={() => setMenuOpen(false)} style={{ textAlign: 'center' }}>Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb lp-orb-1" />
          <div className="lp-hero-orb lp-orb-2" />
          <div className="lp-hero-orb lp-orb-3" />
        </div>
        <div className="lp-hero-wrap-centered">
          <div className="lp-hero-tag">
            <span className="lp-tag-dot" />
            Live · 24/7 Uptime Monitoring
          </div>
          <h1 className="lp-hero-h1">
            Never miss a<br />
            <span className="lp-hero-gradient">website outage again.</span>
          </h1>
          <p className="lp-hero-p">
            UptimeForge is a 24/7 website monitoring platform built for businesses. It watches your sites every 30 seconds to 5 minutes (based on your plan), tracks SSL &amp; domain expiry, measures response time, and instantly alerts you on WhatsApp &amp; Email — so downtime never catches you off guard.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => { localStorage.removeItem('sm_intended_plan'); navigate('/register'); }}>
              Start Free — Just ₹2
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <a href="#pricing" className="lp-btn-outline">View Plans</a>
          </div>
          <div className="lp-hero-google-badge">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span className="lp-hero-google-stars">★★★★★</span>
            <span className="lp-hero-google-text"><strong>4.9/5</strong> Rating on Google Reviews</span>
          </div>
          <div className="lp-hero-trust">
            {['5-day free trial', 'Alerts in under 1 min', 'WhatsApp + Email', 'No hidden charges'].map(t => (
              <div key={t} className="lp-trust-item"><span className="lp-trust-check">✓</span>{t}</div>
            ))}
          </div>
        </div>

        {/* Dashboard preview below the fold - full-width centered, larger */}
        <div className="lp-hero-dashboard-container">
          {renderDashboardMockup()}
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="lp-stats-bar">
        {[['30s–5m', 'Check Interval'], ['24/7', 'Always On'], ['< 1 min', 'Alert Speed'], ['Email', '+ WhatsApp Alerts'], ['₹2', 'Trial Cost'], ['SSL & Domain', 'Expiry Tracking']].map(([v, l]) => (
          <div key={l} className="lp-stat-item">
            <div className="lp-stat-val">{v}</div>
            <div className="lp-stat-label">{l}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ── */}
      <section className="lp-features" id="features">
        <div className="lp-section-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-section-eyebrow">Features</div>
          <h2 className="lp-section-h2" style={{ margin: '0 auto 12px' }}>Everything you need, nothing you don't</h2>
          <p className="lp-section-sub" style={{ margin: '0 auto 48px', color: 'rgba(255, 255, 255, 0.65)' }}>
            Get deep visibility into your application availability and speed with our enterprise-grade monitoring suite.
          </p>
          <div className="lp-marquee-wrapper">
            <div className="lp-marquee-content">
              {(() => {
                const list = [
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    ),
                    color: '#8b5cf6',
                    title: 'Uptime Monitoring',
                    desc: 'We check your site every 30 seconds to 5 minutes based on your plan. If it goes down, you get alerted instantly via Email.',
                    preview: (
                      <div className="lp-feat-preview uptime-preview">
                        <div className="uptime-header">
                          <span className="status-label">acme-corp.com</span>
                          <span className="status-badge up">
                            <span className="status-dot pulsing" /> 99.99% Up
                          </span>
                        </div>
                        <div className="uptime-bars">
                          {[...Array(16)].map((_, i) => (
                            <span key={i} className="uptime-bar" style={{ height: i === 6 || i === 7 ? '12px' : i === 12 ? '15px' : '20px', background: i === 6 || i === 7 ? '#eab308' : '#22c55e', opacity: i === 6 || i === 7 ? 0.6 : 0.85 }} />
                          ))}
                        </div>
                        <div className="uptime-footer">
                          <span>Avg Ping: 14ms</span>
                          <span>Checked 30s ago</span>
                        </div>
                      </div>
                    )
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ),
                    color: '#06b6d4',
                    title: 'SSL Expiry Alerts',
                    desc: 'Get warned 30, 15 and 7 days before your SSL certificate expires. Never wake up to a broken padlock again.',
                    preview: (
                      <div className="lp-feat-preview ssl-preview">
                        <div className="ssl-card-body">
                          <div className="ssl-lock-sec">
                            <div className="ssl-lock-glow">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ssl-lock-svg">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div className="ssl-domain">Wildcard SSL</div>
                              <div className="ssl-status">Expires in 12 days</div>
                            </div>
                          </div>
                          <div className="ssl-badge warning-alert">Action Required</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
                        <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
                      </svg>
                    ),
                    color: '#10b981',
                    title: 'Domain Expiry Tracking',
                    desc: 'We watch your domain renewal date and alert you in advance so you never lose a domain you own.',
                    preview: (
                      <div className="lp-feat-preview domain-preview">
                        <div className="domain-row">
                          <span className="domain-name">uptimeforge.com</span>
                          <span className="domain-days alert-danger">24d left</span>
                        </div>
                        <div className="domain-progress-bar">
                          <div className="domain-progress-fill" style={{ width: '76%' }} />
                        </div>
                        <div className="domain-alert-banner">
                          <span className="alert-dot" /> Auto-alert scheduled (Email)
                        </div>
                      </div>
                    )
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <polyline points="4 17 10 11 12 13 18 7" />
                        <polyline points="14 7 18 7 18 11" />
                        <line x1="2" y1="22" x2="22" y2="22" />
                      </svg>
                    ),
                    color: '#3b82f6',
                    title: 'Ping Monitoring',
                    desc: 'Check server latency, custom TCP/UDP ports, and ICMP ping status live. Ensure server availability from multiple locations.',
                    preview: (
                      <div className="lp-feat-preview ping-preview">
                        <div className="ping-console">
                          <div className="console-line"><span className="c-prompt">$</span> ping -c 2 10.0.0.1</div>
                          <div className="console-line success">64 bytes: seq=1 ttl=56 time=11.4 ms</div>
                          <div className="console-line success">64 bytes: seq=2 ttl=56 time=12.2 ms</div>
                          <div className="console-line footer-line">Latency stable · 100% reachability</div>
                        </div>
                      </div>
                    )
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    ),
                    color: '#ec4899',
                    title: 'Incident Tracking',
                    desc: 'Keep track of past outages, response milestones, and root cause logs. Share live incident summaries with your clients.',
                    preview: (
                      <div className="lp-feat-preview incident-preview">
                        <div className="incident-box">
                          <div className="incident-header">
                            <span className="incident-id">INC-402</span>
                            <span className="incident-status resolved">Resolved</span>
                          </div>
                          <div className="incident-title">API Response Spike</div>
                          <div className="incident-timeline">
                            <span className="timeline-dot resolved-dot" />
                            <span className="timeline-text">Identified in 35s · Resolved in 3m 40s</span>
                          </div>
                        </div>
                      </div>
                    )
                  },
                  {
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-feat4-svg">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    ),
                    color: '#f59e0b',
                    title: 'Performance Charts',
                    desc: 'See response time graphs, uptime history and alert logs. Spot slow trends before they become outages.',
                    preview: (
                      <div className="lp-feat-preview perf-preview">
                        <div className="perf-stats">
                          <span className="perf-num">248ms</span>
                          <span className="perf-label">Avg response speed</span>
                        </div>
                        <div className="perf-sparkline">
                          <svg viewBox="0 0 120 35" className="sparkline-svg">
                            <defs>
                              <linearGradient id="perf-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4"/>
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/>
                              </linearGradient>
                            </defs>
                            <path d="M0,30 Q15,10 30,25 T60,8 T90,20 T120,10" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                            <path d="M0,30 Q15,10 30,25 T60,8 T90,20 T120,10 L120,35 L0,35 Z" fill="url(#perf-grad)" />
                            <circle cx="60" cy="8" r="3.5" fill="#f59e0b" className="pulse-dot" />
                          </svg>
                        </div>
                      </div>
                    )
                  },
                ];
                return [...list, ...list].map((f, i) => (
                  <div key={`${f.title}-${i}`} className="lp-feat4-card" style={{ '--feat-color': f.color, '--feat-glow': `${f.color}18` }}>
                    <div className="lp-feat4-icon">{f.icon}</div>
                    <h3 className="lp-feat4-title">{f.title}</h3>
                    <p className="lp-feat4-desc">{f.desc}</p>
                    {f.preview}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-how" id="how">
        <div className="lp-section-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-section-eyebrow">How It Works</div>
          <h2 className="lp-section-h2" style={{ margin: '0 auto 12px' }}>Up and running in 3 steps</h2>
          <p className="lp-section-sub" style={{ margin: '0 auto 48px', color: 'rgba(255, 255, 255, 0.65)' }}>
            Start monitoring in less than a minute. No complex installation or credit card required.
          </p>
          <div className="lp-how3-grid">
            {[
              {
                step: '01',
                title: 'Create Account',
                desc: 'Sign up with your name, email and mobile. Verify via OTP — takes 30 seconds.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-how3-svg">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                ),
                preview: (
                  <div className="lp-step-preview step1-preview">
                    <div className="step-otp-container">
                      <div className="otp-title">Enter OTP Code</div>
                      <div className="otp-fields">
                        <span className="otp-digit filled">5</span>
                        <span className="otp-digit filled">8</span>
                        <span className="otp-digit active">|</span>
                        <span className="otp-digit"></span>
                      </div>
                      <div className="otp-success">✓ Verified instantly</div>
                    </div>
                  </div>
                )
              },
              {
                step: '02',
                title: 'Add Your Sites',
                desc: 'Paste your website URLs. We start monitoring immediately — every 30s to 5 min based on your plan.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-how3-svg">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                ),
                preview: (
                  <div className="lp-step-preview step2-preview">
                    <div className="step-add-url">
                      <div className="mock-input-row">
                        <span className="mock-https">https://</span>
                        <span className="mock-url-text">mywebsite.com</span>
                      </div>
                      <button className="mock-add-btn">Add Site</button>
                    </div>
                    <div className="mock-ping-status">
                      <span className="ping-status-dot pulsing-purple" />
                      Initializing check...
                    </div>
                  </div>
                )
              },
              {
                step: '03',
                title: 'Get Instant Alerts',
                desc: 'If anything goes wrong — site down, SSL expiring, domain renewal — you get a WhatsApp + email alert right away.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-how3-svg">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                ),
                preview: (
                  <div className="lp-step-preview step3-preview">
                    <div className="whatsapp-bubble">
                      <div className="wa-header">
                        <span className="wa-brand">WhatsApp Notification</span>
                        <span className="wa-time">Just now</span>
                      </div>
                      <div className="wa-body">
                        🚨 <strong>OUTAGE:</strong> mywebsite.com is DOWN (502 Bad Gateway) at 18:22.
                      </div>
                    </div>
                  </div>
                )
              },
            ].map((s, i) => (
              <div key={s.step} className="lp-how3-card">
                <div className="lp-how3-badge-wrap">
                  <div className="lp-how3-num">{s.step}</div>
                  <div className="lp-how3-icon">{s.icon}</div>
                </div>
                <h3 className="lp-how3-title">{s.title}</h3>
                <p className="lp-how3-desc">{s.desc}</p>
                {s.preview}
                {i < 2 && (
                  <div className="lp-how3-arrow-svg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ── INTEGRATIONS ── */}
      <section className="lp-integrations" id="integrations">
        <div className="lp-section-wrap" style={{ textAlign: 'center' }}>
          <div className="lp-section-eyebrow">Integrations</div>
          <h2 className="lp-section-h2" style={{ margin: '0 auto 12px' }}>Connect UptimeForge with your tools</h2>
          <p className="lp-section-sub" style={{ margin: '0 auto 48px', color: 'rgba(255, 255, 255, 0.65)' }}>
            Get notifications instantly where your team works. Alert everyone across your favorite platforms.
          </p>
          
          <div className="lp-integ-grid">
            {[
              {
                category: 'Platform Alerts',
                items: [
                  {
                    name: 'WhatsApp',
                    desc: 'Receive WhatsApp alerts when your site goes down or recovers.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="lp-integ-logo" style={{ color: '#25D366' }}>
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.729-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.637-1.03-5.114-2.905-6.989-1.874-1.873-4.35-2.903-6.986-2.903-5.438 0-9.863 4.42-9.866 9.865-.002 1.95.518 3.854 1.506 5.551l-.988 3.605 3.708-.973zm11.394-4.887c-.314-.157-1.858-.917-2.142-1.02-.284-.103-.49-.155-.696.156-.206.31-.798 1.02-.978 1.225-.18.207-.36.23-.674.074-1.476-.738-2.546-1.306-3.41-2.793-.23-.396.23-.367.658-1.22.073-.153.036-.288-.018-.395-.055-.107-.49-1.18-.67-1.62-.177-.425-.357-.367-.49-.374-.127-.007-.272-.008-.418-.008-.145 0-.38.054-.58.273-.2.22-.76.742-.76 1.81 0 1.067.776 2.094.884 2.242.11.147 1.527 2.33 3.697 3.268.516.223.918.357 1.233.456.518.165.99.14 1.36.085.414-.06 1.858-.76 2.117-1.498.26-.737.26-1.37.18-1.5-.078-.124-.284-.207-.598-.364z"/>
                      </svg>
                    ),
                    badge: '+ Add',
                    actionType: 'add'
                  },
                  {
                    name: 'Email',
                    desc: 'Receive email alerts when your site goes down or recovers.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-integ-logo" style={{ color: '#a78bfa' }}>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    ),
                    badge: '+ Add',
                    actionType: 'add'
                  }
                ]
              },
              {
                category: 'Custom Webhooks',
                items: [
                  {
                    name: 'Webhook',
                    desc: 'POST to any URL when a monitor status changes.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lp-integ-logo" style={{ color: '#f59e0b' }}>
                        <polyline points="16 18 22 12 16 6" />
                        <polyline points="8 6 2 12 8 18" />
                      </svg>
                    ),
                    badge: '+ Add',
                    actionType: 'add'
                  },
                  {
                    name: 'Rocket.Chat',
                    desc: 'Send alerts to your Rocket.Chat workspace via incoming webhook.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="lp-integ-logo" style={{ color: '#F5455C' }}>
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 2.224.723 4.28 1.943 5.946L2.057 24l6.163-1.687A11.95 11.95 0 0 0 12 24c6.523 0 12-5.477 12-12S18.523 2 12 2zm3.5 12h-7a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5z"/>
                      </svg>
                    ),
                    badge: '+ Add',
                    actionType: 'add'
                  }
                ]
              },
              {
                category: 'Coming Soon',
                items: [
                  {
                    name: 'Slack',
                    desc: 'Send alerts to your Slack channel via incoming webhook.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="lp-integ-logo" style={{ color: '#4A154B' }}>
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52h-2.522a2.528 2.528 0 0 1-2.52-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.738a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.782 10.135a2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522a2.528 2.528 0 0 1 2.52 2.52zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z"/>
                      </svg>
                    ),
                    badge: 'Coming Soon',
                    actionType: 'coming'
                  },
                  {
                    name: 'Telegram',
                    desc: 'Get instant alerts via Telegram bot messages.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="lp-integ-logo" style={{ color: '#0088cc' }}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.24-5.54 3.65-.52.36-.97.53-1.34.52-.41-.01-1.2-.23-1.79-.42-.72-.24-1.29-.36-1.24-.76.03-.2.31-.4.85-.62 3.32-1.44 5.53-2.4 6.63-2.87 3.16-1.35 3.82-1.59 4.25-1.59.09 0 .31.02.45.14.12.1.15.24.17.34-.02.1-.01.2-.02.26z"/>
                      </svg>
                    ),
                    badge: 'Coming Soon',
                    actionType: 'coming'
                  },
                  {
                    name: 'Discord',
                    desc: 'Post status updates to your Discord server.',
                    icon: (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="lp-integ-logo" style={{ color: '#5865F2' }}>
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
                      </svg>
                    ),
                    badge: 'Coming Soon',
                    actionType: 'coming'
                  }
                ]
              }
            ].map((cat, catIdx) => (
              <div key={cat.category} className="lp-integ-group">
                <h3 className="lp-integ-cat-title">{cat.category}</h3>
                <div className="lp-integ-list">
                  {cat.items.map((item, itemIdx) => {
                    const globalIdx = catIdx * 3 + itemIdx;
                    return (
                      <div
                        key={item.name}
                        className={`lp-integ-card ${item.actionType === 'coming' ? 'coming-soon' : ''}`}
                        style={{ '--integ-delay': `${globalIdx * 0.35}s` }}
                      >
                        <div className="lp-integ-card-header">
                          <div className="lp-integ-icon-wrap">
                            {item.icon}
                          </div>
                          <div className="lp-integ-meta">
                            <h4 className="lp-integ-name">{item.name}</h4>
                            <span className={`lp-integ-status-badge ${item.actionType}`}>
                              {item.badge}
                            </span>
                          </div>
                        </div>
                        <p className="lp-integ-desc">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="lp-pricing" id="pricing">
        <div className="lp-section-wrap">
          <div className="lp-section-eyebrow">Pricing Plans</div>
          <h2 className="lp-section-h2">Choose the perfect plan for your journey</h2>
          <p className="lp-section-sub">Start free for 5 days · Pay just ₹2 to verify · Instant activation via UPI, Card or Netbanking · Cancel anytime</p>

          {/* Interval comparison */}
          <div className="lp-pricing-intervals">
            {[
              { plan: 'Free Trial', interval: '5 min', color: '#818cf8' },
              { plan: 'Bronze',     interval: '2 min', color: '#f59e0b' },
              { plan: 'Silver',     interval: '1 min', color: '#c084fc' },
              { plan: 'Gold',       interval: '30 sec', color: '#fbbf24' },
            ].map(({ plan, interval, color }) => (
              <div key={plan} className="lp-pricing-interval-card" style={{ '--accent-color': color }}>
                <div className="lp-interval-tag">{plan}</div>
                <div className="lp-interval-val">⏱ {interval}</div>
                <div className="lp-interval-lbl">check interval</div>
              </div>
            ))}
          </div>

          {/* Monthly / Annually Toggle */}
          <div className="lp-billing-toggle-wrap">
            <button
              onClick={() => setBilling('monthly')}
              className={`lp-billing-btn ${billing === 'monthly' ? 'active' : ''}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annually')}
              className={`lp-billing-btn ${billing === 'annually' ? 'active' : ''}`}
            >
              Annually
              <span className="lp-billing-save-badge">Save {discPct}%</span>
            </button>
          </div>

          <div className="lp-plans">
            {plans.map(p => {
              const planColor = p.key === 'free_trial' ? '#818cf8' : p.key === 'bronze' ? '#f59e0b' : p.key === 'silver' ? '#c084fc' : '#fbbf24';
              return (
                <div key={p.key} className={`lp-plan lp-plan-${p.key} ${p.popular ? 'lp-plan-popular' : ''}`} style={{ '--plan-color': planColor, '--plan-gradient': p.gradient }}>
                  <div className="lp-plan-glow" />
                  {p.popular && <div className="lp-plan-pop-badge">⭐ Most Popular</div>}
                  <div className="lp-plan-top">
                    <h3 className="lp-plan-name">
                      <span className="lp-plan-emoji-inline">{p.emoji}</span> {p.name}
                    </h3>
                    <div className="lp-plan-price-row">
                      <span className="lp-plan-price">{p.price}</span>
                      <span className="lp-plan-period">{p.period}</span>
                      {p.origPrice && <span className="lp-plan-orig-price-inline">{p.origPrice}</span>}
                    </div>
                    <div className="lp-plan-sites">{p.note}</div>
                  </div>
                  <div className="lp-plan-body">
                    <ul className="lp-plan-list">
                      {(PLAN_FEATURES[p.key] || []).map(({ label, type }) => (
                        <li key={label} className={`lp-feature-item type-${type}`} style={{ opacity: type === 'no' ? 0.45 : 1 }}>
                          <span className="lp-feature-icon-wrap">
                            {type === 'ok'      && <svg className="lp-feature-icon" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                            {type === 'no'      && <svg className="lp-feature-icon icon-no" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                            {type === 'limited' && <span className="lp-feature-emoji">😐</span>}
                            {type === 'soon'    && <span className="lp-feature-emoji">🔜</span>}
                          </span>
                          <span className="lp-feature-label">{label}</span>
                          {type === 'soon' && <span className="lp-feature-soon-tag">Soon</span>}
                        </li>
                      ))}
                    </ul>
                    <button className={`lp-plan-btn lp-plan-btn-${p.key}`} onClick={() => handlePlan(p.key)}>
                      {p.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3M / 6M Custom Plans */}
          <div className="lp-custom-plans-container">
            {[
              { key:'threeMonth', emoji:'🗓️', gradient:'linear-gradient(135deg,#8b5cf6,#6d28d9)', label: planData?.customPlans?.threeMonth?.label || '3 Month Plan', duration:'3 months', color:'#8b5cf6' },
              { key:'sixMonth',   emoji:'📅', gradient:'linear-gradient(135deg,#10b981,#059669)', label: planData?.customPlans?.sixMonth?.label   || '6 Month Plan', duration:'6 months', color:'#10b981' },
            ].filter(c => planData?.customPlans?.[c.key]?.enabled !== false).map(c => {
              const cp = planData?.customPlans?.[c.key];
              const features = (cp?.features || []).map(f => { const i=f.indexOf(':'); return i===-1?{type:'ok',label:f}:{type:f.slice(0,i),label:f.slice(i+1)}; });
              return (
                <div key={c.key} className={`lp-custom-plan-card lp-custom-plan-${c.key}`} style={{ '--custom-accent': c.color }}>
                  <div className="lp-custom-plan-header">
                    <div className="lp-custom-plan-left">
                      <div className="lp-custom-plan-emoji-wrap">
                        <span className="lp-custom-plan-emoji">{c.emoji}</span>
                      </div>
                      <div className="lp-custom-plan-meta">
                        <h4 className="lp-custom-plan-title">{c.label}</h4>
                        <span className="lp-custom-plan-subtitle">Custom {c.duration} plan · Enterprise grade monitoring</span>
                      </div>
                    </div>
                    <div className="lp-custom-plan-right">
                      {cp?.price > 0 && (
                        <div className="lp-custom-plan-price-block">
                          <div className="lp-custom-plan-price">₹{cp.price}<span className="lp-custom-plan-period">/mo</span></div>
                          <div className="lp-custom-plan-billing-desc">billed every {c.duration}</div>
                        </div>
                      )}
                      <a href={`mailto:support@uptimeforge.com?subject=Custom Plan Enquiry - ${c.label}&body=Hi, I am interested in the ${c.label}. Please share more details.`}
                        className="lp-custom-plan-cta">
                        Contact Support →
                      </a>
                    </div>
                  </div>
                  {features.length > 0 && (
                    <div className="lp-custom-plan-features">
                      {features.map(({type,label}) => (
                        <div key={label} className={`lp-custom-feature type-${type}`} style={{ opacity: type==='no'?0.45:1 }}>
                          <span className="lp-custom-feature-icon-wrap">
                            {type==='ok'      && <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                            {type==='no'      && <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
                            {type==='limited' && <span className="lp-custom-feature-emoji">😐</span>}
                            {type==='soon'    && <span className="lp-custom-feature-emoji">🔜</span>}
                          </span>
                          <span className="lp-custom-feature-label">{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="lp-pricing-note">
            <span>💳 Pay via UPI · Card · Netbanking · Wallets</span>
            <span>🔒 Secure checkout by Razorpay</span>
            <span>⚡ Instant activation · No auto-renewal</span>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-split">
        <div className="lp-cta-split-grid" />
        <div className="lp-cta-split-wrap">
          {/* Left Column */}
          <div className="lp-cta-split-left">
            <div className="lp-cta-avatar-stack">
              <div className="lp-cta-avatars">
                <span className="lp-avatar-initial" style={{ background: '#7c3aed' }}>NK</span>
                <span className="lp-avatar-initial" style={{ background: '#ec4899' }}>JD</span>
                <span className="lp-avatar-initial" style={{ background: '#10b981' }}>SM</span>
                <span className="lp-avatar-initial" style={{ background: '#f59e0b' }}>AJ</span>
              </div>
              <div className="lp-cta-avatar-text">
                <div className="lp-cta-stars">★★★★★</div>
                <span>Trusted by <strong>2,500+</strong> developers &amp; IT teams</span>
              </div>
            </div>

            <h2 className="lp-cta-split-h2">Ready to eliminate downtime?</h2>
            <p className="lp-cta-split-p">
              Join businesses using UptimeForge to monitor response times, track SSL certificates, and receive instant alerts via WhatsApp, Email &amp; Rocket.Chat. Setup takes less than 2 minutes.
            </p>
            <div className="lp-cta-split-actions">
              <button className="lp-cta-split-btn" onClick={() => { localStorage.removeItem('sm_intended_plan'); navigate('/register'); }}>
                Start Monitoring Free
                <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <span className="lp-cta-split-trust">5-day free trial · Setup in 2 mins · ★★★★★ (4.9 Google Reviews)</span>
            </div>

            <div className="lp-cta-tech-stack">
              <span className="lp-cta-tech-title">Compatible with any stack:</span>
              <div className="lp-cta-tech-logos">
                <span className="lp-tech-badge">
                  <svg className="lp-tech-icon" viewBox="-11.5 -10.23 23 20.46" width="14" height="14" fill="none" stroke="#61dafb" strokeWidth="1"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/><circle r="2" fill="#61dafb"/></svg>
                  React
                </span>
                <span className="lp-tech-badge">
                  <svg className="lp-tech-icon" viewBox="0 0 24 24" width="14" height="14" fill="#339933"><path d="M12 2L3.5 7v10L12 22l8.5-5V7L12 2zm0 17.5v-11l6.5 3.8-6.5 7.2z"/></svg>
                  Node.js
                </span>
                <span className="lp-tech-badge">
                  <svg className="lp-tech-icon" viewBox="0 0 24 24" width="14" height="14" fill="#2496ed"><path d="M13.983 8.871h-1.996V6.885h1.996v1.986zm-2.037 0h-2v-1.99h2v1.99zm-2.038 0h-1.99V6.89h1.99v1.98zm-2.037 0h-1.99V6.89h1.99v1.98zm8.108-2.04h-1.99V4.846h1.99V6.83zm-2.037 0h-2v-1.99h2v1.99zm-2.038 0h-1.99V4.85h1.99v1.98zm4.075-2.038h-1.99V2.81h1.99v1.98zm-8.107 8.163h-1.99V10.9h1.99v1.98zm2.037 0h-2V10.9h2v1.98zm2.038 0h-1.99V10.9h1.99v1.98zm2.037 0h-1.99V10.9h1.99v1.98zm2.038 0h-2V10.9h2v1.98zm2.038 0h-1.99V10.9h1.99v1.98z"/></svg>
                  Docker
                </span>
                <span className="lp-tech-badge">
                  <svg className="lp-tech-icon" viewBox="0 0 24 24" width="14" height="14" fill="#ff9900"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                  AWS
                </span>
              </div>
            </div>

          </div>

          {/* Right Column (Visual Interactive Mockup) */}
          <div className="lp-cta-split-right">
            <div className="lp-cta-mockup-card">
              <div className="lp-cta-mockup-header">
                <div className="lp-cta-mockup-dot-green" />
                <span className="lp-cta-mockup-title">api.uptimeforge.com</span>
                <span className="lp-cta-mockup-badge">Active</span>
              </div>
              <div className="lp-cta-mockup-stats">
                <div>
                  <div className="lp-cta-m-val">99.99%</div>
                  <div className="lp-cta-m-lbl">Uptime (30d)</div>
                </div>
                <div>
                  <div className="lp-cta-m-val text-purple">12ms</div>
                  <div className="lp-cta-m-lbl">Avg Response</div>
                </div>
              </div>
              {/* Uptime bars */}
              <div className="lp-cta-mockup-bars">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className={`lp-cta-m-bar ${i === 18 ? 'orange' : 'green'}`} />
                ))}
              </div>
              <div className="lp-cta-mockup-footer">
                <span>Checks every 30s</span>
                <span>Replied from Bangalore, IN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GOOGLE REVIEWS SECTION ── */}
      <section className="lp-google-reviews" id="reviews">
        <div className="lp-reviews-wrap">
          <div className="lp-reviews-header">
            <div className="lp-reviews-badge">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>GOOGLE REVIEWS</span>
            </div>
            <h2 className="lp-reviews-title">What developers &amp; IT teams say</h2>
            <div className="lp-reviews-score">
              <span className="lp-reviews-score-num">4.9</span>
              <div className="lp-reviews-score-stars">★★★★★</div>
              <span className="lp-reviews-score-count">based on 180+ global reviews</span>
            </div>
          </div>

          <div className="lp-reviews-marquee-container">
            <div className="lp-reviews-marquee-track">
              {/* Group 1 */}
              <div className="lp-reviews-marquee-group">
                {/* Review 1 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#7c3aed' }}>AS</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Amit Sharma</div>
                      <div className="lp-review-user-meta">CTO, Digiverse Technologies</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "UptimeForge alerts us on WhatsApp within 30 seconds of an outage. We used to pay 10x more for other services. Highly recommended for production-grade monitoring."
                  </p>
                </div>

                {/* Review 2 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#ec4899' }}>JM</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Jessica Miller</div>
                      <div className="lp-review-user-meta">Lead DevOps, CloudScale Co.</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "SSL certificate monitoring saved our agency last week! UptimeForge warned us that a client's auto-renewal failed 3 days before it expired."
                  </p>
                </div>

                {/* Review 3 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#10b981' }}>RN</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Rahul Nair</div>
                      <div className="lp-review-user-meta">Fullstack Dev &amp; SaaS Founder</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "Setting up monitoring for my React apps and Node.js APIs took less than 2 minutes. The response time graph is fast, neat, and highly accurate."
                  </p>
                </div>
              </div>

              {/* Group 2 (Duplicate for infinite loop) */}
              <div className="lp-reviews-marquee-group" aria-hidden="true">
                {/* Review 1 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#7c3aed' }}>AS</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Amit Sharma</div>
                      <div className="lp-review-user-meta">CTO, Digiverse Technologies</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "UptimeForge alerts us on WhatsApp within 30 seconds of an outage. We used to pay 10x more for other services. Highly recommended for production-grade monitoring."
                  </p>
                </div>

                {/* Review 2 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#ec4899' }}>JM</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Jessica Miller</div>
                      <div className="lp-review-user-meta">Lead DevOps, CloudScale Co.</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "SSL certificate monitoring saved our agency last week! UptimeForge warned us that a client's auto-renewal failed 3 days before it expired."
                  </p>
                </div>

                {/* Review 3 */}
                <div className="lp-review-card">
                  <div className="lp-review-card-header">
                    <div className="lp-review-user-avatar" style={{ background: '#10b981' }}>RN</div>
                    <div className="lp-review-user-info">
                      <div className="lp-review-user-name">Rahul Nair</div>
                      <div className="lp-review-user-meta">Fullstack Dev &amp; SaaS Founder</div>
                    </div>
                    <div className="lp-review-google-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  </div>
                  <div className="lp-review-stars">★★★★★</div>
                  <p className="lp-review-text">
                    "Setting up monitoring for my React apps and Node.js APIs took less than 2 minutes. The response time graph is fast, neat, and highly accurate."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-status-row">
          <div className="lp-footer-status-dot" />
          <span className="lp-footer-status-text">
            All systems operational · <strong>Email, WhatsApp, Webhook &amp; Rocket.Chat</strong> alerts active
          </span>
        </div>
        <div className="lp-footer-wrap">

          {/* Brand */}
          <div className="lp-footer-brand">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <UWLogo size={32} />
              <span className="lp-brand-text" style={{ fontSize:18, background:'none', color:'#fff', WebkitTextFillColor:'#fff' }}>UptimeForge</span>
            </div>
            <p className="lp-footer-brand-desc">
              24×7 uptime monitoring with instant WhatsApp &amp; Email alerts. Know before your customers do.
            </p>
            <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
              {['SSL Monitoring','Ping Monitor','Alerts'].map(t => (
                <span key={t} className="lp-footer-tag">{t}</span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <div className="lp-footer-col-title">Product</div>
            <div className="lp-footer-links">
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#pricing">Pricing</a>
              <a href="#reviews">Reviews</a>
              <Link to="/register">Get Started Free</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <div className="lp-footer-col-title">Account</div>
            <div className="lp-footer-links">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/pricing">Plans</Link>
              <Link to="/support">Support</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <div className="lp-footer-col-title">Legal</div>
            <div className="lp-footer-links">
              <Link to="/terms">Terms of Service</Link>
              <Link to="/terms">Privacy Policy</Link>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="lp-footer-bottom">
          <div className="lp-footer-copy">© 2026 UptimeForge · Built by <strong style={{ color:'#e2e8f0' }}>Narendra Singh</strong></div>
          <Link to="/staff-login" className="lp-staff-login-btn">
            🔐 Staff Login
          </Link>
        </div>
      </footer>

    </div>
  );
}
