/**
 * Global centralized error handling middleware for the Express application.
 * 
 * This middleware serves as a catch-all for errors thrown during the request lifecycle. It is specifically designed
 * to intercept and gracefully format common database errors originating from Mongoose (MongoDB ODM), ensuring
 * that the client receives structured, predictable, and informative JSON responses rather than raw stack traces
 * or generic server errors.
 * 
 * Workflow and Error Transformations:
 * 1. **Default Initialization**: Initializes the response message to the provided error message or defaults to "Internal Server Error", and sets the status code to the error's status code or 500.
 * 2. **Mongoose Validation Error (`ValidationError`)**: Occurs when a document fails schema validation rules before saving. The middleware intercepts this, changes the status code to 400 (Bad Request), and constructs a `validationErrors` object mapping each field to its specific validation failure message.
 * 3. **Mongoose Duplicate Key Error (Code 11000)**: Triggered when a unique index constraint is violated (e.g., registering an email that already exists). It identifies the conflicting field, sets a 400 status code, and generates a user-friendly duplicate error message.
 * 4. **Mongoose Cast Error (`CastError`)**: Happens when Mongoose attempts to cast a value to a specific type but fails (most commonly when an invalid ObjectId string is passed in a URL parameter). It sets a 400 status code and formats an error message indicating the invalid path and value.
 * 5. **Final Response**: Sends an HTTP response with the computed status code. The JSON payload includes a top-level `message` string and, conditionally, a `validationErrors` object containing granular field-level error details.
 * 
 * @param {Error} err - The error object passed down from previous middleware or route handlers. May contain standard Error properties or Mongoose-specific properties (like `name`, `code`, `errors`, `keyValue`, `path`, `value`).
 * @param {Object} req - The Express request object associated with the failed operation.
 * @param {Object} res - The Express response object used to send the formatted JSON error payload to the client.
 * @param {Function} next - The Express next middleware function. Not explicitly called here as this middleware terminates the request-response cycle, but required by Express to recognize the function signature as an error handler.
 * @returns {void} This function sends a response and does not return any internal value.
 * @throws {HTTP Status} Dynamically returns 400 for bad requests/validation issues, or 500/custom status for other unhandled exceptions. Response body format: `{ message: string, validationErrors?: Object }`.
 */
const errorHandler = (err, req, res, next) => {
  let message = err.message || "Internal Server Error";
  let statusCode = err.statusCode || 500;
  let validationErrors = null;

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    message = "Validation failed. Please check your inputs.";
    statusCode = 400;
    validationErrors = {};
    for (const field in err.errors) {
      validationErrors[field] = err.errors[field].message;
    }
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    message = "Duplicate field value entered.";
    statusCode = 400;
    validationErrors = {};
    const field = Object.keys(err.keyValue)[0];
    validationErrors[field] = `An entity with this ${field} already exists.`;
  }

  // Mongoose Cast Error (Invalid ID)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  res.status(statusCode).json({
    message,
    ...(validationErrors && { validationErrors })
  });
};

module.exports = errorHandler;
