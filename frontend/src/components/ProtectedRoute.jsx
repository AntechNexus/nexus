import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import tokenService from '../services/token.service';

const ProtectedRoute = () => {
  const token = tokenService.getToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
