import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificacoesApi } from '../services/supabase';

export default function Shell({ children }) {
  const { role, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const seenIds = useRef(new Set());
  const notifRef = useRef(null);

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    let pollId;
    let realtime;

    const beep = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1200;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
        osc.stop(ctx.currentTime + 0.2);
      } catch {}
    };

    const pushNative = async (n) => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission === 'granted') {
        new Notification(n?.titulo || 'Nova notificação', { body: n?.mensagem || '' });
      }
    };

    const load = async () => {
      try {
        const [count, list] = await Promise.all([
          notificacoesApi.countUnread(),
          notificacoesApi.list(15)
        ]);
        if (!mounted) return;
        setUnread(count);
        setNotifs(list);
      } catch (e) {
        console.error('Falha ao carregar notificações:', e);
      }
    };

    load();
    pollId = window.setInterval(load, 15000);

    notificacoesApi.subscribe((nova) => {
      if (!nova?.id || seenIds.current.has(nova.id)) return;
      seenIds.current.add(nova.id);
      setNotifs((prev) => [nova, ...prev].slice(0, 15));
      setUnread((prev) => prev + (nova.lida ? 0 : 1));
      beep();
      pushNative(nova);
    }).then((sub) => {
      realtime = sub;
    });

    return () => {
      mounted = false;
      if (pollId) clearInterval(pollId);
      realtime?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      window.dispatchEvent(new Event('nt:refresh'));
    } finally {
      setRefreshing(false);
    }
  };

  const markRead = async () => {
    try {
      await notificacoesApi.markAllRead();
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })));
    } catch (e) {
      console.error('Falha ao marcar notificações:', e);
    }
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
          <button className="btn ghost" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
          <div className="notif-wrap" ref={notifRef}>
            <button className="btn ghost notif-btn" onClick={() => setNotifOpen((v) => !v)}>
              Alertas {unread > 0 ? `(${unread})` : ''}
            </button>
            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-header">
                  <strong>Notificações</strong>
                  <button onClick={markRead}>Marcar lidas</button>
                </div>
                {notifs.length === 0 ? (
                  <p className="muted">Sem notificações.</p>
                ) : (
                  <div className="notif-list">
                    {notifs.map((n) => (
                      <div key={n.id} className={`notif-item ${n.lida ? '' : 'unread'}`}>
                        <div className="notif-title">{n.titulo || 'Atualização'}</div>
                        <div className="notif-msg">{n.mensagem || ''}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="btn" onClick={onLogout}>Sair</button>
        </div>
      </header>

      <main className="page-wrap">{children}</main>
    </div>
  );
}
