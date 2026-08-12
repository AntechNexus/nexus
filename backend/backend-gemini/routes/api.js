const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { handleUpload } = require('../controllers/uploadController');
const { handleGeneratePrd } = require('../controllers/prdController');
const { handleSummary } = require('../controllers/summaryController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Strict Rate Limiter for AI Routes: max 10 requests per minute per IP
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 10,
  message: { success: false, message: "Terlalu banyak request ke AI, mohon tunggu sebentar." }
});
router.use(aiLimiter);

// Apply authentication middleware to all AI routes
router.use(authMiddleware);

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
