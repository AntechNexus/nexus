const Folder = require("../models/Folder");
const File = require("../models/File");
const Project = require("../models/Projects");
const User = require("../models/User");

// Helper function untuk mencari semua ID folder dan sub-folder secara rekursif
/**
 * Recursively retrieves all sub-folder IDs for a given folder.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
const getAllSubFolderIds = async (folderId) => {
  let folderIds = [folderId];
  let currentParents = [folderId];

  while (currentParents.length > 0) {
    const children = await Folder.find({ parentFolderId: { $in: currentParents } }).select("_id");
    if (children.length === 0) break;
    currentParents = children.map((c) => c._id);
    folderIds = folderIds.concat(currentParents);
  }

  return folderIds;
};

/**
 * Creates a new folder within a project.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.createFolder = async (req, res) => {
  try {
    const { projectId, parentFolderId, name, color, createdBy } = req.body;
    const userId = req.user?.id || req.user?._id || createdBy;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthenticated user (Please include a JWT Token in Header or createdBy in Body)",
      });
    }

    // Check project access
    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to project" });
    }

    let path = `/${name}`;
    let level = 1;

    if (parentFolderId) {
      const parentFolder = await Folder.findById(parentFolderId);
      if (!parentFolder) {
        return res.status(404).json({ message: "Parent folder not found" });
      }

      if (parentFolder.level >= 5) {
        return res.status(400).json({ message: "Maximum folder depth is 5 levels" });
      }

      path = `${parentFolder.path}/${name}`;
      level = parentFolder.level + 1;
    } else {
      path = `/Root/${name}`;
    }

    const newFolder = new Folder({
      projectId,
      parentFolderId: parentFolderId || null,
      name,
      color: color || null,
      path,
      level,
      createdBy: userId,
      status: "active",
    });

    await newFolder.save();
    return res.status(201).json({ message: "Folder created successfully", data: newFolder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create folder", error: error.message });
  }
};

/**
 * Retrieves all folders accessible by the user.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.getAllFolders = async (req, res) => {
  try {
    const { status = "active" } = req.query;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only get folders for projects the user has access to
    const userProjects = await Project.find({
      isDeleted: false,
      $or: [{ createdBy: userId }, { "members.userId": userId }]
    }).select("_id");
    const projectIds = userProjects.map(p => p._id);

    const filter = { projectId: { $in: projectIds }, status };
    const folders = await Folder.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "profile email")
      .populate("updatedBy", "profile email");
    return res.status(200).json({ data: folders });
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve all folders", error: error.message });
  }
};

/**
 * Retrieves all folders associated with a specific project.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.getFoldersByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status = "active", parentFolderId } = req.query;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to project" });
    }

    const filter = { projectId };
    if (status !== "all") {
      filter.status = status;
    }
    if (parentFolderId !== undefined) {
      filter.parentFolderId = parentFolderId === "null" ? null : parentFolderId;
    }

    const folders = await Folder.find(filter)
      .sort({ name: 1 })
      .populate("createdBy", "profile email")
      .populate("updatedBy", "profile email");
    return res.status(200).json({ data: folders });
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve folders", error: error.message });
  }
};

/**
 * Retrieves details of a specific folder.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.getFolderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const folder = await Folder.findById(id);
    if (!folder || folder.status === "deleted") {
      return res.status(404).json({ message: "Folder not found" });
    }

    const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to folder's project" });
    }

    return res.status(200).json({ data: folder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to retrieve folder", error: error.message });
  }
};

// Move Folder to Trash (Cascades to subfolders & files)
/**
 * Moves a file to the trash (soft delete).
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.moveToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const folder = await Folder.findById(id);
    if (!folder || folder.status === "deleted") {
      return res.status(404).json({ message: "Folder not found" });
    }

    const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can move items to trash." });
    }

    const now = new Date();
    const targetFolderIds = await getAllSubFolderIds(id);

    folder.status = "trash";
    folder.deletedAt = now;
    await folder.save();

    // Update status seluruh subfolder & file di dalamnya
    await Folder.updateMany(
      { _id: { $in: targetFolderIds } },
      { status: "trash", deletedAt: now }
    );

    await File.updateMany(
      { folderId: { $in: targetFolderIds } },
      { status: "trash", deletedAt: now }
    );

    return res.status(200).json({ message: "Folder and contained items moved to trash", data: folder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to move folder to trash", error: error.message });
  }
};

// Restore Folder from Trash (Cascades to subfolders & files)
/**
 * Restores a folder from the trash.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.restoreFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can restore items from trash." });
    }

    const targetFolderIds = await getAllSubFolderIds(id);

    folder.status = "active";
    folder.deletedAt = null;
    await folder.save();

    // Restore status seluruh subfolder & file di dalamnya
    await Folder.updateMany(
      { _id: { $in: targetFolderIds } },
      { status: "active", deletedAt: null }
    );

    await File.updateMany(
      { folderId: { $in: targetFolderIds } },
      { status: "active", deletedAt: null }
    );

    return res.status(200).json({ message: "Folder and contained items restored successfully", data: folder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to restore folder", error: error.message });
  }
};

// Permanently Delete Folder (Cascades to subfolders & files)
/**
 * Permanently deletes a folder.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const folder = await Folder.findById(id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can permanently delete items." });
    }

    const now = new Date();
    const targetFolderIds = await getAllSubFolderIds(id);

    folder.status = "deleted";
    folder.deletedAt = now;
    await folder.save();

    // Mark status seluruh subfolder & file di dalamnya sebagai 'deleted'
    await Folder.updateMany(
      { _id: { $in: targetFolderIds } },
      { status: "deleted", deletedAt: now }
    );

    const filesToDelete = await File.find({ folderId: { $in: targetFolderIds }, status: { $ne: "deleted" } });
    const totalSizeToFree = filesToDelete.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    await File.updateMany(
      { folderId: { $in: targetFolderIds } },
      { status: "deleted", deletedAt: now }
    );

    if (totalSizeToFree > 0) {
      await User.updateOne(
        { _id: project.createdBy },
        { $inc: { 'storage.usedBytes': -totalSizeToFree } }
      );
    }

    return res.status(200).json({ message: "Folder and contained items permanently deleted", data: folder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete folder", error: error.message });
  }
};

// GET /api/folders/trash
/**
 * Retrieves all folders currently in the trash.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.getTrashFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({
      createdBy: userId,
      isDeleted: false
    });
    const projectIds = projects.map(p => p._id);
    
    const folders = await Folder.find({
      projectId: { $in: projectIds },
      status: "trash"
    })
    .populate("createdBy", "profile email")
    .populate("updatedBy", "profile email");
    
    const results = folders.map(f => {
       const p = projects.find(proj => proj._id.toString() === f.projectId.toString());
       return { ...f.toObject(), projectName: p ? p.name : "Unknown Project" };
    });
    
    return res.status(200).json({ data: results });
  } catch (err) {
     return res.status(500).json({ message: "Error fetching trash folders" });
  }
};

// DELETE /api/folders/trash/empty
/**
 * Permanently deletes all folders currently in the trash.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.emptyTrashFolders = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({
      createdBy: userId,
      isDeleted: false
    });
    const projectIds = projects.map(p => p._id);
    
    await Folder.updateMany(
      { projectId: { $in: projectIds }, status: "trash" },
      { status: "deleted", deletedAt: new Date() }
    );
    
    return res.status(200).json({ message: "Trash emptied" });
  } catch (err) {
    return res.status(500).json({ message: "Error emptying trash folders" });
  }
};

// PATCH /api/folders/:id/move
/**
 * Moves a folder to a new parent folder or root directory.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.moveFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { parentFolderId } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const folder = await Folder.findById(id);
    if (!folder || folder.status !== "active") {
      return res.status(404).json({ message: "Folder not found or not active" });
    }

    const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Prevent circular reference: folder cannot be moved into itself
    if (parentFolderId && parentFolderId.toString() === id.toString()) {
      return res.status(400).json({ message: "Cannot move a folder into itself" });
    }
    
    // Check if target folder exists and belongs to the same project
    if (parentFolderId) {
      const targetFolder = await Folder.findById(parentFolderId);
      if (!targetFolder || targetFolder.status !== "active") {
        return res.status(404).json({ message: "Target folder not found" });
      }
      if (targetFolder.projectId.toString() !== folder.projectId.toString()) {
         return res.status(400).json({ message: "Cannot move folder to a different project" });
      }
      
      if (targetFolder.parentFolderId && targetFolder.parentFolderId.toString() === id.toString()) {
        return res.status(400).json({ message: "Cannot move a folder into its own subfolder" });
      }
    }

    folder.parentFolderId = parentFolderId || null;
    folder.updatedBy = userId;
    await folder.save();

    return res.status(200).json({ message: "Folder moved successfully", data: folder });
  } catch (error) {
    return res.status(500).json({ message: "Failed to move folder", error: error.message });
  }
};