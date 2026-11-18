import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiError = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

export const money = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
};

export default api;
