import api from './api';

let projectsCache = null;
let projectsCacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute in milliseconds

export const projectService = {
  /**
   * Retrieves all projects from the backend API, utilizing an in-memory cache to reduce network requests.
   *
   * @param {boolean} [forceRefresh=false] - If true, bypasses the cache and forces a fresh fetch from the backend.
   * @returns {Promise<any>} A promise that resolves to the array of project data objects.
   */
  getProjects: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && projectsCache && (now - projectsCacheTimestamp < CACHE_DURATION)) {
      return { success: true, data: projectsCache };
    }
    
    const response = await api.get('/projects');
    projectsCache = response.data?.data || [];
    projectsCacheTimestamp = now;
    return response.data;
  },

  /**
   * Retrieves a specific project by its ID. (Not cached to ensure fresh detail view).
   */
  getProjectById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  /**
   * Creates a new project and invalidates the cache.
   */
  createProject: async (data) => {
    const response = await api.post('/projects', data);
    projectsCache = null; // Invalidate cache
    return response.data;
  },

  /**
   * Updates an existing project and invalidates the cache.
   */
  updateProject: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    projectsCache = null; // Invalidate cache
    return response.data;
  },

  /**
   * Deletes a specific project and invalidates the cache.
   */
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    projectsCache = null; // Invalidate cache
    return response.data;
  },
  
  /**
   * Explicitly clears the local cache.
   */
  clearCache: () => {
    projectsCache = null;
    projectsCacheTimestamp = 0;
  }
};
