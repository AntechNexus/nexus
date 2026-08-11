const Project = require("../models/Projects");
const Folder = require("../models/Folder");
const File = require("../models/File");

/**
 * Creates a new project for the authenticated user.
 * 
 * @param {Object} req - Express request object containing name and description.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, createdBy, members } = req.body;
    const creatorId = req.user?.id || req.user?._id || createdBy;

    if (!creatorId) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated user. Please log in again.",
      });
    }

    // Pengecekan nama unik per user
    const existingProject = await Project.findOne({
      createdBy: creatorId,
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      isDeleted: false,
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: "You already have an active project with this name",
      });
    }

    const defaultMembers = members && members.length > 0
      ? members
      : [{ userId: creatorId, role: "owner", joinedAt: new Date() }];

    const project = new Project({
      name,
      description,
      createdBy: creatorId,
      members: defaultMembers,
    });

    await project.save();
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all active projects that the authenticated user owns or is a member of.
 * Excludes soft-deleted projects. Also attaches the file count for each project.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getProjects = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const projects = await Project.find({
      isDeleted: false,
        $or: [
          { createdBy: userId },
          { 
            members: { 
              $elemMatch: { userId: userId, status: { $ne: "pending" } } 
            } 
          }
        ]
    })
      .populate("createdBy", "email profile.fullName")
      .populate("updatedBy", "email profile.fullName")
      .populate("members.userId", "email profile.fullName")
      .lean();

    // Fetch file count for each project
    for (const project of projects) {
      project.fileCount = await File.countDocuments({ 
        projectId: project._id, 
        status: 'active'
      });
    }

    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retrieves a single project by its ID, ensuring the user has access.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: id, isDeleted: false })
      .populate("createdBy", "email profile.fullName")
      .populate("updatedBy", "email profile.fullName")
      .populate("members.userId", "email profile.fullName");

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isMember =
      project.createdBy?._id?.toString() === userId ||
      project.createdBy?.toString() === userId ||
      project.members.some((m) => (m.userId?._id?.toString() === userId || m.userId?.toString() === userId) && m.status !== "pending");

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Soft deletes a project (only the owner can do this).
 * Cascades the soft delete to all associated folders and files.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.createdBy.toString() === userId;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Hanya owner yang dapat menghapus projek" });
    }

    const now = new Date();
    project.isDeleted = true;
    project.deletedAt = now;
    project.updatedBy = userId;
    await project.save();

    // Cascade: soft-delete all folders and files that belong to this project
    await Folder.updateMany(
      { projectId: id },
      { status: "deleted", deletedAt: now }
    );
    await File.updateMany(
      { projectId: id },
      { status: "deleted", deletedAt: now }
    );

    res.status(200).json({
      success: true,
      message: "Project, folders, and files have been deleted",
      data: project,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * Updates a project's details (name, description). Restricted to the project owner.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: id, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isOwner = project.createdBy.toString() === userId;

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    project.updatedBy = userId;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;

    await project.save();
    res.status(200).json({
      success: true,
      message: "Project successfully updated",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};
