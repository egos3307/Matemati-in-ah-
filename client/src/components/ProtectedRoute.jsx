import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  // Bypassing authentication for now as per user request
  return children;
};

export default ProtectedRoute;
