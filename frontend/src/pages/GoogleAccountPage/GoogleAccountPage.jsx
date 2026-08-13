import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import nexusLogo from "../../assets/icons/Logo-nexus.png";
import "../LoginPage/LoginPage.css";

const accounts = [
  { name: "Alex Rivers", email: "alex.rivers@gmail.com", initials: "AR" },
  { name: "Alex Rivers", email: "alex@company.com", initials: "AR", badge: "NEXUS" },
];

/**
 * Represents the Google Account Selection page for the Nexus application's Single Sign-On (SSO) flow.
 *
 * This component acts as a mock interface simulating Google's account selection screen.
 * It is presented to users who choose to log in or sign up using their Google credentials.
 * The component retrieves routing and location information using `useNavigate` and `useLocation` hooks.
 *
 * The page maintains no internal state itself, but relies on a pre-defined array of mock accounts.
 * It renders a split layout similar to the main authentication pages:
 * - The left panel displays the Nexus brand and its value proposition.
 * - The right panel displays a list of available Google accounts and an option to use a new account.
 *
 * It triggers navigation side effects based on how the page was accessed. If it was opened as a popup
 * (indicated by a 'popup' query parameter), it uses the `window.postMessage` API to send the selected
 * account data back to the parent window and closes itself. If accessed directly via normal routing,
 * it navigates the user to the `/auth/setup-password` route, passing the selected account data
 * via the React Router location state.
 *
 * @param {Object} props - The properties passed to the component (currently accepts no props).
 * @returns {JSX.Element} The rendered GoogleAccountPage, containing the brand panel and the simulated account selection list.
 */
const GoogleAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPopup = new URLSearchParams(location.search).get("popup") === "true";

  /**
   * Handles the selection of a specific Google account from the simulated list.
   *
   * This function determines the next step in the authentication flow depending on whether
   * the page is being displayed as a popup window or a standard page route.
   *
   * If the `isPopup` flag is true and a parent window (`window.opener`) exists, this function
   * will emit a message event containing the selected account details back to the origin,
   * enabling the parent window to receive the mock authentication payload. It then closes
   * the popup window.
   *
   * If it is not a popup, it triggers a client-side route navigation using the `navigate`
   * function provided by React Router, redirecting the user to the password setup stage
   * while injecting the selected account object into the route's state.
   *
   * @param {Object} account - The account object that was clicked by the user.
   * @param {string} account.name - The full name associated with the mock account.
   * @param {string} account.email - The email address of the mock account.
   * @param {string} account.initials - The generated initials used for the mock avatar display.
   * @param {string} [account.badge] - An optional badge label (e.g., 'NEXUS') representing an internal or verified status.
   * @returns {void} This function does not return a value.
   */
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
