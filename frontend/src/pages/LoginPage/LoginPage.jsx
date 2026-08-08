import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import authService from "../../services/auth.service";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const validate = () => {
    const nextErrors = {};

    if (!formData.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!formData.password) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  };

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: undefined, credentials: undefined }));
    setStatus("idle");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setStatus("loading");

    try {
      const response = await authService.login(formData.email, formData.password);
      
      // Simpan token
      localStorage.setItem("nexus_token", response.token);
      
      // Ambil profile untuk cek onboarding
      const profileRes = await authService.getProfile();
      const user = profileRes.user;

      setStatus("success");
      
      if (!user.onboarding?.isCompleted) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setStatus("idle");
      setErrors({ credentials: err.response?.data?.message || "Incorrect email or password. Please try again." });
    }
  };

  const isLoading = status === "loading";
  const onboardingNotice = location.state?.onboardingCompleted;
  const passwordResetNotice = location.state?.passwordReset;

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Nexus product introduction">
        <div className="auth-brand">
          <Link to="/" className="auth-brand-link" aria-label="Back to Nexus landing page">
            <img src={nexusLogo} alt="Nexus logo" className="auth-logo" />
            <h1>Nexus</h1>
          </Link>
        </div>

        <div className="auth-brand-copy">
          <h2>Your AI Co-Pilot for your project documentation.</h2>
          <p>Transform raw meeting audio, SOPs, and business rules into clear technical PRDs in seconds.</p>
        </div>
      </section>

      <section className="auth-form-panel" aria-label="Sign in form">
        <div className="auth-account-action">
          <span>Don&apos;t have an account? </span>
          <Link to="/signup" className="auth-link">Sign up</Link>
        </div>

        <div className="auth-card">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to continue to your Nexus workspace.</p>

          {onboardingNotice && (
            <p className="auth-success-message" role="status">
              Your sign up process has been completed successfully. Please sign in to continue.
            </p>
          )}
          {passwordResetNotice && (
            <p className="auth-success-message" role="status">
              Your password has been updated successfully. Please sign in with your new password.
            </p>
          )}

          <button type="button" className="auth-google-button" onClick={() => { window.location.href = "http://localhost:5000/api/auth/google"; }}>
            <img
              alt=""
              aria-hidden="true"
              className="auth-google-icon"
              src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png"
            />
            Sign in with Google
          </button>

          <div className="auth-divider">
            <span>OR CONTINUE WITH WORK EMAIL</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-input-group">
              <fieldset className={errors.email ? "auth-fieldset auth-fieldset-error" : "auth-fieldset"}>
                <legend>Email address</legend>
                <input
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={Boolean(errors.email)}
                  autoComplete="email"
                  name="email"
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  type="email"
                  value={formData.email}
                />
              </fieldset>
              {errors.email && <p className="auth-error" id="email-error">{errors.email}</p>}
            </div>

            <div className="auth-input-group">
              <fieldset className={errors.password ? "auth-fieldset auth-fieldset-error auth-password-fieldset" : "auth-fieldset auth-password-fieldset"}>
                <legend>Password</legend>
                <input
                  aria-describedby={errors.password ? "password-error" : undefined}
                  aria-invalid={Boolean(errors.password)}
                  autoComplete="current-password"
                  name="password"
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </fieldset>
              {errors.password && <p className="auth-error" id="password-error">{errors.password}</p>}
            </div>

            <div className="auth-form-row">
              <label className="auth-checkbox">
                <input
                  checked={formData.remember}
                  name="remember"
                  onChange={handleChange}
                  type="checkbox"
                />
                <span>Remember me for 7 days</span>
              </label>
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            {errors.credentials && (
              <p className="auth-alert" role="alert">{errors.credentials}</p>
            )}

            <button className="auth-submit" disabled={isLoading} type="submit">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
