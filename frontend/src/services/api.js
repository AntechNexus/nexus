import axios from 'axios';
import tokenService from './token.service';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

/**
 * Axios Request Interceptor.
 * 
 * This middleware function intercepts every outgoing HTTP request made via the `api` instance
 * before it leaves the browser. Its primary purpose is to automatically inject the user's
 * authorization credentials, ensuring that protected backend routes can verify the requester's identity.
 * 
 * It synchronously retrieves the current JWT from local storage using `tokenService.getToken()`.
 * If a token is found, it mutates the request's `config.headers`, appending the standard
 * `Authorization: Bearer <token>` header. If the token retrieval fails or no token exists,
 * the request proceeds unmodified, which is suitable for public endpoints like login or register.
 * 
 * Any errors occurring during the configuration phase are caught by the secondary error callback
 * and immediately rejected to prevent malformed requests from being sent.
 * 
 * @param {Object} config - The internal Axios request configuration object.
 * @returns {Object} The modified configuration object ready for dispatch.
 */
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Axios Response Interceptor.
 * 
 * This middleware function intercepts all incoming HTTP responses from the backend
 * before they reach the calling service function. Its primary role is to enforce
 * global error handling, specifically concerning authentication and authorization failures.
 * 
 * Successful responses (HTTP 2xx) pass through unmodified. However, if the server returns
 * an error status, the secondary error callback is triggered. It meticulously checks the HTTP
 * status code:
 * - `401 Unauthorized`: Indicates the user's token is invalid, expired, or missing.
 * - `404 Not Found` (specifically on `/auth/me`): Suggests the user's account was deleted or disabled on the server.
 * In either of these critical security cases, it forcibly clears the local token via `tokenService.clearToken()`
 * and redirects the browser to the `/login` page, effectively logging the user out to protect their session.
 * - `403 Forbidden`: If a user attempts to access a resource they lack permissions for (specifically via a GET request),
 * they are redirected to a dedicated `/403` error page.
 * 
 * After processing these global rules, it rejects the promise, allowing the specific calling function
 * to handle or display the error as needed.
 * 
 * @param {Object} response - The successful Axios response object.
 * @returns {Object} The unmodified response object.
 * @throws {Promise<Error>} Rejects the promise with the original error for downstream handling.
 */
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
        tokenService.clearToken();
        window.location.href = '/login';
      } else if (error.response.status === 403 && error.config.method === 'get') {
        window.location.href = '/403';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
