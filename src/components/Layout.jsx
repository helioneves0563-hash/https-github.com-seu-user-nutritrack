import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bell, Home, Settings, UtensilsCrossed, ArrowLeft, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContextObj';
import { auth, notificacoes } from '../services/supabase';

export default function Layout() {
    const { user, profile, role } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showNotif, setShowNotif] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifList, setNotifList] = useState([]);
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('nt_push_enabled') !== 'false');
    const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('nt_sound_enabled') !== 'false');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const seenNotifIdsRef = useRef(new Set());
    const homePath = role === 'nutricionista' ? '/nutricionista' : '/paciente';
    const isHome = location.pathname === homePath;

    useEffect(() => {
        localStorage.setItem('nt_push_enabled', String(pushEnabled));
    }, [pushEnabled]);

    useEffect(() => {
        localStorage.setItem('nt_sound_enabled', String(soundEnabled));
    }, [soundEnabled]);

    const requestPushPermission = useCallback(async () => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
                setPushEnabled(true);
            }
        }
    }, []);

    const playAlertSound = useCallback(() => {
        if (!soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1480, audioCtx.currentTime + 0.12);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (e) {
            console.log('Audio error:', e);
        }
    }, [soundEnabled]);

    const showNativeNotification = useCallback((novaNotif) => {
        if (!pushEnabled) return;
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        new Notification(novaNotif.titulo || 'Novo Alerta - NutriTrack', {
            body: novaNotif.mensagem || 'Você tem uma nova atualização!',
            icon: '/vite.svg'
        });
    }, [pushEnabled]);

    const mergeNotifications = useCallback((incoming) => {
        const mapped = new Map();
        incoming.forEach((n) => mapped.set(n.id, n));
        return [...mapped.values()]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10);
    }, []);

    const handleNovaNotificacao = useCallback((novaNotif, { silent = false, increaseBadge = true } = {}) => {
        if (!novaNotif?.id) return;
        if (seenNotifIdsRef.current.has(novaNotif.id)) return;
        seenNotifIdsRef.current.add(novaNotif.id);

        if (!silent) {
            playAlertSound();
            showNativeNotification(novaNotif);
        }

        if (increaseBadge) {
            setUnreadCount((prev) => prev + (novaNotif.lida ? 0 : 1));
        }
        setNotifList((prev) => mergeNotifications([novaNotif, ...prev]));
    }, [mergeNotifications, playAlertSound, showNativeNotification]);

    // Busca as iniciais e escuta realtime + polling online
    useEffect(() => {
        if (!user) return;
        let canalRealtime;
        let pollingId;
        let mounted = true;

        const loadNotifications = async (silent = true) => {
            try {
                const count = await notificacoes.contarNaoLidas();
                const list = await notificacoes.listar(10);
                if (!mounted) return;

                setUnreadCount(count);
                setNotifList(list || []);

                (list || []).forEach((n) => {
                    if (!seenNotifIdsRef.current.has(n.id)) {
                        handleNovaNotificacao(n, { silent, increaseBadge: false });
                    }
                });
            } catch (error) {
                console.error("Erro ao carregar notificações", error);
            }
        };

        const handleOnline = () => {
            setIsOnline(true);
            loadNotifications(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
        };

        loadNotifications(true);

        canalRealtime = notificacoes.assinar(handleNovaNotificacao);
        pollingId = window.setInterval(() => {
            if (navigator.onLine) {
                loadNotifications(false);
            }
        }, 15000);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            mounted = false;
            if (canalRealtime) canalRealtime.unsubscribe();
            if (pollingId) clearInterval(pollingId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user, handleNovaNotificacao]);

    const handleMarcarLidas = async () => {
        if (unreadCount === 0) return;
        await notificacoes.marcarTodasLidas();
        setUnreadCount(0);
        setNotifList(prev => prev.map(n => ({ ...n, lida: true })));
    };


    // Se não estiver logado, redireciona
    if (!user && profile !== undefined) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        // Envia o comando pro servidor mas nao espera (pois estava travando o botão pra sempre em certas redes)
        auth.logout().catch(err => console.error('Erro silencioso ao sair:', err));

        // Pulveriza a sessão instantaneamente na máquina local
        localStorage.clear();
        sessionStorage.clear();

        // Redireciona na mesma hora
        window.location.href = '/login';
    };

    const getInitials = (nome, sobrenome) => {
        if (!nome) return 'NT';
        return `${nome.charAt(0)}${sobrenome ? sobrenome.charAt(0) : ''}`.toUpperCase();
    };

    return (
        <div className="flex flex-col h-screen bg-brand-cream overflow-hidden text-brand-charcoal font-sans">

            {/* TOPBAR */}
            <nav className="h-16 shrink-0 bg-white border-b border-brand-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    {!isHome && (
                        <button
                            onClick={() => navigate(-1)}
                            className="w-9 h-9 rounded-xl border border-brand-border bg-white flex items-center justify-center hover:bg-brand-warm-white"
                            title="Voltar"
                        >
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <button
                        onClick={() => navigate(homePath)}
                        className="font-serif text-2xl font-semibold text-brand-wine tracking-wider"
                    >
                        Nutri<span className="text-brand-accent">Track</span>
                    </button>
                </div>

                <div className="hidden md:flex bg-brand-warm-white rounded-xl p-1 gap-1">
                    <button
                        onClick={() => navigate(homePath)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg ${location.pathname === homePath ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                    >
                        Início
                    </button>
                    {role === 'paciente' && (
                        <>
                            <button
                                onClick={() => navigate('/plano-alimentar')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${location.pathname === '/plano-alimentar' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                            >
                                Plano
                            </button>
                            <button
                                onClick={() => navigate('/evolucao')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${location.pathname === '/evolucao' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                            >
                                Evolução
                            </button>
                        </>
                    )}
                    {role === 'nutricionista' && (
                        <>
                            <button
                                onClick={() => navigate('/nutricionista/planos')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${location.pathname === '/nutricionista/planos' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                            >
                                Planos
                            </button>
                            <button
                                onClick={() => navigate('/nutricionista/historico')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg ${location.pathname === '/nutricionista/historico' ? 'bg-white text-brand-charcoal shadow-sm' : 'text-brand-muted hover:text-brand-charcoal'}`}
                            >
                                Histórico
                            </button>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotif(!showNotif)}
                            className="relative w-10 h-10 rounded-full border border-brand-border bg-white flex items-center justify-center hover:bg-brand-wine-pale hover:border-brand-wine transition-all"
                        >
                            <Bell size={18} className="text-brand-charcoal" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-brand-danger text-white text-[0.6rem] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotif && (
                            <div className="absolute top-12 right-0 w-80 bg-white border border-brand-border rounded-xl shadow-custom-lg z-50 animate-in slide-in-from-top-2 duration-200">
                                <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-warm-white/50 rounded-t-xl">
                                    <h3 className="font-semibold text-sm">Notificações</h3>
                                    <div className="text-[10px] text-brand-muted mr-2">{isOnline ? 'Online' : 'Offline'}</div>
                                    {unreadCount > 0 && (
                                        <button onClick={handleMarcarLidas} className="text-xs text-brand-wine hover:underline transition-all">Marcar todas como lidas</button>
                                    )}
                                </div>
                                <div className="px-4 py-2 border-b border-brand-border/70 bg-brand-warm-white/30 flex items-center justify-between text-xs">
                                    <label className="inline-flex items-center gap-2">
                                        <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
                                        Som
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                        <input type="checkbox" checked={pushEnabled} onChange={(e) => setPushEnabled(e.target.checked)} />
                                        Push
                                    </label>
                                    <button
                                        onClick={requestPushPermission}
                                        className="text-brand-wine hover:underline"
                                    >
                                        Permissão
                                    </button>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifList.length === 0 ? (
                                        <div className="p-6 text-center text-sm text-brand-muted">
                                            Nenhuma notificação por enquanto.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col">
                                            {notifList.map(notif => (
                                                <div key={notif.id} className={`p-4 border-b border-brand-border/50 text-sm hover:bg-brand-warm-white transition-colors cursor-pointer ${notif.lida ? 'opacity-60' : 'bg-brand-wine-pale/20'}`}>
                                                    <div className="font-semibold mb-1 flex items-center gap-2">
                                                        {!notif.lida && <span className="w-1.5 h-1.5 rounded-full bg-brand-danger shrink-0"></span>}
                                                        {notif.titulo}
                                                    </div>
                                                    <div className="text-brand-muted text-xs leading-relaxed">{notif.mensagem}</div>
                                                    <div className="text-[0.6rem] text-brand-muted/70 mt-2 font-medium">
                                                        {new Date(notif.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Avatar */}
                    <div
                        onClick={() => navigate('/perfil')}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-wine to-brand-wine-light flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:shadow-md transition-shadow"
                        title="Meu Perfil"
                    >
                        {profile ? getInitials(profile.nome, profile.sobrenome) : 'NT'}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="hidden md:flex text-sm text-brand-muted hover:text-brand-danger transition-colors"
                    >
                        Sair
                    </button>
                </div>
            </nav>

            {/* RENDER PAGES HERE */}
            <div className="flex-1 overflow-hidden relative">
                <Outlet />
            </div>

            {/* MOBILE BOTTOM NAV */}
            <nav className="md:hidden shrink-0 bg-white border-t border-brand-border pb-safe">
                <div className="flex justify-around items-center p-2">
                    <button
                        onClick={() => navigate(homePath)}
                        className={`flex flex-col items-center gap-1 p-2 ${location.pathname === homePath ? 'text-brand-wine' : 'text-brand-muted'}`}
                    >
                        <Home size={20} />
                        <span className="text-[0.65rem] font-medium">Início</span>
                    </button>

                    {role === 'nutricionista' && (
                        <>
                            <button
                                onClick={() => navigate('/nutricionista/planos')}
                                className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/nutricionista/planos' ? 'text-brand-wine' : 'text-brand-muted hover:text-brand-wine'}`}
                            >
                                <UtensilsCrossed size={20} />
                                <span className="text-[0.65rem] font-medium">Planos</span>
                            </button>
                            <button
                                onClick={() => navigate('/nutricionista/historico')}
                                className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/nutricionista/historico' ? 'text-brand-wine' : 'text-brand-muted hover:text-brand-wine'}`}
                            >
                                <ClipboardList size={20} />
                                <span className="text-[0.65rem] font-medium">Hist.</span>
                            </button>
                        </>
                    )}

                    {role === 'paciente' && (
                        <button
                            onClick={() => navigate('/plano-alimentar')}
                            className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/plano-alimentar' ? 'text-brand-wine' : 'text-brand-muted hover:text-brand-wine'}`}
                        >
                            <UtensilsCrossed size={20} />
                            <span className="text-[0.65rem] font-medium">Plano</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowNotif(!showNotif)}
                        className="flex flex-col items-center gap-1 p-2 text-brand-muted relative"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-brand-danger rounded-full"></span>}
                        <span className="text-[0.65rem] font-medium">Avisos</span>
                    </button>

                    <button
                        onClick={() => navigate('/perfil')}
                        className={`flex flex-col items-center gap-1 p-2 ${location.pathname === '/perfil' ? 'text-brand-wine' : 'text-brand-muted'}`}
                    >
                        <Settings size={20} />
                        <span className="text-[0.65rem] font-medium">Perfil</span>
                    </button>
                </div>
            </nav>

        </div>
    );
}
