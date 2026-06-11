import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const api = axios.create({ baseURL: `${BASE_URL}/api`, withCredentials: true });
export const API_URL = BASE_URL;
export const logoutUser = () => api.post('/users/logout');

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
export const getAlerts = (params) => api.get('/alerts', { params });
export const getServerIncident = (serverId) => api.get(`/alerts/server/${serverId}`);
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
export const markAbandoned        = (reason) => api.post('/payment/mark-abandoned', { reason });
export const getMyPaymentRequests = ()     => api.get('/payment/my-requests');
export const getMyPlanHistory     = (page=1) => api.get(`/payment/my-history?page=${page}`);

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
export const adminRefundPayment  = (id)       => api.post(`/payment/${id}/refund`);
export const adminRefundStatus   = (id)       => api.get(`/payment/${id}/refund-status`);
export const clearNotifications = () => api.delete('/notifications/clear');

// Staff management (admin)
export const staffList         = ()         => api.get('/staff');
export const staffCreate       = (data)     => api.post('/staff', data);
export const staffUpdate       = (id, data) => api.put(`/staff/${id}`, data);
export const staffDelete       = (id)       => api.delete(`/staff/${id}`);
// Staff auth
export const staffLogin        = (data)     => api.post('/staff/login', data);
export const staffLogout       = ()         => api.post('/staff/logout');
export const staffMe           = ()         => api.get('/staff/me');
