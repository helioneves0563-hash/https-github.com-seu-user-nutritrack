import React, { useEffect, useState } from 'react';
import { auth } from '../services/supabase';
import { AuthContext } from './AuthContextObj';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initSession() {
            try {
                const session = await auth.sessaoAtual();
                if (session && mounted) {
                    setUser(session.user);
                    const p = await auth.perfilAtual();
                    if (mounted) setProfile(p);
                }
            } catch (err) {
                console.error("[Auth] Erro ao carregar cache da sessão:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initSession();

        const { data: { subscription } } = auth.onAuthChange(async (event, session) => {
            if (!mounted) return;

            // O evento INITIAL_SESSION é redundante pois já rodamos initSession.
            // Para atualizar apenas quando há login/logout ativo:
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session) {
                    setUser(session.user);
                    try {
                        const p = await auth.perfilAtual();
                        if (mounted) setProfile(p);
                    } catch (e) {
                        if (mounted) setProfile(null);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setProfile(null);
            }
        });

        // Fallback Force: Se nada rodar em 4 segundos, destrava a tela branca
        const fallbackTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("[Auth] Fallback de segurança acionado. Forçando saída do loading.");
                setLoading(false);
            }
        }, 4000);

        return () => {
            mounted = false;
            clearTimeout(fallbackTimer);
            subscription?.unsubscribe();
        };
    }, []);

    const value = {
        user,
        profile,
        loading,
        role: profile?.role || user?.user_metadata?.role || null // fallback
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-brand-wine/30 border-t-brand-wine rounded-full animate-spin"></div>
                    <p className="mt-4 text-brand-wine font-serif font-medium">Carregando perfil...</p>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
}
