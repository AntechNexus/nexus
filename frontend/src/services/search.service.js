import api from "./api";

export const searchService = {
/**
   * Executes a global search query across the entire application ecosystem.
   *
   * This service method is designed to provide a unified search experience. It takes a search
   * query string, URL-encodes it to ensure safe transmission over HTTP, and sends a GET request
   * to the `/search` endpoint.
   *
   * The backend is expected to process this query across multiple domains (e.g., users, projects,
   * files) and return a composite result set. The function directly returns the `data` payload
   * from the Axios response, making it the responsibility of the calling component to handle
   * the specific structure of the search results.
   *
   * @param {string} query - The raw search string input provided by the user.
   * @returns {Promise<Object>} A promise resolving to the backend's response payload containing the search results.
   */
  globalSearch: async (query) => {
    const response = await api.get(`/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};
