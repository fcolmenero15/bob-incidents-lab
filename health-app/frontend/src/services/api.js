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
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API (Patient Authentication)
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (patientData) => api.post('/auth/register', patientData),
};

// Medical Records API (replaces Accounts API)
export const accountsAPI = {
  // Medical Records
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (recordData) => api.post('/accounts', recordData),
  updateMedicalRecord: (id, data) => api.patch(`/accounts/${id}`, data),
  
  // Appointments (replaces transactions)
  scheduleAppointment: (id, data) => api.post(`/accounts/${id}/schedule-appointment`, data),
  updateAppointment: (recordId, appointmentId, data) => api.patch(`/accounts/${recordId}/appointments/${appointmentId}`, data),
  getAppointments: (id, params) => api.get(`/accounts/${id}/appointments`, { params }),
  
  // Legacy method names for backward compatibility
  deposit: (id, data) => api.post(`/accounts/${id}/schedule-appointment`, data),
  withdraw: (id, data) => api.patch(`/accounts/${id}`, data),
  getTransactions: (id, params) => api.get(`/accounts/${id}/appointments`, { params }),
};

// Insurance Claims API (replaces Loans API)
export const loansAPI = {
  // Insurance Claims
  getAll: () => api.get('/insurance_claims'),
  getById: (id) => api.get(`/insurance_claims/${id}`),
  submitClaim: (claimData) => api.post('/insurance_claims/submit', claimData),
  estimateCoverage: (data) => api.post('/insurance_claims/estimate', data),
  approveClaim: (id) => api.post(`/insurance_claims/${id}/approve`),
  rejectClaim: (id, data) => api.post(`/insurance_claims/${id}/reject`, data),
  markClaimPaid: (id) => api.post(`/insurance_claims/${id}/mark-paid`),
  getClaimTypes: () => api.get('/insurance_claims/types/list'),
  
  // Legacy method names for backward compatibility
  request: (claimData) => api.post('/insurance_claims/submit', claimData),
  calculate: (data) => api.post('/insurance_claims/estimate', data),
  approve: (id) => api.post(`/insurance_claims/${id}/approve`),
  reject: (id) => api.post(`/insurance_claims/${id}/reject`),
};

// Medical Records API (alternative naming)
export const medicalRecordsAPI = {
  getAll: () => api.get('/accounts'),
  getById: (id) => api.get(`/accounts/${id}`),
  create: (recordData) => api.post('/accounts', recordData),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  scheduleAppointment: (id, data) => api.post(`/accounts/${id}/schedule-appointment`, data),
  updateAppointment: (recordId, appointmentId, data) => api.patch(`/accounts/${recordId}/appointments/${appointmentId}`, data),
  getAppointments: (id, params) => api.get(`/accounts/${id}/appointments`, { params }),
};

// Insurance Claims API (alternative naming)
export const insuranceClaimsAPI = {
  getAll: () => api.get('/insurance_claims'),
  getById: (id) => api.get(`/insurance_claims/${id}`),
  submit: (claimData) => api.post('/insurance_claims/submit', claimData),
  estimate: (data) => api.post('/insurance_claims/estimate', data),
  approve: (id) => api.post(`/insurance_claims/${id}/approve`),
  reject: (id, data) => api.post(`/insurance_claims/${id}/reject`, data),
  markPaid: (id) => api.post(`/insurance_claims/${id}/mark-paid`),
  getTypes: () => api.get('/insurance_claims/types/list'),
};

// Healthcare Providers API
export const providersAPI = {
  getAll: (params) => api.get('/providers', { params }),
  getById: (id) => api.get(`/providers/${id}`),
  getSpecialties: () => api.get('/providers/specialties/list'),
};

// Patients API
export const patientsAPI = {
  getAll: () => api.get('/patients'),
  getById: (id) => api.get(`/patients/${id}`),
  getMedicalRecords: (id) => api.get(`/patients/${id}/medical-records`),
};

export default api;

// Made with Bob