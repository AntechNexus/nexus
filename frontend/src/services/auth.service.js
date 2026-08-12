import api from './api';

const authService = {
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    return response.data;
  },

  register: async (email, password, fullName) => {
    const response = await api.post('/auth/register', { email, password, fullName });
    return response.data;
  },

  verifyOtp: async (email, code) => {
    const response = await api.post('/auth/verify-otp', { email, code });
    return response.data;
  },

  resendOtp: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getStorageInfo: async () => {
    const response = await api.get('/auth/storage');
    return response.data;
  },

  setPassword: async (password) => {
    const response = await api.post('/auth/set-password', { password });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  updateProfile: async (data) => {
    let config = {};
    if (data instanceof FormData) {
      config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      };
    }
    const res = await api.put("/auth/profile", data, config);
    return res.data;
  },
};

export default authService;
