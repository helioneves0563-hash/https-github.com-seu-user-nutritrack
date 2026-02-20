import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import NutriDashboard from './pages/NutriDashboard';
import PacienteDashboard from './pages/PacienteDashboard';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

function RootRedirect() {
  const { user, role, loading } = useAuth();
  if (loading) {
    return (
      <div className="screen-center">
        <div className="loader" />
        <p>Carregando...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'nutricionista') return <Navigate to="/nutricionista" replace />;
  if (role === 'paciente') return <Navigate to="/paciente" replace />;
  return <Navigate to="/perfil" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/nutricionista"
            element={(
              <ProtectedRoute allowRole="nutricionista">
                <NutriDashboard />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/paciente"
            element={(
              <ProtectedRoute allowRole="paciente">
                <PacienteDashboard />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/perfil"
            element={(
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            )}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
