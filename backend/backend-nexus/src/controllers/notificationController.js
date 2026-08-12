const Notification = require("../models/Notification");
const Project = require("../models/Projects");

// GET /api/notifications
// Get all notifications for the logged-in user (recipientId = req.user.id)
// Supports query filters: ?status= and ?isRead=
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
