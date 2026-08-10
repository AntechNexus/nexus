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
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage
});

// Wrapper middleware to handle multer errors
const handleUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');
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
