import api from './api';

export const teamService = {
  searchUsers: async (query) => {
    const response = await api.get(`/teams/users/search?q=${query}`);
    return response.data;
  },
  getProjectMembers: async (projectId) => {
    const response = await api.get(`/teams/projects/${projectId}/members`);
    return response.data;
  },
  addProjectMember: async (projectId, userId, role) => {
    const response = await api.post(`/teams/projects/${projectId}/members`, { userId, role });
    return response.data;
  },
  removeProjectMember: async (projectId, userId) => {
    const response = await api.delete(`/teams/projects/${projectId}/members/${userId}`);
    return response.data;
  }
};
