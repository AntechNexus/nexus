const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const helmet = require('helmet');

app.use(helmet());

// Secure CORS: Only allow frontend and backend-nexus
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  process.env.AUTH_SERVICE_URL || "http://localhost:5000"
];
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

// Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
