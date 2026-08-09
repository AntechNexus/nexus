const express = require("express");
const { askNexus, getConversations, getConversationById, regenerateMessage } = require("../controllers/askNexusController");

const router = express.Router();

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  try {
    const response = await fetch("http://localhost:5000/api/auth/me", {
      headers: { Authorization: header }
    });
    
    if (!response.ok) {
      return res.status(401).json({ message: 'Token tidak valid dari auth service' });
    }
    
    const userData = await response.json();
    // getMe returns the user object directly, with _id
    req.user = { id: userData._id || userData.id, ...userData };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Gagal memverifikasi token' });
  }
};

router.post("/ask", authMiddleware, askNexus);
router.post("/regenerate", authMiddleware, regenerateMessage);
router.get("/conversations", authMiddleware, getConversations);
router.get("/conversations/:id", authMiddleware, getConversationById);

module.exports = router;
