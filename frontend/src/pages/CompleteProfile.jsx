import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '../api';
import UWLogo from '../components/UWLogo';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi (NCT)','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

export default function CompleteProfile({ user, onUserUpdate }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', state: '', country: 'India' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.state) { setError('Please select your state'); return; }
    setError(''); setLoading(true);
    try {
      const res = await updateProfile(form);
      const updated = { ...user, ...res.data.user };
      localStorage.setItem('sm_user', JSON.stringify(updated));
      onUserUpdate(updated);
      // Already active user → dashboard; new unverified user → plan selection
      const isActive = updated.trialVerified || updated.plan !== 'free_trial';
      navigate(isActive ? '/dashboard' : '/pay?plan=select');
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
        <p className="cp-sub">Hi <strong>{user?.name}</strong>, just a few more details before you choose your plan.</p>

        <form onSubmit={handleSubmit} className="cp-form">
          <div className="cp-field">
            <label className="cp-label">Mobile Number</label>
            <input
              className="cp-input"
              type="tel"
              placeholder="+91 9876543210"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="cp-field">
            <label className="cp-label">State <span className="reg-req">*</span></label>
            <select
              className="cp-input cp-select"
              value={form.state}
              onChange={e => setForm({ ...form, state: e.target.value })}
            >
              <option value="">Select your state</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="cp-field">
            <label className="cp-label">Country</label>
            <input
              className="cp-input"
              type="text"
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
            />
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
