import React, { useMemo, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import "../LoginPage/LoginPage.css";

const PasswordSetupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetEmail = new URLSearchParams(location.search).get("email");
  const resetCode = new URLSearchParams(location.search).get("code");
  const isResetFlow = location.pathname === "/reset-password" || location.state?.flow === "reset";
  const resetToken = location.state?.resetToken || resetCode;
  const account = location.state?.account || {
    name: isResetFlow ? "Nexus User" : "Google User",
    email: location.state?.email || resetEmail || "google.user@gmail.com",
  };
  
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  const criteria = useMemo(
    () => [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "One lowercase letter", valid: /[a-z]/.test(password) },
      { label: "One number", valid: /\d/.test(password) },
      { label: "At least one special character", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (criteria.some((item) => !item.valid)) {
      setError("Please complete all password requirements.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setStatus("loading");
    
    try {
      if (isResetFlow) {
        await authService.resetPassword(resetEmail, resetCode, password);
        navigate("/login", { replace: true });
      } else {
        await authService.setPassword(password);
        navigate("/onboarding", { replace: true });
      }
    } catch (err) {
      setStatus("idle");
      setError(err.response?.data?.message || "Failed to set password. Please try again.");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Nexus password setup introduction">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-link" aria-label="Back to Nexus landing page">
            <img src={nexusLogo} alt="Nexus logo" className="auth-logo" />
            <h1>NEXUS</h1>
          </Link>
        </div>
        <div className="auth-brand-copy">
          <h2>Your AI Co-Pilot for your project documentation</h2>
          <p>Transform raw meeting audio, SOPs, and business rules into clear technical PRDs in seconds.</p>
        </div>
      </section>

      <section className="auth-form-panel" aria-label="Password setup form">
        <div className="auth-card">
          <h2 className="auth-title">{isResetFlow ? "Create a new password" : "Set a secure password"}</h2>
          <p className="auth-subtitle">
            {isResetFlow
              ? `Create a new password for ${account.email}. After this, sign in again to continue.`
              : `You're connected as ${account.email}. Create a NEXUS password to complete your profile.`}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-input-group">
              <fieldset className="auth-fieldset auth-password-fieldset">
                <legend>New Password</legend>
                <input
                  autoComplete="new-password"
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </fieldset>
            </div>

            <div className="password-checklist">
              <p className="password-checklist-title">Security checklist</p>
              <div className="password-checklist-grid">
                {criteria.map((item) => (
                  <span className={`password-rule ${item.valid ? "valid" : ""}`} key={item.label}>
                    <Check size={13} /> {item.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="auth-input-group">
              <fieldset className="auth-fieldset">
                <legend>Confirm Password</legend>
                <input
                  autoComplete="new-password"
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  type="password"
                  value={confirmPassword}
                />
              </fieldset>
            </div>

            {error && <p className="auth-alert" role="alert">{error}</p>}

            <button className="auth-submit" disabled={status === "loading"} type="submit">
              {status === "loading"
                ? isResetFlow ? "Saving new password..." : "Completing setup..."
                : isResetFlow ? "Save New Password" : "Complete Account Setup"}
            </button>
          </form>

          <p className="terms-text">
            Need help? <a href="#support">Contact Support</a>
          </p>
          <p className="terms-text">END-TO-END ENCRYPTED</p>
        </div>
      </section>
    </main>
  );
};

export default PasswordSetupPage;
