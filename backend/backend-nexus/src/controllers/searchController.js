const Project = require('../models/Projects');
const Folder = require('../models/Folder');
const File = require('../models/File');

exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({ success: true, data: { projects: [], folders: [], files: [] } });
    }

    const userId = req.user.id;
    const regex = new RegExp(q, 'i');

    // Search Projects where user is creator or member
    const projects = await Project.find({
      $and: [
        { isDeleted: false },
        {
          $or: [
            { createdBy: userId },
            { 'members.userId': userId }
          ]
        },
        {
          $or: [
            { name: regex },
            { description: regex }
          ]
        }
      ]
    }).limit(5).select('_id name description projectId');

    // Get project IDs the user has access to for folder/file search scoping
    const userProjects = await Project.find({
      $and: [
        { isDeleted: false },
        {
          $or: [
            { createdBy: userId },
            { 'members.userId': userId }
          ]
        }
      ]
    }).select('_id');
    const allAccessibleProjectIds = userProjects.map(p => p._id);

    // Search Folders
    const folders = await Folder.find({
      projectId: { $in: allAccessibleProjectIds },
      name: regex
    }).limit(5).select('_id name projectId path');

    // Search Files
    const files = await File.find({
      projectId: { $in: allAccessibleProjectIds },
      $or: [
        { fileName: regex },
        { originalName: regex }
      ]
    }).limit(5).select('_id fileName originalName fileType projectId folderId');

    res.status(200).json({
      success: true,
      data: {
        projects,
        folders,
        files
      }
    });
  } catch (error) {
    console.error('Error in globalSearch:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
