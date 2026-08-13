const File = require("../models/File");
const Project = require("../models/Projects");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { recordFileAccess } = require("../services/fileServices");
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

/**
 * Parses and extracts text or HTML content from a given document file based on its MIME/extension type.
 *
 * This utility leverages external libraries (`pdf-parse`, `mammoth`, `xlsx`) to read binary 
 * document files from the local filesystem and extract their readable content. This extracted 
 * content is crucial for the application's AI features, such as passing context to LLMs or 
 * generating embeddings for vector search.
 * 
 * Business Logic:
 * - PDF files are converted to raw text.
 * - Word documents (.docx) are converted into HTML strings to preserve basic formatting.
 * - Excel spreadsheets (.xlsx) iterate through all sheets and convert tabular data into HTML tables.
 * 
 * Edge Cases:
 * - If the file format is corrupted or unsupported, the underlying parsing library may throw an error. 
 *   This function catches these errors, logs them, and returns `null` so the file upload process 
 *   doesn't crash completely (the file is still saved, just without searchable content).
 *
 * @param {string} filePath - The absolute local filesystem path to the saved file.
 * @param {string} fileType - The extension identifier of the file (e.g., 'pdf', 'docx', 'xlsx').
 * @returns {Promise<string|null>} A promise resolving to the extracted text/HTML string, or null on failure.
 */
async function parseDocumentContent(filePath, fileType) {
  try {
    if (fileType === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else if (fileType === 'docx') {
      const result = await mammoth.convertToHtml({ path: filePath });
      return result.value;
    } else if (fileType === 'xlsx') {
      const workbook = xlsx.readFile(filePath);
      let html = "<div>";
      for (const sheetName of workbook.SheetNames) {
        html += `<h3>${sheetName}</h3>`;
        const sheet = workbook.Sheets[sheetName];
        html += xlsx.utils.sheet_to_html(sheet);
      }
      html += "</div>";
      return html;
    }
  } catch (error) {
    console.error("Error parsing document:", error);
  }
  return null;
}

/**
 * Generates a unique file name to avoid collisions within a specific project directory.
 *
 * This function ensures that if a user uploads a file with a name that already exists in 
 * the target folder, the new file gets a numerical suffix (e.g., `report (1).pdf`, `report (2).pdf`).
 * It mimics standard OS behavior for duplicate files.
 * 
 * Workflow:
 * 1. Separates the base name from the extension.
 * 2. Uses a `while (true)` loop to query the `File` collection.
 * 3. Checks if an active file with the proposed name exists in the specific `projectId` and `folderId`.
 * 4. Increments a counter and modifies the proposed name until a unique name is found.
 * 
 * Database Interaction:
 * - Executes a `.findOne` query on the `File` model inside a loop. (Performance note: this is acceptable 
 *   because collisions are relatively rare and usually resolve in 1-2 iterations).
 *
 * @param {string} projectId - The ID of the project the file belongs to.
 * @param {string|null} folderId - The ID of the parent folder, or null if placed in the root.
 * @param {string} originalName - The original name of the uploaded file including its extension.
 * @returns {Promise<string>} A promise resolving to a guaranteed unique file name string.
 */
async function getUniqueFileName(projectId, folderId, originalName) {
  let fileName = originalName;
  let counter = 1;
  const lastDotIndex = originalName.lastIndexOf('.');
  const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '';
  const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;

  while (true) {
    const existingFile = await File.findOne({ 
      projectId, 
      folderId: folderId || null, 
      originalName: fileName, 
      status: 'active' 
    });
    if (!existingFile) {
      break;
    }
    fileName = `${baseName} (${counter})${ext}`;
    counter++;
  }
  return fileName;
}

/**
 * Safely extracts the file extension from a given file name string.
 *
 * A lightweight utility that finds the last period in a string and returns the substring 
 * from that period to the end. It ensures that files without extensions or hidden files 
 * (like `.gitignore`) are handled predictably.
 *
 * @param {string} [fileName=""] - The full file name string to parse.
 * @returns {string} The file extension including the dot (e.g., ".txt"), or an empty string if no extension exists.
 */
const getFileExtension = (fileName = "") => {
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : "";
};

/**
 * Evaluates and increments the storage usage for a project owner before a file upload.
 *
 * This function acts as the primary quota enforcement mechanism. Before allowing a file to 
 * be saved, it retrieves the project owner's current storage usage and limit. If the new 
 * file would exceed the limit, it rejects the operation and triggers a 'Storage Penuh' notification.
 * 
 * Furthermore, it proactively monitors storage health. If adding this file pushes the user's 
 * usage across the 90% threshold for the first time, it dispatches a 'Storage Hampir Penuh' warning.
 * 
 * Workflow:
 * 1. Fetches the project owner's `User` record.
 * 2. Checks if `usedBytes + fileSize > limitBytes`. If true, sends a full storage notification and returns false.
 * 3. Calculates the pre-upload and post-upload usage percentages.
 * 4. Increments the `storage.usedBytes` field on the `User` document.
 * 5. If the new percentage crosses the 90% mark (but wasn't over 90% before), sends a warning notification.
 * 
 * Database Interaction:
 * - Reads `User`.
 * - Executes `$inc` update on `User`.
 * - Creates `Notification` documents.
 * 
 * Edge Cases:
 * - If the owner's limit is undefined, it defaults to 4GB (4294967296 bytes).
 *
 * @param {string} ownerId - The ID of the user who owns the project.
 * @param {number} fileSize - The size of the incoming file in bytes.
 * @returns {Promise<boolean>} True if storage is sufficient (and successfully incremented), false if the quota is exceeded.
 */
async function checkAndIncrementStorage(ownerId, fileSize) {
  const owner = await User.findById(ownerId);
  if (!owner) throw new Error("Project owner not found");

  const used = owner.storage?.usedBytes || 0;
  const limit = owner.storage?.limitBytes || 4294967296;

  if (used + fileSize > limit) {
    // Send full storage notification
    await Notification.create({
      recipientId: ownerId,
      createdBy: ownerId,
      type: "storage_warning",
      title: "Storage Penuh",
      message: "Kapasitas penyimpanan Anda sudah penuh. File baru gagal diunggah.",
      status: "pending",
      isRead: false
    });
    return false; // Not enough space
  }

  const prevPercent = used / limit;
  const newUsed = used + fileSize;
  const newPercent = newUsed / limit;

  // Increment usage
  await User.updateOne({ _id: ownerId }, { $inc: { 'storage.usedBytes': fileSize } });

  // Send warning if it crosses 90%
  if (newPercent >= 0.9 && prevPercent < 0.9) {
    await Notification.create({
      recipientId: ownerId,
      createdBy: ownerId,
      type: "storage_warning",
      title: "Storage Hampir Penuh",
      message: "Kapasitas penyimpanan Anda sudah terpakai 90%. Segera kosongkan Trash atau perbarui layanan Anda.",
      status: "pending",
      isRead: false
    });
  }

  return true;
}

/**
 * Decrements the tracked storage usage for a specific user.
 *
 * Used primarily when files are permanently deleted. It refunds the byte size of the deleted 
 * file back to the user's available quota by decrementing the `storage.usedBytes` field.
 * 
 * Edge Cases:
 * - Ignores zero or negative byte amounts to prevent accidental artificial storage increases.
 *
 * @param {string} ownerId - The ID of the user whose storage is being refunded.
 * @param {number} amountBytes - The positive integer amount of bytes to subtract from their usage.
 * @returns {Promise<void>} Resolves when the database update is complete.
 */
async function decrementStorage(ownerId, amountBytes) {
  if (amountBytes <= 0) return;
  await User.updateOne({ _id: ownerId }, { $inc: { 'storage.usedBytes': -amountBytes } });
}

// Create / Upload File Metadata and File
/**
 * Handles the upload and creation of a new file record within the system.
 * 
 * This controller serves as the main endpoint for user file uploads. It orchestrates file 
 * validation, project authorization, storage quota enforcement, content extraction, and AI 
 * embedding generation.
 * 
 * Workflow:
 * 1. Validates the presence of `req.file` (handled by `multer` middleware).
 * 2. Authenticates the user and verifies they belong to the target project.
 * 3. Identifies the project owner and enforces their storage quota via `checkAndIncrementStorage`.
 * 4. Generates a collision-free filename using `getUniqueFileName`.
 * 5. Extracts readable content from the document via `parseDocumentContent`.
 * 6. Creates and saves the new `File` document in MongoDB.
 * 7. Records the user's interaction in their recent files history.
 * 8. Asynchronously triggers an internal HTTP request to the Gemini service to generate AI embeddings 
 *    for the extracted content, enabling semantic search later.
 * 
 * Database Interaction:
 * - Reads `Project`.
 * - Reads/Updates `User` (via storage helper).
 * - Creates `File`.
 * - (Service Call) Creates embedding records in a separate microservice.
 * 
 * Edge Cases:
 * - Multer fails to attach the file (returns 400).
 * - Storage quota exceeded (returns 400 with specific message).
 * - Background embedding request fails (logged, but doesn't crash the upload response).
 * 
 * @param {Object} req - The Express request object containing form-data: `projectId`, `folderId`, `fileType`, `category`, and the `req.file` buffer.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with `message: "File berhasil disimpan"` and the saved file `data`.
 * @throws {400} On missing file or storage limit exceeded.
 * @throws {401} Unauthenticated user.
 * @throws {403} Unauthorized project access.
 * @throws {404} Project not found.
 * @throws {500} Server, filesystem, or database errors.
 */
exports.createFile = async (req, res) => {
  try {
    const {
      projectId,
      folderId,
      fileType,
      category,
      version,
      previousVersionId,
    } = req.body;

    const createdBy = req.user?.id || req.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        message: "Pengguna tidak terautentikasi (Silakan sertakan Token JWT pada Header atau createdBy pada Body)",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    // Check project access
    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const isMember = project.createdBy.toString() === createdBy || project.members.some(m => m.userId.toString() === createdBy && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to project" });
    }

    const originalName = req.file.originalname;
    const sizeBytes = req.file.size;
    const localPath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`; // Or a real URL if served statically

    // Check storage limits against project owner
    const ownerId = project.createdBy.toString();
    const isStorageSufficient = await checkAndIncrementStorage(ownerId, sizeBytes);
    if (!isStorageSufficient) {
      return res.status(400).json({ message: "Storage limit exceeded. You do not have enough space to upload this file. Please empty your trash or upgrade your storage plan." });
    }

    const fileName = await getUniqueFileName(projectId, folderId, originalName);
    const content = await parseDocumentContent(localPath, fileType);

    const newFile = new File({
      projectId,
      folderId: folderId || null,
      createdBy,
      fileName,
      originalName: fileName,
      fileType,
      category,
      sizeBytes,
      fileUrl,
      localPath,
      content,
      version: version || 1,
      previousVersionId: previousVersionId || null,
      status: "active",
    });

    const savedFile = await newFile.save();

    // Record recent file access
    await recordFileAccess(createdBy, savedFile._id, projectId);

    // Trigger Embedding Generation asynchronously
    if (content) {
      const GEMINI_URL = process.env.GEMINI_SERVICE_URL || "http://localhost:5001";
      const axios = require("axios").default;
      axios.post(`${GEMINI_URL}/api/embeddings/generate`, {
        text: content,
        projectId: savedFile.projectId,
        fileId: savedFile._id,
        createdBy: savedFile.createdBy
      }, {
        headers: { Authorization: req.headers.authorization }
      }).catch(err => {
        console.error(`Auto-embedding failed for file ${savedFile._id}:`, err.message);
      });
    }

    return res.status(201).json({
      message: "File berhasil disimpan",
      data: savedFile,
    });
  } catch (error) {
    fs.writeFileSync('last_error.log', error.stack || error.message);
    return res.status(500).json({
      message: "Failed to create file",
      error: error.message,
    });
  }
};

// Get List Files (Filtered by project, folder, status, category, search)
/**
 * Retrieves a paginated list of files accessible to the user, with extensive filtering options.
 * 
 * This endpoint powers the main file explorer list views. It aggregates files across all projects 
 * the user has access to, or narrows it down to a specific project or folder. It supports 
 * filtering by category, status (active, trash), and keyword search against the filename.
 * 
 * Workflow:
 * 1. Verifies authentication.
 * 2. Fetches all projects the user is affiliated with.
 * 3. Constructs a dynamic Mongoose filter object:
 *    - Validates `projectId` against accessible projects.
 *    - Applies `folderId`, `category`, and `status`.
 *    - Injects a `$regex` for the `fileName` if a `search` query is provided.
 * 4. Executes a paginated `find` query, sorted by `updatedAt` descending.
 * 5. Populates creator/updater metadata.
 * 
 * Database Interaction:
 * - Queries `Project` to build an allowed `projectId` list.
 * - Paginated, sorted query on `File` with `.populate()` and `.countDocuments()`.
 * 
 * Edge Cases:
 * - User requests files for a project they aren't part of (returns 403).
 * - A 'null' folderId string is converted to actual `null` to query the root directory.
 * 
 * @param {Object} req - Express request object containing query params: `projectId`, `folderId`, `status`, `category`, `search`, `page`, `limit`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing the `data` array and `pagination` metrics.
 * @throws {401} Unauthenticated.
 * @throws {403} Access denied to project.
 * @throws {500} Database retrieval error.
 */
exports.getFiles = async (req, res) => {
  try {
    const {
      projectId,
      folderId,
      status = "active",
      category,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Only get files for projects the user has access to
    const userProjects = await Project.find({
      isDeleted: false,
      $or: [{ createdBy: userId }, { "members.userId": userId }]
    }).select("_id");
    const projectIds = userProjects.map(p => p._id);

    const filter = { status };

    if (projectId) {
      if (!projectIds.some(pId => pId.toString() === projectId.toString())) {
        return res.status(403).json({ message: "Access denied to project" });
      }
      filter.projectId = projectId;
    } else {
      filter.projectId = { $in: projectIds };
    }

    if (folderId !== undefined) {
      filter.folderId = folderId === "null" || folderId === "" ? null : folderId;
    }
    if (category) filter.category = category;
    if (search) {
      filter.fileName = { $regex: search, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await File.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "profile email")
      .populate("updatedBy", "profile email");

    const total = await File.countDocuments(filter);

    return res.status(200).json({
      data: files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve the file list",
      error: error.message,
    });
  }
};

// Get Single File by ID
/**
 * Retrieves full details of a specific file by its ID, with dynamic content extraction.
 * 
 * Used when a user clicks on a file to view its details or preview it. It ensures the file 
 * isn't in the trash or deleted, validates project access, and logs the access event for "recent files".
 * 
 * Crucially, it acts as a fallback or self-healing mechanism for content parsing: if the file 
 * was somehow saved without its text content extracted, this function attempts to parse it on-the-fly, 
 * save the content to the DB, and trigger the background embedding service.
 * 
 * Workflow:
 * 1. Fetches the file and populates user metadata and previous version history.
 * 2. Rejects if the file is trashed/deleted (404).
 * 3. Verifies user membership in the parent project (403).
 * 4. Records the read operation via `recordFileAccess`.
 * 5. Self-Healing Block: If `file.content` is missing but the physical file exists, it runs `parseDocumentContent`.
 *    - If successful, it updates the DB and triggers the Gemini embedding API asynchronously.
 * 
 * Database Interaction:
 * - Read/Populate `File`.
 * - Read `Project`.
 * - Mutates `File` (only if content was missing).
 * 
 * Edge Cases:
 * - Physical file missing from local path during self-healing (fails silently, just returns DB data).
 * - Embedding service unreachable (fails silently).
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response with `data` containing the fully populated file document.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized project access.
 * @throws {404} File not found or trashed.
 * @throws {500} Server or database errors.
 */
exports.getFileById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("previousVersionId");

    if (!file || file.status === "deleted" || file.status === "trash") {
      return res.status(404).json({ message: "File not found or has been moved to trash" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to file's project" });
    }

    // Record recent file access
    await recordFileAccess(userId, file._id, file.projectId);

    if (!file.content && file.fileType && file.localPath) {
      const fs = require('fs');
      if (fs.existsSync(file.localPath)) {
        const extractedContent = await parseDocumentContent(file.localPath, file.fileType);
        if (extractedContent) {
          file.content = extractedContent;
          await file.save();

          const GEMINI_URL = process.env.GEMINI_SERVICE_URL || "http://localhost:5001";
          const axios = require("axios").default;
          axios.post(`${GEMINI_URL}/api/embeddings/generate`, {
            text: extractedContent,
            projectId: file.projectId,
            fileId: file._id,
            createdBy: file.createdBy
          }, {
            headers: { Authorization: req.headers.authorization }
          }).catch(err => {
            console.error(`Auto-embedding failed for dynamically extracted file ${file._id}:`, err.message);
          });
        }
      }
    }

    return res.status(200).json({ data: file });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve file details",
      error: error.message,
    });
  }
};

// Get Files by Project ID
/**
 * Retrieves all files associated with a specific project, with pagination and filtering.
 * 
 * A specialized endpoint for fetching files strictly within a single project context, completely 
 * ignoring folder structures (a flat view). Useful for global project searches or category aggregations.
 * 
 * Workflow:
 * 1. Verifies the user has access to the target `projectId`.
 * 2. Constructs a filter object using `projectId`, `status`, `category`, and `search` query parameters.
 * 3. Executes a paginated `find` query on the `File` collection, sorted by update time.
 * 4. Populates creator and updater fields.
 * 
 * Database Interaction:
 * - Single read on `Project` for security validation.
 * - Paginated read on `File` with count.
 * 
 * Edge Cases:
 * - Invalid project or unauthorized user (returns 403/404).
 * 
 * @param {Object} req - Express request object containing `req.params.projectId` and query params (`status`, `category`, `search`, `page`, `limit`).
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing `data` array and `pagination` metrics.
 * @throws {401} Unauthenticated.
 * @throws {403} Forbidden project access.
 * @throws {404} Project not found.
 * @throws {500} Database errors.
 */
exports.getFilesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status = "active", category, search, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to project" });
    }

    const filter = { projectId, status };
    if (category) filter.category = category;
    if (search) filter.fileName = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await File.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "profile email")
      .populate("updatedBy", "profile email");

    const total = await File.countDocuments(filter);

    return res.status(200).json({
      data: files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve files by project ID",
      error: error.message,
    });
  }
};

// Get Files by Folder ID
/**
 * Retrieves all files located strictly within a specific folder (or root project directory).
 * 
 * This controller powers the specific folder view in the file explorer. It dynamically handles 
 * the concept of a "root" folder (where `folderId` is null). If fetching the root, the client MUST 
 * provide a `projectId` in the query to specify *which* project's root they are requesting.
 * 
 * Workflow:
 * 1. Normalizes the `folderId` (translating strings like "null" or "root" to actual `null`).
 * 2. If a specific `folderId` is requested, it fetches the folder, verifies project access, and sets the filter.
 * 3. If requesting root (`folderId` is null), it demands `projectId` from the query, verifies access, and sets the filter.
 * 4. Applies pagination, search, and category filters.
 * 5. Executes the query and returns populated results.
 * 
 * Database Interaction:
 * - Read `Folder` and `Project` for authorization.
 * - Paginated read on `File`.
 * 
 * Edge Cases:
 * - Requesting root files without specifying a `projectId` results in a 400 Bad Request (system wouldn't know which root to fetch).
 * - Target folder deleted or inaccessible (returns 404/403).
 * 
 * @param {Object} req - Express request object containing `req.params.folderId` and optional queries (`projectId`, `status`, `category`, `search`, `page`, `limit`).
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing `data` array and `pagination` metrics.
 * @throws {400} Missing `projectId` when requesting root.
 * @throws {401} Unauthenticated.
 * @throws {403} Forbidden access.
 * @throws {404} Folder or project not found.
 * @throws {500} Database errors.
 */
exports.getFilesByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { status = "active", category, search, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Menangani kasus 'root' folder (folderId === 'null' atau 'root')
    const parsedFolderId = folderId === "null" || folderId === "root" ? null : folderId;

    const filter = { folderId: parsedFolderId, status };

    if (parsedFolderId) {
      const folder = await Folder.findById(parsedFolderId);
      if (!folder) return res.status(404).json({ message: "Folder not found" });
      const project = await Project.findOne({ _id: folder.projectId, isDeleted: false });
      if (!project) return res.status(404).json({ message: "Associated project not found" });
      const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
      if (!isMember) return res.status(403).json({ message: "Access denied" });
      filter.projectId = folder.projectId;
    } else {
      // If folder is root, they MUST pass projectId in query to identify which project's root folder they want.
      const { projectId } = req.query;
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required when retrieving root folder files" });
      }
      const project = await Project.findOne({ _id: projectId, isDeleted: false });
      if (!project) return res.status(404).json({ message: "Project not found" });
      const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
      if (!isMember) return res.status(403).json({ message: "Access denied" });
      filter.projectId = projectId;
    }

    if (category) filter.category = category;
    if (search) filter.fileName = { $regex: search, $options: "i" };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const files = await File.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("createdBy", "profile email")
      .populate("updatedBy", "profile email");

    const total = await File.countDocuments(filter);

    return res.status(200).json({
      data: files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to retrieve files by folder ID",
      error: error.message,
    });
  }
};

// Update File Metadata (rename / move folder / updatedBy)
/**
 * Updates the metadata of a specific file (e.g., renaming or moving to a different folder).
 * 
 * This endpoint handles file mutation without altering the file's physical content. It allows 
 * renaming the file and changing its parent folder (`folderId`).
 * 
 * Critical Logic:
 * - It strictly enforces that a file's physical extension cannot be altered during a rename operation, 
 *   as this would break content-type rendering and parsing logic downstream. It automatically appends 
 *   the original extension if the user tries to remove or change it.
 * 
 * Workflow:
 * 1. Fetches the active file and verifies user project membership.
 * 2. Updates `updatedBy` for audit trailing.
 * 3. If `fileName` is provided, it extracts the original extension and enforces it on the new name.
 * 4. If `folderId` is provided, it reparents the file (translates empty string to root/null).
 * 5. Saves the updated file document.
 * 6. Records the action as a recent file access.
 * 
 * Database Interaction:
 * - Reads `File` and `Project`.
 * - Mutates and saves `File`.
 * 
 * Edge Cases:
 * - User attempts to rename `report.pdf` to `report.docx` -> The system forces it back to `report.docx.pdf` or similar to preserve the true extension.
 * - Moving to a folder that belongs to a different project is not currently cross-checked strictly here, assuming frontend constraints.
 * 
 * @param {Object} req - Express request object containing `req.params.id` and `req.body` (`fileName`, `folderId`, `updatedBy`).
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the update.
 * @throws {400} On malicious extension change attempts.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized access.
 * @throws {404} File or project not found.
 * @throws {500} Database error.
 */
exports.updateFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, folderId, updatedBy } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findById(id);
    if (!file || file.status !== "active") {
      return res.status(404).json({ message: "File not found or not active" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Set attribute updatedBy dengan user yang melakukan update (dari token JWT atau body)
    const updaterId = userId || updatedBy;
    if (updaterId) {
      file.updatedBy = updaterId;
    }

    if (fileName !== undefined) {
      const currentExtension = getFileExtension(file.originalName || file.fileName);
      const requestedExtension = getFileExtension(fileName);

      if (currentExtension && requestedExtension && requestedExtension.toLowerCase() !== currentExtension.toLowerCase()) {
        return res.status(400).json({ message: "File type cannot be changed during rename." });
      }

      const nextBaseName = requestedExtension ? fileName.slice(0, -requestedExtension.length) : fileName;
      const safeFileName = `${nextBaseName}${currentExtension || requestedExtension}`;
      file.fileName = safeFileName;
      file.originalName = safeFileName;
    }
    if (folderId !== undefined) file.folderId = folderId === "" ? null : folderId;

    const updatedFile = await file.save();

    // Record recent file access
    await recordFileAccess(userId, updatedFile._id, updatedFile.projectId);
    return res.status(200).json({
      message: "File successfully updated",
      data: updatedFile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update file",
      error: error.message,
    });
  }
};

// Create New Version of File
/**
 * Uploads a new physical version for an existing file record.
 * 
 * Instead of overwriting the original file record, this creates a new `File` document representing 
 * the updated version. It links back to the original via the `previousVersionId` field, creating 
 * a linked list of file history. The new version increments the `version` integer.
 * 
 * Workflow:
 * 1. Fetches the original active file by `id`.
 * 2. Verifies project access and owner storage limits.
 * 3. Creates a new `File` document inheriting metadata (`projectId`, `folderId`) from the original.
 * 4. Sets `previousVersionId` to the original file's `_id`.
 * 5. Increments the `version` counter.
 * 6. Saves the new file and records the access event.
 * 
 * Database Interaction:
 * - Reads `File`, `Project`.
 * - Updates `User` storage quota via `checkAndIncrementStorage`.
 * - Creates a new `File` document.
 * 
 * Edge Cases:
 * - Original file is trashed/deleted (returns 404).
 * - Storage quota exceeded (returns 400).
 * - Note: The previous file remains 'active' in this implementation; depending on UI needs, older versions might need a different status flag.
 * 
 * @param {Object} req - Express request object containing `req.params.id` and updated file properties in the body.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing the newly created file version `data`.
 * @throws {400} Storage limit exceeded.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized access.
 * @throws {404} Original file not found.
 * @throws {500} Database errors.
 */
exports.createFileVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, originalName, fileType, category, sizeBytes, fileUrl } = req.body;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingFile = await File.findById(id);
    if (!existingFile || existingFile.status !== "active") {
      return res.status(404).json({ message: "Original file not found" });
    }

    const project = await Project.findOne({ _id: existingFile.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check storage limits against project owner
    const ownerId = project.createdBy.toString();
    const isStorageSufficient = await checkAndIncrementStorage(ownerId, sizeBytes);
    if (!isStorageSufficient) {
      return res.status(400).json({ message: "Storage limit exceeded. You do not have enough space to upload this new version. Please empty your trash or upgrade your storage plan." });
    }

    const newVersionFile = new File({
      projectId: existingFile.projectId,
      folderId: existingFile.folderId,
      createdBy: userId || existingFile.createdBy,
      fileName: fileName || existingFile.fileName,
      originalName: originalName || existingFile.originalName,
      fileType: fileType || existingFile.fileType,
      category: category || existingFile.category,
      sizeBytes,
      fileUrl,
      version: (existingFile.version || 1) + 1,
      previousVersionId: existingFile._id,
      status: "active",
    });

    const savedFile = await newVersionFile.save();

    // Record recent file access
    await recordFileAccess(userId, savedFile._id, savedFile.projectId);
    return res.status(201).json({
      message: "New file version created successfully",
      data: savedFile,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create new file version",
      error: error.message,
    });
  }
};

// Move to Trash (Soft delete)
/**
 * Moves a file to the trash (soft delete).
 * 
 * Safely removes a file from active project views without permanently deleting it. 
 * This operation is strictly limited to the project owner to prevent team members from 
 * maliciously or accidentally hiding important documents.
 * 
 * Workflow:
 * 1. Validates the file exists and is not already hard-deleted.
 * 2. Validates project ownership (strict `isOwner` check).
 * 3. Modifies the file's `status` to 'trash'.
 * 4. Sets the `deletedAt` timestamp (which allows TTL index auto-purging after e.g., 30 days).
 * 5. Saves the modified document.
 * 
 * Database Interaction:
 * - Reads `File` and `Project`.
 * - Mutates and saves `File`.
 * 
 * Edge Cases:
 * - Non-owner project members trying to trash a file are blocked with a 403 error.
 * - Hard-deleted files cannot be trashed (returns 404).
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the status change.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized (not owner).
 * @throws {404} File or project not found.
 * @throws {500} Database error.
 */
exports.moveToTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findById(id);
    if (!file || file.status === "deleted") {
      return res.status(404).json({ message: "File not found" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can move items to trash." });
    }

    file.status = "trash";
    file.deletedAt = new Date(); // Auto purge setelah 30 hari via TTL index

    await file.save();

    return res.status(200).json({
      message: "File moved to trash",
      data: file,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to move file to trash",
      error: error.message,
    });
  }
};

// Restore File from Trash
/**
 * Restores a file from the trash back to active status.
 * 
 * The inverse of `moveToTrash`. It requires strict project ownership to execute.
 * 
 * Workflow:
 * 1. Validates the file is currently in the 'trash' state.
 * 2. Validates the user is the project owner.
 * 3. Reverts `status` to 'active' and clears the `deletedAt` timestamp.
 * 4. Saves the document.
 * 
 * Database Interaction:
 * - Reads `File` and `Project`.
 * - Mutates and saves `File`.
 * 
 * Edge Cases:
 * - File is not in the trash (returns 400).
 * - Non-owner attempt (returns 403).
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming restoration.
 * @throws {400} File not in trash.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized (not owner).
 * @throws {404} File or project not found.
 * @throws {500} Database error.
 */
exports.restoreFromTrash = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findById(id);
    if (!file || file.status !== "trash") {
      return res.status(400).json({ message: "File not in trash" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can restore items from trash." });
    }

    const uniqueName = await getUniqueFileName(file.projectId, file.folderId, file.originalName);
    if (uniqueName !== file.originalName) {
      file.originalName = uniqueName;
      file.fileName = uniqueName;
    }

    file.status = "active";
    file.deletedAt = null;

    await file.save();

    return res.status(200).json({
      message: "File successfully restored from trash",
      data: file,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to restore file from trash",
      error: error.message,
    });
  }
};

// Hard Delete / Mark status as 'deleted'
/**
 * Permanently deletes a file from the database and reclaims its storage quota.
 * 
 * This is a destructive hard-delete operation (modeled as a terminal 'deleted' status). 
 * Only project owners can execute this. Crucially, it triggers the `decrementStorage` helper 
 * to refund the file's byte size back to the owner's global storage limit, preventing storage leaks.
 * 
 * Workflow:
 * 1. Validates file existence and project ownership.
 * 2. Mutates `status` to 'deleted' and sets `deletedAt`.
 * 3. Saves the file document.
 * 4. Subtracts `file.sizeBytes` from the owner's storage quota via `decrementStorage`.
 * 
 * Database Interaction:
 * - Reads `File` and `Project`.
 * - Mutates and saves `File`.
 * - Updates `User` via storage helper.
 * 
 * Edge Cases:
 * - Physical files on the local disk are not actively deleted via `fs.unlinkSync` in this specific method block, which could lead to physical disk bloat over time unless a cleanup cron job exists.
 * - Negative or null `sizeBytes` are handled safely by `decrementStorage`.
 * 
 * @param {Object} req - Express request object containing `req.params.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming permanent deletion.
 * @throws {401} Unauthenticated.
 * @throws {403} Unauthorized (not owner).
 * @throws {404} File or project not found.
 * @throws {500} Database error.
 */
exports.deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isOwner = project.createdBy.toString() === userId;
    if (!isOwner) {
      return res.status(403).json({ message: "Access denied. Only the project owner can permanently delete items." });
    }

    file.status = "deleted";
    file.deletedAt = new Date();
    await file.save();

    await decrementStorage(project.createdBy.toString(), file.sizeBytes || 0);

    return res.status(200).json({
      message: "File successfully deleted permanently",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete file permanently",
      error: error.message,
    });
  }
};

// GET /api/files/trash
/**
 * Retrieves all files that are currently in the trash.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.getTrashFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await Project.find({
      createdBy: userId,
      isDeleted: false
    });
    const projectIds = projects.map(p => p._id);
    
    const files = await File.find({
      projectId: { $in: projectIds },
      status: "trash"
    })
    .populate("createdBy", "profile email")
    .populate("updatedBy", "profile email");
    
    const results = files.map(f => {
       const p = projects.find(proj => proj._id.toString() === f.projectId.toString());
       return { ...f.toObject(), projectName: p ? p.name : "Unknown Project" };
    });
    
    return res.status(200).json({ data: results });
  } catch (err) {
     return res.status(500).json({ message: "Error fetching trash files" });
  }
};

// DELETE /api/files/trash/empty
/**
 * Permanently deletes all files currently in the trash.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.emptyTrashFiles = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const projects = await Project.find({
      createdBy: userId,
      isDeleted: false
    });
    const projectIds = projects.map(p => p._id);
    
    // Find files to sum up their sizes
    const filesToDelete = await File.find({ projectId: { $in: projectIds }, status: "trash" });
    const totalSizeToFree = filesToDelete.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

    await File.updateMany(
      { projectId: { $in: projectIds }, status: "trash" },
      { status: "deleted", deletedAt: new Date() }
    );
    
    if (totalSizeToFree > 0) {
      await decrementStorage(userId.toString(), totalSizeToFree);
    }
    
    return res.status(200).json({ message: "Trash emptied" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Download File Endpoint
/**
 * Downloads the physical file associated with a file record.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findOne({ _id: id, status: 'active' });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Verify project access
    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ message: "Physical file not found on disk" });
    }

    // Record recent file access
    await recordFileAccess(userId, file._id, file.projectId);

    res.download(file.localPath, file.originalName, (err) => {
      if (err) {
        console.error("Download error:", err);
        // Only send response if headers have not been sent yet
        if (!res.headersSent) {
          res.status(500).json({ message: "Could not download the file" });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Log Recent Access Endpoint
/**
 * Logs a file as recently accessed by the user.
 * 
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} [next] - Express next middleware function.
 */
exports.logRecentAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = await File.findOne({ _id: id, status: { $ne: 'deleted' } });
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    await recordFileAccess(userId, file._id, file.projectId);

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

