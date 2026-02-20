import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Shell({ children }) {
  const { role, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate(role === 'nutricionista' ? '/nutricionista' : '/paciente')}>
          NutriTrack
        </button>

        <nav className="nav-links">
          {role === 'nutricionista' && <NavLink to="/nutricionista">Início</NavLink>}
          {role === 'paciente' && <NavLink to="/paciente">Início</NavLink>}
          <NavLink to="/perfil">Perfil</NavLink>
        </nav>

        <div className="top-actions">
          <button className="btn ghost" onClick={refresh}>Atualizar</button>
          <button className="btn" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="page-wrap">{children}</main>
    </div>
  );
}
