import api from './api';

export const notificationService = {
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  createNotification: async (data) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
  respondToNotification: async (id, responseText) => {
    const response = await api.patch(`/notifications/${id}/respond`, { response: responseText });
    return response.data;
  },
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
  clearReadNotifications: async () => {
    const response = await api.delete('/notifications/read-all');
    return response.data;
  }
};
