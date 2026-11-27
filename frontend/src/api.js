import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiError = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong';

const headerValue = (headers, name) => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    if (value !== undefined && value !== null) return value;
  }
  return headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
};

const headerNumber = (headers, name) => {
  const value = Number(headerValue(headers, name));
  return Number.isFinite(value) && value >= 0 ? value : null;
};

export const retryAfterSeconds = (error) => {
  const headers = error?.response?.headers;
  const value = headerNumber(headers, 'retry-after');
  return value && value > 0 ? Math.ceil(value) : 0;
};

export const readList = async (request) => {
  const response = await request;
  const body = response?.data;
  if (body === undefined || body === null) throw new Error('Invalid API response');
  const items = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const headers = response?.headers;
  const total = headerNumber(headers, 'x-total-count');
  const page = headerNumber(headers, 'x-page') ?? 1;
  const perPage = headerNumber(headers, 'x-per-page') ?? items.length ?? 20;
  const totalPages = headerNumber(headers, 'x-total-pages') ?? (total === null ? 1 : Math.ceil(total / (perPage || 20)));
  return {
    items,
    pagination: {
      page: page > 0 ? page : 1,
      perPage: perPage > 0 ? perPage : items.length || 20,
      total: total ?? items.length,
      totalPages: Math.max(1, totalPages),
      hasPagination: total !== null,
    },
  };
};

export const money = (value) =>
  new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
};

export default api;
