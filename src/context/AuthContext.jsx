import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const session = await authApi.currentSession();
    if (!session?.user) {
      setUser(null);
      setProfile(null);
      return;
    }

    setUser(session.user);
    const p = await authApi.currentProfile();
    setProfile(p);
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!mounted) return;
        await refresh();
      } catch (error) {
        console.error('[Auth] Falha ao carregar sessão:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = authApi.onAuthChange(async (_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(session.user);
      try {
        const p = await authApi.currentProfile();
        if (mounted) setProfile(p);
      } catch (error) {
        console.error('[Auth] Falha ao atualizar profile:', error);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    role: profile?.role || user?.user_metadata?.role || null,
    loading,
    login: authApi.login,
    signupNutri: authApi.signupNutri,
    signupPaciente: authApi.signupPaciente,
    logout: authApi.logout,
    refresh
  }), [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
