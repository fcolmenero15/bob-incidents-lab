import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

// Accounts API
export const accountsAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (accountData) => api.post('/accounts', accountData),
  deposit: (id, data) => api.post(`/accounts/${id}/deposit`, data),
  withdraw: (id, data) => api.post(`/accounts/${id}/withdraw`, data),
  getTransactions: (id, params) => api.get(`/accounts/${id}/transactions`, { params }),
};

// Loans API
export const loansAPI = {
  getAll: () => api.get('/loans'),
  getById: (id) => api.get(`/loans/${id}`),
  request: (loanData) => api.post('/loans/request', loanData),
  calculate: (data) => api.post('/loans/calculate', data),
  approve: (id) => api.post(`/loans/${id}/approve`),
  reject: (id) => api.post(`/loans/${id}/reject`),
};

export default api;

// Made with Bob
