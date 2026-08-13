import api from './api';

export const notificationService = {
  /**
   * Retrieves the current user's list of notifications from the server.
   * 
   * This method issues an HTTP GET request to the `/notifications` endpoint.
   * It relies on the pre-configured `api` instance which automatically attaches
   * the user's authentication token to the request headers. The backend fetches
   * all active notifications tied to the user's account, sorted by date (newest first).
   * 
   * The response payload is expected to contain an array of notification objects
   * which the frontend can use to render a notification dropdown or center. If the
   * request fails (e.g., unauthorized or network error), the `api` interceptor
   * will handle standard error behaviors or bubble up the exception.
   * 
   * @returns {Promise<Array<Object>>} A promise resolving to an array of the user's notification objects.
   */
  getNotifications: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },
  /**
   * Creates a new notification on the server.
   * 
   * Typically used by admin panels or system events to dispatch a notification
   * directly to a user or group. It sends an HTTP POST request to `/notifications`
   * containing the notification payload (e.g., title, message, recipient).
   * 
   * The `api` instance automatically manages the authorization. Upon success,
   * the backend returns the newly created notification document, complete with
   * database-assigned IDs and timestamps.
   * 
   * @param {Object} data - The payload containing notification details.
   * @param {string} data.title - The title of the notification.
   * @param {string} data.message - The detailed message body.
   * @param {string} [data.type] - The category or type of notification.
   * @returns {Promise<Object>} A promise resolving to the created notification object.
   */
  createNotification: async (data) => {
    const response = await api.post('/notifications', data);
    return response.data;
  },
  /**
   * Marks a specific notification as 'read' by the user.
   * 
   * Triggers an HTTP PATCH request to the `/notifications/{id}/read` endpoint.
   * This is commonly invoked when a user clicks on a single notification in the UI.
   * The backend updates the notification's state, decrementing the unread counter.
   * 
   * The function returns the updated notification object from the server to
   * allow the frontend state to synchronize accurately without needing a full refresh.
   * 
   * @param {string} id - The unique identifier of the notification to mark as read.
   * @returns {Promise<Object>} A promise resolving to the updated notification object.
   */
  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },
  /**
   * Marks all unread notifications for the current user as 'read'.
   * 
   * Issues an HTTP PATCH request to the `/notifications/read-all` endpoint.
   * This is a bulk operation typically triggered by a "Mark all as read" button
   * in the UI, saving the user from clicking each item individually.
   * 
   * The backend updates the status of all relevant notification documents and
   * returns a confirmation response, often including the number of items modified.
   * 
   * @returns {Promise<Object>} A promise resolving to a success confirmation from the server.
   */
  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },
  /**
   * Submits a user's response to an interactive notification.
   * 
   * Some notifications (e.g., project invitations, approval requests) require
   * a user action. This method sends an HTTP PATCH request to the
   * `/notifications/{id}/respond` endpoint, carrying the user's decision or input.
   * 
   * The backend processes the response, potentially triggering cascading workflows
   * (like adding the user to a project) and updates the notification status accordingly.
   * 
   * @param {string} id - The unique identifier of the interactive notification.
   * @param {string} responseText - The user's response, decision, or input string.
   * @returns {Promise<Object>} A promise resolving to the backend's acknowledgement and updated state.
   */
  respondToNotification: async (id, responseText) => {
    const response = await api.patch(`/notifications/${id}/respond`, { response: responseText });
    return response.data;
  },
  /**
   * Permanently deletes a specific notification from the user's feed.
   * 
   * Sends an HTTP DELETE request to the `/notifications/{id}` endpoint.
   * This action removes the document from the database entirely, allowing users
   * to clean up their notification history.
   * 
   * @param {string} id - The unique identifier of the notification to be deleted.
   * @returns {Promise<Object>} A promise resolving to the deletion confirmation from the server.
   */
  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
  /**
   * Clears all previously read notifications from the user's feed.
   * 
   * Dispatches an HTTP DELETE request to the `/notifications/read-all` endpoint.
   * This bulk operation helps users maintain a tidy inbox by wiping out
   * old, acknowledged alerts in one go. The backend deletes all notifications
   * flagged as read for the authenticated user.
   * 
   * @returns {Promise<Object>} A promise resolving to a confirmation detailing the number of deleted items.
   */
  clearReadNotifications: async () => {
    const response = await api.delete('/notifications/read-all');
    return response.data;
  }
};
