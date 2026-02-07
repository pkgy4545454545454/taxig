import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('taxig_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('taxig_token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Client API
export const clientApi = {
  register: (data) => api.post('/client/register', data),
  login: (data) => api.post('/client/login', data),
  getProfile: () => api.get('/client/me'),
  getCourses: () => api.get('/client/courses'),
  getStats: () => api.get('/client/stats'),
  spinRoulette: () => api.post('/client/roulette'),
};

// Course API
export const courseApi = {
  estimate: (data) => api.post('/course/estimate', data),
  book: (data) => api.post('/course/book', data),
  get: (courseId) => api.get(`/course/${courseId}`),
  cancel: (courseId) => api.post(`/course/${courseId}/cancel`),
};

// Chauffeur API
export const chauffeurApi = {
  login: (data) => api.post('/chauffeur/login', data),
  register: (data) => api.post('/chauffeur/register', data),
  getProfile: () => api.get('/chauffeur/me'),
  pointer: () => api.post('/chauffeur/pointer'),
  updatePosition: (data) => api.post('/chauffeur/position', data),
  getCommandes: (status) => api.get('/chauffeur/commandes', { params: { status } }),
  getRevenus: () => api.get('/chauffeur/revenus'),
  getPendingCourse: () => api.get('/chauffeur/pending-course'),
  respondToCourse: (requestId, accept) => api.post(`/chauffeur/respond-course/${requestId}`, null, { params: { accept } }),
  startCourse: (courseId) => api.post(`/chauffeur/start-course/${courseId}`),
  completeCourse: (courseId, waitMinutes = 0) => api.post(`/chauffeur/complete-course/${courseId}`, null, { params: { wait_minutes: waitMinutes } }),
  addIndisponibilite: (date) => api.post('/chauffeur/indisponibilite', null, { params: { date } }),
  removeIndisponibilite: (date) => api.delete(`/chauffeur/indisponibilite/${date}`),
};

// Admin API
export const adminApi = {
  login: (data) => api.post('/admin/login', data),
  register: (data) => api.post('/admin/register', data),
  getDashboard: () => api.get('/admin/dashboard'),
  getChauffeurs: () => api.get('/admin/chauffeurs'),
  addChauffeur: (data) => api.post('/admin/chauffeur', data),
  deleteChauffeur: (chauffeurId) => api.delete(`/admin/chauffeur/${chauffeurId}`),
  addRapport: (chauffeurId, rapport) => api.post(`/admin/chauffeur/${chauffeurId}/rapport`, { rapport }),
  getClients: () => api.get('/admin/clients'),
  getCourses: (params) => api.get('/admin/courses', { params }),
  getRevenus: (period) => api.get('/admin/revenus', { params: { period } }),
};

// Public API
export const publicApi = {
  getActiveChauffeurs: () => api.get('/chauffeurs/actifs'),
};

// Payment API
export const paymentApi = {
  getPublicKey: () => api.get('/stripe/public-key'),
  createSession: (courseId) => api.post('/payment/create-session', null, { 
    params: { course_id: courseId, origin_url: window.location.origin }
  }),
  getStatus: (sessionId) => api.get(`/payment/status/${sessionId}`),
};

export default api;
