import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to automatically attach Bearer token
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

// Response interceptor for error handling and token expiration
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ethiobus_user');
      localStorage.removeItem('ethiobus_token');
    }
    const message =
      error.response?.data?.message ||
      (error.code === 'ERR_NETWORK' || error.message?.includes('Network')
        ? 'Cannot connect to backend server. Please start the backend with: npm run start:backend'
        : error.message || 'An unexpected error occurred.');
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data).then((r) => r.data),
  login: (data) => API.post('/auth/login', data).then((r) => r.data),
  logout: () => API.post('/auth/logout').then((r) => r.data),
  getProfile: () => API.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => API.put('/auth/profile', data).then((r) => r.data),
  changePassword: (data) => API.put('/auth/change-password', data).then((r) => r.data),
};

export const busAPI = {
  getAll: () => API.get('/buses').then((r) => r.data),
  getById: (id) => API.get(`/buses/${id}`).then((r) => r.data),
  create: (data) => API.post('/buses', data).then((r) => r.data),
  update: (id, data) => API.put(`/buses/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/buses/${id}`).then((r) => r.data),
};

export const routeAPI = {
  getAll: () => API.get('/routes').then((r) => r.data),
  getById: (id) => API.get(`/routes/${id}`).then((r) => r.data),
  create: (data) => API.post('/routes', data).then((r) => r.data),
  update: (id, data) => API.put(`/routes/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/routes/${id}`).then((r) => r.data),
};

export const scheduleAPI = {
  getAll: () => API.get('/schedules').then((r) => r.data),
  search: (params) => API.get('/schedules/search', { params }).then((r) => r.data),
  getById: (id) => API.get(`/schedules/${id}`).then((r) => r.data),
  create: (data) => API.post('/schedules', data).then((r) => r.data),
  update: (id, data) => API.put(`/schedules/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/schedules/${id}`).then((r) => r.data),
  getSeatMap: (id) => API.get(`/schedules/${id}/seats`).then((r) => r.data),
};

export const bookingAPI = {
  create: (data) => API.post('/bookings', data).then((r) => r.data),
  getMyBookings: () => API.get('/bookings/my').then((r) => r.data),
  getById: (id) => API.get(`/bookings/${id}`).then((r) => r.data),
  cancel: (id) => API.put(`/bookings/${id}/cancel`).then((r) => r.data),
  getAll: () => API.get('/bookings').then((r) => r.data),
  getByPassenger: (pid) => API.get(`/bookings/passenger/${pid}`).then((r) => r.data),
  getDailyBookings: (date) => API.get('/bookings/daily', { params: { date } }).then((r) => r.data),
};

export const paymentAPI = {
  initiate: (data) => API.post('/payments/initiate', data).then((r) => r.data),
  verify: (data) => API.post('/payments/verify', data).then((r) => r.data),
  getHistory: () => API.get('/payments/history').then((r) => r.data),
  getAll: () => API.get('/payments').then((r) => r.data),
};

export const ticketAPI = {
  getByBooking: (bookingId) => API.get(`/tickets/booking/${bookingId}`).then((r) => r.data),
  verify: (ticketNumber) => API.get(`/tickets/verify/${ticketNumber}`).then((r) => r.data),
  print: (ticketId) => API.post(`/tickets/${ticketId}/print`).then((r) => r.data),
};

export const userAPI = {
  getAll: () => API.get('/users').then((r) => r.data),
  getById: (id) => API.get(`/users/${id}`).then((r) => r.data),
  update: (id, data) => API.put(`/users/${id}`, data).then((r) => r.data),
  delete: (id) => API.delete(`/users/${id}`).then((r) => r.data),
  getAgents: () => API.get('/users/agents').then((r) => r.data),
  createAgent: (data) => API.post('/users/agents', data).then((r) => r.data),
};

export const reportAPI = {
  getOverview: () => API.get('/reports/overview').then((r) => r.data),
};

export const supportAPI = {
  getAll: () => API.get('/support').then((r) => r.data),
  create: (data) => API.post('/support', data).then((r) => r.data),
  update: (id, data) => API.put(`/support/${id}`, data).then((r) => r.data),
};

export default API;
