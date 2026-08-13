import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import tokenService from "../../services/token.service";
import "../LoginPage/LoginPage.css";

/**
 * PasswordSetupPage Component
 * 
 * This component is responsible for handling the user's password setup and reset flows. 
 * It determines the current context (either setting a new password for a Google-authenticated user or resetting an existing password) 
 * by examining the URL parameters and routing state. It maintains local state for the user's account details, 
 * password input, confirmation, validation criteria, and submission status.
 * 
 * Side effects triggered by this component include checking the user's current Google account session on mount 
 * if not in the reset flow. It also uses the `authService` to securely transmit the new password to the backend API 
 * and handles potential error responses by displaying them to the user.
 * 
 * @returns {JSX.Element} The rendered interface for setting up or resetting a user's password, 
 *                        complete with a real-time security checklist and feedback messages.
 */
const PasswordSetupPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const resetEmail = new URLSearchParams(location.search).get("email");
  const resetCode = new URLSearchParams(location.search).get("code");
  const isResetFlow = location.pathname === "/reset-password" || location.state?.flow === "reset";
  const initialAccount = location.state?.account || {
    name: isResetFlow ? "Nexus User" : "Google User",
    email: location.state?.email || resetEmail || "",
  };
  
  const [account, setAccount] = useState(initialAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (isResetFlow || account.email) return;

    let isMounted = true;

    const loadGoogleAccount = async () => {
      try {
        const response = await authService.getProfile();
        const user = response.user;
        if (!isMounted || !user?.email) return;

        setAccount({
          name: user.profile?.fullName || "Google User",
          email: user.email,
        });
      } catch {
        if (isMounted) {
          setError("Unable to load your Google account. Please try signing in again.");
        }
      }
    };

    loadGoogleAccount();

    return () => {
      isMounted = false;
    };
  }, [account.email, isResetFlow]);

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
        tokenService.clearToken();
        navigate("/login", { replace: true, state: { onboardingCompleted: true } });
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
              : account.email
                ? `You're connected as ${account.email}. Create a NEXUS password to complete your profile.`
                : "Loading your Google account details..."}
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
