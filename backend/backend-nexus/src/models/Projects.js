const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "editor" },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    projectId: { type: String, unique: true, required: true, default: 
      /**
       * Generates a highly unique, randomized project identification string.
       * This function serves as the default generator for the `projectId` field within the Project schema.
       * It operates by producing a pseudorandom integer between 1 and 999, which is then padded with leading zeros
       * to ensure a consistent three-digit format. The resulting number is appended to the standard prefix "NEX-PRJ-".
       * 
       * This identifier is crucial for internal tracking, API routing, and referencing across interconnected microservices 
       * or database relations. Since this is generated entirely in-memory at the time of document instantiation, 
       * it acts as a synchronous fallback before database insertion. It does not perform any database checks for collisions,
       * relying instead on the schema's `unique: true` constraint at the database level to reject duplicates.
       * In the highly unlikely event of a collision, Mongoose will throw a MongoServerError with code 11000, 
       * which should be handled by the calling service.
       *
       * @returns {string} The randomly generated project identifier formatted as `NEX-PRJ-XXX`, where XXX is a 3-digit number.
       * @throws {MongoServerError} Will indirectly result in an HTTP 500 or 409 if a collision occurs on save due to unique indexing.
       */
      () => `NEX-PRJ-${String(Math.floor(1 + Math.random() * 999)).padStart(3, '0')}` 
    },
    name: { type: String, required: [true, 'Project name is required'], maxlength: [75, 'Project name cannot exceed 75 characters'], index: true, trim: true },
    description: { type: String, maxlength: [200, 'Description cannot exceed 200 characters'], default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    members: { type: [memberSchema], validate: [
      /**
       * Evaluates the integrity of the project's collaborator roster by enforcing a strict upper bound on team size.
       * This inline validation hook is invoked by Mongoose whenever the `members` array is modified (added to or replaced)
       * prior to persisting the changes to the database. The business logic dictates that a single project cannot exceed 
       * 5 collaborators to maintain optimal performance and billing tier constraints within the system.
       *
       * The function iterates or measures the incoming array of member subdocuments. It expects a raw Javascript Array 
       * from the Document instance. If the array's length exceeds 5, the validator rejects the mutation. This preempts
       * database writes, saving I/O and enforcing application-level business rules securely.
       *
       * @param {Array<Object>} val - The incoming array containing member objects. Each object represents a user's role and status within the project.
       * @returns {boolean} Returns `true` if the member array length is 5 or fewer; otherwise, returns `false` triggering a ValidationError.
       * @throws {ValidationError} Throws a Mongoose ValidationError (often resulting in HTTP 400 Bad Request) if the function returns false.
       */
      (val) => val.length <= 5, 'Project collaborator list maximum of 5 people'], default: [] },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

projectSchema.index({ updatedAt: -1 });
projectSchema.index({ createdBy: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

module.exports = mongoose.model('Project', projectSchema);
