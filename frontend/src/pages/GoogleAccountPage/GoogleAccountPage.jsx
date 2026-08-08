import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import "../LoginPage/LoginPage.css";

const accounts = [
  { name: "Alex Rivers", email: "alex.rivers@gmail.com", initials: "AR" },
  { name: "Alex Rivers", email: "alex@company.com", initials: "AR", badge: "NEXUS" },
];

const GoogleAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPopup = new URLSearchParams(location.search).get("popup") === "true";

  const chooseAccount = (account) => {
    if (isPopup && window.opener) {
      window.opener.postMessage({ type: "nexus-google-auth-success", account }, window.location.origin);
      window.close();
      return;
    }
    navigate("/auth/setup-password", { state: { account } });
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Nexus SSO introduction">
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

      <section className="auth-form-panel" aria-label="Choose Google account">
        <div className="auth-card">
          <div className="auth-google-mark sso-google-logo" aria-hidden="true">G</div>
          <h2 className="auth-title">Choose an account</h2>
          <p className="auth-subtitle">to continue to <strong>NEXUS</strong></p>

          <div className="account-list">
            {accounts.map((account) => (
              <button className="account-option" key={account.email} onClick={() => chooseAccount(account)} type="button">
                <span className="account-avatar">{account.initials}</span>
                <span className="account-meta">
                  <strong>{account.name}</strong>
                  <span>{account.email}</span>
                </span>
                {account.badge && <span className="account-badge">{account.badge}</span>}
              </button>
            ))}
          </div>

          <button className="account-option" onClick={() => chooseAccount({ name: "New Google Account", email: "new.account@gmail.com", initials: "NA" })} type="button">
            <span className="account-avatar">+</span>
            <span className="account-meta">
              <strong>Use another account</strong>
              <span>Continue with a different Google account</span>
            </span>
          </button>

          <p className="terms-text">
            To continue, Google will share your name, email address, language preference, and profile picture with NEXUS.
          </p>
          <p className="terms-text">Help · Privacy · Terms</p>
        </div>
      </section>
    </main>
  );
};

export default GoogleAccountPage;
