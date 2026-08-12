import api from './api';

const authService = {
  /**
   * Authenticates a user with their email and password.
   * 
   * This function sends an HTTP POST request to the `/auth/login` endpoint
   * with the provided credentials. The backend verifies the credentials against
   * the database. If successful, it typically returns a JWT access token and
   * user profile data. The `rememberMe` flag may be used by the backend to
   * adjust the token's expiration time.
   * 
   * @param {string} email - The user's registered email address.
   * @param {string} password - The user's secret password.
   * @param {boolean} [rememberMe=false] - Flag indicating if the session should persist longer.
   * @returns {Promise<Object>} A promise resolving to the authentication response (e.g., tokens and user data).
   */
  login: async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    return response.data;
  },

  /**
   * Registers a new user account in the system.
   * 
   * Sends an HTTP POST request to `/auth/register` with the necessary
   * user details. The backend will validate the inputs, ensure the email
   * is unique, hash the password, and create the user record.
   * Upon successful registration, the backend often triggers an OTP email
   * for verification or automatically logs the user in.
   * 
   * @param {string} email - The desired email address for the new account.
   * @param {string} password - The chosen password, matching security policies.
   * @param {string} fullName - The user's full, real name.
   * @returns {Promise<Object>} A promise resolving to the registration confirmation payload.
   */
  register: async (email, password, fullName) => {
    const response = await api.post('/auth/register', { email, password, fullName });
    return response.data;
  },

  /**
   * Verifies an OTP (One-Time Password) sent to the user's email.
   * 
   * This is part of the multi-factor authentication or registration flow.
   * It makes an HTTP POST request to `/auth/verify-otp`. The backend checks
   * if the provided code matches the one stored and hasn't expired.
   * Success usually transitions the user to a fully authenticated state.
   * 
   * @param {string} email - The email address associated with the OTP.
   * @param {string} code - The 6-digit (or similar) code entered by the user.
   * @returns {Promise<Object>} A promise resolving to the verification success payload.
   */
  verifyOtp: async (email, code) => {
    const response = await api.post('/auth/verify-otp', { email, code });
    return response.data;
  },

  /**
   * Requests a new OTP to be sent to the user's email.
   * 
   * When a user's previous OTP expires or is lost, this function triggers
   * an HTTP POST request to `/auth/resend-otp`. The backend generates a fresh
   * code, invalidates the old one, and dispatches a new email.
   * 
   * @param {string} email - The email address to send the new OTP to.
   * @returns {Promise<Object>} A promise resolving to the server's acknowledgement.
   */
  resendOtp: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  /**
   * Retrieves the currently authenticated user's profile information.
   * 
   * Executes an HTTP GET request to the `/auth/me` endpoint. The request relies
   * on the axios interceptor to attach the current Bearer token. It returns
   * detailed user information such as name, email, roles, and preferences,
   * which is used to populate the UI and manage client-side authorization.
   * 
   * @returns {Promise<Object>} A promise resolving to the user's profile data.
   */
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Fetches storage usage statistics for the authenticated user.
   * 
   * Makes an HTTP GET request to `/auth/storage`. This endpoint calculates
   * the total bytes consumed by the user's uploaded files (e.g., across projects)
   * and returns the quota details. This is vital for rendering storage bars
   * and enforcing upload limits on the frontend.
   * 
   * @returns {Promise<Object>} A promise resolving to the storage statistics payload.
   */
  getStorageInfo: async () => {
    const response = await api.get('/auth/storage');
    return response.data;
  },

  /**
   * Sets an initial password for a user account.
   * 
   * This is typically used when a user signs up via OAuth (like Google)
   * and later decides to set a local password, or after a specific admin
   * creation flow. It sends an HTTP POST request to `/auth/set-password`.
   * 
   * @param {string} password - The new password to be securely hashed and saved.
   * @returns {Promise<Object>} A promise resolving to the server's success confirmation.
   */
  setPassword: async (password) => {
    const response = await api.post('/auth/set-password', { password });
    return response.data;
  },

  /**
   * Initiates the password recovery process.
   * 
   * Triggers an HTTP POST request to `/auth/forgot-password` with the user's email.
   * If the email exists in the system, the backend generates a secure reset token
   * or OTP and emails it to the user. To prevent enumeration attacks, it often
   * returns a success response regardless of whether the email was found.
   * 
   * @param {string} email - The email address of the account requesting recovery.
   * @returns {Promise<Object>} A promise resolving to the API's acknowledgement.
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Resets a user's password using a recovery code.
   * 
   * The final step of the forgot-password flow. It posts the user's email,
   * the recovery `code` (or token) received via email, and the `newPassword`
   * to `/auth/reset-password`. The backend validates the code and, if valid,
   * overwrites the old password with the new one.
   * 
   * @param {string} email - The email address of the account.
   * @param {string} code - The valid reset token or OTP from the email.
   * @param {string} newPassword - The new password chosen by the user.
   * @returns {Promise<Object>} A promise resolving to the successful reset confirmation.
   */
  resetPassword: async (email, code, newPassword) => {
    const response = await api.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  /**
   * Changes the authenticated user's password from their account settings.
   * 
   * Requires the user to prove their identity by providing their `currentPassword`
   * alongside the `newPassword`. It sends an HTTP POST request to `/auth/change-password`.
   * The backend verifies the current password before applying the change.
   * 
   * @param {string} currentPassword - The user's existing, active password.
   * @param {string} newPassword - The new password to replace the old one.
   * @returns {Promise<Object>} A promise resolving to the successful change confirmation.
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  /**
   * Updates the authenticated user's profile details, supporting file uploads (e.g., avatars).
   * 
   * This function intelligently handles both standard JSON payloads and `FormData` payloads.
   * If the `data` argument is an instance of `FormData` (used when uploading a profile picture),
   * it overrides the axios request headers to set `Content-Type: multipart/form-data`.
   * Otherwise, it defaults to standard JSON. It dispatches an HTTP PUT request to `/auth/profile`.
   * 
   * The backend processes the changes (like updating the name or saving the image) and
   * returns the fully updated user profile document.
   * 
   * @param {Object|FormData} data - The updated profile fields or a FormData object containing files.
   * @returns {Promise<Object>} A promise resolving to the newly updated user profile object.
   */
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
