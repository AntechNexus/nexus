import React, { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import tokenService from "../../services/token.service";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import "../LoginPage/LoginPage.css";

/**
 * VerifyOtpPage Component
 * 
 * This component is responsible for rendering the OTP (One-Time Password) verification screen after a user registers.
 * 
 * It maintains the following local state:
 * - `otp`: An array of 6 strings, representing the individual digits of the verification code.
 * - `status`: A string representing the current form submission state ('idle', 'loading', 'success').
 * - `error`: A string to store and display validation or API errors.
 * 
 * Side effects triggered by this component include:
 * - `updateOtp`: Manages the OTP input array and automatically focuses the next input field as the user types.
 * - `handleKeyDown`: Intercepts Backspace presses on empty fields to move focus to the previous input automatically.
 * - `handleSubmit`: Validates that all 6 digits are provided, sets the loading state, and calls the verification API. On success, it persists the session token via `tokenService`, clears old tokens, and navigates the user to the onboarding flow. On failure, it updates the error state.
 * - `handleResend`: Makes an API call to re-send the verification code and alerts the user of the outcome.
 * 
 * @returns {JSX.Element} The OTP verification interface including a branding side-panel and the 6-digit input form.
 */
const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputsRef = useRef([]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const email = location.state?.email || "jane@company.com";
  const fullName = location.state?.fullName || "";

  const updateOtp = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    setError("");

    if (digit && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (otp.some((digit) => !digit)) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setStatus("loading");
    try {
      const code = otp.join("");
      tokenService.clearToken();
      const response = await authService.verifyOtp(email, code);
      if (!response.token) {
        throw new Error("Verification succeeded but no session token was returned.");
      }
      tokenService.setToken(response.token, true);
      setStatus("success");
      navigate("/onboarding", { replace: true, state: { email, fullName } });
    } catch (err) {
      setStatus("idle");
      setError(err.response?.data?.message || err.message || "Invalid or expired OTP.");
    }
  };

  const handleResend = async () => {
    try {
      await authService.resendOtp(email);
      alert("A new verification code has been sent to your email.");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resend OTP.");
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Nexus verification introduction">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-link" aria-label="Back to Nexus landing page">
            <img src={nexusLogo} alt="Nexus logo" className="auth-logo" />
            <h1>Nexus</h1>
          </Link>
        </div>
        <div className="auth-brand-copy">
          <h2>Your AI Co-Pilot for your project documentation</h2>
          <p>Transform raw meeting audio, SOPs, and business rules into clear technical PRDs in seconds.</p>
        </div>
      </section>

      <section className="auth-form-panel" aria-label="OTP verification form">
        <div className="auth-card">
          <Link to="/login" className="auth-link auth-back-link">
            <ArrowLeft size={14} /> Back to login
          </Link>
          <h2 className="auth-title">Verify your identity</h2>
          <p className="auth-subtitle">We&apos;ve sent a 6-digit code to {email}.</p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="otp-group" aria-label="Verification code">
              {otp.map((digit, index) => (
                <input
                  aria-label={`Digit ${index + 1}`}
                  className="otp-input"
                  inputMode="numeric"
                  key={index}
                  maxLength={1}
                  onChange={(event) => updateOtp(index, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  ref={(element) => {
                    inputsRef.current[index] = element;
                  }}
                  value={digit}
                />
              ))}
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Verifying..." : "Verify Account"}
            </button>
          </form>

          <p className="terms-text">
            Didn&apos;t receive it? <button className="auth-inline-button" type="button" onClick={handleResend}>Resend Code</button>
          </p>
          <p className="terms-text">
            Having trouble? <a href="#support">Contact Support</a>
          </p>
        </div>
      </section>
    </main>
  );
};

export default VerifyOtpPage;
