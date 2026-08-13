const jwt = require('jsonwebtoken');

const User = require('../models/User');

/**
 * Express middleware that enforces authentication on protected routes.
 * 
 * This middleware intercepts incoming HTTP requests to check for the presence of a valid JSON Web Token (JWT).
 * It specifically looks for the `authorization` header and expects the format `Bearer <token>`.
 * 
 * Workflow:
 * 1. Checks if the `authorization` header exists and starts with the string "Bearer ".
 * 2. If the header is missing or improperly formatted, it sets `req.user = null` and proceeds to the next middleware (allowing unauthenticated access if handled downstream, although typical protected routes will require user object).
 * 3. Extracts the token string by splitting the header value.
 * 4. Synchronously verifies the token using `jsonwebtoken` against the `JWT_SECRET` environment variable.
 * 5. If verification succeeds, the decoded token payload is attached to the `req.user` property, allowing subsequent route handlers to identify the authenticated user.
 * 6. If verification fails (e.g., token expired, malformed, or invalid signature), it catches the error and immediately terminates the request-response cycle, returning a 401 Unauthorized status.
 * 
 * Edge Cases Handled:
 * - Missing `authorization` header.
 * - Header present but does not use the Bearer scheme.
 * - Token is valid but `JWT_SECRET` is misconfigured.
 * - Token is expired or invalid.
 * 
 * @param {Object} req - The Express request object. It is expected to contain headers, and if successful, `req.user` will be populated with the decoded JWT payload.
 * @param {Object} res - The Express response object used to send back a 401 error response if token validation fails.
 * @param {Function} next - The Express callback function to pass control to the next middleware in the stack.
 * @returns {void} Does not return a specific value; either calls `next()` or sends an HTTP response.
 * @throws {401} Responds with a 401 HTTP status and a JSON payload `{ message: 'Invalid token' }` if the token cannot be verified.
 */
const protect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Akses ditolak, token tidak ditemukan' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

exports.protect = protect;
exports.verifyToken = protect;
