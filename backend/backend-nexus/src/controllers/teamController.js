const User = require("../models/User");
const Project = require("../models/Projects");
const Notification = require("../models/Notification");

// 1. GET /api/users/search?email=xxx (Protected)
/**
 * Executes a directory search for users based on email address or full name.
 * 
 * This controller facilitates the user discovery process, typically used in autocomplete dropdowns when inviting new collaborators to a project. The workflow extracts the search query from either `req.query.q` or `req.query.email`. If the query is completely missing, it immediately rejects the request with a 400 status to prevent inefficient, unbounded database queries.
 * 
 * The core search relies on a case-insensitive regular expression (`$regex`) matching against both the `email` and `profile.fullName` fields in the `User` collection. Crucially, the query explicitly excludes the currently authenticated user (`_id: { $ne: userId }`) from the results, as a user cannot logically invite themselves to a project they are already managing.
 * 
 * To optimize payload size and maintain privacy, the response projection is strictly limited to essential profile fields (`_id`, `email`, `profile.fullName`, `profile.avatarUrl`, and `profile.roleTitle`). Furthermore, the result set is hard-capped at 10 documents (`.limit(10)`) to ensure the autocomplete endpoint remains highly responsive even in databases with millions of users.
 * 
 * @param {import('express').Request} req - Express request object. Expects the search term in `req.query.q` or `req.query.email`. Also requires the authenticated user's ID in `req.user`.
 * @param {import('express').Response} res - Express response object utilized for sending the search results.
 * @returns {Promise<void>} Resolves upon successful query execution. Returns a 200 OK status with `{ success: true, data: [ ...users ] }` containing up to 10 matching user profiles.
 * @throws {Error} Returns a 400 Bad Request if the search query parameter is omitted. Returns a 500 Internal Server Error if the MongoDB regex query fails or encounters an exception.
 */
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
/**
 * Retrieves the complete list of collaborating members for a specific project.
 * 
 * This endpoint is responsible for populating the team management interface within a project workspace. The process starts by validating the requester's authentication token and locating the target active project via the provided `projectId` parameter.
 * 
 * Security and access control are paramount here. Before exposing the member list, the controller invokes the `checkProjectAccess` helper function to explicitly verify that the authenticated user is either the original project creator or an existing member. If authorization fails, a 403 Forbidden response is dispatched to prevent data leakage across isolated projects.
 * 
 * Upon passing the security checkpoint, the controller executes a secondary query using Mongoose's `.populate()` method on the `members.userId` path. This crucial step transforms the array of raw user IDs stored within the project document into an array of rich user profile objects containing emails, full names, and avatar URLs. This structured list is then returned to the client.
 * 
 * @param {import('express').Request} req - Express request object. The target project ID must be in `req.params.projectId`, and the requester's ID must be accessible via `req.user`.
 * @param {import('express').Response} res - Express response object used to deliver the populated team roster.
 * @returns {Promise<void>} Resolves when access is confirmed and data is populated. Returns a 200 OK status containing `{ success: true, data: [ ...members ] }`.
 * @throws {Error} Returns a 401 status if the user is unauthenticated. Returns a 404 status if the requested project is missing or deleted. Returns a 403 status if the user lacks access rights. Returns a 500 status on database failure.
 */
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
/**
 * Processes an invitation to add a new collaborator to an existing project.
 * 
 * This controller executes a complex, multi-step business workflow involving validation, access control, database updates, and asynchronous notification dispatch. It requires the target `userId` and their intended `role` from the request body.
 * 
 * The security model strictly limits this action to the project owner. The code verifies that the `currentUserId` matches the project's `createdBy` property. Furthermore, it performs a battery of defensive checks: it validates the target user actually exists in the system (404 if not), ensures the user isn't already a member to prevent duplication (400 if true), and enforces a hard business rule capping project collaborators at a maximum of 5 members (NEX-051 policy, returning 400 if exceeded).
 * 
 * Upon passing all checks, the target user is appended to the project's `members` array with an initial status of 'pending', pending their acceptance. Following the successful save of the updated project document, the controller orchestrates the creation of an in-app `Notification`. It dynamically constructs a personalized message incorporating the sender's name and the project's title, directing it to the invited user's notification tray.
 * 
 * @param {import('express').Request} req - Express request object. The target project ID is in `req.params.projectId`. The body must contain the target `userId` and an optional `role` (defaults to 'editor').
 * @param {import('express').Response} res - Express response object used to confirm the invitation dispatch.
 * @returns {Promise<void>} Resolves when the database updates and notification creation complete successfully. Returns a 200 OK status with the newly updated `members` array.
 * @throws {Error} Returns 400 Bad Request for missing target IDs, duplicate members, or exceeding the member limit. Returns 401/403 for unauthorized access. Returns 404 if the project or target user is missing. Returns 500 for transaction failures.
 */
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
/**
 * Revokes a user's membership and access from a specific project.
 * 
 * This controller oversees the secure removal of a collaborator from a workspace. Similar to the addition process, this destructive action is strictly gated: only the original project owner (verified against `project.createdBy`) is authorized to execute member removals.
 * 
 * The primary operation involves a functional array filter over the `project.members` array, stripping out any element whose `userId` matches the target `userId` specified in the route parameters. To ensure data consistency and provide accurate feedback, the controller compares the array lengths before and after the filter operation. If the lengths are identical, it indicates the target user was never a member, resulting in a 404 Not Found response.
 * 
 * Crucially, the workflow includes an intelligent cleanup phase. It queries the `Notification` collection and performs a bulk `updateMany` operation. It locates any pending or read 'collaboration_invite' notifications specifically related to this project and targeted at the removed user, and soft-deletes them. This prevents the removed user from attempting to accept an old, now-invalidated invitation link residing in their inbox.
 * 
 * @param {import('express').Request} req - Express request object. Requires both `projectId` and the target `userId` within `req.params`. The authenticated owner's ID must be in `req.user`.
 * @param {import('express').Response} res - Express response object to acknowledge the successful removal.
 * @returns {Promise<void>} Resolves upon successful database updates. Returns a 200 OK status acknowledging the removal.
 * @throws {Error} Returns 401 Unauthorized or 403 Forbidden if the requester is not the owner. Returns 404 Not Found if the project doesn't exist or the target user is not a current member. Returns 500 Internal Server Error for cascade update failures.
 */
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
