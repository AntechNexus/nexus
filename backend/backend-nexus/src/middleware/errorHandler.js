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
