import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // 401 Unauthorized (invalid token) or 404 Not Found (user deleted)
      if (
        error.response.status === 401 || 
        (error.response.status === 404 && error.config.url === '/auth/me')
      ) {
        localStorage.removeItem('nexus_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
