// config/db.js
const mongoose = require("mongoose");

/**
 * Establishes an asynchronous connection to the MongoDB cluster using the Mongoose Object Data Modeling (ODM) library.
 * 
 * This function is critical for the backend application's initialization sequence. It relies on environment variables
 * to locate the database and attempt a connection. It implements robust error handling to ensure the application
 * fails fast if the database is unreachable, preventing the server from running in a degraded, non-functional state.
 * 
 * Workflow:
 * 1. Retrieves the MongoDB connection URI string from the `process.env.MONGO_URI` environment variable.
 * 2. Invokes `mongoose.connect()` asynchronously, waiting for the connection promise to resolve.
 * 3. Upon successful connection, it logs a confirmation message to the console containing the host address of the connected database instance (`conn.connection.host`).
 * 4. If an exception occurs during the connection attempt (e.g., invalid URI, network timeout, authentication failure), it catches the error.
 * 5. In the catch block, it logs the specific error message to the console using `console.error`.
 * 6. Finally, it forcefully terminates the Node.js process with an exit code of `1` (indicating failure) via `process.exit(1)`, signaling to process managers (like PM2 or Docker) that the app failed to start.
 * 
 * External Interactions:
 * - Network call to a MongoDB server (local or cloud-based like MongoDB Atlas).
 * 
 * @returns {Promise<void>} Returns a Promise that resolves when the database connection is successfully established. It never resolves if the connection fails, as the process exits.
 * @throws {Error} Catches connection errors internally, logs them, and halts the application process; does not bubble exceptions up to the caller.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;