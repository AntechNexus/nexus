import api from './api';

export const teamService = {
/**
   * Searches for users within the system based on a given query string.
   *
   * This method facilitates the user discovery process, typically used when inviting new
   * members to a team or project. It sends an HTTP GET request to the `/teams/users/search`
   * endpoint, appending the query string as a URL parameter.
   *
   * The backend performs a text-based search (usually against names or email addresses)
   * and returns a list of matching user profiles. This function returns the direct payload
   * from the response object.
   *
   * @param {string} query - The search term used to find matching users.
   * @returns {Promise<Array<Object>>} A promise resolving to an array of matching user objects.
   */
  searchUsers: async (query) => {
    const response = await api.get(`/teams/users/search?q=${query}`);
    return response.data;
  },

  /**
   * Retrieves the complete list of members belonging to a specific project.
   *
   * When a user views a project's settings or team dashboard, this function is invoked
   * to fetch the roster. It makes an HTTP GET request to the `/teams/projects/${projectId}/members`
   * endpoint.
   *
   * The expected response includes user details along with their specific roles within the project.
   * It is essential for managing permissions and displaying team hierarchies. The function extracts
   * and returns the `data` property from the Axios response.
   *
   * @param {string} projectId - The unique identifier of the project whose members are being requested.
   * @returns {Promise<Array<Object>>} A promise resolving to an array of project member objects, including their roles.
   */
  getProjectMembers: async (projectId) => {
    const response = await api.get(`/teams/projects/${projectId}/members`);
    return response.data;
  },

  /**
   * Adds a new user to a project and assigns them a specific role.
   *
   * This function orchestrates the process of expanding a project's team. It constructs an HTTP
   * POST request targeting `/teams/projects/${projectId}/members`. The payload body includes the
   * `userId` of the person being added and the `role` they are being granted (e.g., 'viewer', 'editor', 'admin').
   *
   * Successfully executing this function updates the project's access control lists on the backend.
   * The returned data typically confirms the addition and may include the newly created member record.
   *
   * @param {string} projectId - The unique identifier of the target project.
   * @param {string} userId - The unique identifier of the user to be added to the project.
   * @param {string} role - The permission role to be assigned to the user within the project context.
   * @returns {Promise<Object>} A promise resolving to the backend's confirmation response, often the new member record.
   */
  addProjectMember: async (projectId, userId, role) => {
    const response = await api.post(`/teams/projects/${projectId}/members`, { userId, role });
    return response.data;
  },

  /**
   * Removes a user's membership and access from a specific project.
   *
   * This critical administrative function handles the revocation of project access. It sends an
   * HTTP DELETE request to the `/teams/projects/${projectId}/members/${userId}` endpoint.
   *
   * This action is typically destructive regarding the user's ability to view or interact with
   * the project. The backend processes the removal, and this function returns the confirmation payload.
   *
   * @param {string} projectId - The unique identifier of the project.
   * @param {string} userId - The unique identifier of the user whose access is being revoked.
   * @returns {Promise<Object>} A promise resolving to the server's confirmation of the successful removal.
   */
  removeProjectMember: async (projectId, userId) => {
    const response = await api.delete(`/teams/projects/${projectId}/members/${userId}`);
    return response.data;
  }
};
