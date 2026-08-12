const TOKEN_KEY = "nexus_token";

const tokenService = {
  /**
   * Retrieves the currently active authentication token from browser storage.
   *
   * This method is the primary mechanism for the application to access the JWT or session
   * token needed to authenticate API requests. It first attempts to retrieve the token from
   * `localStorage` (which persists across browser sessions). If not found there, it falls
   * back to `sessionStorage` (which is cleared when the tab or window is closed).
   *
   * This dual-storage approach supports both "remember me" functionality and strict
   * session-bound authentication depending on user preference during login.
   *
   * @returns {string|null} The stored authentication token if it exists, or null if no token is found.
   */
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  /**
   * Persists an authentication token into the appropriate browser storage mechanism.
   *
   * When a user successfully authenticates, this function handles saving their token.
   * It first aggressively clears any existing tokens from both `localStorage` and
   * `sessionStorage` to prevent conflicting states or stale credentials.
   *
   * Based on the `remember` parameter, it then securely stores the new token. If `remember`
   * is true, it uses `localStorage` for long-term persistence. If false, it uses `sessionStorage`
   * to ensure the token is destroyed when the browser session ends.
   *
   * @param {string} token - The authentication token (e.g., JWT) provided by the backend.
   * @param {boolean} [remember=false] - A flag indicating whether the token should persist across browser restarts.
   */
  setToken: (token, remember = false) => {
    // Clear old token first to avoid conflicts
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Completely removes the authentication token from all browser storage locations.
   *
   * This method is utilized during the user logout process or when an authentication session
   * is determined to be expired or invalid. By explicitly removing the token from both
   * `localStorage` and `sessionStorage`, it ensures that subsequent API requests will be
   * unauthenticated and the user will be forced to log in again.
   */
  clearToken: () => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

export default tokenService;
