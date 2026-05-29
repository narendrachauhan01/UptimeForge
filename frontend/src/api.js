import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const api = axios.create({ baseURL: `${BASE_URL}/api` });
export const API_URL = BASE_URL;

// Attach token to every request
api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('sm_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    return cfg;
});

// Expiry
export const getExpiry = (id) => api.get(`/expiry/${id}`);

// Servers
export const getServers = () => api.get('/servers');
export const addServer = (data) => api.post('/servers', data);
export const updateServer = (id, data) => api.put(`/servers/${id}`, data);
export const deleteServer = (id) => api.delete(`/servers/${id}`);
export const checkNow = () => api.post('/servers/check-now');

// Recipients
export const getRecipients = () => api.get('/recipients');
export const addRecipient = (data) => api.post('/recipients', data);
export const updateRecipient = (id, data) => api.put(`/recipients/${id}`, data);
export const deleteRecipient = (id) => api.delete(`/recipients/${id}`);

// Alerts
export const getAlerts = () => api.get('/alerts');
export const getWaStatus = () => api.get('/whatsapp/status');

// Public config (Google Client ID from backend)
export const getPublicConfig = () => api.get('/users/config');

// User auth
export const loginUser          = (data) => api.post('/users/login', data);
export const googleAuth         = (data) => api.post('/users/google-auth', data);
export const getMe              = ()     => api.get('/users/me');
export const deleteMyAccount    = ()     => api.delete('/users/me');
export const changePassword     = (data) => api.put('/users/change-password', data);
export const updateProfile      = (data) => api.put('/users/profile', data);
export const forgotPassword     = (data) => api.post('/users/forgot-password', data);
export const resetPassword      = (data) => api.post('/users/reset-password', data);

// OTP registration
export const sendRegisterOtp = (data) => api.post('/users/register/send-otp', data);
export const verifyRegisterOtp = (data) => api.post('/users/register/verify-otp', data);

// Notifications
export const getNotifications = () => api.get('/notifications');
export const markNotificationsRead = () => api.put('/notifications/read');

// Payment (Razorpay)
export const getPlans             = ()     => api.get('/payment/plans');
export const createOrder          = (data) => api.post('/payment/create-order', data);
export const verifyPayment        = (data) => api.post('/payment/verify', data);
export const getMyPaymentRequests = ()     => api.get('/payment/my-requests');

// Admin profile
export const getAdminProfile    = ()     => api.get('/auth/profile');
export const updateAdminProfile = (data) => api.put('/auth/profile', data);

// Admin
export const adminGetUsers = () => api.get('/admin/users');
export const adminUpdateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`);
export const adminGetServers = () => api.get('/admin/servers');
export const adminGetSettings = () => api.get('/admin/settings');
export const adminUpdateSettings = (data) => api.put('/admin/settings', data);
export const adminClearCache = () => api.post('/admin/clear-cache');
export const adminGetPayments    = ()         => api.get('/admin/payments');
export const adminDeletePayment  = (id)       => api.delete(`/admin/payments/${id}`);
export const adminApprovePayment = (id, data) => api.put(`/admin/payments/${id}/approve`, data || {});
export const adminRejectPayment  = (id, note) => api.put(`/admin/payments/${id}/reject`, { note: note || '' });
