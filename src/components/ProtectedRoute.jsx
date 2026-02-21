import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowRole = null }) {
  const { user, role, loading } = useAuth();
  const manualAuth = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('nt_manual_auth') === '1'
    : false;

  if (loading) {
    return (
      <div className="screen-center">
        <div className="loader" />
        <p>Carregando sessão...</p>
      </div>
    );
  }

  if (!user || !manualAuth) return <Navigate to="/login" replace />;
  if (allowRole && role !== allowRole) return <Navigate to="/" replace />;

  return children;
}
