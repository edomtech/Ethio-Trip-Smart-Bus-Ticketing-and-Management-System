import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ethiobus_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ethiobus_user');
      localStorage.removeItem('ethiobus_token');
    }

    // Safely extract a plain string message from any error shape
    const rawMsg = error.response?.data?.message || error.response?.data?.error;
    let message;
    if (typeof rawMsg === 'string' && rawMsg.length > 0) {
      message = rawMsg;
    } else if (typeof rawMsg === 'object' && rawMsg !== null) {
      // validation error object — join all field messages
      message = Object.values(rawMsg).flat().join(', ');
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      message = 'Cannot connect to backend server. Please make sure the backend is running.';
    } else {
      message = typeof error.message === 'string' ? error.message : 'An unexpected error occurred.';
    }

    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  sendOTP: (email) => API.post('/auth/send-otp', { email }).then((r) => r.data),
  verifyOTP: (email, otp) => API.post('/auth/verify-otp', { email, otp }).then((r) => r.data),
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
};

export const discountAPI = {
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
  // Refund
  requestRefund: (data) => API.post('/payments/refund/request', data).then((r) => r.data),
  getRefunds: (params) => API.get('/payments/refund/all', { params }).then((r) => r.data),
  refundDecision: (id, decision, adminNote) => API.put(`/payments/refund/${id}/decision`, { decision, adminNote }).then((r) => r.data),
  verifyRefund: (id) => API.get(`/payments/refund/${id}/verify`).then((r) => r.data),
};

export const ticketAPI = {
  getByBooking: (bookingId) => API.get(`/tickets/booking/${bookingId}`).then((r) => r.data),
  getTripManifest: (params) => API.get('/tickets/trip-manifest', { params }).then((r) => r.data),
  agentVerify: (data) => API.post('/tickets/agent-verify', data).then((r) => r.data),
  conductorValidate: (data) => API.post('/tickets/conductor-validate', data).then((r) => r.data),
  conductorConfirmBoarding: (data) => API.post('/tickets/conductor-confirm-boarding', data).then((r) => r.data),
  verify: (ticketInput) => API.post('/tickets/conductor-validate', { ticketNumber: ticketInput, qrData: ticketInput }).then((r) => r.data),
};

export const userAPI = {
  getAll: (params) => API.get('/users', { params }).then((r) => r.data),
  getById: (id) => API.get(`/users/${id}`).then((r) => r.data),
  update: (id, data) => API.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/users/${id}`).then((r) => r.data),
  getStaff: (params) => API.get('/users/staff', { params }).then((r) => r.data),
  getConductors: () => API.get('/users/conductors').then((r) => r.data),
  createStaff: (data) => API.post('/users/staff', data).then((r) => r.data),
  getAgents: () => API.get('/users/staff', { params: { role: 'agent' } }).then((r) => r.data),
  createAgent: (data) => API.post('/users/staff', { ...data, role: 'agent' }).then((r) => r.data),
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
};

export const auditAPI = {
  getLogs: (params) => API.get('/audit-logs', { params }).then((r) => r.data),
};

export const reportAPI = {
  getOverview: () => API.get('/reports/overview').then((r) => r.data),
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

export default API;
