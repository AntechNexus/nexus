const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");
const recentFileController = require("../controllers/recentFileController");
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  /**
   * Defines the local filesystem destination directory for incoming file uploads managed by Multer.
   * This is a critical part of the file upload pipeline, ensuring that all user-uploaded files are securely temporarily or permanently stored in the designated upload directory.
   * By abstracting the destination logic, the system maintains a unified storage location, which simplifies volume mounting and backups.
   * The directory must already be initialized (or created synchronously on startup) before this callback is triggered.
   *
   * Workflow:
   * 1. Multer parses the multipart/form-data request.
   * 2. For each incoming file part, Multer invokes this callback to ascertain where the file should reside on disk.
   * 3. The callback immediately signals completion by returning the pre-configured absolute path `uploadDir`.
   *
   * Edge Cases & Error Handling:
   * - If the directory somehow gets deleted during runtime, subsequent filesystem writes by Multer will fail and propagate an error through the pipeline.
   * - Does not perform any validation on the file type itself; it simply returns the target folder path.
   *
   * @param {import("express").Request} req - The standard Express request object containing context about the current HTTP request, including headers and the authenticated user making the upload.
   * @param {Express.Multer.File} file - An object provided by Multer containing metadata about the file currently being processed (e.g., originalname, mimetype, size).
   * @param {function(Error|null, string): void} cb - The callback function supplied by Multer. It must be invoked with an error (if any occurred, or null for success) as the first argument, and the absolute directory path string as the second argument.
   * @returns {void} This function does not return a value; it delegates the result back to Multer via the `cb` parameter.
   */
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  /**
   * Generates a unique, collision-resistant filename for an incoming file upload prior to saving it on the disk.
   * This business logic ensures that files with identical names from different users, or repeated uploads of the same file, do not overwrite one another in the shared storage directory.
   * It forms a crucial layer of data integrity, allowing the system to reference exact file versions reliably.
   *
   * Workflow:
   * 1. Extracts the current UNIX timestamp (in milliseconds) to ensure temporal uniqueness.
   * 2. Generates a random integer up to 1,000,000,000 to drastically minimize collision probabilities for concurrent requests hitting the server within the same millisecond.
   * 3. Concatenates these two values to form a `uniqueSuffix`.
   * 4. Appends the `uniqueSuffix` to the file's original name to preserve the file extension and recognizable context, while guaranteeing system-wide uniqueness.
   * 5. Passes the final generated string back to Multer via the provided callback.
   *
   * Edge Cases & Error Handling:
   * - If `file.originalname` contains special characters or spaces, they are preserved as-is. Depending on the underlying OS, extremely long original names might hit filesystem path length limits.
   * - Relies on `Math.random()`, which is sufficient for non-cryptographic uniqueness but not guaranteed globally unique like a UUID v4.
   *
   * @param {import("express").Request} req - The standard Express request object containing context about the incoming HTTP upload request.
   * @param {Express.Multer.File} file - The file metadata object provided by Multer, from which `originalname` is extracted.
   * @param {function(Error|null, string): void} cb - The callback function provided by Multer. Invoked with an Error or null as the first argument, and the generated unique filename string as the second.
   * @returns {void} Does not return a direct value; instead, it triggers the callback function with the computed filename.
   */
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage
});

// Wrapper middleware to handle multer errors
/**
 * A highly specialized Express middleware wrapper designed to gracefully intercept, process, and handle errors originating from the Multer file upload process.
 * Standard Multer middleware can sometimes crash the request lifecycle or return unformatted stack traces if an internal error occurs (e.g., file size limits exceeded, or unexpected multipart boundary issues).
 * This wrapper ensures that any failure at the Multer level is transformed into a standardized JSON error response, providing a predictable API contract for the client.
 *
 * Workflow:
 * 1. Instantiates the Multer middleware configured for a single file upload on the field named 'file'.
 * 2. Invokes the inner Multer middleware within a try-catch-like callback pattern.
 * 3. Inspects the `err` object returned by Multer.
 * 4. If the error is a known `multer.MulterError` (like 'LIMIT_FILE_SIZE'), it maps it to a 400 Bad Request status.
 * 5. If it's a generic unhandled exception, it maps it to a 500 Internal Server Error status.
 * 6. If no error occurs, it proceeds to the next middleware or controller in the Express chain.
 *
 * Edge Cases & Error Handling:
 * - Differentiates between Multer-specific formatting/limit errors and critical system errors (like disk full).
 * - Protects the main application process from crashing due to malformed multipart/form-data payloads sent by malicious or buggy clients.
 *
 * @param {import("express").Request} req - The Express request object containing the multipart payload and headers. Multer will mutate this object to include `req.file` and `req.body` upon success.
 * @param {import("express").Response} res - The Express response object. Used to immediately terminate the request with a structured JSON error if the upload fails.
 * @param {import("express").NextFunction} next - The Express next middleware callback. Invoked only if the upload succeeds without errors.
 * @throws {400} Returns a 400 Bad Request JSON response `{ message: string }` if a Multer-specific error occurs.
 * @throws {500} Returns a 500 Internal Server Error JSON response `{ message: string }` if a generic unexpected error occurs during file parsing.
 * @returns {void|import("express").Response} Returns an early JSON response on failure, otherwise calls `next()` and returns nothing.
 */
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');
  /**
   * The inner callback execution block that directly receives the output of Multer's parsing phase.
   * This function operates in the critical juncture between successful stream parsing and downstream application logic.
   *
   * Workflow:
   * 1. Evaluates whether `err` is populated.
   * 2. Uses `instanceof multer.MulterError` to categorize the failure type accurately.
   * 3. Dispatches the appropriate HTTP response or continues the request chain.
   *
   * Edge Cases & Error Handling:
   * - Triggers if the client submits a field name other than 'file' for single upload, returning an unexpected field error.
   * - Catches payload-too-large constraints if they are defined on the multer instance in the future.
   *
   * @param {any} err - The error object optionally populated by Multer. Can be an instance of Error, MulterError, or undefined/null on success.
   * @returns {import("express").Response|void} Returns an HTTP response ending the lifecycle on error, or void as it calls `next()` on success.
   */
  uploadSingle(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(500).json({ message: err.message });
    }
    next();
  });
};

router.use(protect);

// File CRUD Routes
router.post("/", handleUpload, fileController.createFile);
router.get("/", fileController.getFiles);
router.get("/project/:projectId", fileController.getFilesByProject);
router.get("/folder/:folderId", fileController.getFilesByFolder);
router.get("/recent", recentFileController.getRecentFiles);
router.get("/trash/all", fileController.getTrashFiles);
router.delete("/trash/empty", fileController.emptyTrashFiles);
router.get("/:id", fileController.getFileById);
router.get("/:id/download", fileController.downloadFile);
router.put("/:id", fileController.updateFile);
router.post("/:id/version", handleUpload, fileController.createFileVersion);
router.post("/:id/recent", fileController.logRecentAccess);
router.patch("/:id/trash", fileController.moveToTrash);
router.patch("/:id/restore", fileController.restoreFromTrash);
router.delete("/:id", fileController.deleteFile);

module.exports = router;
