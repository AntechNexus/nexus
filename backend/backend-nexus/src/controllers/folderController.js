const Folder = require("../models/Folder");
const File = require("../models/File");
const Project = require("../models/Projects");
const User = require("../models/User");

// Helper function untuk mencari semua ID folder dan sub-folder secara rekursif
/**
 * Recursively retrieves all sub-folder IDs for a given folder in the hierarchy.
 * 
 * This helper function traverses the folder tree downwards starting from a specific parent folder. 
 * It employs a breadth-first search (BFS) approach utilizing an iterative loop rather than 
 * strict recursion to prevent call stack limits. It repeatedly queries the database to find 
 * child folders whose `parentFolderId` matches the current batch of parent IDs, accumulating 
 * all discovered folder IDs into a flat array.
 * 
 * This is particularly critical for cascade operations like deleting or moving a folder to the trash, 
 * where the status of all nested contents must be updated simultaneously to maintain data integrity.
 * 
 * Database Interaction:
 * - Executes multiple sequential `find` queries on the `Folder` model, requesting only the `_id` field.
 * - Loop terminates when a depth level returns no children.
 * 
 * Edge Cases:
 * - Deeply nested folders might require numerous database calls. (Bounded by app-level depth limits elsewhere).
 * - An empty folder immediately breaks the loop and returns just its own ID.
 * 
 * @param {string} folderId - The ID of the root folder from which to start the downward traversal.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of strings representing the IDs of the folder and all its recursive sub-folders.
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
 * Creates a new directory (folder) within a specific project.
 * 
 * This controller orchestrates the creation of folders, managing their hierarchical structure 
 * and access control. It first validates the user's authenticity and ensures they are an active 
 * member or the creator of the target project. 
 * 
 * If a `parentFolderId` is provided, it attempts to nest the new folder within it. It validates 
 * that the parent folder exists and enforces a strict maximum depth limit of 5 levels to prevent 
 * overly complex hierarchical trees that are hard to query or render on the UI. The folder's 
 * internal `path` string (e.g., `/Root/Parent/Child`) and `level` integer are calculated dynamically.
 * 
 * Workflow:
 * 1. Validates user authentication.
 * 2. Checks project existence and verifies the user's membership.
 * 3. Evaluates hierarchical placement (Root vs. Subfolder) and enforces depth constraints.
 * 4. Constructs the new `Folder` document and saves it to the database.
 * 
 * Database Interaction:
 * - Reads `Project` to verify access.
 * - Reads `Folder` (parent) to calculate depth and path.
 * - Creates and saves a new `Folder` document.
 * 
 * Edge Cases:
 * - User lacks project access (Returns 403 Forbidden).
 * - Target parent folder does not exist (Returns 404 Not Found).
 * - Maximum depth (5) exceeded (Returns 400 Bad Request).
 * 
 * @param {Object} req - The Express request object containing `projectId`, `parentFolderId` (optional), `name`, `color`, and `createdBy` (fallback).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with a success message and the newly created folder data.
 * @throws {401} Unauthenticated user.
 * @throws {403} Access denied to project.
 * @throws {404} Project or parent folder not found.
 * @throws {400} Exceeds maximum folder depth limit.
 * @throws {500} Internal server error.
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
 * Retrieves all folders across all projects accessible by the authenticated user.
 * 
 * This endpoint aggregates folders from multiple projects to provide a unified view, 
 * potentially used for search, global dashboards, or administrative overviews. It first 
 * scans the `Project` collection to compile a list of all project IDs where the user is 
 * either the creator or an accepted member. It then fetches all folders belonging to those 
 * projects, filtering them by status (defaulting to 'active').
 * 
 * Workflow:
 * 1. Validates user authentication.
 * 2. Queries `Project` for all projects linked to the user.
 * 3. Queries `Folder` for all records matching the retrieved project IDs and specified status.
 * 4. Populates creator and updater metadata for frontend display.
 * 5. Sorts the folders by creation date descending.
 * 
 * Database Interaction:
 * - Queries `Project` model with an `$or` condition on `createdBy` and `members.userId`.
 * - Queries `Folder` model using `$in` with the gathered project IDs.
 * - Populates `createdBy` and `updatedBy` references.
 * 
 * Edge Cases:
 * - User has no projects (returns an empty array).
 * - Query parameter `status` provided as 'deleted' or 'trash' changes the filter scope.
 * 
 * @param {Object} req - The Express request object. Accepts `req.query.status` to filter (defaults to 'active').
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing the `data` array of accessible folders.
 * @throws {401} If the user is unauthenticated.
 * @throws {500} If database queries fail.
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
 * This controller serves as the primary data fetcher for the file explorer UI within a specific 
 * project context. It rigorously verifies that the user has the rights to view the project's contents. 
 * The query is highly flexible: it can fetch all active folders, include trashed folders, or narrow 
 * down to folders that share a specific parent (`parentFolderId`). This allows the frontend to 
 * lazy-load folder contents or display tree structures accurately.
 * 
 * Workflow:
 * 1. Checks authentication and project membership.
 * 2. Builds a dynamic Mongoose query filter based on `projectId`, `status`, and `parentFolderId`.
 * 3. Translates a string 'null' for `parentFolderId` into an actual `null` value to query root folders.
 * 4. Executes the query, sorts alphabetically by name, and populates user metadata.
 * 
 * Database Interaction:
 * - Queries `Project` to validate access rights.
 * - Queries `Folder` with dynamic filters, sorted by `name` ascending (A-Z).
 * 
 * Edge Cases:
 * - Project does not exist or was deleted (404 Not Found).
 * - User is not a member of the project (403 Forbidden).
 * - `parentFolderId` passed as "null" string needs specific parsing to work in MongoDB.
 * 
 * @param {Object} req - Express request object containing `req.params.projectId` and `req.query` (`status`, `parentFolderId`).
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing the `data` array of matched folders.
 * @throws {401} Unauthorized access.
 * @throws {403} Forbidden (User not in project).
 * @throws {404} Project not found.
 * @throws {500} Internal server error.
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
 * Retrieves comprehensive details for a specific folder by its ID.
 * 
 * Used for fetching metadata of a single folder (e.g., for showing folder properties or 
 * ensuring it exists before an operation). It applies strict security checks to ensure the 
 * folder is not hard-deleted and that the user belongs to the project that owns the folder.
 * 
 * Workflow:
 * 1. Finds the folder by ID in the database.
 * 2. Rejects if the folder is missing or marked as completely 'deleted'.
 * 3. Identifies the project the folder belongs to and checks user authorization.
 * 4. Returns the single folder object.
 * 
 * Database Interaction:
 * - Reads a single document from `Folder`.
 * - Reads a single document from `Project`.
 * 
 * Edge Cases:
 * - The folder ID is invalid or not found.
 * - The folder's parent project has been deleted independently (corruption check).
 * - Access rights have changed since the folder was created.
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing the `data` of the requested folder.
 * @throws {401} If the user is unauthenticated.
 * @throws {403} If the user lacks access to the folder's project.
 * @throws {404} If the folder or its project is not found.
 * @throws {500} Server or database error.
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
 * Moves a folder and all its contents recursively to the trash.
 * 
 * This is a highly destructive "soft-delete" operation. When a folder is moved to the trash, 
 * every single sub-folder and file nested within it at any depth must also be moved to the trash 
 * to maintain UI consistency and prevent orphaned active files inside a trashed parent.
 * 
 * The operation enforces strict ownership rules: only the project owner (creator) is allowed 
 * to trash folders. 
 * 
 * Workflow:
 * 1. Verifies the folder exists and is not already hard-deleted.
 * 2. Checks project ownership. Members cannot trash folders, only the creator.
 * 3. Uses `getAllSubFolderIds` to recursively gather all nested folder IDs.
 * 4. Updates the target folder to `status: "trash"` and sets `deletedAt`.
 * 5. Uses `Folder.updateMany` to apply the trash status to all discovered sub-folders.
 * 6. Uses `File.updateMany` to apply the trash status to all files contained within any of those folders.
 * 
 * Database Interaction:
 * - Reads `Folder` and `Project` for validation.
 * - Multi-read in `getAllSubFolderIds`.
 * - Massive `updateMany` on `Folder` collection.
 * - Massive `updateMany` on `File` collection.
 * 
 * Edge Cases:
 * - Trashing a massive folder structure could be computationally heavy.
 * - The operation is not strictly atomic (MongoDB transactions are not used here), which could 
 *   lead to partial failures if the server crashes mid-execution.
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the cascade trash operation.
 * @throws {401} Unauthenticated.
 * @throws {403} User is not the project owner.
 * @throws {404} Folder or project not found.
 * @throws {500} Cascade update failure.
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
 * Restores a folder and all its contents recursively from the trash.
 * 
 * This is the exact inverse of `moveToTrash`. If a folder is restored, all of its nested 
 * sub-folders and files must also be brought back to the 'active' state. 
 * 
 * Similar to trashing, only the project owner possesses the authorization to perform this action.
 * 
 * Workflow:
 * 1. Validates existence and ownership.
 * 2. Uses `getAllSubFolderIds` to gather the tree of IDs from the root folder downwards.
 * 3. Sets the root folder's status back to 'active' and nullifies `deletedAt`.
 * 4. Cascades the update via `updateMany` to all child folders.
 * 5. Cascades the update via `updateMany` to all child files.
 * 
 * Database Interaction:
 * - Multiple reads and updates spanning the `Folder` and `File` collections.
 * 
 * Edge Cases:
 * - Restoring a folder where its original parent folder is STILL in the trash may result in 
 *   the folder being active but hidden in the UI. (UI logic handles displaying this).
 * - Data races if another admin deletes the project simultaneously.
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming successful restoration.
 * @throws {401} Unauthenticated.
 * @throws {403} User is not the project owner.
 * @throws {404} Folder or project not found.
 * @throws {500} Database error during restoration.
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
 * Permanently deletes a folder and all its contents, reclaiming storage quotas.
 * 
 * This is a highly destructive "hard-delete" operation (though implemented as a terminal status 
 * change to 'deleted' for audit purposes). It cascades through all sub-folders and files. 
 * Crucially, it calculates the total byte size of all files being permanently deleted and refunds 
 * that storage space back to the project owner's global storage quota.
 * 
 * Workflow:
 * 1. Ownership and existence validation.
 * 2. Collects all nested folder IDs recursively.
 * 3. Updates the root folder and all sub-folders to `status: "deleted"`.
 * 4. Identifies all files inside these folders that are not already 'deleted'.
 * 5. Aggregates the `sizeBytes` of these files to compute total freed space.
 * 6. Updates all nested files to `status: "deleted"`.
 * 7. Decrements the `storage.usedBytes` on the project owner's `User` record.
 * 
 * Database Interaction:
 * - Recursive folder fetches.
 * - `Folder.updateMany` and `File.updateMany`.
 * - Aggregation/Calculation on `File.find`.
 * - `$inc` update on the `User` model to subtract storage bytes.
 * 
 * Edge Cases:
 * - If `totalSizeToFree` calculation fails or is inaccurate, storage leaks occur.
 * - High load if thousands of files are within the folder.
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming deletion.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized (not owner).
 * @throws {404} Target not found.
 * @throws {500} Database update failures.
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
 * Retrieves all folders currently in the trash for the user's owned projects.
 * 
 * This controller fetches data exclusively for the "Trash" or "Recycle Bin" view in the UI. 
 * It identifies all projects owned by the requesting user, then retrieves every folder 
 * across those projects that has the `status: "trash"`.
 * 
 * Workflow:
 * 1. Find all active projects where the user is the creator.
 * 2. Extract their IDs.
 * 3. Query `Folder` for those project IDs matching the 'trash' status.
 * 4. Populate creator/updater metadata.
 * 5. Map the results to append the `projectName` for easier UI rendering.
 * 
 * Database Interaction:
 * - Reads from `Project` and `Folder` collections sequentially.
 * - In-memory array mapping to inject project names.
 * 
 * Edge Cases:
 * - If a project was deleted, its trashed folders are skipped.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response with the `data` array of trashed folders.
 * @throws {500} If fetching from the database fails.
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
 * Permanently deletes (empties) all trashed folders across all owned projects.
 * 
 * This bulk operation acts as an "Empty Trash" function for folders. It finds all projects 
 * created by the user, then finds every folder within those projects that is currently in the 
 * trash, and marks them as permanently 'deleted'.
 * 
 * Note: This specific endpoint does not cascade delete files or refund storage quotas on its own. 
 * It relies on the file trash emptier or garbage collection jobs to handle the file-level cleanup 
 * and quota recalculations.
 * 
 * Workflow:
 * 1. Identifies owned projects.
 * 2. Uses `updateMany` to change folder status from 'trash' to 'deleted'.
 * 
 * Database Interaction:
 * - Queries `Project` for ownership mapping.
 * - Executes a massive `updateMany` on the `Folder` collection.
 * 
 * Edge Cases:
 * - Storage quotas are not refunded here; it is assumed files are emptied separately.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the trash was emptied.
 * @throws {500} If the bulk update fails.
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
 * Moves a folder to a different location within the same project.
 * 
 * This controller handles drag-and-drop or manual move operations in the file explorer UI. 
 * It allows changing a folder's `parentFolderId`, effectively reparenting it. 
 * 
 * Critical security and integrity checks are enforced:
 * - A folder cannot be moved to a different project.
 * - A folder cannot be moved into itself (circular reference).
 * - A folder cannot be moved into its own subfolder (causes a detached cycle in the hierarchy).
 * 
 * Workflow:
 * 1. Validation of the folder and project membership.
 * 2. Validates that the target parent is not the folder itself.
 * 3. Validates the target parent exists, belongs to the same project, and isn't a direct child.
 * 4. Updates `parentFolderId` and `updatedBy`.
 * 5. Saves the folder.
 * 
 * Database Interaction:
 * - Fetches the source `Folder` and its `Project`.
 * - Fetches the target `Folder` to validate location.
 * - Updates and saves the source `Folder`.
 * 
 * Edge Cases:
 * - Attempting a deep circular move (moving A into A/B/C) is partially protected by the direct 
 *   parent check, but deep cycle detection might require full tree traversal.
 * - Target parent is in the trash (not allowed).
 * 
 * @param {Object} req - Express request object containing `req.params.id` and `req.body.parentFolderId`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the move.
 * @throws {400} On invalid move targets (itself, different project, direct subfolder).
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized access.
 * @throws {404} Source or target folder not found.
 * @throws {500} Internal server errors.
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