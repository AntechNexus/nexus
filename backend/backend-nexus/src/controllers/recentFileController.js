const RecentFile = require('../models/RecentFile');

/**
 * Retrieves a paginated list of files recently accessed by the authenticated user.
 * 
 * This controller handles the business logic for fetching the user's recent file history. It is crucial for populating the "Recent Files" dashboard section, allowing users to quickly jump back into their active documents. The workflow begins by extracting the `userId` from the authenticated request payload. It then queries the `RecentFile` collection, specifically filtering for entries created by the current user. To ensure relevance, the results are sorted in descending order based on the `accessedAt` timestamp, limiting the output to the top 5 most recently interacted files.
 * 
 * The query utilizes deep population to fetch associated metadata for each file. It populates the `fileId` reference to retrieve essential file details like `fileName`, `originalName`, `fileType`, `sizeBytes`, and ownership information. Crucially, it only includes files with an 'active' status, ensuring that soft-deleted or trashed files are excluded from the recent files list. Furthermore, it nests populations to resolve the file's parent `folderId` (for folder names) and user profiles for both `createdBy` and `updatedBy` fields. It also populates the parent `projectId` to provide broader context.
 * 
 * An important edge case handled by this function is the potential for dangling references. If a file is permanently deleted or moved to a state where it no longer matches the population criteria (e.g., status changed from 'active'), the populated `fileId` might resolve to `null`. The code explicitly filters out these null references before sending the response to maintain data integrity.
 * 
 * @param {import('express').Request} req - The Express request object. Expected to contain a valid `req.user` object with an `id` or `_id` property, populated by previous authentication middleware.
 * @param {import('express').Response} res - The Express response object used to send back the HTTP result.
 * @param {import('express').NextFunction} [next] - The Express next middleware function, used for error delegation if needed.
 * @returns {Promise<void>} Resolves when the response is sent. Returns a 200 OK status with a JSON body containing `success: true` and a `data` array of recent file objects.
 * @throws {Error} Returns a 401 Unauthorized status if the user ID is missing from the request. Returns a 500 Internal Server Error status with the error message if any database query fails or an unexpected exception occurs during execution.
 */
exports.getRecentFiles = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Query recent files, limit to 15, sort by accessedAt desc
    const recentFiles = await RecentFile.find({ createdBy: userId })
      .sort({ accessedAt: -1 })
      .limit(5)
      .populate({
        path: 'fileId',
        select: 'fileName originalName fileType sizeBytes status folderId createdBy updatedBy',
        match: { status: 'active' },
        populate: [
          { path: 'folderId', select: 'name' },
          { path: 'createdBy', select: 'profile email' },
          { path: 'updatedBy', select: 'profile email' },
        ],
      })
      .populate({
        path: 'projectId',
        select: 'name createdBy members',
      });

    // Filter out entries where fileId is null or user has lost access to the project
    const filteredRecentFiles = recentFiles.filter((item) => {
      if (item.fileId === null) return false;
      const project = item.projectId;
      if (!project) return false;
      
      const isOwner = project.createdBy?.toString() === userId;
      const isAcceptedMember = project.members?.some(
        (m) => m.userId?.toString() === userId && m.status === 'accepted'
      );
      
      return isOwner || isAcceptedMember;
    });

    return res.status(200).json({
      success: true,
      data: filteredRecentFiles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
