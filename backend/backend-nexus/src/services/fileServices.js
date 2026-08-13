const RecentFile = require("../models/RecentFile");

/**
 * Asynchronously logs and updates a user's recent file access history in the database.
 * 
 * This service function acts as an analytical and operational tracker. Whenever a user opens, previews, or edits
 * a file, this function should be invoked to maintain a "Recently Viewed Files" list. It uses a MongoDB `upsert`
 * operation to ensure high performance and avoid duplicate entries.
 * 
 * Workflow:
 * 1. Executes a Mongoose `findOneAndUpdate` operation on the `RecentFile` collection.
 * 2. **Query Criteria**: Searches for an existing record matching both the `createdBy` (the user's ID) and the `fileId`. This guarantees one recent access record per user per file.
 * 3. **Update Payload**: Updates the `projectId` (in case the file was moved), refreshes the `accessedAt` timestamp to the current exact time, and ensures `createdBy`/`updatedBy` audit fields are set.
 * 4. **Options**: Uses `{ upsert: true, new: true }`. If no matching record is found (first time access), it creates a new document. If found, it updates the existing one. `new: true` is provided to return the modified document, though its result isn't actively returned by this function.
 * 5. **Error Handling**: Wraps the database call in a try-catch block. If the operation fails (e.g., database timeout), it logs the error to the console prefixed with `[RECORD_FILE_ACCESS_ERROR]:`. It intentionally *does not* throw the error outwards, ensuring that a non-critical analytics failure does not interrupt the main user workflow (like fetching the file content).
 * 
 * @param {string} userId - The unique ObjectId string representing the authenticated user performing the action.
 * @param {string} fileId - The unique ObjectId string of the target file being accessed.
 * @param {string} projectId - The associated project ObjectId string. Helps in grouping recent files contextually.
 * @returns {Promise<void>} Resolves when the database operation completes. Does not return the upserted document.
 */
const recordFileAccess = async (userId, fileId, projectId) => {
  try {
    await RecentFile.findOneAndUpdate(
      { createdBy: userId, fileId },
      {
        projectId,
        accessedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("[RECORD_FILE_ACCESS_ERROR]:", error);
  }
};

module.exports = {
  recordFileAccess,
};
