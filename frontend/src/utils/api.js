import axios from 'axios';
import { storage, migrateLegacyStorage } from './storage';

const defaultBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : 'https://ethio-trip-smart-bus-ticketing-and-z9dl.onrender.com/api';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: { 'Content-Type': 'application/json' },
});

migrateLegacyStorage();

API.interceptors.request.use(
  (config) => {
    const token = storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AUTH_PROBE_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/send-otp',
  '/auth/resend-otp',
  '/auth/verify-otp',
  '/auth/verify-email',
];

const SAFE_STATUS_MESSAGES = {
  400: 'Invalid Request',
  401: 'Session Expired',
  403: 'Access Denied',
  404: 'Not Found',
  409: 'Conflict',
  413: 'File Too Large',
  422: 'Invalid Request',
  429: 'Too Many Attempts',
  500: 'Server Error',
  502: 'Server Error',
  503: 'Server Error',
  504: 'Request Timed Out',
};

const NETWORK_MESSAGE = 'Cannot connect to the server. Please check your internet connection and try again.';

const extractMessage = (error) => {
  const rawMsg = error.response?.data?.message || error.response?.data?.error;
  if (typeof rawMsg === 'string' && rawMsg.trim().length > 0) return rawMsg;
  if (rawMsg && typeof rawMsg === 'object') {
    const joined = Object.values(rawMsg).flat().filter((v) => typeof v === 'string').join(', ');
    if (joined.trim().length > 0) return joined;
  }
  return null;
};

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthProbe = AUTH_PROBE_PATHS.some((p) => url.includes(p));

    if (status === 401 && !isAuthProbe) {
      storage.clearAuth();
      window.dispatchEvent(new CustomEvent('ethiotrip:unauthorized'));
    }

    const isNetwork =
      !status &&
      (error.code === 'ERR_NETWORK' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('Failed to fetch'));

    const extracted = extractMessage(error);

    const isServerFault = status >= 500;
    const message = isNetwork
      ? NETWORK_MESSAGE
      : extracted
        ? extracted
        : isServerFault
          ? SAFE_STATUS_MESSAGES[status] || 'Server Error'
          : SAFE_STATUS_MESSAGES[status] || 'Something went wrong. Please try again.';

    const err = new Error(message);
    err.status = status;
    err.code = error.response?.data?.code;
    err.data = error.response?.data;
    err.isNetworkError = Boolean(isNetwork);
    err.isServerError = Boolean(isServerFault);
    return Promise.reject(err);
  }
);

export const authAPI = {
  sendOTP: (email) => API.post('/auth/resend-otp', { email }).then((r) => r.data),
  resendOTP: (email) => API.post('/auth/resend-otp', { email }).then((r) => r.data),
  verifyOTP: (email, otp) => API.post('/auth/verify-email', { email, otp }).then((r) => r.data),
  verifyEmail: (email, otp) => API.post('/auth/verify-email', { email, otp }).then((r) => r.data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }).then((r) => r.data),
  verifyResetOTP: (email, otp) => API.post('/auth/verify-reset-otp', { email, otp }).then((r) => r.data),
  resetPassword: ({ email, otp, newPassword }) => API.post('/auth/reset-password', { email, otp, newPassword }).then((r) => r.data),
  googleLogin: (data) => API.post('/auth/google', data).then((r) => r.data),
  register: (data) => API.post('/auth/register', data).then((r) => r.data),
  login: (data) => API.post('/auth/login', data).then((r) => r.data),
  logout: () => API.post('/auth/logout').then((r) => r.data),
  getProfile: () => API.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => API.put('/auth/profile', data).then((r) => r.data),
  changePassword: (data) => API.put('/auth/change-password', data).then((r) => r.data),
};

export const companyAPI = {
  registerCompany: (data) => API.post('/companies/register', data).then((r) => r.data),
  getActiveCompanies: () => API.get('/companies/active').then((r) => r.data),
  getAllCompanies: (params) => API.get('/companies', { params }).then((r) => r.data),
  getAll: (params) => API.get('/companies/active', { params }).then((r) => r.data),
  getCompanyById: (id) => API.get(`/companies/${id}`).then((r) => r.data),
  updateCompany: (id, data) => API.put(`/companies/${id}`, data).then((r) => r.data),
  updateCompanyStatus: (id, status, reason) => API.patch(`/companies/${id}/status`, { status, reason }).then((r) => r.data),
  getMyCompany: () => API.get('/companies/my-company').then((r) => r.data),
  updateCompanyProfile: (data) => API.put('/companies/my-company', data).then((r) => r.data),
};

export const busAPI = {
  getAll: (params) => API.get('/buses', { params }).then((r) => r.data),
  getPublic: () => API.get('/buses/public').then((r) => r.data),
  getById: (id) => API.get(`/buses/${id}`).then((r) => r.data),
  create: (data) => API.post('/buses', data).then((r) => r.data),
  update: (id, data) => API.put(`/buses/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/buses/${id}`).then((r) => r.data),
};

export const routeAPI = {
  getAll: (params) => API.get('/routes', { params }).then((r) => r.data),
  getById: (id) => API.get(`/routes/${id}`).then((r) => r.data),
  create: (data) => API.post('/routes', data).then((r) => r.data),
  update: (id, data) => API.put(`/routes/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/routes/${id}`).then((r) => r.data),
};

export const scheduleAPI = {
  getAll: (params) => API.get('/schedules', { params }).then((r) => r.data),
  search: (params) => API.get('/schedules/search', { params }).then((r) => r.data),
  getMyAssigned: () => API.get('/schedules/my-assigned').then((r) => r.data),
  getById: (id) => API.get(`/schedules/${id}`).then((r) => r.data),
  create: (data) => API.post('/schedules', data).then((r) => r.data),
  update: (id, data) => API.put(`/schedules/${id}`, data).then((r) => r.data),
  assignConductor: (id, conductorId) => API.put(`/schedules/${id}/assign-conductor`, { conductorId }).then((r) => r.data),
  delete: (id) => API.delete(`/schedules/${id}`).then((r) => r.data),
  getSeatMap: (id) => API.get(`/schedules/${id}/seats`).then((r) => r.data),
};

export const bookingAPI = {
  create: (data) => API.post('/bookings', data).then((r) => r.data),
  getMyBookings: () => API.get('/bookings/my').then((r) => r.data),
  getById: (id) => API.get(`/bookings/${id}`).then((r) => r.data),
  cancel: (id, reason, leg = 'all') => API.put(`/bookings/${id}/cancel`, { reason, leg }).then((r) => r.data),
  processRefundDecision: (id, decision, amount, note) => API.put(`/bookings/${id}/refund-decision`, { decision, amount, note }).then((r) => r.data),
  getAll: (params) => API.get('/bookings', { params }).then((r) => r.data),
  getDailyBookings: (date) => API.get('/bookings/daily', { params: { date } }).then((r) => r.data),
  uploadReceipt: (id, data) => API.post(`/bookings/${id}/upload-receipt`, data).then((r) => r.data),
  getPendingReceipts: () => API.get('/bookings/pending-receipts').then((r) => r.data),
  reviewReceipt: (id, decision, note) => API.put(`/bookings/${id}/review-receipt`, { decision, note }).then((r) => r.data),
};

export const uploadAPI = {
  uploadImage: (image, folder = 'receipts') => API.post('/upload/image', { image, folder }).then((r) => r.data),
};

export const discountAPI = {
  getPublic: () => API.get('/discounts/public').then((r) => r.data),
  getAll: (params) => API.get('/discounts', { params }).then((r) => r.data),
  create: (data) => API.post('/discounts', data).then((r) => r.data),
  update: (id, data) => API.put(`/discounts/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/discounts/${id}`).then((r) => r.data),
};

export const paymentAPI = {
  initiate: (data) => API.post('/payments/initiate', data).then((r) => r.data),
  verify: (data) => API.post('/payments/verify', data).then((r) => r.data),
  chapaInitialize: (bookingId) => API.post('/payments/chapa/initialize', { bookingId }).then((r) => r.data),
  chapaVerify: (txRef) => API.get(`/payments/chapa/verify/${txRef}`).then((r) => r.data),
  getHistory: () => API.get('/payments/history').then((r) => r.data),
  getAll: (params) => API.get('/payments', { params }).then((r) => r.data),
  updateStatus: (id, status) => API.put(`/payments/${id}/status`, { status }).then((r) => r.data),
  requestRefund: (data) => API.post('/payments/refund/request', data).then((r) => r.data),
  getRefunds: (params) => API.get('/payments/refund/all', { params }).then((r) => r.data),
  getMyRefunds: () => API.get('/payments/refund/my').then((r) => r.data),
  refundDecision: (id, decision, adminNote) => API.put(`/payments/refund/${id}/decision`, { decision, adminNote }).then((r) => r.data),
  verifyRefund: (id) => API.get(`/payments/refund/${id}/verify`).then((r) => r.data),
  submitManualReceipt: (data) => API.post('/payments/manual/submit', data).then((r) => r.data),
  getPendingManualReceipts: (params) => API.get('/payments/manual/pending', { params }).then((r) => r.data),
  reviewManualReceipt: (id, decision, data = {}) => API.put(`/payments/manual/${id}/review`, { decision, ...data }).then((r) => r.data),
};

export const ticketAPI = {
  getByBooking: (bookingId) => API.get(`/tickets/booking/${bookingId}`).then((r) => r.data),
  getTripManifest: (params) => API.get('/tickets/trip-manifest', { params }).then((r) => r.data),
  agentVerify: (data) => API.post('/tickets/agent-verify', data).then((r) => r.data),
  conductorValidate: (data) => API.post('/tickets/conductor-validate', data).then((r) => r.data),
  conductorConfirmBoarding: (data) => API.post('/tickets/conductor-confirm-boarding', data).then((r) => r.data),
  verify: (ticketInput) => API.post('/tickets/conductor-validate', { ticketNumber: ticketInput, qrData: ticketInput }).then((r) => r.data),
};

export const aiAPI = {
  ask: (prompt, history = []) => API.post('/ai/ask', { prompt, history }).then((r) => r.data),
};

export const userAPI = {
  getAll: (params) => API.get('/users', { params }).then((r) => r.data),
  getById: (id) => API.get(`/users/${id}`).then((r) => r.data),
  update: (id, data) => API.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/users/${id}`).then((r) => r.data),
  getStaff: (params) => API.get('/users/staff', { params }).then((r) => r.data),
  getConductors: () => API.get('/users/conductors').then((r) => r.data),
  createStaff: (data) => API.post('/users/staff', { ...data, role: data.role || 'company_staff' }).then((r) => r.data),
  getAgents: () => API.get('/users/staff', { params: { role: 'company_staff' } }).then((r) => r.data),
  createAgent: (data) => API.post('/users/staff', { ...data, role: 'company_staff' }).then((r) => r.data),
  createConductor: (data) => API.post('/users/staff', { ...data, role: 'conductor' }).then((r) => r.data),
};

export const reviewAPI = {
  getByCompany: (companyId) => API.get(`/reviews/company/${companyId}`).then((r) => r.data),
  create: (data) => API.post('/reviews', data).then((r) => r.data),
};

export const notificationAPI = {
  getMyNotifications: () => API.get('/notifications').then((r) => r.data),
  markAsRead: (id) => API.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllAsRead: () => API.put('/notifications/read-all').then((r) => r.data),
  delete: (id) => API.delete(`/notifications/${id}`).then((r) => r.data),
  clearAll: () => API.delete('/notifications/clear-all').then((r) => r.data),
  sendPassengerEmail: (data) => API.post('/notifications/send-passenger-email', data).then((r) => r.data),
  sendTicketEmail: (data) => API.post('/notifications/send-ticket-email', data).then((r) => r.data),
};

export const auditAPI = {
  getLogs: (params) => API.get('/audit-logs', { params }).then((r) => r.data),
};

export const reportAPI = {
  getOverview: () => API.get('/reports/overview').then((r) => r.data),
  getPublic: () => API.get('/reports/public').then((r) => r.data),
};

export const supportAPI = {
  create: (data) => API.post('/support', data).then((r) => r.data),
  getAll: (params) => API.get('/support', { params }).then((r) => r.data),
  getById: (id) => API.get(`/support/${id}`).then((r) => r.data),
  addMessage: (id, message) => API.post(`/support/${id}/messages`, { message }).then((r) => r.data),
  update: (id, data) => API.put(`/support/${id}`, data).then((r) => r.data),
  updateStatus: (id, status, agentNotes) => API.put(`/support/${id}/status`, { status, agentNotes }).then((r) => r.data),
  getMyTickets: () => API.get('/support').then((r) => r.data),
  delete: (id) => API.delete(`/support/${id}`).then((r) => r.data),
};

export const conductorReportAPI = {
  create: (data) => API.post('/conductor-reports', data).then((r) => r.data),
  getAll: (params) => API.get('/conductor-reports', { params }).then((r) => r.data),
  getById: (id) => API.get(`/conductor-reports/${id}`).then((r) => r.data),
  updateStatus: (id, status, resolutionNotes) => API.put(`/conductor-reports/${id}/status`, { status, resolutionNotes }).then((r) => r.data),
};

export const platformSettingAPI = {
  getSettings: () => API.get('/platform-settings').then((r) => r.data),
  updateSettings: (data) => API.put('/platform-settings', data).then((r) => r.data),
};

export default API;
