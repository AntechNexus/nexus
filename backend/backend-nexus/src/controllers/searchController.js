const Project = require("../models/Projects");
const Folder = require("../models/Folder");
const File = require("../models/File");

/**
 * Executes a comprehensive global search across multiple domain entities including Projects, Folders, and Files.
 *
 * This controller serves as the primary search engine endpoint for the application. The workflow initiates by extracting the search query `q` from the request parameters. If the query is empty or consists solely of whitespace, it short-circuits and immediately returns an empty result set to optimize performance and avoid unnecessary database load.
 *
 * The core search logic relies on constructing case-insensitive regular expressions (`RegExp`) based on the user's input query. It then performs parallel searches across different MongoDB collections, meticulously scoped to the authenticated user's access permissions to ensure data security.
 *
 * 1. **Project Search**: Queries the `Project` collection for active (non-deleted) projects where the current user is either the creator (`createdBy`) or an explicit member within the `members` array. The search matches the regex against both the project's `name` and `description` fields.
 * 2. **Access Scoping**: To securely search Folders and Files, it first retrieves a list of all `projectId`s that the user is authorized to access (again, as a creator or member). This list of IDs (`allAccessibleProjectIds`) forms the foundational security boundary for subsequent queries.
 * 3. **Folder Search**: Queries the `Folder` collection for active folders that belong to any of the user's accessible projects and match the search regex against their `name`.
 * 4. **File Search**: Queries the `File` collection for active files within the user's accessible projects, matching the regex against either the `fileName` or `originalName`.
 *
 * All individual entity searches are capped at a limit of 5 results each to maintain response speed and prevent overwhelming the UI. The results are aggregated into a single, cohesive JSON response structure.
 *
 * @param {import('express').Request} req - The Express request object. Must contain the search term in `req.query.q` and authenticated user details in `req.user.id`.
 * @param {import('express').Response} res - The Express response object used to send the search payload.
 * @param {import('express').NextFunction} [next] - The Express next middleware function.
 * @returns {Promise<void>} Resolves when the response is finalized. Returns a 200 OK status with a JSON payload structured as `{ success: true, data: { projects: [...], folders: [...], files: [...] } }`. Returns empty arrays if the search query is blank.
 * @throws {Error} Logs the error to the console and returns a 500 Internal Server Error status with the message if any of the database queries fail or if an unexpected exception interrupts the search process.
 */
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === "") {
      return res
        .status(200)
        .json({
          success: true,
          data: { projects: [], folders: [], files: [] },
        });
    }

    const userId = req.user.id;
    const regex = new RegExp(q, "i");

    // Search Projects where user is creator or member
    const projects = await Project.find({
      $and: [
        { isDeleted: false },
        {
          $or: [{ createdBy: userId }, { "members.userId": userId }],
        },
        {
          $or: [{ name: regex }, { description: regex }],
        },
      ],
    })
      .limit(5)
      .select("_id name description projectId");

    // Get project IDs the user has access to for folder/file search scoping
    const userProjects = await Project.find({
      $and: [
        { isDeleted: false },
        {
          $or: [{ createdBy: userId }, { "members.userId": userId }],
        },
      ],
    }).select("_id");
    const allAccessibleProjectIds = userProjects.map((p) => p._id);

    // Search Folders
    const folders = await Folder.find({
      projectId: { $in: allAccessibleProjectIds },
      status: "active",
      name: regex,
    })
      .limit(5)
      .select("_id name projectId path");

    // Search Files
    const files = await File.find({
      projectId: { $in: allAccessibleProjectIds },
      status: "active",
      $or: [{ fileName: regex }, { originalName: regex }],
    })
      .limit(5)
      .select("_id fileName originalName fileType projectId folderId");

    res.status(200).json({
      success: true,
      data: {
        projects,
        folders,
        files,
      },
    });
  } catch (error) {
    console.error("Error in globalSearch:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};
