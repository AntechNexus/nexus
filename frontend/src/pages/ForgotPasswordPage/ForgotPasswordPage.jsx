import React, { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import "../LoginPage/LoginPage.css";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

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
