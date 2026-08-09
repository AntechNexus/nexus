const express = require("express");
const jwt = require("jsonwebtoken");
const { askNexus, getConversations, getConversationById, regenerateMessage } = require("../controllers/askNexusController");

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};

router.post("/ask", authMiddleware, askNexus);
router.post("/regenerate", authMiddleware, regenerateMessage);
router.get("/conversations", authMiddleware, getConversations);
router.get("/conversations/:id", authMiddleware, getConversationById);

module.exports = router;
