const express = require("express");
const router = express.Router();
const folderController = require("../controllers/folderController");
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post("/",  folderController.createFolder);
router.get("/", folderController.getAllFolders);
router.get("/project/:projectId", folderController.getFoldersByProject);
router.get("/trash/all", folderController.getTrashFolders);
router.delete("/trash/empty", folderController.emptyTrashFolders);
router.get("/:id", folderController.getFolderById);
router.patch("/:id/trash", folderController.moveToTrash);
router.patch("/:id/restore", folderController.restoreFolder);
router.patch("/:id/move", folderController.moveFolder);
router.delete("/:id", folderController.deleteFolder);

module.exports = router;
