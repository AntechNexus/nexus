const Project = require("../models/Projects");
const Folder = require("../models/Folder");
const File = require("../models/File");

/**
 * Creates and initializes a new project entity within the application.
 * 
 * This controller orchestrates the creation of a new workspace project. The process initiates by extracting the intended `name`, `description`, and optional `members` list from the request body. It rigorously verifies the identity of the user making the request via the decoded JWT payload to establish ownership (`creatorId`). If the user context is missing, it explicitly blocks the action with a 401 response.
 * 
 * A critical business constraint enforced here is naming uniqueness per user. The controller queries the `Project` collection to ensure the user does not already own an active (non-deleted) project with the exact same name, employing a case-insensitive regex match. If a collision is detected, a 400 Bad Request is returned to prevent duplicate project sprawl.
 * 
 * During instantiation, if no initial members are provided by the client, the controller automatically injects the creator as the default 'owner' member. This guarantees that every project has at least one administrative user with full access rights. The new project object is then constructed and saved to the database.
 * 
 * @param {import('express').Request} req - The Express request object. The body must contain at least a `name` string. Optional fields include `description` and `members`. The authenticated user context must be present.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function for passing errors to the global error handler.
 * @returns {Promise<void>} Resolves upon successful creation. Returns a 201 Created status with a JSON payload structured as `{ success: true, data: { ...projectDetails } }`.
 * @throws {Error} Returns 401 Unauthorized if user context is missing. Returns 400 Bad Request if a project with the same name already exists for the user. Forwards database or unexpected errors to the `next` middleware.
 */
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, members } = req.body;
    const creatorId = req.user?.id || req.user?._id;

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
 * Aggregates and retrieves a comprehensive list of all projects the authenticated user has access to.
 * 
 * This controller serves as the primary data fetcher for the user's main project dashboard. It requires strict authentication; if the `userId` cannot be extracted from the request, it immediately aborts with a 401 status.
 * 
 * The core database query is designed for inclusive access control. It searches the `Project` collection for any active (`isDeleted: false`) projects meeting either of two criteria: 1) The user is the absolute creator/owner of the project, OR 2) The user exists within the `members` array and their membership status is explicitly not 'pending' (meaning they have accepted the invitation).
 * 
 * To provide a rich UI experience, the query leverages Mongoose's `.populate()` extensively. It resolves the `createdBy` and `updatedBy` user references to include email and full name details. Furthermore, it deeply populates the `members.userId` references so the client receives the profiles of all collaborators within each project.
 * 
 * A key post-processing step involves calculating file statistics. The controller iterates through the retrieved, lean project objects and performs secondary aggregate queries against the `File` collection to count the number of active files residing within each respective project. This `fileCount` property is dynamically injected into each project object before dispatching the response.
 * 
 * @param {import('express').Request} req - The Express request object containing the authenticated user's ID.
 * @param {import('express').Response} res - The Express response object.
 * @returns {Promise<void>} Resolves when the retrieval is complete. Returns a 200 OK status with a JSON payload `{ success: true, data: [ ...projects ] }`, where each project object includes populated user data and a dynamically calculated `fileCount`.
 * @throws {Error} Returns 401 Unauthorized if the user is unauthenticated. Returns a 500 Internal Server Error if any of the MongoDB queries or population steps fail.
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
 * Retrieves the detailed profile of a specific project, enforcing strict access controls.
 * 
 * This endpoint is critical for loading a specific project's workspace. It begins by extracting the target `id` from the route parameters and verifying the requester's authentication status.
 * 
 * The database query targets a single active project by its `_id`. Crucially, it chains `.populate()` calls to resolve user profiles for the creator, the last updater, and the array of participating members, providing a complete contextual view of the project's ecosystem. If the queried project does not exist or is marked as deleted, a 404 Not Found response is issued.
 * 
 * Following retrieval, the controller enforces authorization business logic. It evaluates whether the authenticated user has permission to view this specific project. A user is granted access if they are the original creator OR if they are listed in the `members` array with an active (non-pending) status. If these conditions are not met, a 403 Forbidden response is dispatched, preventing unauthorized data exposure.
 * 
 * @param {import('express').Request} req - The Express request object. The target project's ID must be in `req.params.id` and the user's ID must be available via authentication middleware.
 * @param {import('express').Response} res - The Express response object used to deliver the project details.
 * @returns {Promise<void>} Resolves upon successful verification and retrieval. Returns a 200 OK status with `{ success: true, data: { ...project } }` containing the fully populated project document.
 * @throws {Error} Returns 401 Unauthorized if no user ID is found. Returns 404 Not Found if the project doesn't exist. Returns 403 Forbidden if the user lacks membership/ownership rights. Returns 500 Internal Server Error for unexpected database failures.
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
 * Executes a cascading soft-delete operation on a project and its nested entities.
 * 
 * This controller handles the critical destructive action of removing a project. It strictly enforces an ownership-only authorization model; only the user who originally created the project is permitted to delete it. The workflow starts by fetching the project and verifying this ownership rule. If a non-owner attempts the deletion, a 403 Forbidden response is immediately returned.
 * 
 * Rather than physically removing records from the database (hard delete), the system employs a soft-delete strategy for data retention and potential recovery. The target project document is updated by toggling the `isDeleted` flag to true, stamping the `deletedAt` timestamp, and recording the user who performed the action in `updatedBy`.
 * 
 * The business logic extends beyond the project itself. It performs a cascade operation to maintain data consistency. It executes bulk `updateMany` operations against both the `Folder` and `File` collections. Any folder or file whose `projectId` matches the deleted project is also soft-deleted by setting its `status` to 'deleted' and recording the deletion timestamp. This ensures that orphaned files and folders are hidden from the UI alongside the parent project.
 * 
 * @param {import('express').Request} req - The Express request object containing the project ID in `req.params.id`.
 * @param {import('express').Response} res - The Express response object confirming the deletion cascade.
 * @returns {Promise<void>} Resolves when the cascading updates complete. Returns a 200 OK status with a success message and the updated project document.
 * @throws {Error} Returns 401 Unauthorized if unauthenticated. Returns 404 Not Found if the project doesn't exist. Returns 403 Forbidden if the requester is not the project owner. Returns 500 Internal Server Error if the cascading database updates fail.
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
 * Modifies the metadata details (name and description) of an existing project.
 * 
 * This controller manages partial updates to a project's core information. Security rules mandate that only the project's original owner possesses the authority to alter these details. 
 * 
 * The workflow begins by retrieving the active project using the provided ID. If found, it rigorously checks if the `createdBy` field matches the authenticated user's ID. If a collaborator or external user attempts the update, it is blocked with a 403 Forbidden error.
 * 
 * The update process is selective. It inspects the request body for `name` and `description` keys. It only modifies the Mongoose document properties if the corresponding keys are explicitly defined (`!== undefined`) in the payload, allowing clients to update just the name, just the description, or both simultaneously without risking data loss. It also automatically updates the `updatedBy` audit field. Finally, it invokes `.save()` to commit the changes to the database.
 * 
 * @param {import('express').Request} req - The Express request object. Requires the project ID in `req.params.id`. The body may contain optional `name` and `description` strings.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function for error handling.
 * @returns {Promise<void>} Resolves after the save operation. Returns a 200 OK status with `{ success: true, message: "...", data: { ...updatedProject } }`.
 * @throws {Error} Returns 401 if unauthenticated, 404 if project is missing, or 403 if the user is not the owner. Forwards database validation or save errors to the `next` error handler.
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
