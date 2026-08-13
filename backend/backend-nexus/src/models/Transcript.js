const mongoose = require("mongoose");

const segmentSchema = new mongoose.Schema(
  {
    start: {
      type: Number,
      required: [true, "segment.start is required"],
      min: [0, "segment.start must be non-negative"],
    },
    end: {
      type: Number,
      required: [true, "segment.end is required"],
      min: [0, "segment.end must be non-negative"],
    },
    text: {
      type: String,
      required: [true, "segment.text is required"],
      trim: true,
    },
  },
  { _id: false }
);

const transcriptSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      required: [true, "fileId is required"],
      unique: true, // One transcript per file
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "projectId is required"],
      index: true,
    },
    fullText: {
      type: String,
      required: [true, "fullText is required"],
      trim: true,
    },
    language: {
      type: String,
      default: null,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      required: [true, "durationSeconds is required"],
      min: [0, "durationSeconds must be non-negative"],
    },
    segments: {
      type: [segmentSchema],
      required: [true, "segments is required"],
      validate: {
        /**
         * Enforces the business requirement that every persisted Transcript document must contain at least one meaningful audio segment.
         * This validator is triggered implicitly by Mongoose before writing to the database. In the context of audio/video processing, 
         * a transcript without any text segments is considered invalid and likely indicative of a failed transcription pipeline 
         * or a silent media file.
         *
         * The function performs a twofold check:
         * 1. It verifies the primitive type of the incoming value, ensuring it is strictly a Javascript Array.
         * 2. It inspects the `length` property to guarantee that at least one segment object exists.
         * By failing early at the schema level, the application avoids storing ghost transcripts that consume database 
         * records without providing any retrievable NLP or search value, preventing cascading UI errors down the line.
         *
         * @param {Array<Object>} val - The array of parsed segment subdocuments attempting to be saved.
         * @returns {boolean} `true` if the input is a valid array containing 1 or more items, otherwise `false`.
         * @throws {ValidationError} Triggers a Mongoose ValidationError (HTTP 400) if the array is absent or empty.
         */
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: "segments must be a non-empty array",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true, // auto-manages createdAt & updatedAt
  }
);

module.exports = mongoose.model("Transcript", transcriptSchema);
