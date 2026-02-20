import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowRole = null }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen-center">
        <div className="loader" />
        <p>Carregando sessão...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (allowRole && role !== allowRole) return <Navigate to="/" replace />;

  return children;
}
