const express = require("express");
const passport = require("passport");
const router = express.Router();
const auth = require("../controllers/authController");
const { protect } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');
const upload = require("../middleware/upload");

// Rate limiting configurations
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, 
  max: 5, 
  message: { message: 'Too many login attempts, please try again after 5 minutes' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 5, 
  message: { message: 'Too many registration attempts, please try again after 1 hour' },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});

router.use(generalLimiter);

router.post("/register", registerLimiter, auth.register);
router.post("/verify-otp", auth.verifyOtp);
router.post("/login", loginLimiter, auth.login);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  auth.googleCallback,
);

router.get('/me', protect, auth.getMe);
router.get('/storage', protect, auth.getStorage);
router.post('/resend-otp', auth.resendOtp);
router.post('/set-password', protect, auth.setPassword);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.put('/profile', protect, upload.single('avatar'), auth.updateProfile);
router.post('/change-password', protect, auth.changePassword);
router.delete('/account', protect, auth.deleteAccount);
module.exports = router;
