const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { handleUpload } = require('../controllers/uploadController');
const { handleGeneratePrd } = require('../controllers/prdController');
const { handleSummary } = require('../controllers/summaryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all AI routes
router.use(authMiddleware);

const { defaultKeyGenerator } = require('express-rate-limit');

// Strict Rate Limiter for AI Routes: max 30 requests per minute per user/IP
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 30,
  message: { success: false, message: "Too many AI requests, please wait a moment." },
  keyGenerator: (req, res) => {
    // Gunakan user ID jika ada, jika tidak gunakan fallback bawaan express-rate-limit
    return req.user ? req.user.id : defaultKeyGenerator(req, res); 
  }
});
router.use(aiLimiter);


const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.array('files', 10), handleUpload);
router.post('/generate-prd', handleGeneratePrd);

// Transcript routes
const { handleTranscribe, updateTranscript } = require('../controllers/transcribeController');
router.get('/files/:id/transcribe', handleTranscribe);
router.put('/files/:id/transcribe', updateTranscript);

router.get('/files/:id/summary', handleSummary);

// Ask Nexus & Embeddings
const askNexusRoutes = require('./askNexusRoutes');
const embeddingRoutes = require('./embeddingRoutes');
router.use('/ask-nexus', askNexusRoutes);
router.use('/embeddings', embeddingRoutes);

module.exports = router;
