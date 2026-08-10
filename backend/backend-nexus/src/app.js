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
app.use(cors({ origin: true, credentials: true })); // origin: true allows any requester origin
app.use(express.json());
const path = require("path");
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Handle malformed JSON body requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ success: false, message: "Invalid JSON format. Please verify your request payload structure." });
  }
  next(err);
});

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

