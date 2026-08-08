import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const OAuthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const hasPassword = searchParams.get('hasPassword');

    if (token) {
      localStorage.setItem('nexus_token', token);
      
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
