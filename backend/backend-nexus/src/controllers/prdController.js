const PRD = require("../models/PRD");
const Project = require("../models/Projects");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require("docx");
const PDFDocument = require("pdfkit");

/**
 * Converts a given project name into a sanitized slug suitable for generating PRD filenames.
 *
 * This utility function takes a raw project name string and normalizes it to ensure it can be safely 
 * used as part of a file name or a URL slug. It trims whitespace, replaces all non-alphanumeric 
 * characters with underscores, and trims any trailing or leading underscores. If the resulting 
 * string is empty, it defaults to "Project".
 * 
 * Business Logic:
 * - Used heavily during the AI PRD generation process where the PRD document needs a physical 
 *   filename (like `PRD_My_Project_V1.docx`). Ensuring filename safety prevents OS-level file creation errors.
 *
 * @param {string} [name="Project"] - The raw project name to be slugified.
 * @param {number} [maxLength=72] - The maximum allowed length of the resulting slug to prevent filesystem length limits.
 * @returns {string} The sanitized, URL-safe and filesystem-safe slug string.
 */
const toPrdProjectSlug = (name = "Project", maxLength = 72) => {
  const slug = String(name)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return (slug || "Project").slice(0, maxLength).replace(/_+$/g, "") || "Project";
};

// Create PRD Data Collection
/**
 * Creates a new Product Requirement Document (PRD) manually in the system.
 * 
 * This controller handles the manual submission of a PRD, bypassing the AI generation flow. 
 * Users can input raw Markdown content which is then saved as a new PRD document tied to a specific project.
 * It enforces authentication and checks whether the user is an active member or creator of the project.
 * 
 * Workflow:
 * 1. Validates that the request comes from an authenticated user.
 * 2. Queries the `Project` model to verify the target project exists and hasn't been deleted.
 * 3. Verifies that the authenticated user is either the project creator or an accepted member.
 * 4. Instantiates a new `PRD` document with the provided data, defaulting the version to 1 if omitted.
 * 5. Saves the new PRD document to the database.
 * 
 * Database Interaction:
 * - Reads from the `Project` collection to validate access controls.
 * - Writes a new document to the `PRD` collection.
 * 
 * Edge Cases:
 * - The provided `projectId` is invalid or refers to a deleted project (returns 404).
 * - The user does not have permission to add PRDs to the target project (returns 403).
 * - Missing required fields (caught by Mongoose validation, throws 500 in the catch block).
 * 
 * @param {Object} req - The Express request object containing `projectId`, `name`, `content`, `rawMarkdown`, `sourceFileIds`, `exportedFileIds`, and `version` in `req.body`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing `success: true` and the newly created PRD `data`.
 * @throws {401} If the user is unauthenticated.
 * @throws {403} If the user lacks access to the project.
 * @throws {404} If the associated project is not found.
 * @throws {500} If saving to the database fails.
 */
exports.createPRD = async (req, res) => {
  try {
    const {
      projectId,
      name,
      content,
      rawMarkdown,
      sourceFileIds,
      exportedFileIds,
      version,
    } = req.body;

    const createdBy = req.user?.id || req.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Pengguna tidak terautentikasi (Silakan sertakan Token JWT pada Header atau createdBy pada Body)",
      });
    }

    // Check project access
    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isMember =
      project.createdBy.toString() === createdBy ||
      project.members.some((m) => m.userId.toString() === createdBy);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied to project" });
    }

    const newPrd = new PRD({
      projectId,
      name,
      version: version || 1,
      content,
      rawMarkdown,
      sourceFileIds: sourceFileIds || [],
      exportedFileIds: exportedFileIds || [],
      createdBy,
    });

    const savedPrd = await newPrd.save();
    return res.status(201).json({
      success: true,
      message: "PRD berhasil disimpan",
      data: savedPrd,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create PRD",
      error: error.message,
    });
  }
};

// Get List of PRDs (with Project Filter)
/**
 * Retrieves a paginated list of all PRDs accessible by the authenticated user.
 * 
 * This controller serves the main list view for PRDs. It aggregates PRDs from all projects where 
 * the user is a member or creator. It supports filtering by a specific project and by the status 
 * of the PRD (e.g., active, trash). Pagination is built-in to handle projects with extensive PRD histories.
 * 
 * Workflow:
 * 1. Checks for user authentication.
 * 2. Queries the `Project` collection to find all project IDs the user has access to.
 * 3. Constructs a query filter for the `PRD` collection based on accessible projects and requested status.
 * 4. If a specific `projectId` is requested, it ensures the user has access to it before applying it to the filter.
 * 5. Executes a paginated, sorted query on the `PRD` collection, populating creator and updater details.
 * 6. Counts the total matching documents to calculate pagination metadata.
 * 
 * Database Interaction:
 * - Queries `Project` using an `$or` clause to find owned or membership projects.
 * - Queries `PRD` with sorting (`updatedAt: -1`), skipping, limiting, and populating `createdBy` and `updatedBy`.
 * 
 * Edge Cases:
 * - A user requests a `projectId` they do not have access to (returns 403).
 * - A user has no projects (returns an empty list safely).
 * 
 * @param {Object} req - The Express request object. Query parameters: `projectId` (optional), `status` (default: 'active'), `page` (default: 1), `limit` (default: 20).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, the `data` array of PRDs, and `pagination` metadata.
 * @throws {401} If the user is unauthenticated.
 * @throws {403} If access to the explicitly requested project is denied.
 * @throws {500} If a database error occurs during retrieval.
 */
exports.getPRDs = async (req, res) => {
  try {
    const { projectId, status = "active", page = 1, limit = 20 } = req.query;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Identify which projects the user has access to
    const userProjects = await Project.find({
      isDeleted: false,
      $or: [{ createdBy: userId }, { "members.userId": userId }],
    }).select("_id");
    const projectIds = userProjects.map((p) => p._id.toString());

    const filter = { status };

    if (projectId) {
      if (!projectIds.includes(projectId.toString())) {
        return res.status(403).json({ success: false, message: "Access denied to project" });
      }
      filter.projectId = projectId;
    } else {
      filter.projectId = { $in: userProjects.map((p) => p._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const prds = await PRD.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    const total = await PRD.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: prds,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve PRD list",
      error: error.message,
    });
  }
};

// Get Single PRD by ID
/**
 * Retrieves comprehensive details of a specific PRD by its ID.
 * 
 * Used primarily for displaying the full content of a PRD, including its generated markdown, 
 * source files used for context, and the exported DOCX/PDF files. It enforces strict security 
 * checks to ensure the user has access to the project containing the PRD, and verifies the PRD 
 * is not permanently deleted.
 * 
 * Workflow:
 * 1. Validates user authentication.
 * 2. Fetches the PRD by its `_id`, heavily populating related fields (`createdBy`, `updatedBy`, `sourceFileIds`, `exportedFileIds`).
 * 3. Validates the PRD exists and is not in a 'deleted' status.
 * 4. Fetches the parent `Project` to verify the user's membership or ownership.
 * 5. If authorized, returns the fully populated PRD document.
 * 
 * Database Interaction:
 * - Single document read on `PRD` with multiple `.populate()` calls for rich relational data.
 * - Single document read on `Project` for authorization.
 * 
 * Edge Cases:
 * - The PRD exists but its parent project was deleted or the user was removed from the project (returns 403).
 * - The PRD is marked as 'deleted' (returns 404).
 * 
 * @param {Object} req - The Express request object containing `req.params.id`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response containing `success: true` and the fully populated PRD `data`.
 * @throws {401} If the user is unauthenticated.
 * @throws {403} If the user lacks access to the parent project.
 * @throws {404} If the PRD or its project is not found.
 * @throws {500} If a database error occurs.
 */
exports.getPRDById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const prd = await PRD.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("sourceFileIds")
      .populate("exportedFileIds");

    if (!prd || prd.status === "deleted") {
      return res.status(404).json({ success: false, message: "PRD not found" });
    }

    // Verify project membership
    const project = await Project.findOne({ _id: prd.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied to PRD's project" });
    }

    return res.status(200).json({ success: true, data: prd });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve PRD details",
      error: error.message,
    });
  }
};

// Update PRD
/**
 * Updates the content or metadata of an existing active PRD.
 * 
 * This controller allows users to edit the name, content, raw markdown, version number, or 
 * associated files of a PRD. It ensures that the PRD is currently 'active' (not trashed or deleted) 
 * before allowing any modifications. It also updates the `updatedBy` field to maintain an audit trail.
 * 
 * Workflow:
 * 1. Verifies the user is authenticated.
 * 2. Retrieves the PRD and confirms its status is 'active'.
 * 3. Retrieves the parent project and confirms the user has access rights.
 * 4. Selectively updates fields on the PRD document based on the provided request body.
 * 5. Records the `userId` in the `updatedBy` field.
 * 6. Saves the updated document to the database.
 * 
 * Database Interaction:
 * - Reads from `PRD` and `Project` collections.
 * - Mutates and saves the `PRD` document.
 * 
 * Edge Cases:
 * - Attempting to update a PRD that is in the trash (returns 404).
 * - Partial updates: only fields explicitly provided in the request body are modified.
 * 
 * @param {Object} req - The Express request object. `req.params.id` contains the PRD ID. `req.body` contains the fields to update (`name`, `content`, `rawMarkdown`, `version`, `sourceFileIds`, `exportedFileIds`).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, a success message, and the updated PRD `data`.
 * @throws {401} If unauthenticated.
 * @throws {403} If unauthorized for the project.
 * @throws {404} If the PRD is missing/inactive or the project is missing.
 * @throws {500} For database update errors.
 */
exports.updatePRD = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, rawMarkdown, version, sourceFileIds, exportedFileIds } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const prd = await PRD.findById(id);
    if (!prd || prd.status !== "active") {
      return res.status(404).json({ success: false, message: "PRD not found or not active" });
    }

    // Verify project membership
    const project = await Project.findOne({ _id: prd.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    prd.updatedBy = userId;

    if (name !== undefined) prd.name = name;
    if (content !== undefined) prd.content = content;
    if (rawMarkdown !== undefined) prd.rawMarkdown = rawMarkdown;
    if (version !== undefined) prd.version = version;
    if (sourceFileIds !== undefined) prd.sourceFileIds = sourceFileIds;
    if (exportedFileIds !== undefined) prd.exportedFileIds = exportedFileIds;

    const updatedPrd = await prd.save();
    return res.status(200).json({
      success: true,
      message: "PRD successfully updated",
      data: updatedPrd,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update PRD",
      error: error.message,
    });
  }
};

// Delete PRD (Hard Delete)
/**
 * Permanently deletes a Product Requirement Document (PRD).
 * 
 * This is a hard-delete operation modeled as a status change to 'deleted' for audit retention. 
 * Once a PRD is marked as deleted via this endpoint, it will no longer appear in standard queries 
 * or the trash bin. Only users with project access can perform this action.
 * 
 * Workflow:
 * 1. Validates the user's authentication and retrieves their ID.
 * 2. Fetches the PRD by ID; rejects if it is already 'deleted'.
 * 3. Fetches the associated project to verify the user is a valid member or owner.
 * 4. Updates the PRD's `status` to 'deleted' and sets the `deletedAt` timestamp to the current time.
 * 5. Saves the updated record to the database.
 * 
 * Database Interaction:
 * - Reads from `PRD` and `Project`.
 * - Mutates the `status` and `deletedAt` fields on the `PRD` document and saves it.
 * 
 * Edge Cases:
 * - The PRD is already deleted (returns 404).
 * - Note: This does not automatically delete associated source or export files in the `File` collection to prevent accidental loss of shared assets.
 * 
 * @param {Object} req - The Express request object containing `req.params.id`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response confirming successful deletion.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} PRD or project not found.
 * @throws {500} Database errors during the save operation.
 */
exports.deletePRD = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const prd = await PRD.findById(id);
    if (!prd || prd.status === "deleted") {
      return res.status(404).json({ success: false, message: "PRD not found" });
    }

    // Verify project membership
    const project = await Project.findOne({ _id: prd.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    prd.status = "deleted";
    prd.deletedAt = new Date();
    await prd.save();

    return res.status(200).json({
      success: true,
      message: "PRD successfully deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete PRD",
      error: error.message,
    });
  }
};

// Move PRD to Trash
/**
 * Moves a specific PRD to the trash (soft delete).
 * 
 * This function changes the PRD's status to 'trash', hiding it from active lists but 
 * allowing it to be recovered later. It is a critical part of the application's data safety mechanism.
 * 
 * Workflow:
 * 1. Checks user authentication.
 * 2. Retrieves the PRD, ensuring it isn't already hard-deleted.
 * 3. Retrieves the parent project to verify the user has access rights.
 * 4. Modifies the PRD's status to 'trash' and records the current timestamp in `deletedAt`.
 * 5. Saves the document.
 * 
 * Database Interaction:
 * - Reads from `PRD` and `Project`.
 * - Updates and saves the `PRD` document.
 * 
 * Edge Cases:
 * - The PRD is already hard-deleted (returns 404).
 * - A background job may eventually purge trashed items based on the `deletedAt` timestamp (depends on DB TTL indexes).
 * 
 * @param {Object} req - The Express request object containing `req.params.id`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response confirming the PRD was moved to trash, along with the updated PRD `data`.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized access.
 * @throws {404} PRD or project not found.
 * @throws {500} Database error.
 */
exports.moveToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const prd = await PRD.findById(id);
    if (!prd || prd.status === "deleted") {
      return res.status(404).json({ success: false, message: "PRD not found" });
    }

    // Verify project membership
    const project = await Project.findOne({ _id: prd.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    prd.status = "trash";
    prd.deletedAt = new Date();
    await prd.save();

    return res.status(200).json({
      success: true,
      message: "PRD successfully moved to trash",
      data: prd,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to move PRD to trash",
      error: error.message,
    });
  }
};

// Restore PRD from Trash
/**
 * Restores a previously trashed PRD back to active status.
 * 
 * If a user accidentally moves a PRD to the trash, this controller allows them to recover it, 
 * provided it hasn't been permanently deleted by the system or another user.
 * 
 * Workflow:
 * 1. Validates authentication.
 * 2. Fetches the PRD by ID and ensures its current status is explicitly 'trash'.
 * 3. Validates the user's access rights to the associated project.
 * 4. Reverts the PRD's status to 'active' and clears the `deletedAt` timestamp (sets to null).
 * 5. Saves the restored document.
 * 
 * Database Interaction:
 * - Reads from `PRD` and `Project`.
 * - Updates and saves the `PRD` document.
 * 
 * Edge Cases:
 * - Attempting to restore a PRD that is currently 'active' or 'deleted' results in a 400 Bad Request.
 * 
 * @param {Object} req - The Express request object containing `req.params.id`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response confirming successful restoration, along with the restored PRD `data`.
 * @throws {400} If the PRD is not currently in the trash.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} Associated project not found.
 * @throws {500} Database error.
 */
exports.restoreFromTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const prd = await PRD.findById(id);
    if (!prd || prd.status !== "trash") {
      return res.status(400).json({ success: false, message: "PRD not in trash" });
    }

    // Verify project membership
    const project = await Project.findOne({ _id: prd.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Associated project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    prd.status = "active";
    prd.deletedAt = null;
    await prd.save();

    return res.status(200).json({
      success: true,
      message: "PRD successfully restored from trash",
      data: prd,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to restore PRD from trash",
      error: error.message,
    });
  }
};

// Get PRDs by Project ID
/**
 * Retrieves a paginated list of all PRDs specifically associated with a given project ID.
 * 
 * This controller powers the project-specific PRD list view. It filters PRDs strictly by the 
 * provided `projectId` parameter while verifying the user's right to view that project. 
 * It supports status filtering (e.g., viewing trashed PRDs for a specific project) and pagination.
 * 
 * Workflow:
 * 1. Checks user authentication.
 * 2. Retrieves the project by ID and validates the user is a creator or member.
 * 3. Constructs the query filter using `projectId` and the requested `status`.
 * 4. Executes a paginated query against the `PRD` collection, sorting by `updatedAt` descending.
 * 5. Populates metadata for the creators and updaters.
 * 6. Calculates total documents for pagination mathematics.
 * 
 * Database Interaction:
 * - Single read on `Project` for security validation.
 * - Paginated read on `PRD` with `populate` and `countDocuments`.
 * 
 * Edge Cases:
 * - An invalid `projectId` or one the user cannot access will immediately reject the request (403/404).
 * 
 * @param {Object} req - The Express request object containing `req.params.projectId` and `req.query` (`status`, `page`, `limit`).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, the paginated `data` array of PRDs, and `pagination` details.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} Project not found.
 * @throws {500} Database retrieval error.
 */
exports.getPRDsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status = "active", page = 1, limit = 20 } = req.query;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Verify project access
    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isMember =
      project.createdBy.toString() === userId ||
      project.members.some((m) => m.userId.toString() === userId);

    if (!isMember) {
      return res.status(403).json({ success: false, message: "Access denied to project" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { projectId, status };

    const prds = await PRD.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    const total = await PRD.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: prds,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve PRDs by project ID",
      error: error.message,
    });
  }
};

// ─── PRD AI Generate Helpers ───────────────────────────────────────────────

// POST /api/prd/generate/save-files
// Save uploaded local files to the project, trigger transcription for audio files
/**
 * Handles the uploading and saving of source files meant for AI PRD generation.
 * 
 * This complex controller serves as the entry point for files (documents, audio, spreadsheets) 
 * uploaded by users as context for generating a new PRD. It processes both newly uploaded files 
 * (via `multer`) and existing files already stored in the Nexus system (via ID references).
 * 
 * For physical file uploads, it performs deduplication checks, calculates storage usage against 
 * the project owner's quota, saves the file to the local filesystem, and registers it in the database. 
 * Crucially, if any uploaded files are audio files (mp3, wav, m4a), it asynchronously triggers an 
 * external transcription service to process them in the background.
 * 
 * Workflow:
 * 1. Validates user and project access.
 * 2. Retrieves the project owner to verify storage limits.
 * 3. Aggregates IDs of already existing Nexus files provided in the request.
 * 4. Iterates through newly uploaded files:
 *    a. Determines file category based on extension.
 *    b. Checks if the file size exceeds the owner's remaining storage limit.
 *    c. Ensures the filename is unique within the project root to prevent collisions.
 *    d. Saves the file buffer to the local disk.
 *    e. Creates a new `File` record in the database.
 *    f. Increments the owner's `storage.usedBytes`.
 * 5. Triggers background asynchronous requests to the Gemini service to transcribe any audio files.
 * 6. Calculates what the next PRD version number should be for UI flow.
 * 
 * Database Interaction:
 * - Reads `Project`, `User` (owner), and `PRD` (for versioning).
 * - Writes new `File` documents.
 * - Mutates `User` (increments storage).
 * 
 * External Calls:
 * - Asynchronous HTTP GET requests via `axios` to the Gemini service (`GEMINI_SERVICE_URL`) for audio transcription.
 * 
 * Edge Cases:
 * - File upload exceeds owner's storage quota (aborts file save, returns 400).
 * - Filename collisions are handled via a loop that appends numerical suffixes e.g., `file (1).txt`.
 * - The transcription service goes down (the error is caught and logged, but the API response remains 200 OK since transcription is async).
 * 
 * @param {Object} req - The Express request object containing `req.body.projectId`, `req.body.nexusFileIds`, and `req.files` (from multer).
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, an array of all `savedFileIds`, and the anticipated `nextVersion`.
 * @throws {400} Missing `projectId` or Storage limit exceeded.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} Project or project owner not found.
 * @throws {500} Filesystem or database failure.
 */
exports.saveFilesToProject = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwnerOrMember = project.createdBy.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isOwnerOrMember) return res.status(403).json({ message: "Access denied to this project" });

    const owner = await User.findById(project.createdBy);
    if (!owner) return res.status(404).json({ message: "Project owner not found" });

    const savedFileIds = [];
    const audioFileIds = [];

    // Handle nexus file IDs (already in DB, just collect them)
    const nexusFileIds = req.body.nexusFileIds ? JSON.parse(req.body.nexusFileIds) : [];
    savedFileIds.push(...nexusFileIds);

    // Handle locally uploaded files
    const uploadedFiles = req.files || [];
    for (const file of uploadedFiles) {
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      const isAudio = ["mp3", "m4a", "wav"].includes(ext);
      const category = isAudio ? "audio" : ext === "xlsx" ? "spreadsheet" : "document";

      // Check storage quota
      const used = owner.storage?.usedBytes || 0;
      const limit = owner.storage?.limitBytes || 4294967296;
      if (used + file.size > limit) {
        return res.status(400).json({ message: `Storage limit exceeded. Cannot save file: ${file.originalname}` });
      }

      // Check for originalName deduplication
      let finalOriginalName = file.originalname;
      let counter = 1;
      const lastDotIndex = finalOriginalName.lastIndexOf('.');
      const nameExt = lastDotIndex !== -1 ? finalOriginalName.substring(lastDotIndex) : '';
      const baseName = lastDotIndex !== -1 ? finalOriginalName.substring(0, lastDotIndex) : finalOriginalName;

      while (true) {
        const existingFile = await File.findOne({ 
          projectId, 
          folderId: null, 
          originalName: finalOriginalName, 
          status: { $ne: 'deleted' } 
        });
        if (!existingFile) break;
        finalOriginalName = `${baseName} (${counter})${nameExt}`;
        counter++;
      }

      // Generate unique filename for storage
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileName = `${uniqueSuffix}-${finalOriginalName}`;
      const uploadDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const localPath = path.join(uploadDir, fileName);
      fs.writeFileSync(localPath, file.buffer);

      const newFile = new File({
        projectId,
        folderId: null,
        createdBy: userId,
        fileName,
        originalName: finalOriginalName,
        fileType: ext,
        category,
        sizeBytes: file.size,
        fileUrl: `/uploads/${fileName}`,
        localPath,
        status: "active",
      });

      const savedFile = await newFile.save();
      await User.updateOne({ _id: project.createdBy }, { $inc: { "storage.usedBytes": file.size } });
      savedFileIds.push(savedFile._id.toString());
      if (isAudio) audioFileIds.push(savedFile._id.toString());
    }

    // Trigger transcription for audio files in the background
    if (audioFileIds.length > 0) {
      const GEMINI_URL = process.env.GEMINI_SERVICE_URL || "http://localhost:5001";
      const axios = require("axios").default;
      audioFileIds.forEach(fileId => {
        axios.get(`${GEMINI_URL}/api/files/${fileId}/transcribe`, {
          headers: { Authorization: req.headers.authorization }
        }).catch(err => {
          console.error(`Auto-transcribe failed for file ${fileId}:`, err.message);
        });
      });
    }

    const latestPrd = await PRD.findOne({ projectId })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const nextVersion = (latestPrd?.version || 0) + 1;

    return res.status(200).json({ success: true, savedFileIds, nextVersion });
  } catch (error) {
    console.error("saveFilesToProject error:", error);
    return res.status(500).json({ message: "Failed to save files to project", error: error.message });
  }
};

// POST /api/prd/generate/save
// Generate DOCX + PDF from raw Markdown, create a folder in the project, save PRD record
/**
 * Saves a newly AI-generated PRD, compiling it into physical DOCX and PDF documents.
 * 
 * This heavy-lifting controller takes raw Markdown generated by the AI, parses it, and uses it 
 * to construct a fully formatted Microsoft Word document (`docx`) and a PDF document (`pdfkit`).
 * These generated files are then saved to the local disk, registered in the database under a 
 * newly created project folder, and finally linked to a new `PRD` database record.
 * 
 * Workflow:
 * 1. Validates user, project access, and required payload (`rawMarkdown`, `projectId`).
 * 2. Determines the next PRD version number and constructs a safe, slugified folder and file base name.
 * 3. Finds or creates a dedicated directory (`Folder`) within the project to house the exported files.
 * 4. DOCX Generation: Parses markdown lines, mapping `#`, `##`, `###`, and list items into `docx` paragraph components, then writes the buffer to disk.
 * 5. PDF Generation: Uses `pdfkit` to draw the markdown content onto a PDF canvas. It sanitizes Unicode characters first to prevent standard font (Helvetica) rendering crashes. Writes to disk via a WriteStream.
 * 6. Creates two new `File` database records representing the exported DOCX and PDF files.
 * 7. Increments the project owner's storage quota based on the size of the generated files.
 * 8. Creates a new `PRD` document linking the raw markdown, the source files used for context, and the newly generated export files.
 * 
 * Database Interaction:
 * - Reads `Project`, `PRD` (for versioning), `Folder`, and `User` (owner).
 * - Creates a new `Folder` (if it doesn't exist).
 * - Creates two new `File` documents.
 * - Increments `storage.usedBytes` on the `User` document.
 * - Creates one new `PRD` document.
 * 
 * Edge Cases:
 * - Unicode characters in the Markdown (like smart quotes or emojis) can crash PDFKit; a sanitization regex strips them.
 * - High CPU/Memory usage during concurrent PDF/DOCX generation.
 * - Filesystem write permissions could fail, causing a 500 error before database insertion.
 * 
 * @param {Object} req - The Express request object containing `req.body.rawMarkdown`, `req.body.projectId`, and `req.body.sourceFileIds`.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `success: true`, the new `prdId`, `folderId`, `projectId`, and the `exportedFileIds`.
 * @throws {400} Missing raw markdown or project ID.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} Project not found.
 * @throws {500} Document generation, filesystem, or database errors.
 */
exports.saveGeneratedPrd = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { rawMarkdown, projectId, sourceFileIds } = req.body;
    if (!rawMarkdown || !projectId) {
      return res.status(400).json({ message: "rawMarkdown and projectId are required" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwnerOrMember = project.createdBy.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isOwnerOrMember) return res.status(403).json({ message: "Access denied to this project" });

    const latestPrd = await PRD.findOne({ projectId })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const nextVersion = (latestPrd?.version || 0) + 1;
    const safeName = `PRD_${toPrdProjectSlug(project.name)}_V${nextVersion}`;
    const folderName = safeName;

    let savedFolder = await Folder.findOne({ projectId, name: folderName, isDeleted: false });
    if (!savedFolder) {
      const newFolder = new Folder({
        projectId,
        parentFolderId: null,
        name: folderName,
        path: `/${folderName}`,
        level: 1,
        createdBy: userId,
        status: "active",
      });
      savedFolder = await newFolder.save();
    }

    // ── Generate DOCX ──────────────────────────────────────────────────────
    const lines = rawMarkdown.split("\n").map(line => line.replace(/\*\*/g, ""));
    const docChildren = [];
    for (let line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("# ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: trimmedLine.replace(/^# /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_1, 
          alignment: AlignmentType.LEFT 
        }));
      } else if (trimmedLine.startsWith("## ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: trimmedLine.replace(/^## /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_2 
        }));
      } else if (trimmedLine.startsWith("### ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: trimmedLine.replace(/^### /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_3 
        }));
      } else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        docChildren.push(new Paragraph({ text: trimmedLine.replace(/^[-*] /, ""), bullet: { level: 0 } }));
      } else if (trimmedLine === "---") {
        docChildren.push(new Paragraph({ text: "" }));
      } else {
        docChildren.push(new Paragraph({ children: [new TextRun({ text: trimmedLine, size: 24 })] }));
      }
    }

    const docxDoc = new Document({ sections: [{ children: docChildren }] });
    const docxBuffer = await Packer.toBuffer(docxDoc);
    const docxFileName = `${Date.now()}-${safeName}.docx`;
    const exportDir = path.join(__dirname, "../../uploads/prd-exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const docxPath = path.join(exportDir, docxFileName);
    fs.writeFileSync(docxPath, docxBuffer);

    // ── Generate PDF ──────────────────────────────────────────────────────
    const pdfFileName = `${Date.now()}-${safeName}.pdf`;
    const pdfPath = path.join(exportDir, pdfFileName);
    await new Promise((resolve, reject) => {
      const pdfDoc = new PDFDocument({ margin: 50 });
      const pdfStream = fs.createWriteStream(pdfPath);
      pdfDoc.pipe(pdfStream);
      pdfDoc.fontSize(10).font("Helvetica");
      for (let line of lines) {
        // Sanitize Unicode characters that crash PDFKit's standard Helvetica font (WinAnsiEncoding)
        line = line
          .replace(/[\u2018\u2019]/g, "'") // curly single quotes
          .replace(/[\u201C\u201D]/g, '"') // curly double quotes
          .replace(/[\u2013\u2014]/g, "-") // en and em dashes
          .replace(/…/g, "...")
          .replace(/[^\x00-\x7F]/g, ""); // strip all other non-ascii characters

        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("# ")) {
          pdfDoc.fontSize(18).font("Helvetica-Bold").text(trimmedLine.replace(/^# /, ""), { align: "left" }).moveDown(0.5);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (trimmedLine.startsWith("## ")) {
          pdfDoc.fontSize(14).font("Helvetica-Bold").text(trimmedLine.replace(/^## /, "")).moveDown(0.3);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (trimmedLine.startsWith("### ")) {
          pdfDoc.fontSize(12).font("Helvetica-Bold").text(trimmedLine.replace(/^### /, "")).moveDown(0.3);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (trimmedLine === "---") {
          pdfDoc.moveDown(0.5);
        } else if (trimmedLine) {
          if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
            pdfDoc.text(trimmedLine.replace(/^[-*] /, "- "), { align: "left", indent: 15 }).moveDown(0.2);
          } else {
            pdfDoc.text(trimmedLine, { align: "left" }).moveDown(0.2);
          }
        }
      }
      pdfDoc.end();
      pdfStream.on("finish", resolve);
      pdfStream.on("error", reject);
    });

    // ── Save File records for DOCX + PDF ───────────────────────────────────
    const owner = await User.findById(project.createdBy);
    const docxSize = fs.statSync(docxPath).size;
    const pdfSize = fs.statSync(pdfPath).size;

    const [docxFile, pdfFile] = await Promise.all([
      File.create({
        projectId,
        folderId: savedFolder._id,
        createdBy: userId,
        fileName: docxFileName,
        originalName: `${safeName}.docx`,
        fileType: "docx",
        category: "prd",
        sizeBytes: docxSize,
        fileUrl: `/uploads/prd-exports/${docxFileName}`,
        localPath: docxPath,
        status: "active",
      }),
      File.create({
        projectId,
        folderId: savedFolder._id,
        createdBy: userId,
        fileName: pdfFileName,
        originalName: `${safeName}.pdf`,
        fileType: "pdf",
        category: "prd",
        sizeBytes: pdfSize,
        fileUrl: `/uploads/prd-exports/${pdfFileName}`,
        localPath: pdfPath,
        status: "active",
      }),
    ]);

    // Increment storage usage for owner
    await User.updateOne({ _id: project.createdBy }, { $inc: { "storage.usedBytes": docxSize + pdfSize } });

    // ── Save PRD record ───────────────────────────────────────────────────
    const newPrd = new PRD({
      projectId,
      name: safeName,
      version: nextVersion,
      rawMarkdown,
      content: { markdown: rawMarkdown },
      sourceFileIds: sourceFileIds || [],
      exportedFileIds: [docxFile._id, pdfFile._id],
      createdBy: userId,
    });
    const savedPrd = await newPrd.save();

    return res.status(201).json({
      success: true,
      prdId: savedPrd._id,
      folderId: savedFolder._id,
      projectId,
      exportedFiles: [
        { id: docxFile._id, name: docxFile.originalName, type: "docx" },
        { id: pdfFile._id, name: pdfFile.originalName, type: "pdf" },
      ],
    });
  } catch (error) {
    console.error("saveGeneratedPrd error:", error);
    return res.status(500).json({ message: "Failed to save PRD", error: error.message });
  }
};
