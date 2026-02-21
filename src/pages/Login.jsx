import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, role, loading, login, signupNutri, signupPaciente, logout } = useAuth();
  const manualAuth = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('nt_manual_auth') === '1'
    : false;

  const [mode, setMode] = useState('login');
  const [tipoCadastro, setTipoCadastro] = useState('paciente');
  const [form, setForm] = useState({
    email: '',
    senha: '',
    nome: '',
    sobrenome: '',
    telefone: '',
    codigoConvite: '',
    crn: '',
    especialidade: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user && !manualAuth) {
      logout().catch(() => {});
    }
  }, [loading, user, manualAuth, logout]);

  if (!loading && user && manualAuth) {
    if (role === 'nutricionista') return <Navigate to="/nutricionista" replace />;
    if (role === 'paciente') return <Navigate to="/paciente" replace />;
    return <Navigate to="/perfil" replace />;
  }

  const onChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await login(form.email, form.senha);
        window.sessionStorage.setItem('nt_manual_auth', '1');
        return;
      }

      if (tipoCadastro === 'nutricionista') {
        await signupNutri({
          nome: form.nome,
          sobrenome: form.sobrenome,
          email: form.email,
          senha: form.senha,
          crn: form.crn,
          especialidade: form.especialidade
        });
      } else {
        await signupPaciente({
          nome: form.nome,
          sobrenome: form.sobrenome,
          email: form.email,
          senha: form.senha,
          telefone: form.telefone,
          codigoConvite: form.codigoConvite
        });
      }
      window.sessionStorage.setItem('nt_manual_auth', '1');
    } catch (err) {
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-left">
        <h1>NutriTrack</h1>
        <p>Acompanhamento entre nutricionista e paciente, sem complicação.</p>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Criar conta</button>
        </div>

        {mode === 'register' && (
          <div className="switcher" style={{ marginBottom: 12 }}>
            <button className={tipoCadastro === 'paciente' ? 'active' : ''} onClick={() => setTipoCadastro('paciente')}>Paciente</button>
            <button className={tipoCadastro === 'nutricionista' ? 'active' : ''} onClick={() => setTipoCadastro('nutricionista')}>Nutricionista</button>
          </div>
        )}

        <form onSubmit={onSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <input placeholder="Nome" value={form.nome} onChange={(e) => onChange('nome', e.target.value)} required />
              <input placeholder="Sobrenome" value={form.sobrenome} onChange={(e) => onChange('sobrenome', e.target.value)} required />
              {tipoCadastro === 'paciente' && (
                <input placeholder="Telefone" value={form.telefone} onChange={(e) => onChange('telefone', e.target.value)} />
              )}
              {tipoCadastro === 'paciente' && (
                <input placeholder="Código da nutricionista (opcional)" value={form.codigoConvite} onChange={(e) => onChange('codigoConvite', e.target.value.toUpperCase())} />
              )}
              {tipoCadastro === 'nutricionista' && (
                <input placeholder="CRN" value={form.crn} onChange={(e) => onChange('crn', e.target.value.toUpperCase())} />
              )}
              {tipoCadastro === 'nutricionista' && (
                <input placeholder="Especialidade" value={form.especialidade} onChange={(e) => onChange('especialidade', e.target.value)} />
              )}
            </>
          )}

          <input type="email" placeholder="E-mail" value={form.email} onChange={(e) => onChange('email', e.target.value)} required />
          <input type="password" placeholder="Senha" value={form.senha} onChange={(e) => onChange('senha', e.target.value)} minLength={6} required />

          {error && <div className="error-box">{error}</div>}

          <button className="btn full" type="submit" disabled={busy}>
            {busy ? 'Processando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
