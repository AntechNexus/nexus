const express = require("express");
const { askNexus, getConversations, getConversationById, regenerateMessage } = require("../controllers/askNexusController");

const router = express.Router();

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan' });
  }
  try {
    const authUrl = process.env.AUTH_SERVICE_URL || "http://localhost:5000";
    const response = await fetch(`${authUrl}/api/auth/me`, {
      headers: { Authorization: header }
    });
    
    if (!response.ok) {
      return res.status(401).json({ message: 'Token tidak valid dari auth service' });
    }
    
    const data = await response.json();
    // getMe returns { user: { id, email, ... } }
    const userData = data.user || data;
    req.user = { id: userData._id || userData.id, ...userData };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({ message: 'Gagal memverifikasi token', error: err.message });
  }
};

router.post("/ask", authMiddleware, askNexus);
router.post("/regenerate", authMiddleware, regenerateMessage);
router.get("/conversations", authMiddleware, getConversations);
router.get("/conversations/:id", authMiddleware, getConversationById);

module.exports = router;
