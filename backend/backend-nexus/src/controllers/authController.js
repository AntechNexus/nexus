const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const File = require("../models/File");
const Project = require("../models/Projects");
const Otp = require("../models/Otp");
const { sendOtpEmail, sendResetLinkEmail } = require("../config/mailer");

const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const isValidEmail = (email) => {
  return typeof email === 'string' && email.includes('@') && email.includes('.');
};

// Helper validasi kerumitan password (NEX-002)
const isValidPassword = (password) => {
  // Minimal 8 karakter, ada huruf besar, huruf kecil, angka, dan setidaknya satu karakter non-alfanumerik (spesial apa pun)
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return regex.test(password);
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// create
exports.register = async (req, res) => {
  let { email, password, fullName } = req.body;
  
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string' || !fullName || typeof fullName !== 'string')
    return res.status(400).json({ message: "Email, password, and full name are required" });
    
  email = email.trim().toLowerCase();
  password = password.trim();
  fullName = fullName.trim();
  
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Please enter a valid email address" });
    
  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special characters" 
    });
  }

  if (fullName.length < 2 || fullName.length > 50)
    return res.status(400).json({ message: "Full name must be between 2 and 50 characters" });

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email is already registered" });

    const hashed = await bcrypt.hash(password, 10);
    
    // Simpan pendaftaran dengan nama lengkap di profil
    await User.create({
      email,
      passwordHash: hashed,
      isVerified: false,
      profile: {
        fullName: fullName
      }
    });

    const otp = genOtp();
    await Otp.create({
      email,
      code: otp,
      type: "signup",
      cooldownUntil: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60000),
    });
    await sendOtpEmail(email, otp);

    res.json({ message: "Registration successful. Please check your email for the OTP code" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  let { email, code, onboarding } = req.body;
  
  if (!email || typeof email !== 'string' || !code || typeof code !== 'string')
    return res.status(400).json({ message: "Email and OTP are required" });
    
  email = email.trim().toLowerCase();
  code = code.trim();

  try {
    const record = await Otp.findOne({ email, code });
    if (!record) return res.status(400).json({ message: "Invalid OTP code" });
    if (record.expiresAt < new Date())
      return res.status(400).json({ message: "OTP code has expired" });

    // Cari user untuk di-update status verifikasi dan data onboarding-nya
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isVerified = true;

    // Simpan data onboarding jika dikirimkan oleh frontend
    if (onboarding) {
      user.onboarding.role = typeof onboarding.role === 'string' ? onboarding.role.trim() : '';
      user.onboarding.teamSize = typeof onboarding.teamSize === 'string' ? onboarding.teamSize.trim() : '';
      user.onboarding.industry = typeof onboarding.industry === 'string' ? onboarding.industry.trim() : '';
    }
    
    // Set status onboarding telah selesai
    user.onboarding.isCompleted = true;

    await user.save();
    await Otp.deleteMany({ email });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({ message: "Verification successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.login = async (req, res) => {
  let { email, password, rememberMe } = req.body;
  
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string')
    return res.status(400).json({ message: "Email and password are required" });
    
  email = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash)
      return res.status(400).json({ message: "Incorrect email or password" });
    if (!user.isVerified)
      return res.status(403).json({ message: "Account has not been verified" });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match)
      return res.status(400).json({ message: "Incorrect email or password" });

    const expiresIn = (rememberMe === true || rememberMe === 'true') ? '7d' : '1d';
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn },
    );
    res.json({ token, user: { email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// google SSO
exports.googleCallback = (req, res) => {
  const token = jwt.sign(
    { id: req.user._id, email: req.user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
  const hasPassword = !!req.user.passwordHash;
  res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}&hasPassword=${hasPassword}`);
};

// Fungsi forgotPassword
exports.forgotPassword = async (req, res) => {
  let { email } = req.body;
  if (!email || typeof email !== 'string')
    return res.status(400).json({ message: "Email is required" });

  email = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    // Opsi A: Jika email tidak ditemukan, tetap tampilkan pesan sukses (User Enumeration Protection)
    if (!user) {
      return res.json({ message: "If the email is registered, a password reset link has been sent" });
    }

    await Otp.deleteMany({ email, type: 'password_reset' });

    const otp = genOtp();
    await Otp.create({
      email,
      code: otp,
      type: "password_reset",
      cooldownUntil: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60000),
    });
    await sendResetLinkEmail(email, otp);

    res.json({ message: "If the email is registered, a password reset link has been sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Fungsi resetPassword
exports.resetPassword = async (req, res) => {
  let { email, code, newPassword } = req.body;

  if (!email || typeof email !== 'string' || !code || typeof code !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: "Email, OTP code, and new password are required" });
  }

  email = email.trim().toLowerCase();
  code = code.trim();
  newPassword = newPassword.trim();

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special characters"
    });
  }

  try {
    const record = await Otp.findOne({ email, code, type: 'password_reset' });
    if (!record) return res.status(400).json({ message: "Invalid or missing OTP code" });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: "OTP code has expired" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.isVerified = true;
    await user.save();

    await Otp.deleteMany({ email, type: 'password_reset' });

    res.json({ message: "Password updated successfully. Please sign in" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// View Profile
exports.getMe = async (req, res) => {
  try {
    // Ambil data utuh terlebih dahulu agar hasPassword terhitung valid
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const userObj = user.toObject();
    const hasPassword = !!userObj.passwordHash;
    
    // Hapus hash password sebelum dikirim demi alasan keamanan
    delete userObj.passwordHash;

    // Sinkronisasi/Default roleTitle ke onboarding.role jika di profile masih kosong
    if (!userObj.profile.roleTitle && userObj.onboarding?.role) {
      userObj.profile.roleTitle = userObj.onboarding.role;
    }

    res.json({
      user: {
        id: userObj._id,
        email: userObj.email,
        isVerified: userObj.isVerified,
        hasPassword: hasPassword,
        hasGoogle: !!userObj.googleId,
        profile: userObj.profile,
        onboarding: userObj.onboarding,
        storage: {
          usedBytes: userObj.storage.usedBytes,
          limitBytes: userObj.storage.limitBytes,
          // limit dibulatkan dalam GB
          limitGB: Math.round(userObj.storage.limitBytes / (1024 * 1024 * 1024)), 
          usedFormatted: formatBytes(userObj.storage.usedBytes),
          limitFormatted: formatBytes(userObj.storage.limitBytes),
        },
        subscription: userObj.subscription,
        createdAt: userObj.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  let { email } = req.body;
  
  if (!email || typeof email !== 'string')
    return res.status(400).json({ message: "Email is required" });
    
  email = email.trim().toLowerCase();
  
  if (!isValidEmail(email))
    return res.status(400).json({ message: "Please enter a valid email address" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Email not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Account is already verified' });

    const existingOtp = await Otp.findOne({ email, type: 'signup' });
    if (existingOtp && existingOtp.cooldownUntil > new Date()) {
      const waitSeconds = Math.ceil((existingOtp.cooldownUntil - new Date()) / 1000);
      return res.status(400).json({ message: `Please wait ${waitSeconds} seconds before requesting another OTP` });
    }

    await Otp.deleteMany({ email });
    const otp = genOtp();
    await Otp.create({
      email,
      code: otp,
      type: 'signup',
      cooldownUntil: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60000)
    });
    await sendOtpEmail(email, otp);

    res.json({ message: 'A new OTP code has been sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.setPassword = async (req, res) => {
  let { password } = req.body;
  
  if (!password || typeof password !== 'string')
    return res.status(400).json({ message: "Password is required" });
    
  password = password.trim();
  
  try {
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, lowercase, number, and special characters"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.passwordHash)
      return res.status(400).json({ message: 'Account already has a password' });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: 'Password saved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Edit Profile
exports.updateProfile = async (req, res) => {
  const { fullName, roleTitle, avatarUrl, role, industry, teamSize } = req.body;

  // Validasi panjang nama jika disediakan (2-50 karakter - NEX-089)
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 50) {
      return res.status(400).json({ message: "Full name must be between 2 and 50 characters" });
    }
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Inisialisasi jika profile belum terbentuk di DB
    if (!user.profile) {
      user.profile = { fullName: 'New User', roleTitle: '', avatarUrl: '' };
    }

    if (fullName !== undefined) {
      user.profile.fullName = fullName.trim();
    }
    
    // Update role / roleTitle
    if (role !== undefined) {
      const trimmedRole = typeof role === 'string' ? role.trim() : '';
      user.onboarding.role = trimmedRole;
      user.profile.roleTitle = trimmedRole; // Sinkronisasi ke profile.roleTitle
    } else if (roleTitle !== undefined) {
      user.profile.roleTitle = typeof roleTitle === 'string' ? roleTitle.trim() : '';
      user.onboarding.role = user.profile.roleTitle; // Sinkronisasi ke onboarding.role
    } else if (!user.profile.roleTitle && user.onboarding?.role) {
      user.profile.roleTitle = user.onboarding.role;
    }

    // Update avatarUrl jika disediakan atau ada file yang diunggah
    if (req.file) {
      user.profile.avatarUrl = `/uploads/avatars/${req.file.filename}`;
    } else if (avatarUrl !== undefined) {
      user.profile.avatarUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    }

    // Update onboarding fields jika disediakan
    if (industry !== undefined) {
      user.onboarding.industry = typeof industry === 'string' ? industry.trim() : '';
    }
    if (teamSize !== undefined) {
      user.onboarding.teamSize = typeof teamSize === 'string' ? teamSize.trim() : '';
    }

    await user.save();
    res.json({
      message: "Profile updated successfully",
      profile: user.profile,
      onboarding: user.onboarding
    });
  } catch (err) {
    console.error("[PROFILE UPDATE ERROR]:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// fungsi change password di profile
exports.changePassword = async (req, res) => {
  let { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: "Current password and new password are required" });
  }

  currentPassword = currentPassword.trim();
  newPassword = newPassword.trim();

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: "New password must be at least 8 characters and include uppercase, lowercase, number, and special characters"
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Cek jika akun SSO dan belum memiliki password
    if (!user.passwordHash) {
      return res.status(400).json({ message: "Your account does not have a password yet. Please use Set Password first" });
    }

    // Verifikasi password saat ini
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Mencegah penggunaan password yang sama dengan password saat ini
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ message: "New password cannot be the same as your current password" });
    }

    // Hash dan simpan password baru
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// delete
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Otp.deleteMany({ email: user.email });
    await User.findByIdAndDelete(req.user.id);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getStorage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projects = await Project.find({ createdBy: userId, isDeleted: false });
    const projectIds = projects.map(p => p._id);

    const breakdownAgg = await File.aggregate([
      { $match: { projectId: { $in: projectIds }, status: { $ne: 'deleted' } } },
      { $group: { _id: '$category', totalSize: { $sum: '$sizeBytes' } } }
    ]);

    const breakdown = {
      document: 0,
      audio: 0,
      spreadsheet: 0,
      prd: 0,
    };

    let actualUsedBytes = 0;

    breakdownAgg.forEach(item => {
      if (item._id && breakdown[item._id] !== undefined) {
        breakdown[item._id] = item.totalSize;
        actualUsedBytes += item.totalSize;
      }
    });

    const dbUsedBytes = user.storage?.usedBytes || 0;

    // Self-healing mechanism: correct storage leak if there's a discrepancy
    if (dbUsedBytes !== actualUsedBytes) {
      await User.updateOne({ _id: userId }, { 'storage.usedBytes': actualUsedBytes });
      if (user.storage) {
        user.storage.usedBytes = actualUsedBytes;
      }
    }

    res.json({
      limitBytes: user.storage?.limitBytes || 4294967296,
      usedBytes: actualUsedBytes,
      breakdown,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch storage info', error: error.message });
  }
};




