import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import tokenService from '../../services/token.service';

/**
 * Renders the OAuth success callback handler component.
 * 
 * This component acts as a seamless intermediary to process successful OAuth authentication flows. 
 * Upon a successful third-party login (e.g., via Google or Github), the backend redirects the user 
 * to this page with authentication parameters embedded in the URL. Its primary responsibility is to 
 * securely extract these parameters and establish the user's session without requiring additional 
 * interactions on this screen.
 * 
 * The component relies on React Router's `useSearchParams` to retrieve the `token` and `hasPassword` 
 * flags from the query string. If a valid token is found, it leverages the `tokenService` to persist 
 * the token locally, effectively logging the user in. The session is typically marked as long-lived 
 * given the nature of OAuth authentications.
 * 
 * Furthermore, the component dictates the subsequent navigation path based on the `hasPassword` flag. 
 * If the user's account was newly provisioned and lacks a dedicated password (`hasPassword === 'false'`), 
 * they are immediately redirected to the `/auth/setup-password` route to complete their account setup. 
 * Conversely, if a password already exists, they are routed to the main `/dashboard`. In cases where 
 * the token is entirely missing from the URL—suggesting an invalid or aborted OAuth attempt—the 
 * user is redirected back to the `/login` page as a fallback mechanism.
 * 
 * The visual rendering of this component is intentionally minimal, displaying only a loading indicator 
 * ("Authenticating...") since the parsing, storage, and redirection logic is designed to execute almost 
 * instantaneously on mount via a `useEffect` hook.
 *
 * @returns {JSX.Element} The JSX element presenting a centered "Authenticating..." loading screen.
 */
const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const hasPassword = searchParams.get('hasPassword');

    if (token) {
      tokenService.setToken(token, true); // OAuth usually gets long lived sessions
      
      if (hasPassword === 'false') {
        navigate('/auth/setup-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>Authenticating...</h2>
    </div>
  );
};

export default OAuthSuccess;
