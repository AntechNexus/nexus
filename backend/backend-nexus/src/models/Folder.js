const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "projectId is required"],
      index: true,
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Folder name is required"],
      maxlength: [75, "Folder name cannot exceed 75 characters"],
      trim: true,
    },
    color: {
      type: String,
      default: null,
      validate: {
        /**
         * Verifies the lexical structure of the folder's assigned color tag to ensure it conforms to standard CSS hex color specifications.
         * This custom validator runs synchronously during document validation phases (e.g., save, update). The system allows folders 
         * to have customizable color labels for UI/UX purposes. The validator must ensure that any submitted color is either null/falsy 
         * (indicating no color is set) or precisely matches a 3-character or 6-character hexadecimal code prefixed by a hash symbol (#).
         *
         * The logic employs a Regular Expression (`/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`) to parse the string. 
         * - If the value is missing or falsy, it gracefully short-circuits and returns true, allowing the default `null` state.
         * - If the value is present, it must strictly evaluate against the regex.
         * By handling this at the schema level, the system guarantees that the frontend will never receive malformed color data 
         * that could break CSS rendering or cause injection vulnerabilities.
         *
         * @param {string|null|undefined} v - The raw string value attempting to be set as the folder's color.
         * @returns {boolean} Evaluates to `true` if the string is perfectly formatted or deliberately empty, and `false` if it violates the regex.
         * @throws {ValidationError} Will cause Mongoose to throw a ValidationError (typically translating to HTTP 400) if it returns false.
         */
        validator: function (v) {
          if (!v) return true;
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        /**
         * Dynamically constructs a user-facing error message when the associated hex color validator fails.
         * This function is invoked by Mongoose's validation error handler precisely when the `validator` function 
         * for the `color` field returns false. The purpose of this method is to contextualize the failure 
         * by injecting the rejected value directly into the error payload, providing better debugging context 
         * for developers and clearer feedback for the end user.
         * 
         * The resulting string is attached to the `ValidationError.errors.color.message` property, 
         * which is eventually serialized and transmitted via API responses (usually resulting in an HTTP 400 response body).
         *
         * @param {Object} props - The contextual properties object automatically supplied by Mongoose.
         * @param {string} props.value - The exact invalid string that triggered the validation failure.
         * @returns {string} A detailed, stringified error message clarifying which exact value was rejected.
         */
        message: (props) => `${props.value} is not a valid hex color code!`,
      },
    },
    path: {
      type: String,
      required: [true, "Path is required"],
      index: true,
    },
    level: {
      type: Number,
      required: [true, "Level is required"],
      min: [1, "Minimum depth level is 1"],
      max: [5, "Maximum depth level is 5"],
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
    status: {
      type: String,
      enum: {
        values: ["active", "trash", "deleted"],
        message: "Status needs to be 'active', 'trash', or 'deleted'",
      },
      default: "active",
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Folder", folderSchema);