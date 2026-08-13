require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("./config/passport");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const fileRoutes = require("./routes/fileRoutes");
const folderRoutes = require("./routes/folderRoutes");
const projectRoutes = require("./routes/projectRoutes");
const teamRoutes = require("./routes/teamRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const transcriptRoutes = require("./routes/transcriptRoutes");
const prdRoutes = require("./routes/prdRoutes");
const searchRoutes = require("./routes/searchRoutes");

const app = express();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

app.set("trust proxy", 1); // Enable trusting proxy to get real IP for rate limiting

app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  xFrameOptions: false,
  contentSecurityPolicy: false,
}));

// Global Rate Limiter: max 1000 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 1000,
  message: { success: false, message: "Terlalu banyak request, mohon tunggu sebentar." }
});
app.use(globalLimiter);

// Secure CORS: Only allow frontend
const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
const path = require("path");
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Handle malformed JSON body requests
/**
 * Express middleware acting as an early interceptor for body-parser syntax errors.
 * 
 * This middleware specifically watches for instances where `express.json()` fails to parse an incoming request body
 * because the client sent invalid, malformed JSON (e.g., missing quotes, trailing commas). Without this, Express
 * would typically return a raw HTML stack trace or a generic 500 error, which breaks API contract expectations.
 * 
 * Workflow:
 * 1. Checks if the caught `err` is an instance of `SyntaxError`.
 * 2. Verifies that the HTTP status attached to the error is `400` (Bad Request), which is what `express.json()` sets on parse failures.
 * 3. Ensures the error originated from parsing the `body` property.
 * 4. If all conditions match, it intercepts the error and responds immediately with a localized, structured 400 JSON payload, advising the client to verify their payload structure.
 * 5. If the error is not a JSON syntax issue, it passes the error down the chain to the next error handler using `next(err)`.
 * 
 * @param {Error} err - The error object propagated from preceding middleware (specifically `express.json()`).
 * @param {Object} req - The Express HTTP request object.
 * @param {Object} res - The Express HTTP response object used to send the 400 error.
 * @param {Function} next - The Express callback to pass control down the middleware chain.
 * @returns {Object|void} Returns a JSON response object if a syntax error is handled, otherwise calls `next()` returning void.
 */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ success: false, message: "Invalid JSON format. Please verify your request payload structure." });
  }
  next(err);
});

/**
 * Development and auditing middleware that logs all incoming HTTP traffic to the server console.
 * 
 * This function intercepts every single HTTP request hitting the server before they are routed to specific endpoints.
 * It provides a basic audit trail useful for debugging, monitoring traffic frequency, and tracing request lifecycles
 * in real-time.
 * 
 * Workflow:
 * 1. Extracts the current server time and formats it as an ISO string (e.g., `2026-08-12T10:00:00.000Z`).
 * 2. Constructs a log string combining the timestamp, the HTTP method (e.g., GET, POST, PUT), and the accessed URL path.
 * 3. Prints the string to standard output using `console.log`.
 * 4. Immediately calls `next()` to ensure the request continues its journey down the Express middleware stack without artificial delay.
 * 
 * @param {Object} req - The Express HTTP request object, providing the `method` and `url` attributes.
 * @param {Object} res - The Express HTTP response object (unused in this function, but required by signature).
 * @param {Function} next - The Express callback function to advance to the next middleware.
 * @returns {void} Does not return a value; its purpose is strictly side-effectual logging.
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Inisialisasi Passport JS
app.use(passport.initialize());

const errorHandler = require("./middleware/errorHandler");

// Mounting Routes
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/transcripts", transcriptRoutes);
app.use("/api/prd", prdRoutes);
app.use("/api/search", searchRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/**
 * Bootstraps and initializes the core backend infrastructure asynchronously.
 * 
 * This is the primary entry point function responsible for orchestrating the startup sequence of the Nexus backend.
 * It ensures that critical dependencies, particularly the database, are fully operational before the Express server
 * begins accepting incoming HTTP traffic.
 * 
 * Workflow:
 * 1. **Database Connection**: Awaits the `connectDB()` function. This blocks the server from starting if MongoDB is unreachable, enforcing a fail-fast architecture.
 * 2. **Server Binding**: If the database connects successfully, it instructs the Express app to bind to the specified `PORT` (derived from environment variables, defaulting to 5000) and start listening for connections.
 * 3. **Confirmation**: Logs a success message indicating the active port, confirming the application is healthy and ready.
 * 4. **Fatal Error Handling**: Wraps the entire boot sequence in a try-catch block. If `connectDB` throws an error or the port binding fails (e.g., port already in use), it catches the exception, logs a fatal error message, and explicitly kills the Node.js process with `process.exit(1)`.
 * 
 * Business Logic Impact:
 * - Prevents the API from returning 500 errors to users due to an unconnected database by simply refusing to start the web server until the DB is ready.
 * 
 * @returns {Promise<void>} Resolves when the Express server successfully binds to the port and enters the listening state.
 * @throws {Error} Terminates the process upon failure; does not throw up the stack.
 */
const startServer = async () => {
  try {
    // Panggil fungsi koneksi database dari config/db.js
    await connectDB();

    // Jalankan server Express
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => console.log("MongoDB connected"))
//   .catch((err) => console.error(err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

