const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const File = require('../models/File');
const Project = require('../models/Projects');
const Otp = require('../models/Otp');
const { sendOtpEmail, sendResetLinkEmail } = require('../config/mailer');

/**
 * Generates a cryptographically insecure, random 6-digit One-Time Password (OTP).
 *
 * This utility function creates a 6-digit numerical string used primarily for email 
 * verification during user registration and password resets. It leverages `Math.random()` 
 * to generate a number between 100,000 and 999,999.
 * 
 * Business Logic:
 * - The OTP is purely numeric to ensure high usability for users copying it from emails.
 * - It is not cryptographically secure, but its short lifespan (e.g., 5 minutes) and 
 *   cooldown periods mitigate brute-force risks.
 *
 * @returns {string} The generated 6-digit OTP as a string.
 */
const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Validates whether a provided string conforms to a basic email format.
 *
 * This function performs a rudimentary check to ensure the input is a string containing 
 * at least an '@' symbol and a '.' character. While not a fully compliant RFC 5322 regex, 
 * it serves as a lightweight first-pass filter before relying on the database or mailer 
 * to throw more complex validation errors.
 * 
 * Edge Cases:
 * - Non-string inputs (like null, undefined, or objects) immediately return false.
 * - Strings missing an '@' or '.' (e.g., "userexamplecom") return false.
 *
 * @param {string} email - The email address string to validate.
 * @returns {boolean} True if the input is a string and contains required characters, false otherwise.
 */
const isValidEmail = (email) => {
  return typeof email === 'string' && email.includes('@') && email.includes('.');
};

// Helper validasi kerumitan password (NEX-002)
/**
 * Validates the complexity of a user password against strict security criteria (NEX-002).
 *
 * To ensure account security, this function checks that a password meets the following requirements:
 * 1. Minimum length of 8 characters.
 * 2. Contains at least one lowercase letter (a-z).
 * 3. Contains at least one uppercase letter (A-Z).
 * 4. Contains at least one numeric digit (0-9).
 * 5. Contains at least one special/non-alphanumeric character.
 * 
 * This is enforced via a comprehensive regular expression utilizing positive lookaheads.
 *
 * @param {string} password - The plaintext password to evaluate.
 * @returns {boolean} True if the password meets all complexity requirements, false otherwise.
 */
const isValidPassword = (password) => {
  // Minimal 8 karakter, ada huruf besar, huruf kecil, angka, dan setidaknya satu karakter non-alfanumerik (spesial apa pun)
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  return regex.test(password);
};

/**
 * Formats a raw byte count into a human-readable storage string (e.g., KB, MB, GB).
 *
 * This utility converts raw integer byte sizes (like those returned from `fs.stat`) into 
 * standard SI-like prefixes for UI display. It calculates the appropriate magnitude using 
 * base-1024 logarithms and rounds the result to two decimal places.
 * 
 * Edge Cases:
 * - A byte size of exactly 0 is explicitly handled to avoid division by zero or logarithmic errors.
 *
 * @param {number} bytes - The numerical size in raw bytes to format.
 * @returns {string} The formatted string with appropriate units (e.g., "1.5 MB").
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
};

// create
/**
 * Registers a new user account and initiates the email verification process.
 * 
 * This controller handles the initial step of user onboarding. It performs strict validation 
 * on the provided email, full name, and password complexity. If valid, it hashes the password, 
 * creates an unverified `User` record, generates a 6-digit OTP, stores it in the `Otp` collection, 
 * and sends it via email.
 * 
 * Workflow:
 * 1. Validates presence and types of `email`, `password`, and `fullName`.
 * 2. Normalizes inputs (trimming, lowercasing email).
 * 3. Applies regex validations for email format and password complexity.
 * 4. Checks the database to ensure the email isn't already registered.
 * 5. Hashes the password using `bcrypt` (cost factor 10).
 * 6. Creates the `User` document with `isVerified: false`.
 * 7. Generates an OTP, calculates cooldown and expiry times.
 * 8. Saves the `Otp` document and triggers the external `sendOtpEmail` mailer service.
 * 
 * Database Interaction:
 * - Queries `User` to check for duplicates.
 * - Inserts a new document into `User`.
 * - Inserts a new document into `Otp`.
 * 
 * External Calls:
 * - `sendOtpEmail` via Nodemailer to deliver the code.
 * 
 * Edge Cases:
 * - Email already in use (returns 400).
 * - Mailer service fails (catches exception, returns 500, though user might be created).
 * 
 * @param {Object} req - The Express request object containing `email`, `password`, `fullName` in the body.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response confirming registration and prompting OTP check.
 * @throws {400} On validation failures or duplicate emails.
 * @throws {500} On database or mailer server errors.
 */
exports.register = async (req, res) => {
  let { email, password, fullName } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string' || !fullName || typeof fullName !== 'string') return res.status(400).json({ message: 'Email, password, and full name are required' });

  email = email.trim().toLowerCase();
  password = password.trim();
  fullName = fullName.trim();

  if (!isValidEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
    });
  }

  if (fullName.length < 2 || fullName.length > 50) return res.status(400).json({ message: 'Full name must be between 2 and 50 characters' });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'This email is already registered in our system.' });

    const hashed = await bcrypt.hash(password, 10);

    // Simpan pendaftaran dengan nama lengkap di profil
    await User.create({
      email,
      passwordHash: hashed,
      isVerified: false,
      profile: {
        fullName: fullName,
      },
    });

    const otp = genOtp();
    await Otp.create({
      email,
      code: otp,
      type: 'signup',
      cooldownUntil: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60000),
    });
    await sendOtpEmail(email, otp);

    res.json({ message: 'Registration successful. Please check your email for the OTP code' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Verifies a user's account using the OTP sent to their email.
 * 
 * This controller finalizes the registration process. It validates the provided OTP against 
 * the database. If successful, it marks the user's account as verified (`isVerified: true`), 
 * processes optional onboarding data (role, team size, industry), issues a JWT for immediate 
 * authentication, and cleans up the used OTP.
 * 
 * Workflow:
 * 1. Validates presence and type of `email` and `code`.
 * 2. Normalizes the email to lowercase.
 * 3. Queries the `Otp` collection for a matching email and code.
 * 4. Checks if the retrieved OTP has passed its `expiresAt` timestamp.
 * 5. Retrieves the corresponding `User`.
 * 6. Updates user verification status and injects any provided `onboarding` payload.
 * 7. Marks onboarding as completed.
 * 8. Saves the `User` and deletes all OTPs for this email to prevent reuse.
 * 9. Generates a 1-day JWT.
 * 
 * Database Interaction:
 * - Reads from `Otp` and `User`.
 * - Mutates and saves `User`.
 * - Executes `deleteMany` on `Otp`.
 * 
 * Edge Cases:
 * - OTP is incorrect or missing (returns 400).
 * - OTP is correct but expired (returns 400).
 * - User record was manually deleted between registration and verification (returns 404).
 * 
 * @param {Object} req - The Express request object. Body includes `email`, `code`, and optionally `onboarding` object.
 * @param {Object} res - The Express response object.
 * @returns {Object} JSON response with a success message and a signed JWT `token`.
 * @throws {400} Invalid input, bad OTP, or expired OTP.
 * @throws {404} User not found.
 * @throws {500} Database or JWT signing errors.
 */
exports.verifyOtp = async (req, res) => {
  let { email, code, onboarding } = req.body;

  if (!email || typeof email !== 'string' || !code || typeof code !== 'string') return res.status(400).json({ message: 'Email and OTP are required' });

  email = email.trim().toLowerCase();
  code = code.trim();

  try {
    const record = await Otp.findOne({ email, code });
    if (!record) return res.status(400).json({ message: 'Invalid OTP code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP code has expired' });

    // Cari user untuk di-update status verifikasi dan data onboarding-nya
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

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

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Verification successful', token });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Authenticates a user using email and password, returning a JWT session token.
 * 
 * This controller handles standard credential-based login. It verifies user existence, 
 * checks if the account has been verified via OTP, compares password hashes, and generates 
 * a JWT with a dynamic expiration based on the "remember me" preference.
 * 
 * Workflow:
 * 1. Validates that `email` and `password` are provided as strings.
 * 2. Normalizes the email.
 * 3. Fetches the `User` by email. If not found or lacks a password (e.g., SSO-only accounts), rejects.
 * 4. Checks `isVerified`. If false, forces the user to complete OTP verification (403).
 * 5. Uses `bcrypt.compare` to validate the provided password against the stored hash.
 * 6. Generates a JWT valid for 7 days (if `rememberMe` is true) or 1 day (default).
 * 
 * Database Interaction:
 * - Single read query on the `User` model.
 * 
 * Edge Cases:
 * - User registered via Google SSO and has no password hash (returns 400 with generic invalid message).
 * - User has not verified their email yet (returns 403 Forbidden).
 * - Timing attacks mitigated generically by bcrypt's constant-time comparison.
 * 
 * @param {Object} req - Express request object containing `email`, `password`, and optional `rememberMe`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response with the signed `token` and basic `user` details.
 * @throws {400} On missing fields or invalid credentials.
 * @throws {403} If the account is unverified.
 * @throws {500} On server or cryptographic errors.
 */
exports.login = async (req, res) => {
  let { email, password, rememberMe } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') return res.status(400).json({ message: 'Email and password are required' });

  email = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email });
    if (!user || !user.passwordHash) return res.status(400).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    if (!user.isVerified) return res.status(403).json({ message: 'Your account has not been verified. Please complete the OTP verification.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(400).json({ message: 'Invalid email or password. Please check your credentials and try again.' });

    const expiresIn = rememberMe === true || rememberMe === 'true' ? '7d' : '1d';
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn });
    res.json({ token, user: { email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// google SSO
/**
 * Callback handler for Google SSO OAuth2 authentication flow.
 *
 * After Passport.js successfully negotiates with Google and retrieves/creates a user record, 
 * it forwards the request to this controller. This function generates a JWT for the authenticated 
 * user and redirects them back to the frontend client application, embedding the token in the URL.
 * 
 * Workflow:
 * 1. Extracts the authenticated user's `_id` and `email` injected by Passport middleware into `req.user`.
 * 2. Generates a 1-day JWT.
 * 3. Determines if the user has a password set (important for the UI to know if they need to prompt "Set Password").
 * 4. Issues an HTTP 302 redirect to the client's OAuth success page.
 * 
 * Edge Cases:
 * - Token exposure in URL parameters (handled by frontend immediately absorbing and stripping the URL).
 *
 * @param {Object} req - Express request object. Must contain `req.user` populated by Passport Google Strategy.
 * @param {Object} res - Express response object used for HTTP redirection.
 * @returns {void} Does not return JSON; issues a 302 Redirect.
 */
exports.googleCallback = (req, res) => {
  const token = jwt.sign({ id: req.user._id, email: req.user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });
  const hasPassword = !!req.user.passwordHash;
  res.redirect(`${process.env.CLIENT_URL}/oauth-success?token=${token}&hasPassword=${hasPassword}`);
};

// Fungsi forgotPassword
/**
 * Initiates the password reset workflow by generating and emailing a secure OTP.
 * 
 * When a user forgets their password, they provide their email here. If the account exists, 
 * the system invalidates any previously issued password reset OTPs, generates a fresh 6-digit 
 * code, stores it with an expiration and cooldown, and dispatches an email containing the code.
 * 
 * Workflow:
 * 1. Validates and normalizes the requested email address.
 * 2. Queries the `User` database to ensure the account exists. If not, returns 404 to prevent 
 *    spam, though this technically reveals account existence (acceptable for this platform's threat model).
 * 3. Deletes any existing `password_reset` OTPs for this email to prevent race conditions.
 * 4. Generates a new OTP, setting a 1-minute cooldown and a 5-minute expiration.
 * 5. Saves the `Otp` record and triggers the `sendResetLinkEmail` mailer function.
 * 
 * Database Interaction:
 * - Read from `User`.
 * - `deleteMany` on `Otp` collection.
 * - `create` on `Otp` collection.
 * 
 * External Calls:
 * - Uses Nodemailer (`sendResetLinkEmail`) to send the generated OTP.
 * 
 * Edge Cases:
 * - Email does not exist (returns 404).
 * - User requests multiple resets rapidly (cooldown is set, but this endpoint specifically overwrites old ones).
 * 
 * @param {Object} req - Express request object containing `email`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the OTP has been dispatched.
 * @throws {400} If email is missing or malformed.
 * @throws {404} If the email is not registered.
 * @throws {500} If mailer or database fails.
 */
exports.forgotPassword = async (req, res) => {
  let { email } = req.body;
  if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Email is required' });

  email = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email });

    // Validasi keberadaan akun
    if (!user) {
      return res.status(404).json({
        message: 'This email is not registered in our system.',
      });
    }

    // Bersihkan OTP reset password lama jika ada
    await Otp.deleteMany({ email, type: 'password_reset' });

    const otp = genOtp();
    await Otp.create({
      email,
      code: otp,
      type: 'password_reset',
      cooldownUntil: new Date(Date.now() + 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 60000),
    });

    // Kirim email HANYA jika user terbukti ada di database
    await sendResetLinkEmail(email, otp);

    res.json({ message: 'Password reset OTP has been sent to your email address.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Fungsi resetPassword
/**
 * Resets a user's password using a previously issued OTP.
 * 
 * This controller finalizes the password reset flow. It consumes the OTP sent to the user's email 
 * and binds a new password to their account. It enforces the same password complexity rules as registration.
 * Furthermore, it automatically marks the account as verified if it wasn't already.
 * 
 * Workflow:
 * 1. Validates inputs: `email`, `code`, and `newPassword`.
 * 2. Enforces password complexity rules on `newPassword`.
 * 3. Queries the `Otp` collection specifically for a `password_reset` type matching the email and code.
 * 4. Verifies the OTP is not expired.
 * 5. Fetches the corresponding `User`.
 * 6. Hashes the new password using `bcrypt`.
 * 7. Updates `passwordHash` and sets `isVerified: true`.
 * 8. Cleans up by deleting all password reset OTPs for this user.
 * 
 * Database Interaction:
 * - Reads from `Otp` and `User`.
 * - Mutates and saves `User`.
 * - Executes `deleteMany` on `Otp`.
 * 
 * Edge Cases:
 * - OTP is invalid, missing, or for the wrong type (returns 400).
 * - OTP is expired (returns 400).
 * - User record disappeared (returns 404).
 * 
 * @param {Object} req - Express request object containing `email`, `code`, and `newPassword`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the password update.
 * @throws {400} On invalid inputs, weak password, or bad/expired OTP.
 * @throws {404} If user is not found.
 * @throws {500} Cryptography or database errors.
 */
exports.resetPassword = async (req, res) => {
  let { email, code, newPassword } = req.body;

  if (!email || typeof email !== 'string' || !code || typeof code !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
  }

  email = email.trim().toLowerCase();
  code = code.trim();
  newPassword = newPassword.trim();

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special characters',
    });
  }

  try {
    const record = await Otp.findOne({ email, code, type: 'password_reset' });
    if (!record) return res.status(400).json({ message: 'Invalid or missing OTP code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP code has expired' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.isVerified = true;
    await user.save();

    await Otp.deleteMany({ email, type: 'password_reset' });

    res.json({ message: 'Password updated successfully. Please sign in' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// View Profile
/**
 * Retrieves the currently authenticated user's complete profile and storage metadata.
 * 
 * This endpoint is typically called by the frontend upon initial load to hydrate the user's 
 * session state (the "Me" endpoint). It returns sanitized user data, stripping out sensitive 
 * fields like the password hash, while synthesizing calculated fields (like `hasPassword` and 
 * formatted storage capacities).
 * 
 * Workflow:
 * 1. Fetches the user document using `req.user.id` (provided by JWT middleware).
 * 2. Converts the Mongoose document to a plain JavaScript object.
 * 3. Calculates the boolean `hasPassword` flag based on the presence of `passwordHash`.
 * 4. Securely deletes `passwordHash` from the object memory.
 * 5. Synchronizes legacy or mismatched role titles (fallbacks to onboarding role if profile role is empty).
 * 6. Formats storage metrics (converts bytes to formatted strings and GB integers).
 * 7. Returns the comprehensive payload.
 * 
 * Database Interaction:
 * - Single read query on the `User` model by ID.
 * 
 * Edge Cases:
 * - User was deleted from DB but holds a valid JWT (returns 404).
 * - Storage limits are missing; falls back to raw byte formatting logic safely.
 * 
 * @param {Object} req - Express request object containing the decoded `req.user.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing the synthesized `user` profile payload.
 * @throws {404} If the user document no longer exists.
 * @throws {500} Server or database errors.
 */
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
        createdAt: userObj.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Resends the registration verification OTP to the user's email.
 * 
 * If a user doesn't receive their initial registration OTP or it expires, they can request 
 * a new one. This controller enforces a strict 60-second cooldown period to prevent email 
 * spamming or SMS bombing style attacks.
 * 
 * Workflow:
 * 1. Validates and normalizes the email address.
 * 2. Retrieves the `User` record to ensure they exist and are NOT already verified.
 * 3. Checks the `Otp` collection for a recently issued 'signup' OTP for this email.
 * 4. If an OTP exists and its `cooldownUntil` timestamp is in the future, rejects the request.
 * 5. Purges old OTPs for this email.
 * 6. Generates a new OTP, sets a new 60-second cooldown and 5-minute expiry.
 * 7. Saves the new `Otp` and sends the email.
 * 
 * Database Interaction:
 * - Reads from `User` and `Otp`.
 * - Executes `deleteMany` and `create` on `Otp`.
 * 
 * External Calls:
 * - Sends email via `sendOtpEmail`.
 * 
 * Edge Cases:
 * - User is already verified (returns 400).
 * - User requests OTP within the 60s cooldown window (returns 400 with a calculation of remaining seconds).
 * 
 * @param {Object} req - Express request object containing `email`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming a new OTP was dispatched.
 * @throws {400} Invalid email, already verified, or cooldown active.
 * @throws {404} Email not registered.
 * @throws {500} Database or mailer failure.
 */
exports.resendOtp = async (req, res) => {
  let { email } = req.body;

  if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Email is required' });

  email = email.trim().toLowerCase();

  if (!isValidEmail(email)) return res.status(400).json({ message: 'Please enter a valid email address' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'This email is not registered in our system.' });
    if (user.isVerified) return res.status(400).json({ message: 'This account is already verified.' });

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
      expiresAt: new Date(Date.now() + 5 * 60000),
    });
    await sendOtpEmail(email, otp);

    res.json({ message: 'A new OTP code has been sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

/**
 * Sets an initial password for users who registered via an OAuth provider (e.g., Google SSO).
 * 
 * Users who onboarded via SSO do not have a password hash in the database. To allow them 
 * to log in traditionally, this endpoint permits them to establish a password. It explicitly 
 * prevents overwriting an existing password (that must be done via `changePassword`).
 * 
 * Workflow:
 * 1. Validates the incoming password for strict complexity rules.
 * 2. Retrieves the authenticated user via their JWT `req.user.id`.
 * 3. Rejects the request if `passwordHash` is already populated.
 * 4. Hashes the new password using `bcrypt` and stores it.
 * 5. Saves the updated user document.
 * 
 * Database Interaction:
 * - Reads and mutates the `User` document.
 * 
 * Edge Cases:
 * - The user attempts to "set" a password when one already exists (returns 400).
 * - Password doesn't meet security rules (returns 400).
 * 
 * @param {Object} req - Express request object containing `password` in body, and `req.user.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the password was set.
 * @throws {400} On weak password or if account already has a password.
 * @throws {404} If user is missing from DB.
 * @throws {500} On cryptographic or database errors.
 */
exports.setPassword = async (req, res) => {
  let { password } = req.body;

  if (!password || typeof password !== 'string') return res.status(400).json({ message: 'Password is required' });

  password = password.trim();

  try {
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.passwordHash) return res.status(400).json({ message: 'Account already has a password' });

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: 'Password saved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Edit Profile
/**
 * Updates the authenticated user's profile and onboarding details.
 * 
 * This flexible controller handles partial updates to the user's profile, including their 
 * full name, role, industry, team size, and avatar. It ensures bidirectional synchronization 
 * between the `profile.roleTitle` and `onboarding.role` fields. It also seamlessly handles 
 * multipart/form-data file uploads via `req.file` for avatar updates.
 * 
 * Workflow:
 * 1. Validates the `fullName` length (2-50 characters) if provided.
 * 2. Fetches the user by `req.user.id`.
 * 3. Initializes the `profile` object if it is somehow missing from the document.
 * 4. Conditionally assigns provided fields (`fullName`, `role`, `industry`, `teamSize`).
 * 5. Synchronizes roles: updating `role` updates `profile.roleTitle`, and vice versa.
 * 6. Avatar handling: if a file was processed by `multer` (`req.file`), its path is saved to `avatarUrl`. 
 *    Alternatively, a string URL can be passed directly.
 * 7. Saves the updated user document.
 * 
 * Database Interaction:
 * - Single read and mutate on the `User` model.
 * 
 * Edge Cases:
 * - The user provides an empty string for avatarUrl to remove their avatar.
 * - Missing fields in `req.body` are ignored, allowing partial patches.
 * 
 * @param {Object} req - Express request object containing body fields and optional `req.file` (multer).
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response with success message and the updated `profile` and `onboarding` objects.
 * @throws {400} On invalid name lengths.
 * @throws {404} If user not found.
 * @throws {500} Database or filesystem errors.
 */
exports.updateProfile = async (req, res) => {
  const { fullName, roleTitle, avatarUrl, role, industry, teamSize } = req.body;

  // Validasi panjang nama jika disediakan (2-50 karakter - NEX-089)
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 50) {
      return res.status(400).json({ message: 'Full name must be between 2 and 50 characters' });
    }
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

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
      message: 'Profile updated successfully',
      profile: user.profile,
      onboarding: user.onboarding,
    });
  } catch (err) {
    console.error('[PROFILE UPDATE ERROR]:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// fungsi change password di profile
/**
 * Changes the authenticated user's password from within their account settings.
 * 
 * This endpoint requires the user to prove knowledge of their current password before 
 * allowing them to set a new one. It prevents SSO-only users from using this endpoint 
 * (directing them to `setPassword` instead), and enforces password history constraints 
 * by forbidding reuse of the current password.
 * 
 * Workflow:
 * 1. Validates input presence: `currentPassword` and `newPassword`.
 * 2. Enforces complexity rules on the new password.
 * 3. Retrieves the user document.
 * 4. Verifies the user actually has a password (fails if SSO-only).
 * 5. Compares `currentPassword` against the stored `passwordHash` via bcrypt.
 * 6. Compares `newPassword` against the stored `passwordHash` to ensure they aren't identical.
 * 7. Hashes the new password and persists it to the database.
 * 
 * Database Interaction:
 * - Reads and mutates the `User` document.
 * 
 * Edge Cases:
 * - SSO-only accounts without passwords trigger a specific 400 error.
 * - `newPassword` matches `currentPassword` (returns 400).
 * - Incorrect current password (returns 400).
 * 
 * @param {Object} req - Express request object containing `currentPassword` and `newPassword`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming the password was changed.
 * @throws {400} On invalid inputs, weak password, missing current password, or identical passwords.
 * @throws {404} If user is not found.
 * @throws {500} On cryptographic or database failures.
 */
exports.changePassword = async (req, res) => {
  let { currentPassword, newPassword } = req.body;

  if (!currentPassword || typeof currentPassword !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  currentPassword = currentPassword.trim();
  newPassword = newPassword.trim();

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: 'New password must be at least 8 characters and include uppercase, lowercase, number, and special characters',
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Cek jika akun SSO dan belum memiliki password
    if (!user.passwordHash) {
      return res.status(400).json({ message: 'Your account does not have a password yet. Please use Set Password first' });
    }

    // Verifikasi password saat ini
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Mencegah penggunaan password yang sama dengan password saat ini
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({ message: 'New password cannot be the same as your current password' });
    }

    // Hash dan simpan password baru
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// delete
/**
 * Deletes the authenticated user's account permanently from the system.
 * 
 * This is a highly destructive operation that removes the user record entirely. 
 * As a side effect, it also cleans up any pending OTPs associated with the user's email 
 * to maintain database hygiene.
 * 
 * Note: Depending on foreign key constraints in other collections (like Projects, Files, Notifications), 
 * a more complex cascade delete might be required in production. Currently, it deletes the User and OTP records.
 * 
 * Workflow:
 * 1. Fetches the user by ID.
 * 2. Deletes all OTPs associated with the user's email.
 * 3. Deletes the user document by ID.
 * 
 * Database Interaction:
 * - `findOne` on `User` to get email.
 * - `deleteMany` on `Otp` collection.
 * - `findByIdAndDelete` on `User` collection.
 * 
 * Edge Cases:
 * - User is already deleted but JWT is still valid (returns 404).
 * - Orphaned records in other collections (Projects/Files) currently remain (technical debt/by design).
 * 
 * @param {Object} req - Express request object containing `req.user.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response confirming account deletion.
 * @throws {404} If the user is not found.
 * @throws {500} Database deletion errors.
 */
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

/**
 * Retrieves and audits the user's total file storage usage statistics.
 * 
 * This controller serves two critical purposes: returning storage metrics for the UI dashboard, 
 * and performing a self-healing audit on the user's storage quota. Because file deletions, 
 * uploads, and versioning can sometimes fall out of sync with the denormalized `user.storage.usedBytes` 
 * integer due to race conditions, this endpoint aggregates the exact byte sizes of all active 
 * files owned by the user and actively repairs the database if a discrepancy is found.
 * 
 * Workflow:
 * 1. Retrieves the user and finds all active projects owned by them.
 * 2. Runs an aggregation pipeline on the `File` collection to group active files by `category` 
 *    and sum their `sizeBytes`.
 * 3. Constructs a breakdown object (documents, audio, spreadsheets, PRDs).
 * 4. Sums the actual used bytes from the aggregation.
 * 5. Compares the aggregated sum against the denormalized `storage.usedBytes` on the user model.
 * 6. If they differ (storage leak or desync), it updates the `User` model with the correct value (Self-healing).
 * 7. Returns the absolute limits, the corrected usage, and the breakdown.
 * 
 * Database Interaction:
 * - Read `User` and `Project` collections.
 * - Complex `$aggregate` pipeline on the `File` collection utilizing `$match` and `$group`.
 * - Conditional `updateOne` on the `User` collection if correction is needed.
 * 
 * Edge Cases:
 * - The user owns no projects or files (returns zeros).
 * - Very large number of files could make the aggregation slow, but indexing on `projectId` and `status` mitigates this.
 * 
 * @param {Object} req - Express request object containing `req.user.id`.
 * @param {Object} res - Express response object.
 * @returns {Object} JSON response containing `limitBytes`, `usedBytes`, and category `breakdown`.
 * @throws {404} User not found.
 * @throws {500} Aggregation or database update errors.
 */
exports.getStorage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const projects = await Project.find({ createdBy: userId, isDeleted: false });
    const projectIds = projects.map((p) => p._id);

    const breakdownAgg = await File.aggregate([{ $match: { projectId: { $in: projectIds }, status: { $ne: 'deleted' } } }, { $group: { _id: '$category', totalSize: { $sum: '$sizeBytes' } } }]);

    const breakdown = {
      document: 0,
      audio: 0,
      spreadsheet: 0,
      prd: 0,
    };

    let actualUsedBytes = 0;

    breakdownAgg.forEach((item) => {
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
