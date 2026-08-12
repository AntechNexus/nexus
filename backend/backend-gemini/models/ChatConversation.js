const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "New Conversation",
    },
    filesId: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "File",
        },
      ],
      default: [],
    },
    messages: [
      {
        role: { type: String, enum: ['user', 'model'], required: true },
        content: { type: String, required: true },
        sources: [
          {
            fileName: String,
            fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
            fileStatus: { type: String, default: "active" },
            textSnippet: String
          }
        ],
        timestamp: { type: Date, default: Date.now }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
