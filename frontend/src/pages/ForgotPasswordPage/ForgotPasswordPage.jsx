import React, { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import "../LoginPage/LoginPage.css";

/**
 * Represents the Forgot Password page in the Nexus application.
 *
 * This component provides an interface for users who have forgotten their passwords
 * to request a password reset link. It maintains local state for the user's email input,
 * any validation or API errors, and the current submission status ('idle', 'sending', 'sent').
 *
 * The page renders a split layout:
 * - A branding panel that introduces the Nexus application and its core value proposition.
 * - A form panel where users can enter their registered email address.
 *
 * It triggers a side effect by calling the `authService.forgotPassword` method when the form
 * is submitted with a valid email. Upon successful submission, the view transitions to a
 * success state, informing the user that the secure reset link has been dispatched to their inbox.
 *
 * @param {Object} props - The properties passed to the component (currently accepts no props).
 * @returns {JSX.Element} The rendered ForgotPasswordPage, containing both the branding section and the password reset form.
 */
const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  /**
   * Validates the format of the provided email address using a regular expression.
   *
   * This function checks whether the string roughly conforms to standard email syntax
   * (e.g., username@domain.com). It first trims any leading or trailing whitespace
   * to ensure that accidental spaces do not cause false negative validations.
   *
   * @param {string} value - The raw email string inputted by the user.
   * @returns {boolean} Returns `true` if the email matches the required format, otherwise `false`.
   */
  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  /**
   * Handles the form submission event for sending the password reset email.
   *
   * This asynchronous handler prevents the default form submission behavior and checks
   * the current submission status to avoid duplicate requests. It proceeds to validate
   * the email input. If validation fails, it updates the `error` state and halts execution.
   *
   * If validation succeeds, it updates the `status` state to 'sending', clears any existing errors,
   * and invokes the `authService.forgotPassword` API call. Depending on the API response,
   * it either transitions the `status` state to 'sent' upon success, or sets the `error` state
   * with the message returned from the server (or a generic fallback message) and resets the
   * status to 'idle' upon failure.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission event object.
   * @returns {Promise<void>} A promise that resolves when the form handling and API call are complete.
   */
  const handleSendEmail = async (event) => {
    event.preventDefault();
    if (status === "sending") return;
    
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setStatus("sending");
    try {
      await authService.forgotPassword(email);
      setStatus("sent");
    } catch (err) {
      setStatus("idle");
      setError(err.response?.data?.message || "Failed to send reset link. Please try again.");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Nexus password recovery introduction">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-link" aria-label="Back to Nexus landing page">
            <img src={nexusLogo} alt="Nexus logo" className="auth-logo" />
            <h1>NEXUS</h1>
          </Link>
        </div>

        <div className="auth-brand-copy">
          <h2>Your AI Co-Pilot for your project documentation.</h2>
          <p>Transform raw meeting audio, SOPs, and business rules into clear technical PRDs in seconds.</p>
        </div>
      </section>

      <section className="auth-form-panel" aria-label="Forgot password form">
        <div className="auth-account-action">
          <span>Remember your password? </span>
          <Link to="/login" className="auth-link">Sign in</Link>
        </div>

        <div className="auth-card">
          <Link to="/login" className="auth-link auth-back-link">
            <ArrowLeft size={14} /> Back to login
          </Link>
          <h2 className="auth-title">Reset your password</h2>
          
          {status !== "sent" ? (
            <>
              <p className="auth-subtitle">Enter your registered email and we&apos;ll send a secure reset link.</p>
              <form className="auth-form" onSubmit={handleSendEmail} noValidate>
                <div className="auth-input-group">
                  <fieldset className={error ? "auth-fieldset auth-fieldset-error" : "auth-fieldset"}>
                    <legend>Registered email</legend>
                    <span className="auth-fieldset-content">
                      <Mail size={16} />
                      <input
                        aria-describedby={error ? "forgot-email-error" : undefined}
                        aria-invalid={Boolean(error)}
                        autoComplete="email"
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setError("");
                          setStatus("idle");
                        }}
                        placeholder="jane@company.com"
                        type="email"
                        value={email}
                      />
                    </span>
                  </fieldset>
                  {error && <p className="auth-error" id="forgot-email-error">{error}</p>}
                </div>

                <button className="auth-submit" disabled={status === "sending"} type="submit">
                  {status === "sending" ? "Sending link..." : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-6">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle size={32} />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-nexus-primary">Link Sent Successfully</h3>
              <p className="text-sm text-nexus-secondary max-w-[280px]">
                We have sent a secure password reset link to <strong>{email}</strong>. Please check your inbox and click the link to continue.
              </p>
            </div>
          )}

        </div>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
