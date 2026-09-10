import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

import { getClientDeviceId } from '../utils/deviceFingerprint';

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fts_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const deviceId = getClientDeviceId();
    if (deviceId) {
      config.headers['x-device-id'] = deviceId;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let message = error.response?.data?.message || error.message || 'API request failed';
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      message = 'Network Error: Cannot connect to backend server. Please make sure the backend is running on port 5001 (npm run dev:backend).';
    }
    const code = error.response?.data?.code || null;
    return Promise.reject({ message, code, status: error.response?.status });
  }
);

export default api;
