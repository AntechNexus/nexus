import React, { useState } from 'react';
import { Eye, EyeOff, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import nexusLogo from '../../assets/icons/Logo-nexus.png'; 
import authService from '../../services/auth.service';
import './RegisterPage.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Password validation rules check
  const passwordCriteria = [
    { label: 'Lowercase characters.', test: (p) => /[a-z]/.test(p) },
    { label: 'Uppercase characters.', test: (p) => /[A-Z]/.test(p) },
    { label: 'Numbers.', test: (p) => /[0-9]/.test(p) },
    { label: 'Unique characters.', test: (p) => /[^A-Za-z0-9]/.test(p) },
    { label: '8+ characters minimum.', test: (p) => p.length >= 8 },
  ];

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const clearStaleAuth = () => {
    localStorage.removeItem("nexus_token");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors((current) => ({ ...current, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) {
      setErrors({ email: 'Please enter a complete company email, for example jane@company.com.' });
      return;
    }
    if (passwordCriteria.some((criterion) => !criterion.test(formData.password))) {
      setErrors({ password: 'Please complete all password requirements.' });
      return;
    }

    setIsLoading(true);
    try {
      clearStaleAuth();
      await authService.register(formData.email, formData.password, formData.fullName);
      navigate('/signup/verify', { state: { email: formData.email, fullName: formData.fullName } });
    } catch (err) {
      setErrors({ email: err.response?.data?.message || 'An error occurred during registration.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left Banner Section */}
      <div className="left-section">
        <div className="brand-logo">
          <Link to="/" className="brand-logo-link" aria-label="Back to Nexus landing page">
            <img src={nexusLogo} alt="Nexus Logo" className="logo-img" />
            <h2>Nexus</h2>
          </Link>
        </div>
        
        <div className="left-content">
          <h1>
            Your AI Co-Pilot for your project documentation.
          </h1>
          <p>
            Transform raw meeting audio, SOPs, and business rules into clear technical PRDs in seconds.
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="right-section">
        <div className="top-nav">
          <span>Already have an account? </span>
          <Link to="/login" className="login-link">Log in</Link>
        </div>

        <div className="form-wrapper">
          <h1 className="welcome-heading">Welcome to Nexus 👋</h1>
          <p className="welcome-subtext">
            Hiring a global team is complex. Nexus makes it easy.
          </p>

          <button type="button" className="google-btn" onClick={() => {
            clearStaleAuth();
            window.location.href = "http://localhost:5000/api/auth/google";
          }}>
            <img 
              src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" 
              alt="Google" 
              className="google-icon" 
            />
            Sign up with Google
          </button>

          <div className="divider">
            <span>OR CONTINUE WITH WORK EMAIL</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <fieldset>
                <legend>Full name</legend>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Jane Doe"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </fieldset>
              <small className="helper-text">For example: Jane Doe</small>
            </div>

            <div className="input-group">
              <fieldset className={errors.email ? 'fieldset-error' : undefined}>
                <legend>Company email</legend>
                <input
                  aria-describedby={errors.email ? 'signup-email-error' : undefined}
                  aria-invalid={Boolean(errors.email)}
                  type="email"
                  name="email"
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                  required
                />
              </fieldset>
              {errors.email && <small className="form-error" id="signup-email-error">{errors.email}</small>}
              <small className="helper-text">For example 'you@companyname.com'</small>
            </div>

            <div className="input-group">
              <fieldset className="password-fieldset">
                <legend>Create password</legend>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </fieldset>
            </div>

            {/* Validation Checklist */}
            <div className="password-rules">
              {passwordCriteria.map((criterion, index) => {
                const isValid = criterion.test(formData.password);
                return (
                  <div key={index} className={`rule-item ${isValid ? 'valid' : ''}`}>
                    <Check size={14} className="check-icon" />
                    <span>{criterion.label}</span>
                  </div>
                );
              })}
            </div>
            {errors.password && <small className="form-error">{errors.password}</small>}

            <button type="submit" className="submit-btn" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign up for free'}
            </button>
          </form>

          <p className="terms-text">
            By signing up, you agree to Privacy Policy and Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
