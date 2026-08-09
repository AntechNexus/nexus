const File = require("../models/File");
const Project = require("../models/Projects");
const Folder = require("../models/Folder");
const User = require("../models/User");
const Notification = require("../models/Notification");
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

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
      fileName, 
      status: { $ne: 'deleted' } 
    });
    if (!existingFile) {
      break;
    }
    fileName = `${baseName} (${counter})${ext}`;
    counter++;
  }
  return fileName;
}

async function checkAndIncrementStorage(ownerId, fileSize) {
  const owner = await User.findById(ownerId);
  if (!owner) throw new Error("Project owner not found");

  const used = owner.storage?.usedBytes || 0;
  const limit = owner.storage?.limitBytes || 4294967296;

  if (used + fileSize > limit) {
    // Send full storage notification
    await Notification.create({
      recipientId: ownerId,
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
      type: "storage_warning",
      title: "Storage Hampir Penuh",
      message: "Kapasitas penyimpanan Anda sudah terpakai 90%. Segera kosongkan Trash atau perbarui layanan Anda.",
      status: "pending",
      isRead: false
    });
  }

  return true;
}

async function decrementStorage(ownerId, amountBytes) {
  if (amountBytes <= 0) return;
  await User.updateOne({ _id: ownerId }, { $inc: { 'storage.usedBytes': -amountBytes } });
}

// Create / Upload File Metadata and File
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

    const createdBy = req.user?.id || req.user?._id || req.body.createdBy;

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
    const isMember = project.createdBy.toString() === createdBy || project.members.some(m => m.userId.toString() === createdBy);
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
      return res.status(400).json({ message: "Storage limit exceeded. Cannot upload file." });
    }

    const fileName = await getUniqueFileName(projectId, folderId, originalName);
    const content = await parseDocumentContent(localPath, fileType);

    const newFile = new File({
      projectId,
      folderId: folderId || null,
      createdBy,
      fileName,
      originalName,
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

    // Trigger Embedding Generation asynchronously
    if (content) {
      const GEMINI_URL = process.env.GEMINI_SERVICE_URL || "http://localhost:5001";
      const axios = require("axios").default;
      axios.post(`${GEMINI_URL}/api/embeddings/generate`, {
        text: content,
        projectId: savedFile.projectId,
        fileId: savedFile._id,
        createdBy: savedFile.createdBy
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

    if (!file || file.status === "deleted") {
      return res.status(404).json({ message: "File not found" });
    }

    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Associated project not found" });
    }
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied to file's project" });
    }

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
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
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
      const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
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
      const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
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
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Set attribute updatedBy dengan user yang melakukan update (dari token JWT atau body)
    const updaterId = userId || updatedBy;
    if (updaterId) {
      file.updatedBy = updaterId;
    }

    if (fileName !== undefined) file.fileName = fileName;
    if (folderId !== undefined) file.folderId = folderId === "" ? null : folderId;

    const updatedFile = await file.save();
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
    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check storage limits against project owner
    const ownerId = project.createdBy.toString();
    const isStorageSufficient = await checkAndIncrementStorage(ownerId, sizeBytes);
    if (!isStorageSufficient) {
      return res.status(400).json({ message: "Storage limit exceeded. Cannot upload new version." });
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
exports.downloadFile = async (req, res) => {
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

    // Verify project access
    const project = await Project.findOne({ _id: file.projectId, isDeleted: false });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isMember = project.createdBy.toString() === userId || project.members.some(m => m.userId.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ message: "Physical file not found on disk" });
    }

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
