import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../api';
import UWLogo from '../components/UWLogo';
import COUNTRIES from '../constants/countries';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const PURPOSES = [
  { key: 'learning',  label: '📚 Learning',  desc: 'Personal learning & experiments' },
  { key: 'personal',  label: '👤 Personal',  desc: 'Personal projects & websites' },
  { key: 'business',  label: '💼 Business',  desc: 'Professional & business use' },
];

const GENDERS = [
  { key: 'male',   label: '👨 Male' },
  { key: 'female', label: '👩 Female' },
  { key: 'other',  label: '🧑 Other' },
];

export default function CompleteProfile({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ city: '', gender: '', country: '', state: 'N/A', phone: 'N/A', purpose: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.city.trim()) { setError('City is required'); return; }
    if (!form.gender) { setError('Please select your gender'); return; }
    if (!form.country) { setError('Please select your country'); return; }
    if (!form.purpose) { setError('Please select your account purpose'); return; }
    setError(''); setLoading(true);
    try {
      const res = await updateProfile(form);
      const updated = { ...user, ...res.data.user };
      onUserUpdate(updated);
      // Already active user → dashboard; new unverified user → plan selection
      const isActive = updated.trialVerified || updated.plan !== 'free_trial';
      navigate(isActive ? '/monitoring' : '/pay?plan=select');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    }
    setLoading(false);
  };

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-logo"><UWLogo size={40} /></div>
        <h1 className="cp-title">Complete Your Profile</h1>
        <p className="cp-sub">Hi <strong>{user?.name}</strong>, a few more details to complete your account setup.</p>

        <form onSubmit={handleSubmit} className="cp-form">
          <div className="cp-field">
            <label className="cp-label">City <span className="reg-req">*</span></label>
            <input
              className="cp-input"
              type="text"
              placeholder="e.g. Mumbai, Delhi"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div className="cp-field">
            <label className="cp-label">Gender <span className="reg-req">*</span></label>
            <div style={{ display:'flex', gap:10 }}>
              {GENDERS.map(g => (
                <button key={g.key} type="button"
                  className={`cp-purpose-btn ${form.gender === g.key ? 'cp-purpose-active' : ''}`}
                  style={{ flex:1, padding:'10px 8px' }}
                  onClick={() => setForm({ ...form, gender: g.key })}>
                  <span className="cp-purpose-label">{g.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cp-field">
            <label className="cp-label">Country <span className="reg-req">*</span></label>
            <select
              className="cp-input cp-select"
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
            >
              <option value="">Select your country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="cp-field">
            <label className="cp-label">Account Purpose <span className="reg-req">*</span></label>
            <div className="cp-purpose-group">
              {PURPOSES.map(p => (
                <button
                  key={p.key}
                  type="button"
                  className={`cp-purpose-btn ${form.purpose === p.key ? 'cp-purpose-active' : ''}`}
                  onClick={() => setForm({ ...form, purpose: p.key })}
                >
                  <span className="cp-purpose-label">{p.label}</span>
                  <span className="cp-purpose-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="login-error-box">{error}</div>}

          <button className="cp-submit" type="submit" disabled={loading}>
            {loading ? <><span className="login-spinner" /> Saving...</> : 'Continue to Plan Selection →'}
          </button>
        </form>
      </div>
    </div>
  );
}
