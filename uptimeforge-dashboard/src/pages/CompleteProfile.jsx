import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, deleteMyAccount, API_URL } from '../api';
import axios from 'axios';
import { useConfirm } from '../components/ConfirmDialog';
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

// city → { state, country } for auto-fill
const CITY_MAP = {
  'Mumbai': { state: 'Maharashtra', country: 'India' },
  'Pune': { state: 'Maharashtra', country: 'India' },
  'Nashik': { state: 'Maharashtra', country: 'India' },
  'Nagpur': { state: 'Maharashtra', country: 'India' },
  'Aurangabad': { state: 'Maharashtra', country: 'India' },
  'Delhi': { state: 'Delhi (NCT)', country: 'India' },
  'New Delhi': { state: 'Delhi (NCT)', country: 'India' },
  'Noida': { state: 'Uttar Pradesh', country: 'India' },
  'Gurgaon': { state: 'Haryana', country: 'India' },
  'Gurugram': { state: 'Haryana', country: 'India' },
  'Faridabad': { state: 'Haryana', country: 'India' },
  'Ghaziabad': { state: 'Uttar Pradesh', country: 'India' },
  'Bangalore': { state: 'Karnataka', country: 'India' },
  'Bengaluru': { state: 'Karnataka', country: 'India' },
  'Mysore': { state: 'Karnataka', country: 'India' },
  'Hubli': { state: 'Karnataka', country: 'India' },
  'Hyderabad': { state: 'Telangana', country: 'India' },
  'Warangal': { state: 'Telangana', country: 'India' },
  'Chennai': { state: 'Tamil Nadu', country: 'India' },
  'Coimbatore': { state: 'Tamil Nadu', country: 'India' },
  'Madurai': { state: 'Tamil Nadu', country: 'India' },
  'Kolkata': { state: 'West Bengal', country: 'India' },
  'Howrah': { state: 'West Bengal', country: 'India' },
  'Ahmedabad': { state: 'Gujarat', country: 'India' },
  'Surat': { state: 'Gujarat', country: 'India' },
  'Vadodara': { state: 'Gujarat', country: 'India' },
  'Rajkot': { state: 'Gujarat', country: 'India' },
  'Gandhinagar': { state: 'Gujarat', country: 'India' },
  'Jaipur': { state: 'Rajasthan', country: 'India' },
  'Jodhpur': { state: 'Rajasthan', country: 'India' },
  'Udaipur': { state: 'Rajasthan', country: 'India' },
  'Kota': { state: 'Rajasthan', country: 'India' },
  'Lucknow': { state: 'Uttar Pradesh', country: 'India' },
  'Kanpur': { state: 'Uttar Pradesh', country: 'India' },
  'Agra': { state: 'Uttar Pradesh', country: 'India' },
  'Varanasi': { state: 'Uttar Pradesh', country: 'India' },
  'Allahabad': { state: 'Uttar Pradesh', country: 'India' },
  'Prayagraj': { state: 'Uttar Pradesh', country: 'India' },
  'Meerut': { state: 'Uttar Pradesh', country: 'India' },
  'Bhopal': { state: 'Madhya Pradesh', country: 'India' },
  'Indore': { state: 'Madhya Pradesh', country: 'India' },
  'Jabalpur': { state: 'Madhya Pradesh', country: 'India' },
  'Gwalior': { state: 'Madhya Pradesh', country: 'India' },
  'Patna': { state: 'Bihar', country: 'India' },
  'Gaya': { state: 'Bihar', country: 'India' },
  'Ranchi': { state: 'Jharkhand', country: 'India' },
  'Jamshedpur': { state: 'Jharkhand', country: 'India' },
  'Bhubaneswar': { state: 'Odisha', country: 'India' },
  'Cuttack': { state: 'Odisha', country: 'India' },
  'Chandigarh': { state: 'Chandigarh', country: 'India' },
  'Amritsar': { state: 'Punjab', country: 'India' },
  'Ludhiana': { state: 'Punjab', country: 'India' },
  'Jalandhar': { state: 'Punjab', country: 'India' },
  'Dehradun': { state: 'Uttarakhand', country: 'India' },
  'Haridwar': { state: 'Uttarakhand', country: 'India' },
  'Shimla': { state: 'Himachal Pradesh', country: 'India' },
  'Srinagar': { state: 'Jammu & Kashmir', country: 'India' },
  'Jammu': { state: 'Jammu & Kashmir', country: 'India' },
  'Guwahati': { state: 'Assam', country: 'India' },
  'Thiruvananthapuram': { state: 'Kerala', country: 'India' },
  'Kochi': { state: 'Kerala', country: 'India' },
  'Kozhikode': { state: 'Kerala', country: 'India' },
  'Visakhapatnam': { state: 'Andhra Pradesh', country: 'India' },
  'Vijayawada': { state: 'Andhra Pradesh', country: 'India' },
  'Raipur': { state: 'Chhattisgarh', country: 'India' },
  'Panaji': { state: 'Goa', country: 'India' },
  'Margao': { state: 'Goa', country: 'India' },
  'Puducherry': { state: 'Puducherry', country: 'India' },
  'Imphal': { state: 'Manipur', country: 'India' },
  'Shillong': { state: 'Meghalaya', country: 'India' },
  'Agartala': { state: 'Tripura', country: 'India' },
};

// state → cities[] (derived from CITY_MAP)
const STATE_CITIES = Object.entries(CITY_MAP).reduce((acc, [city, { state }]) => {
  if (!acc[state]) acc[state] = [];
  acc[state].push(city);
  return acc;
}, {});

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
  const { confirm, Dialog: ConfirmDialog } = useConfirm();
  const [form, setForm] = useState({
    phone:   user?.phone   || '',
    city:    user?.city    || '',
    gender:  user?.gender  || '',
    state:   user?.state   || '',
    country: user?.country || '',
    purpose: user?.purpose || '',
    pincode: user?.pincode || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm(f => ({
        phone:   user.phone   || f.phone,
        city:    user.city    || f.city,
        gender:  user.gender  || f.gender,
        state:   user.state   || f.state,
        country: user.country || f.country,
        purpose: user.purpose || f.purpose,
        pincode: user.pincode || f.pincode,
      }));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || form.phone.replace(/\D/g,'').length < 10) { setError('Enter valid 10-digit mobile number'); return; }
    if (!form.city.trim()) { setError('City is required'); return; }
    if (!form.gender) { setError('Please select your gender'); return; }
    if (!form.country) { setError('Please select your country'); return; }
    if (!form.state.trim()) { setError('State is required'); return; }
    if (!form.pincode.trim()) { setError('PIN Code is required'); return; }
    if (form.country === 'India' && !/^\d{6}$/.test(form.pincode.trim())) { setError('Enter valid 6-digit Indian PIN code'); return; }
    if (form.country !== 'India' && form.pincode.trim().length < 3) { setError('Enter valid ZIP / Postal code'); return; }
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

  // Check if user is brand new (created within last 10 min, no sites, never verified)
  const isNewUser = user && !user.trialVerified &&
    user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < 10 * 60 * 1000;

  const handleBack = async () => {
    if (isNewUser) {
      // New user → confirm delete
      const ok = await confirm('Your new account will be deleted. Continue?', {
        title: 'Delete Account & Go Back',
        confirmText: 'Yes, Delete',
        danger: true
      });
      if (!ok) return;
      try { await deleteMyAccount(); } catch (_) {}
      window.location.href = '/register';
    } else {
      // Existing user → just logout safely
      try {
        await axios.post(`${API_URL}/api/users/logout`, {}, { withCredentials: true });
      } catch (_) {}
      window.location.href = '/login';
    }
  };

  return (
    <div className="cp-page">
      <ConfirmDialog />
      <div className="cp-card">
        <button onClick={handleBack} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.6)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600, marginBottom:16, transition:'all 0.2s' }}
          onMouseEnter={e=>e.currentTarget.style.color='#fff'} onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.6)'}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back
        </button>
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <UWLogo size={44} />
          <h1 style={{ fontSize:22, fontWeight:900, color:'#fff', margin:'12px 0 6px', fontFamily:"'Outfit',sans-serif", letterSpacing:'-0.3px' }}>Complete Your Profile</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', margin:0 }}>Hi <strong style={{ color:'#c084fc' }}>{user?.name}</strong> — just a few more details!</p>
        </div>

        <form onSubmit={handleSubmit} className="cp-form">
          {/* Row 1: Phone (full width) */}
          <div className="cp-field">
            <label className="cp-label">📱 Mobile Number <span className="reg-req">*</span></label>
            <input className="cp-input" type="tel" placeholder="10-digit number" maxLength={10}
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g,'').slice(0,10) })} />
          </div>

          {/* Row 2: Country + State */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="cp-field">
              <label className="cp-label">🌍 Country <span className="reg-req">*</span></label>
              <select className="cp-input cp-select" value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value, state: '', city: '' })}>
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="cp-field">
              <label className="cp-label">📍 State / Province <span className="reg-req">*</span></label>
              {form.country === 'India' ? (
                <select className="cp-input cp-select" value={form.state}
                  onChange={e => setForm({ ...form, state: e.target.value, city: '' })}
                  disabled={!form.country}>
                  <option value="">{form.country ? 'Select state' : 'Select country first'}</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input className="cp-input" type="text"
                  placeholder={form.country ? 'Enter state / province' : 'Select country first'}
                  disabled={!form.country}
                  value={form.state} onChange={e => setForm({ ...form, state: e.target.value, city: '' })} />
              )}
            </div>
          </div>

          {/* Row 3: City + PIN Code */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="cp-field">
              <label className="cp-label">🏙️ City <span className="reg-req">*</span></label>
              {form.country === 'India' && form.state && STATE_CITIES[form.state] ? (
                <select className="cp-input cp-select" value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                  <option value="">Select city</option>
                  {STATE_CITIES[form.state].sort().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input className="cp-input" type="text"
                  placeholder={!form.country ? 'Select country first' : !form.state ? 'Select state first' : 'Enter city'}
                  disabled={!form.state}
                  list="city-suggestions"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              )}
              <datalist id="city-suggestions">
                {Object.keys(CITY_MAP).map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="cp-field">
              <label className="cp-label">📮 PIN Code <span className="reg-req">*</span></label>
              <input className="cp-input" type="text" inputMode="numeric"
                placeholder={form.country === 'India' ? '6-digit PIN code' : 'ZIP / Postal code'}
                maxLength={form.country === 'India' ? 6 : 10}
                value={form.pincode}
                onChange={e => {
                  const val = form.country === 'India'
                    ? e.target.value.replace(/\D/g, '').slice(0, 6)
                    : e.target.value.slice(0, 10);
                  setForm({ ...form, pincode: val });
                }} />
              {form.country === 'India' && form.pincode && !/^\d{6}$/.test(form.pincode) && (
                <span style={{ fontSize: 11, color: '#ef4444', marginTop: 3, display: 'block' }}>
                  6-digit number required ({form.pincode.length}/6)
                </span>
              )}
            </div>
          </div>

          {/* Gender */}
          <div className="cp-field">
            <label className="cp-label">👤 Gender <span className="reg-req">*</span></label>
            <div style={{ display:'flex', gap:10 }}>
              {GENDERS.map(g => (
                <button key={g.key} type="button"
                  className={`cp-purpose-btn ${form.gender === g.key ? 'cp-purpose-active' : ''}`}
                  style={{ flex:1, padding:'10px 8px', textAlign:'center' }}
                  onClick={() => setForm({ ...form, gender: g.key })}>
                  <span className="cp-purpose-label" style={{ fontSize:13 }}>{g.label}</span>
                </button>
              ))}
            </div>
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
