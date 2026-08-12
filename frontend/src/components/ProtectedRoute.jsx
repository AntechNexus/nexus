import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import tokenService from '../services/token.service';

/**
 * The ProtectedRoute component is a crucial routing utility that acts as a guard for authenticated routes
 * within the React Router DOM hierarchy. Its primary responsibility is to determine whether a user is authorized
 * to view nested child routes based on the presence of a valid authentication token.
 * 
 * When this component renders, it synchronously checks for an auth token by calling `tokenService.getToken()`.
 * If a token is found, it proceeds to render the nested routes via the `<Outlet />` component provided by `react-router-dom`.
 * If no token is present, it immediately redirects the user to the `/login` route using the `<Navigate />` component, 
 * utilizing the `replace` prop to prevent the protected route from being added to the browser's history stack.
 * This component handles imperative navigation logic as a rendering side effect but holds no internal React state itself.
 * 
 * @returns {JSX.Element} Either a `<Navigate>` redirection component to the login page, or an `<Outlet>` to render the authenticated child routes.
 */
const ProtectedRoute = () => {
  const token = tokenService.getToken();
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
