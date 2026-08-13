const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  /**
   * Defines the physical destination directory on the server file system for saving uploaded files.
   * 
   * This function is part of the `multer` disk storage configuration engine. It determines where the incoming
   * file stream should be routed. In this application, it statically routes all valid uploads to the pre-configured
   * `uploadDir` which is typically set to `uploads/avatars`.
   * 
   * Workflow:
   * 1. The multer middleware receives a file upload request.
   * 2. This function is invoked to resolve the destination path.
   * 3. It immediately calls the provided callback `cb` with a null error parameter and the resolved absolute directory path.
   * 
   * Edge Cases:
   * - Relies on the external synchronous directory creation logic at the top of the file to ensure the folder exists before this function is called.
   * 
   * @param {Object} req - The Express request object containing context about the HTTP request.
   * @param {Object} file - An object containing metadata about the file being uploaded (e.g., fieldname, originalname, encoding, mimetype).
   * @param {Function} cb - The callback function to signal completion to multer. Signature: `cb(error, destinationPath)`.
   * @returns {void} Executes the callback without returning a direct value.
   */
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  /**
   * Dynamically generates a highly unique filename to prevent overwriting existing files in the storage directory.
   * 
   * This function is utilized by the `multer` disk storage engine. Whenever a new file is accepted for upload,
   * this function constructs a new filename string that guarantees uniqueness across concurrent upload requests
   * by combining timestamps and random number generation.
   * 
   * Workflow:
   * 1. Captures the current system timestamp in milliseconds (`Date.now()`).
   * 2. Generates a random integer multiplier up to 1 billion (`Math.round(Math.random() * 1E9)`).
   * 3. Concatenates the timestamp and the random number with a hyphen to form a `uniqueSuffix`.
   * 4. Constructs the final filename using the original form field name, the unique suffix, and the original file extension extracted via Node.js `path.extname`.
   * 5. Passes the newly generated filename string back to multer via the callback function.
   * 
   * Business Logic Impact:
   * - Prevents race conditions where two users uploading files with the same original name (e.g., `image.png`) at the same time would overwrite each other's avatars.
   * 
   * @param {Object} req - The Express request object providing context for the file upload.
   * @param {Object} file - An object containing metadata about the uploaded file, specifically `fieldname` and `originalname`.
   * @param {Function} cb - The callback function to pass the generated unique filename back to multer. Signature: `cb(error, generatedFilename)`.
   * @returns {void} Executes the callback without returning a direct value.
   */
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * Security and validation filter to strictly enforce that only image files are processed and stored.
 * 
 * This function acts as a gatekeeper for the multer upload middleware. Before reading the file stream or saving
 * anything to the disk, it inspects the file's MIME type metadata to verify its content type. This prevents malicious
 * users from uploading executable scripts, HTML files, or other potentially dangerous file types disguised as images.
 * 
 * Workflow:
 * 1. Intercepts the incoming file metadata.
 * 2. Checks if the `mimetype` property starts with the string `image/` (e.g., `image/jpeg`, `image/png`, `image/gif`).
 * 3. If the condition is met, it signals multer to accept the file by calling the callback with `null` for the error and `true` for acceptance.
 * 4. If the condition fails, it constructs a new `Error` object with a localized rejection message ("Hanya file gambar yang diperbolehkan!") and passes it to the callback, immediately aborting the upload process for that file.
 * 
 * Edge Cases Handled:
 * - Protects against arbitrary file upload vulnerabilities.
 * - Handles edge cases where a user might try to upload PDFs or documents when only avatars are expected.
 * 
 * @param {Object} req - The Express request object initiating the file upload.
 * @param {Object} file - An object containing file metadata, heavily relying on the `mimetype` attribute for validation.
 * @param {Function} cb - The callback function to signal whether the file should be accepted or rejected. Signature: `cb(error, acceptFileBoolean)`.
 * @returns {void} Executes the callback and does not return a direct value.
 * @throws {Error} Throws (via callback) an Error object with a specific message if the file is not an image, which is then caught by Express error handlers.
 */
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diperbolehkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = upload;
