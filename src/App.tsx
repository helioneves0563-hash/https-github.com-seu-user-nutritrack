import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import DashboardNutri from './pages/DashboardNutri';
import DashboardPaciente from './pages/DashboardPaciente';
import Profile from './pages/Profile';
import Evolucao from './pages/Evolucao';
import PlanoAlimentar from './pages/PlanoAlimentar';
import NutriPlanos from './pages/NutriPlanos';
import NutriHistorico from './pages/NutriHistorico';
import Layout from './components/Layout';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            <Route element={<Layout />}>
              <Route path="/nutricionista" element={<DashboardNutri />} />
              <Route path="/paciente" element={<DashboardPaciente />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/evolucao" element={<Evolucao />} />
              <Route path="/plano-alimentar" element={<PlanoAlimentar />} />
              <Route path="/nutricionista/planos" element={<NutriPlanos />} />
              <Route path="/nutricionista/historico" element={<NutriHistorico />} />
            </Route>

            {/* Rotas de legado ou não encontradas (Fallback 404) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
