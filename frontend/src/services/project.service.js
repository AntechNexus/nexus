import api from './api';

export const projectService = {
/**
   * Retrieves all projects from the backend API.
   *
   * This function initiates a GET request to the `/projects` endpoint to fetch the complete
   * list of projects associated with the authenticated user or workspace. It expects the API
   * client (`api`) to automatically handle token injection via interceptors (e.g., adding a
   * Bearer token to the Authorization header). Upon a successful response, it extracts and
   * returns the `data` payload from the Axios response object. If the request fails, the error
   * will propagate up to the caller to be caught and handled.
   *
   * @returns {Promise<any>} A promise that resolves to the array of project data objects.
   */
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
/**
   * Fetches the details of a specific project by its unique identifier.
   *
   * This function makes a GET request to the `/projects/:id` endpoint. It relies on the pre-configured
   * `api` instance to attach necessary authentication headers, ensuring that only authorized users
   * can access the project details. The response is expected to contain a standard wrapper where
   * the actual project information is nested within the `data` property. It simply returns this
   * data directly to the caller, allowing the caller to handle any potential network or validation
   * errors that may be thrown during the API call.
   *
   * @param {string|number} id - The unique identifier of the project to retrieve.
   * @returns {Promise<any>} A promise resolving to the specific project's data structure.
   */
  getProjectById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },
/**
   * Creates a new project using the provided data payload.
   *
   * This function executes a POST request to the `/projects` endpoint, sending the given `data`
   * object as the request body. The `api` client handles the serialization of the payload into JSON
   * and attaches any required authentication tokens. The backend processes the payload, validates
   * the provided fields, and upon successful creation, returns the newly created project record.
   * The function extracts the `data` field from the response, which typically includes the generated
   * ID and default properties, and returns it. Errors such as validation failures (e.g., 400 Bad Request)
   * are passed down to be managed by the calling component.
   *
   * @param {Object} data - The payload containing the project details (e.g., title, description) to be created.
   * @returns {Promise<any>} A promise that resolves to the newly created project object.
   */
  createProject: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  },
/**
   * Updates an existing project with the specified data payload.
   *
   * This function performs a PUT request to the `/projects/:id` endpoint, updating the project
   * identified by the `id` parameter with the properties provided in the `data` object. The global
   * `api` client ensures that the request is properly authenticated. The backend typically expects
   * either a full replacement or a partial update depending on the API design, and it responds with
   * the updated project data. This function resolves with the `data` property of the response.
   * Any errors encountered, such as a 404 Not Found or a 403 Forbidden, will throw an exception
   * that must be caught by the invoker.
   *
   * @param {string|number} id - The unique identifier of the project to update.
   * @param {Object} data - The payload containing the updated properties for the project.
   * @returns {Promise<any>} A promise resolving to the updated project data.
   */
  updateProject: async (id, data) => {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  },
/**
   * Deletes a specific project from the system.
   *
   * By sending a DELETE request to the `/projects/:id` endpoint, this function requests the
   * backend to permanently remove or soft-delete the project identified by the given `id`.
   * Authentication is automatically applied by the `api` instance. The API might return a
   * success message, the deleted project object, or simply a 204 No Content status. This
   * function returns the `data` payload of the response. If the user lacks permissions or
   * the project does not exist, an error will be thrown for the caller to handle.
   *
   * @param {string|number} id - The unique identifier of the project to be deleted.
   * @returns {Promise<any>} A promise that resolves to the API's confirmation data upon successful deletion.
   */
  deleteProject: async (id) => {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }
};
