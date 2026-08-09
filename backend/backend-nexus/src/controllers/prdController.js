const PRD = require("../models/PRD");
const Project = require("../models/Projects");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require("docx");
const PDFDocument = require("pdfkit");

// Create PRD Data Collection
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

    const createdBy = req.user?.id || req.user?._id || req.body.createdBy;

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

      // Generate unique filename
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const fileName = `${uniqueSuffix}-${file.originalname}`;
      const uploadDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const localPath = path.join(uploadDir, fileName);
      fs.writeFileSync(localPath, file.buffer);

      const newFile = new File({
        projectId,
        folderId: null,
        createdBy: userId,
        fileName,
        originalName: file.originalname,
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
        axios.get(`${GEMINI_URL}/api/files/${fileId}/transcribe`).catch(err => {
          console.error(`Auto-transcribe failed for file ${fileId}:`, err.message);
        });
      });
    }

    return res.status(200).json({ success: true, savedFileIds });
  } catch (error) {
    console.error("saveFilesToProject error:", error);
    return res.status(500).json({ message: "Failed to save files to project", error: error.message });
  }
};

// POST /api/prd/generate/save
// Generate DOCX + PDF from raw Markdown, create a folder in the project, save PRD record
exports.saveGeneratedPrd = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { rawMarkdown, projectId, prdName, sourceFileIds } = req.body;
    if (!rawMarkdown || !projectId) {
      return res.status(400).json({ message: "rawMarkdown and projectId are required" });
    }

    const project = await Project.findOne({ _id: projectId, isDeleted: false });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isOwnerOrMember = project.createdBy.toString() === userId ||
      project.members.some(m => m.userId.toString() === userId && m.status === "accepted");
    if (!isOwnerOrMember) return res.status(403).json({ message: "Access denied to this project" });

    const safeDate = new Date().toISOString().split("T")[0];
    const safeName = prdName || `PRD – ${project.name}`;
    const folderName = `PRD – ${safeName} – ${safeDate}`;

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
      
      if (line.startsWith("# ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: line.replace(/^# /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_1, 
          alignment: AlignmentType.LEFT 
        }));
      } else if (line.startsWith("## ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: line.replace(/^## /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_2 
        }));
      } else if (line.startsWith("### ")) {
        docChildren.push(new Paragraph({ 
          children: [new TextRun({ text: line.replace(/^### /, ""), bold: true, color: "000000" })], 
          heading: HeadingLevel.HEADING_3 
        }));
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        docChildren.push(new Paragraph({ text: line.replace(/^[-*] /, ""), bullet: { level: 0 } }));
      } else if (line.trim() === "---") {
        docChildren.push(new Paragraph({ text: "" }));
      } else {
        docChildren.push(new Paragraph({ children: [new TextRun({ text: line, size: 24 })] }));
      }
    }

    const docxDoc = new Document({ sections: [{ children: docChildren }] });
    const docxBuffer = await Packer.toBuffer(docxDoc);
    const docxFileName = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9]/g, "_")}.docx`;
    const exportDir = path.join(__dirname, "../../uploads/prd-exports");
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    const docxPath = path.join(exportDir, docxFileName);
    fs.writeFileSync(docxPath, docxBuffer);

    // ── Generate PDF ──────────────────────────────────────────────────────
    const pdfFileName = `${Date.now()}-${safeName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
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

        if (line.startsWith("# ")) {
          pdfDoc.fontSize(18).font("Helvetica-Bold").text(line.replace(/^# /, ""), { align: "left" }).moveDown(0.5);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (line.startsWith("## ")) {
          pdfDoc.fontSize(14).font("Helvetica-Bold").text(line.replace(/^## /, "")).moveDown(0.3);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (line.startsWith("### ")) {
          pdfDoc.fontSize(12).font("Helvetica-Bold").text(line.replace(/^### /, "")).moveDown(0.3);
          pdfDoc.fontSize(10).font("Helvetica");
        } else if (line.trim() === "---") {
          pdfDoc.moveDown(0.5);
        } else if (line.trim()) {
          pdfDoc.text(line.replace(/^[-*] /, "- "), { align: "left" }).moveDown(0.2);
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
      version: 1,
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
