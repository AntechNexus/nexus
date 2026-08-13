const Transcript = require("../models/Transcript");

// POST /api/transcripts
// Create a transcript for a file — one transcript per file (fileId is unique)
/**
 * Creates a new transcription record associated with an uploaded audio or video file.
 * 
 * This controller governs the ingestion of transcription data into the system, ensuring one-to-one mapping between physical files and their text transcripts. The workflow begins by extracting payload data including `fileId`, `projectId`, the raw `fullText`, detected `language`, overall `durationSeconds`, and a granular array of timestamped `segments`. It verifies the requesting user's identity via the attached JWT token payload to establish the `createdBy` audit trail.
 * 
 * A critical business rule enforced here is the unique constraint on `fileId` at the database level. A single file can only have one active transcript. If a client attempts to create a duplicate transcript for an existing file, the MongoDB driver throws an `11000` duplicate key error, which is caught and gracefully translated into a specific HTTP 400 response.
 * 
 * Upon successful validation and object instantiation, the new `Transcript` document is persisted to the database. This acts as the foundational record for downstream features like subtitle generation, text-based search within media, and summary extractions.
 * 
 * @param {import('express').Request} req - Express request object. Must contain the transcription details (`fileId`, `projectId`, `fullText`, etc.) in `req.body` and the user's ID in `req.user`.
 * @param {import('express').Response} res - Express response object for dispatching the HTTP result.
 * @returns {Promise<void>} Resolves when the process completes. Returns a 201 Created status with the newly saved `Transcript` object upon success.
 * @throws {Error} Returns a 401 status if the user is unauthenticated. Returns a 400 Bad Request status with a custom message if a duplicate `fileId` is detected, or for other generic validation/database save errors.
 */
exports.createTranscript = async (req, res) => {
  try {
    const { fileId, projectId, fullText, language, durationSeconds, segments } = req.body;
    const createdBy = req.user?.id || req.user?._id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Unauthenticated user (Please include a JWT Token in the Header)",
      });
    }

    const transcript = new Transcript({
      fileId,
      projectId,
      fullText,
      language: language || null,
      durationSeconds,
      segments,
      createdBy,
    });

    await transcript.save();

    res.status(201).json({
      success: true,
      message: "Transcript created successfully",
      data: transcript,
    });
  } catch (error) {
    // Duplicate fileId (unique constraint)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A transcript for this file already exists",
      });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/transcripts/file/:fileId
// Get the transcript for a specific file
/**
 * Retrieves the transcription document associated with a specific file identifier.
 * 
 * This endpoint allows clients to fetch the text representation of a media file by providing the target file's ID. The workflow relies on querying the `Transcript` collection using a filter on the `fileId` field.
 * 
 * To provide a rich data context, this controller performs several database joins (populations). It populates the parent `fileId` document to attach the original file's metadata (`fileName`, `originalName`, `fileType`). It also populates the parent `projectId` to expose the project's name, and fetches the profile details (`name`, `email`) for both the user who created (`createdBy`) and last updated (`updatedBy`) the transcript. 
 * 
 * This deep population strategy is crucial for rendering comprehensive UI views where users need to see both the transcription text and the context of the file it belongs to without making multiple subsequent API calls. If the query yields no results, it correctly handles the empty state by returning a 404 response, indicating that the media file either hasn't been transcribed yet or the transcript was removed.
 * 
 * @param {import('express').Request} req - Express request object. The target file's unique ID must be provided in the URL parameters as `req.params.fileId`.
 * @param {import('express').Response} res - Express response object to transmit the populated transcript data.
 * @returns {Promise<void>} Resolves upon successful retrieval. Returns a 200 OK status containing the `success: true` flag and the fully populated `Transcript` object in the `data` field.
 * @throws {Error} Returns a 404 Not Found status if no transcript is linked to the provided file ID. Returns a 500 Internal Server Error if database connectivity issues or other unexpected exceptions occur.
 */
exports.getTranscriptByFileId = async (req, res) => {
  try {
    const { fileId } = req.params;

    const transcript = await Transcript.findOne({ fileId })
      .populate("fileId", "fileName originalName fileType")
      .populate("projectId", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!transcript) {
      return res.status(404).json({ success: false, message: "Transcript not found for this file" });
    }

    res.status(200).json({ success: true, data: transcript });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transcripts/project/:projectId
// Get all transcripts under a project
/**
 * Retrieves a list of all transcripts belonging to a specific workspace project.
 * 
 * This function handles bulk retrieval of transcription data scoped to a single project boundary. It extracts the `projectId` from the route parameters and queries the `Transcript` collection for all documents possessing that specific project reference.
 * 
 * To enhance the usability of the returned data list, the results are sorted in descending order by creation date (`createdAt: -1`), ensuring that the most recently transcribed files appear at the top of the list. Furthermore, it utilizes Mongoose's populate mechanism to join related data: it attaches the corresponding file metadata (`fileName`, `originalName`, `fileType`) from the `File` collection and the creator's details (`name`, `email`) from the `User` collection.
 * 
 * This controller is primarily utilized for project-level dashboards or search interfaces where users need an overview of all transcribed media within their current workspace. It efficiently returns both the array of documents and a `total` count for pagination or display purposes.
 * 
 * @param {import('express').Request} req - Express request object. The target project's unique ID must be specified in `req.params.projectId`.
 * @param {import('express').Response} res - Express response object used to deliver the list of transcripts.
 * @returns {Promise<void>} Resolves when the query finishes. Returns a 200 OK status containing `success: true`, a `total` integer representing the count, and a `data` array of populated `Transcript` objects.
 * @throws {Error} Returns a 500 Internal Server Error status with the error message if the database query fails or encounters an unhandled exception.
 */
exports.getTranscriptsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const transcripts = await Transcript.find({ projectId })
      .populate("fileId", "fileName originalName fileType")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: transcripts.length,
      data: transcripts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transcripts/:id
// Get a single transcript by its _id
/**
 * Retrieves the detailed profile of a specific transcript using its unique database ID.
 * 
 * Unlike `getTranscriptByFileId`, this endpoint targets the transcript document directly via its primary MongoDB `_id`. The controller fetches the document and performs extensive population to build a complete context around the transcription.
 * 
 * The query joins four related collections: the parent `File` (fetching basic file info), the parent `Project` (fetching the project name), and the `User` collection twice to populate the `createdBy` and `updatedBy` audit fields with names and emails. This heavy lifting on the backend ensures the client receives a fully realized object ready for detailed display in the UI, such as in a dedicated transcript editing or viewing modal.
 * 
 * If a malformed ID is provided or the transcript has been deleted, the query will return null, which the controller explicitly checks and handles by dispatching a 404 Not Found response.
 * 
 * @param {import('express').Request} req - Express request object. The transcript's primary `_id` must be present in `req.params.id`.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>} Resolves when the document is found and populated. Returns a 200 OK status containing `success: true` and the populated `Transcript` object.
 * @throws {Error} Returns a 404 Not Found status if the transcript ID does not exist in the database. Returns a 500 Internal Server Error for malformed ObjectIds or other database-level failures.
 */
exports.getTranscriptById = async (req, res) => {
  try {
    const { id } = req.params;

    const transcript = await Transcript.findById(id)
      .populate("fileId", "fileName originalName fileType")
      .populate("projectId", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!transcript) {
      return res.status(404).json({ success: false, message: "Transcript not found" });
    }

    res.status(200).json({ success: true, data: transcript });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/transcripts/:id
// Update a transcript — fullText, language, durationSeconds, segments
/**
 * Updates an existing transcript document with new textual data or metadata.
 * 
 * This controller handles partial updates (similar to a PATCH request) for a specific transcript identified by its `_id`. The workflow begins by retrieving the existing transcript document. If the document is not found, it immediately halts and returns a 404 Not Found status.
 * 
 * The core logic relies on a selective update mechanism. It checks the incoming `req.body` for specific keys (`fullText`, `language`, `durationSeconds`, `segments`). If a key is explicitly provided (`!== undefined`), the corresponding property on the Mongoose document is updated. This allows clients to update just the `language`, just the text `segments`, or everything at once without overwriting existing data with nulls.
 * 
 * Crucially, it automatically updates the `updatedBy` audit field using the ID of the authenticated user making the request. Finally, it calls `.save()` on the modified document, running any associated Mongoose validation hooks before persisting the changes to the database.
 * 
 * @param {import('express').Request} req - Express request object. Expects the transcript `id` in `req.params`, and optional update fields (`fullText`, `language`, `durationSeconds`, `segments`) in `req.body`. The user ID must be available in `req.user`.
 * @param {import('express').Response} res - Express response object to confirm the update.
 * @returns {Promise<void>} Resolves upon successful database save. Returns a 200 OK status with a JSON payload including `success: true`, a success message, and the newly updated `Transcript` object.
 * @throws {Error} Returns a 404 Not Found status if the target transcript does not exist. Returns a 400 Bad Request status if the provided update data violates Mongoose validation rules (e.g., malformed segments array) or if saving fails.
 */
exports.updateTranscript = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullText, language, durationSeconds, segments } = req.body;
    const updatedBy = req.user?.id || req.user?._id;

    const transcript = await Transcript.findById(id);

    if (!transcript) {
      return res.status(404).json({ success: false, message: "Transcript not found" });
    }

    if (fullText !== undefined) transcript.fullText = fullText;
    if (language !== undefined) transcript.language = language;
    if (durationSeconds !== undefined) transcript.durationSeconds = durationSeconds;
    if (segments !== undefined) transcript.segments = segments;
    if (updatedBy) transcript.updatedBy = updatedBy;

    await transcript.save();

    res.status(200).json({
      success: true,
      message: "Transcript updated successfully",
      data: transcript,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// GET /api/transcripts/:id/export/txt
// Export transcript as a .txt file download
/**
 * Generates and streams a downloadable plain text (.txt) file representing the transcript.
 * 
 * This controller provides the export functionality, allowing users to download a formatted text version of a media file's transcription. It starts by locating the transcript via its ID and populating the parent `fileId` to retrieve the original file's name, which is crucial for generating a contextual download filename.
 * 
 * The business logic involves meticulously constructing a raw string (`txtContent`). It begins by appending a metadata header containing the file name, detected language, and formatted total duration (e.g., "01:25:30"). It then appends the raw, continuous `fullText` block. Following this, if granular timestamp `segments` exist, it iterates through them, formatting the raw seconds into human-readable `[HH:]MM:SS` brackets and appending the spoken text for that segment.
 * 
 * The response construction is critical here. Instead of a standard JSON response, this controller manipulates the HTTP response headers. It sets `Content-Type` to `text/plain` and uses the `Content-Disposition` header with the `attachment` directive. It dynamically calculates a clean download filename (e.g., `meeting_recording_transcript.txt`) derived from the original file name, stripping the original extension and appending a suffix. Finally, it streams the raw `txtContent` string directly to the client, prompting a native file download in the browser.
 * 
 * @param {import('express').Request} req - Express request object containing the transcript `id` in the URL parameters.
 * @param {import('express').Response} res - Express response object utilized for streaming the text file download.
 * @returns {Promise<void>} Resolves by sending a raw text payload with attachment headers. Does not return JSON on success.
 * @throws {Error} Returns a 404 Not Found JSON response if the transcript cannot be located. Returns a 500 Internal Server Error JSON response if string manipulation or database queries fail.
 */
exports.exportTranscriptToTxt = async (req, res) => {
  try {
    const { id } = req.params;

    const transcript = await Transcript.findById(id).populate("fileId", "fileName originalName");

    if (!transcript) {
      return res.status(404).json({ success: false, message: "Transcript not found" });
    }

    // Helper to format seconds to [HH:]MM:SS
    const formatTime = (seconds) => {
      if (typeof seconds !== "number" || isNaN(seconds)) return "00:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      
      const pad = (num) => String(num).padStart(2, "0");
      
      if (h > 0) {
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
      }
      return `${pad(m)}:${pad(s)}`;
    };

    // Format transcript segments into readable text
    let txtContent = "";
    
    // Add Metadata Header
    const fileName = transcript.fileId?.originalName || transcript.fileId?.fileName || "Untitled File";
    txtContent += `=== TRANSCRIPT: ${fileName} ===\r\n`;
    if (transcript.language) {
      txtContent += `Language: ${transcript.language}\r\n`;
    }
    if (transcript.durationSeconds) {
      txtContent += `Duration: ${formatTime(transcript.durationSeconds)}\r\n`;
    }
    txtContent += `\r\n=== FULL TEXT ===\r\n${transcript.fullText}\r\n\r\n`;
    
    txtContent += `=== TIMESTAMPS ===\r\n`;
    if (transcript.segments && transcript.segments.length > 0) {
      transcript.segments.forEach((seg) => {
        txtContent += `[${formatTime(seg.start)} - ${formatTime(seg.end)}] ${seg.text}\r\n`;
      });
    } else {
      txtContent += "(No segment timestamps available)\r\n";
    }

    // Determine download filename
    let downloadName = "transcript.txt";
    if (transcript.fileId?.originalName) {
      // Remove original extension if any, and append _transcript.txt
      const baseName = transcript.fileId.originalName.replace(/\.[^/.]+$/, "");
      downloadName = `${baseName}_transcript.txt`;
    } else if (transcript.fileId?.fileName) {
      const baseName = transcript.fileId.fileName.replace(/\.[^/.]+$/, "");
      downloadName = `${baseName}_transcript.txt`;
    }

    // Set headers to trigger file download
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(downloadName)}"`
    );

    return res.send(txtContent);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

