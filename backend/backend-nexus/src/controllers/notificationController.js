const Notification = require("../models/Notification");
const Project = require("../models/Projects");

// GET /api/notifications
// Get all notifications for the logged-in user (recipientId = req.user.id)
// Supports query filters: ?status= and ?isRead=
/**
 * Retrieves all notifications for the currently authenticated user.
 * 
 * This controller handles fetching the notification feed for the user. It inherently filters out 
 * any notifications that have been marked as deleted (`deletedAt: null`). Furthermore, it applies
 * a time-based filter to automatically exclude notifications that have already been read and are 
 * older than 24 hours. This ensures the user's feed is not cluttered with stale, read notifications
 * while keeping unread ones visible regardless of age.
 * 
 * The function supports dynamic filtering via query parameters:
 * - `status`: Allows filtering notifications by their specific status (e.g., 'pending', 'accepted').
 * - `isRead`: Allows fetching exclusively read or unread notifications.
 * 
 * Database Interaction:
 * - Queries the `Notification` model matching `recipientId` to the authenticated user's ID.
 * - Populates the `senderId` (with `name` and `email`) and `projectId` (with `name`) fields for 
 *   richer frontend display.
 * - Sorts the results in descending order of creation (`createdAt: -1`).
 * 
 * Edge Cases:
 * - User lacks an ID in `req.user`, though usually handled by middleware, is caught safely.
 * - Unexpected query parameter formats are strictly parsed (e.g., `isRead === "true"`).
 * 
 * @param {Object} req - The Express request object containing `req.user` and optional `req.query` (`status`, `isRead`).
 * @param {Object} res - The Express response object used to send the JSON result.
 * @returns {Object} JSON response with `success` boolean, `total` count of notifications, and `data` array of notification objects.
 * @throws {500} If a database query fails or an unexpected server error occurs.
 */
exports.getMyNotifications = async (req, res) => {
  try {
    const recipientId = req.user?.id || req.user?._id;
    const { status, isRead } = req.query;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filter = { 
      recipientId, 
      deletedAt: null,
      $nor: [
        { isRead: true, createdAt: { $lt: oneDayAgo } }
      ]
    };

    if (status) filter.status = status;
    if (isRead !== undefined) filter.isRead = isRead === "true";

    const notifications = await Notification.find(filter)
      .populate("senderId", "name email")
      .populate("projectId", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, total: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/notifications/:id
/**
 * Retrieves a specific notification by its unique identifier.
 * 
 * This function fetches detailed information for a single notification requested by the user.
 * It is primarily used when a user clicks on a notification to view its full details or context.
 * To ensure security and data isolation, the query mandates that the `recipientId` of the 
 * notification matches the currently authenticated user's ID. It also ensures the notification 
 * has not been soft-deleted (`deletedAt: null`).
 * 
 * Database Interaction:
 * - Queries the `Notification` model using `_id` from the URL parameters and `recipientId` from `req.user`.
 * - Populates `senderId` (with `name`, `email`) and `projectId` (with `name`) to provide complete context.
 * 
 * Edge Cases:
 * - The requested notification ID does not exist in the database.
 * - The notification exists but belongs to a different user (access denied implicitly by `recipientId` filter).
 * - The notification was previously soft-deleted.
 * In all these cases, a 404 Not Found response is returned to prevent data leakage.
 * 
 * @param {Object} req - The Express request object containing `req.params.id` and `req.user`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true` and the `data` object containing the notification document.
 * @throws {404} If the notification is not found, doesn't belong to the user, or is soft-deleted.
 * @throws {500} On database connection issues or query execution errors.
 */
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipientId = req.user?.id || req.user?._id;

    const notification = await Notification.findOne({ _id: id, recipientId, deletedAt: null })
      .populate("senderId", "name email")
      .populate("projectId", "name");

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifications
/**
 * Creates a new notification in the system.
 * 
 * This controller allows the generation of new notifications, which can be system-generated 
 * or triggered by user actions (like inviting someone to a project). The `createdBy` field is 
 * automatically populated using the authenticated user's ID. If no explicit `recipientId` is 
 * provided in the request body, the notification is self-addressed (recipient becomes the creator).
 * 
 * Workflow:
 * 1. Validates that the user is authenticated.
 * 2. Determines the `recipientId` (defaults to the creator if absent).
 * 3. Constructs a new `Notification` document with the provided details (`type`, `title`, 
 *    `message`, `projectId`, `actionPath`).
 * 4. Saves the document to the database.
 * 
 * Database Interaction:
 * - Instantiates and saves a new document in the `Notification` collection.
 * 
 * Edge Cases:
 * - Unauthenticated requests missing `req.user` are rejected with a 401 status.
 * - Missing required fields dictated by the Mongoose schema will trigger a validation error 
 *   during the `.save()` operation, which is caught and returned as a 400 Bad Request.
 * 
 * @param {Object} req - The Express request object. Expected body: `recipientId`, `senderId`, `type`, `title`, `message`, `projectId`, `actionPath`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, a success message, and the newly created notification `data`.
 * @throws {401} If the user is unauthenticated.
 * @throws {400} If Mongoose validation fails or required fields are missing.
 */
exports.createNotification = async (req, res) => {
  try {
    const { recipientId, senderId, type, title, message, projectId, actionPath } = req.body;
    const createdBy = req.user?.id || req.user?._id;

    if (!createdBy) return res.status(401).json({ success: false, message: "Unauthenticated user" });

    const actualRecipientId = recipientId || createdBy;

    const notification = new Notification({
      recipientId: actualRecipientId,
      senderId: senderId || null,
      type,
      title,
      message,
      projectId: projectId || null,
      actionPath: actionPath || null,
      createdBy,
    });

    await notification.save();

    res.status(201).json({ success: true, message: "Notification created successfully", data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/read
/**
 * Marks a specific notification as read.
 * 
 * This function updates the `isRead` status of a notification to `true`. This action is 
 * typically triggered when a user opens the notification dropdown or clicks on a specific 
 * notification. It sets the `readAt` timestamp to the current server time and updates the 
 * `updatedBy` field for audit trailing.
 * 
 * Workflow:
 * 1. Queries for the active (non-deleted) notification by `id` belonging to the current user.
 * 2. If it's already marked as read, short-circuits and returns success without hitting the DB again.
 * 3. Otherwise, mutates the `isRead`, `readAt`, and `updatedBy` properties.
 * 4. Saves the updated document back to the database.
 * 
 * Database Interaction:
 * - Reads from the `Notification` collection.
 * - Updates and saves the mutated `Notification` document.
 * 
 * Edge Cases:
 * - Notification does not exist, belongs to someone else, or is deleted (returns 404).
 * - Notification is already read (returns 200 without redundant save operation).
 * 
 * @param {Object} req - The Express request object containing `req.params.id` and `req.user`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, a status message, and the updated notification `data`.
 * @throws {404} If the notification is not found or not accessible.
 * @throws {500} For any unexpected database or server errors.
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const now = new Date();

    const notification = await Notification.findOne({ _id: id, recipientId: userId, deletedAt: null });

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    if (notification.isRead) return res.status(200).json({ success: true, message: "Notification already marked as read", data: notification });

    notification.isRead = true;
    notification.readAt = now;
    notification.updatedBy = userId;

    await notification.save();

    res.status(200).json({ success: true, message: "Notification marked as read", data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/notifications/:id/respond
/**
 * Responds to a collaboration invite notification (accept or reject).
 * 
 * This controller handles the complex workflow of a user responding to a project invitation.
 * It not only updates the state of the notification itself but also applies the decision to 
 * the corresponding `Project` model, either granting the user full member status or removing 
 * their pending invitation.
 * 
 * Workflow:
 * 1. Validates the `response` payload (must be strictly 'accepted' or 'rejected').
 * 2. Retrieves the notification, ensuring it belongs to the user, isn't deleted, and is 
 *    specifically a 'collaboration_invite' type.
 * 3. Checks if the notification was already responded to (must be 'pending' or 'read').
 * 4. Updates the notification: sets `status` to the response, marks as read, sets timestamps.
 * 5. Retrieves the associated `Project`.
 * 6. Finds the user in the project's `members` array.
 * 7. If 'accepted', updates the member's status to 'accepted'. If 'rejected', removes the 
 *    user from the `members` array entirely.
 * 8. Saves both the updated Notification and Project documents.
 * 
 * Database Interaction:
 * - Reads, modifies, and saves a `Notification` document.
 * - Reads, modifies, and saves a `Project` document.
 * 
 * Edge Cases:
 * - Invalid response strings return a 400 error.
 * - Target notification is not found (404).
 * - Target notification is of the wrong type (400).
 * - Notification has already been responded to previously (400).
 * - The associated project or member record is missing (handled gracefully without throwing, though project state won't change).
 * 
 * @param {Object} req - The Express request object containing `req.params.id` and `req.body.response`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, a success message, and the updated notification.
 * @throws {400} On invalid input, wrong notification type, or if already responded to.
 * @throws {404} If the notification is not found.
 * @throws {500} On server or database errors during the transaction-like operations.
 */
exports.respondToNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!["accepted", "rejected"].includes(response)) return res.status(400).json({ success: false, message: "response must be 'accepted' or 'rejected'" });

    const notification = await Notification.findOne({ _id: id, recipientId: userId, deletedAt: null });

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });
    if (notification.type !== "collaboration_invite") return res.status(400).json({ success: false, message: "Only 'collaboration_invite' notifications can be responded to" });
    if (notification.status !== "pending" && notification.status !== "read") return res.status(400).json({ success: false, message: `Notification has already been responded to with status: '${notification.status}'` });

    notification.status = response;
    notification.isRead = true;
    notification.readAt = notification.readAt || new Date();
    notification.updatedBy = userId;

    await notification.save();

    if (notification.projectId) {
      const project = await Project.findById(notification.projectId);
      if (project) {
        const memberIndex = project.members.findIndex(m => m.userId.toString() === userId);
        if (memberIndex !== -1) {
          if (response === "accepted") project.members[memberIndex].status = "accepted";
          else if (response === "rejected") project.members.splice(memberIndex, 1);
          await project.save();
        }
      }
    }

    res.status(200).json({ success: true, message: `Invitation ${response}`, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/:id
/**
 * Performs a soft delete on a specific notification.
 * 
 * Allows users to manually remove a notification from their feed. Instead of permanently 
 * erasing the record from the database, this function implements a soft-delete mechanism 
 * by populating the `deletedAt` timestamp.
 * 
 * Workflow:
 * 1. Locates the active notification by ID for the authenticated user.
 * 2. If not found, returns a 404 error.
 * 3. Sets `deletedAt` to the current time and updates `updatedBy`.
 * 4. Saves the changes. Future queries (like `getMyNotifications`) will filter this out.
 * 
 * Database Interaction:
 * - Queries the `Notification` model.
 * - Updates the document and saves it back to the database.
 * 
 * Edge Cases:
 * - The notification was already deleted or doesn't belong to the user (returns 404).
 * 
 * @param {Object} req - The Express request object containing `req.params.id`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true` and the soft-deleted notification data.
 * @throws {404} If the notification is not found or already deleted.
 * @throws {500} For server or database-related failures.
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const now = new Date();

    const notification = await Notification.findOne({ _id: id, recipientId: userId, deletedAt: null });

    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

    notification.deletedAt = now;
    notification.updatedBy = userId;

    await notification.save();

    res.status(200).json({ success: true, message: "Notification deleted", data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/notifications/read-all
/**
 * Clears all read notifications for the authenticated user.
 * 
 * A bulk operation feature that allows users to quickly clean up their notification inbox. 
 * It targets all notifications where the user is the recipient, the notification has been 
 * read (`isRead: true`), and it has not yet been deleted (`deletedAt: null`). It applies 
 * a soft-delete to all matching records in a single database operation.
 * 
 * Workflow:
 * 1. Identifies the authenticated user.
 * 2. Executes an `updateMany` query on the `Notification` collection.
 * 3. Sets `deletedAt` to the current date and time for all matching records.
 * 4. Returns the count of modified documents to the client.
 * 
 * Database Interaction:
 * - Executes a single, highly efficient `updateMany` command on the `Notification` collection.
 * 
 * Edge Cases:
 * - User has no read notifications (modifies 0 documents, but still returns 200 Success).
 * 
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, a summary message, and the count of cleared notifications.
 * @throws {500} If the bulk update operation fails.
 */
exports.clearReadNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const now = new Date();

    const result = await Notification.updateMany(
      { recipientId: userId, isRead: true, deletedAt: null },
      { $set: { deletedAt: now, updatedBy: userId } }
    );
    
    console.log("clearReadNotifications result:", result, "for userId:", userId);

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} read notifications cleared`,
      clearedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("clearReadNotifications Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
