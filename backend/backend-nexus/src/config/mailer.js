const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Dispatches a One-Time Password (OTP) verification email to a user during account registration or sensitive actions.
 * 
 * This asynchronous function leverages the pre-configured NodeMailer `transporter` to send a stylized HTML email
 * containing a secure, short-lived OTP code. It is primarily used to verify ownership of an email address.
 * 
 * Workflow:
 * 1. Simulates email sending by immediately logging the target email address and the OTP code to the server console. This is crucial for local development and debugging when actual SMTP credentials might not be configured.
 * 2. Checks if the `transporter` object was successfully initialized (meaning `EMAIL_USER` and `EMAIL_PASS` environment variables were provided).
 * 3. If a valid transporter exists, it attempts to send an email asynchronously using `transporter.sendMail()`.
 * 4. Constructs the email payload:
 *    - `from`: Formats the sender name as "NEXUS" along with the configured email address.
 *    - `to`: The target recipient address.
 *    - `subject`: A standard verification subject line.
 *    - `html`: An embedded HTML template rendering the OTP in a large, prominent font with instructions regarding its 5-minute expiry.
 * 5. If the network call to the SMTP server fails, it catches the exception and logs a specific "[MAIL ERROR]" message without throwing, ensuring that the main application flow (like user registration) isn't completely halted by a non-critical background email failure (though business logic might dictate otherwise, here it just logs).
 * 
 * External Interactions:
 * - Makes a network request to an SMTP server (defaulting to Gmail's service per transporter config) to dispatch the email payload.
 * 
 * Edge Cases:
 * - Missing SMTP credentials: The function will gracefully skip sending the real email but still log the OTP to the console.
 * - SMTP server timeout or authentication error: Caught and logged, preventing application crash.
 * 
 * @param {string} to - The valid email address of the recipient who requested the OTP.
 * @param {string} otp - The dynamically generated numeric or alphanumeric OTP string to be embedded in the email.
 * @returns {Promise<void>} Resolves when the email dispatch attempt completes, regardless of success or failure.
 * @throws {Error} Does not throw errors to the caller; SMTP errors are caught and logged internally.
 */
async function sendOtpEmail(to, otp) {
  console.log(`\n===========================================`);
  console.log(`[MAIL SIMULATOR] Kode OTP untuk ${to}: ${otp}`);
  console.log(`===========================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"NEXUS" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verify Your NEXUS Account",
        html: `
          <p>Hello,</p>
          <p>Use the verification code below to continue signing in to your NEXUS account.</p>
          <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em; margin: 24px 0;">${otp}</p>
          <p>This code expires in 5 minutes. Please keep it private and do not share it with anyone.</p>
          <p>If you did not request this code, no further action is needed.</p>
          <p>Best regards,<br />The NEXUS Team</p>
        `,
      });
    } catch (error) {
      console.error("[MAIL ERROR] Gagal mengirim email asli:", error.message);
    }
  }
}

/**
 * Delivers a secure password reset link to a user's email address when they request an account recovery.
 * 
 * This function constructs a personalized URL containing a unique token (passed here as `otp`) and the user's
 * encoded email address. It then uses the NodeMailer `transporter` to send this link embedded within an HTML email.
 * 
 * Workflow:
 * 1. Dynamically constructs the `resetLink` URL. It attempts to read `process.env.CLIENT_URL` to determine the frontend application's base URL, falling back to `http://localhost:5173` for local development. It appends the `otp` and URL-encoded `email` as query parameters.
 * 2. Outputs a highly visible block to the server console displaying the generated reset link. This acts as a reliable fallback for development environments where real emails are disabled or undeliverable.
 * 3. Checks for the existence of an active `transporter` instance.
 * 4. Asynchronously invokes `transporter.sendMail()` with the necessary configuration:
 *    - `from`: Indicates "App Login" as the sender.
 *    - `subject`: A localized subject line "Link Reset Password Anda".
 *    - `html`: A simple HTML document containing a clickable anchor `<a>` tag pointing to the generated `resetLink`, accompanied by a note about the 5-minute expiration window.
 * 5. Catches any errors thrown during the SMTP communication process and logs them to the console, preventing unhandled promise rejections.
 * 
 * External Interactions:
 * - Integrates with external SMTP providers to deliver the reset payload.
 * 
 * Edge Cases Handled:
 * - Ensures email addresses with special characters are safely embedded in the URL via `encodeURIComponent`.
 * - Degrades gracefully (only logging to console) if SMTP setup is incomplete or fails during transit.
 * 
 * @param {string} to - The destination email address belonging to the user attempting to reset their password.
 * @param {string} otp - The unique, time-sensitive token generated by the backend to authorize the password reset operation.
 * @returns {Promise<void>} A promise that resolves after the email operation concludes, capturing any internal errors.
 * @throws {Error} Internal SMTP errors are caught and logged; they do not propagate up the call stack.
 */
async function sendResetLinkEmail(to, otp) {
  const resetLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?code=${otp}&email=${encodeURIComponent(to)}`;
  
  console.log(`\n===========================================`);
  console.log(`[MAIL SIMULATOR] Link Reset untuk ${to}: \n${resetLink}`);
  console.log(`===========================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"App Login" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Link Reset Password Anda",
        html: `<p>Klik link berikut untuk mereset password Anda:</p><p><a href="${resetLink}">Reset Password</a></p><p>Berlaku 5 menit.</p>`,
      });
    } catch (error) {
      console.error("[MAIL ERROR] Gagal mengirim email asli:", error.message);
    }
  }
}

module.exports = { sendOtpEmail, sendResetLinkEmail };

