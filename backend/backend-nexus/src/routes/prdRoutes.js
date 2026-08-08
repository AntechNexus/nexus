const express = require("express");
const router = express.Router();
const prdController = require("../controllers/prdController");
const { protect } = require("../middleware/authMiddleware");
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 75 * 1024 * 1024 },
});

// All PRD endpoints require authentication
router.use(protect);

// CRUD routes (existing)
router.post("/", prdController.createPRD);
router.get("/", prdController.getPRDs);
router.get("/project/:projectId", prdController.getPRDsByProject);
router.get("/:id", prdController.getPRDById);
router.put("/:id", prdController.updatePRD);
router.patch("/:id/trash", prdController.moveToTrash);
router.patch("/:id/restore", prdController.restoreFromTrash);
router.delete("/:id", prdController.deletePRD);

// AI Generate routes (new)
router.post("/generate/save-files", upload.array("files", 10), prdController.saveFilesToProject);
router.post("/generate/save", prdController.saveGeneratedPrd);

module.exports = router;
