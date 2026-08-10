const User = require("../models/User");
const Project = require("../models/Projects");
const Notification = require("../models/Notification");

// 1. GET /api/users/search?email=xxx (Protected)
exports.searchUsersByEmail = async (req, res) => {
  try {
    const query = req.query.q || req.query.email;
    if (!query) {
      return res.status(400).json({ success: false, message: "Query parameter 'q' is required" });
    }

    const userId = req.user?.id || req.user?._id;
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { email: { $regex: query, $options: "i" } },
        { "profile.fullName": { $regex: query, $options: "i" } }
      ]
    })
      .select("_id email profile.fullName profile.avatarUrl profile.roleTitle")
      .limit(10);

    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to check project access
const checkProjectAccess = (project, userId) => {
  return (
    project.createdBy.toString() === userId ||
    project.members.some((m) => m.userId.toString() === userId)
  );
};

// 2. GET /api/projects/:projectId/members (Protected)
exports.getProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (!checkProjectAccess(project, userId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Retrieve and populate members
    const populatedProject = await Project.findById(projectId).populate(
      "members.userId",
      "email profile.fullName profile.avatarUrl"
    );

    return res.status(200).json({ success: true, data: populatedProject.members });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. POST /api/projects/:projectId/members (Protected)
exports.addProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body; // target user ID
    const currentUserId = req.user?.id || req.user?._id; // requesting user ID

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: "Target userId is required" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.createdBy.toString() === currentUserId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Only the project owner can add members" });
    }

    // a. Cek apakah user terdaftar di DB
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // b. Cek apakah user sudah ada di project.members
    const isAlreadyMember = project.members.some(
      (member) => member.userId.toString() === targetUser._id.toString()
    );
    if (isAlreadyMember) {
      return res.status(400).json({ success: false, message: "User is already a member" });
    }

    // c. BATAS MAKSIMAL ANGGOTA (NEX-051): Cek jumlah project.members.length. Jika sudah mencapai 5, return error 400
    if (project.members.length >= 5) {
      return res.status(400).json({
        success: false,
        message: "Project member limit reached. You can invite up to 5 collaborators.",
      });
    }

    // Push new member and save
    project.members.push({
      userId: targetUser._id,
      role: role || "editor",
      status: "pending",
      joinedAt: new Date()
    });
    await project.save();

    // Create Notification
    const currentUser = await User.findById(currentUserId);
    const senderName = currentUser?.profile?.fullName || currentUser?.email || "Someone";
    
    const notification = new Notification({
      recipientId: targetUser._id,
      senderId: currentUserId,
      type: "collaboration_invite",
      title: "Project Invitation",
      message: `${senderName} invited you to join the project "${project.name}" as ${role || "editor"}.`,
      projectId: project._id,
      createdBy: currentUserId,
    });
    await notification.save();

    // Populate saved members for response
    const updatedProject = await Project.findById(projectId).populate(
      "members.userId",
      "email profile.fullName profile.avatarUrl"
    );

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      data: updatedProject.members,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DELETE /api/projects/:projectId/members/:userId (Protected)
exports.removeProjectMember = async (req, res) => {
  try {
    const { projectId, userId: targetUserId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Only the project owner can remove members" });
    }

    // Remove element from project.members array
    const originalLength = project.members.length;
    project.members = project.members.filter(
      (member) => member.userId.toString() !== targetUserId.toString()
    );

    if (project.members.length === originalLength) {
      return res.status(404).json({ success: false, message: "Member not found in this project" });
    }

    await project.save();
    await Notification.updateMany(
      {
        recipientId: targetUserId,
        senderId: userId,
        projectId,
        type: "collaboration_invite",
        status: { $in: ["pending", "read"] },
        deletedAt: null,
      },
      {
        $set: {
          deletedAt: new Date(),
          updatedBy: userId,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
