import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from "@/lib/router-compat";
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { subscribeToHubRevocations } from '@/lib/hubRevocationChannel';
import { sha256Hex } from '@/lib/deviceFingerprint';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const previousSessionRef = useRef<Session | null>(null);
  const isInitialLoadRef = useRef(true);
  const navigateRef = useRef(navigate);
  const pathnameRef = useRef(location.pathname);
  const userInitiatedSignOutRef = useRef(false);
  const lastEmailRef = useRef<string | null>(null);
  useEffect(() => {
    navigateRef.current = navigate;
    pathnameRef.current = location.pathname;
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      previousSessionRef.current = session;
      lastEmailRef.current = session?.user?.email?.toLowerCase() ?? null;
      isInitialLoadRef.current = false;
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user?.email) {
          lastEmailRef.current = newSession.user.email.toLowerCase();
        }

        // Session loss (JWT expired). Skip when we just navigated to the
        // explicit signed-out page (user-initiated logout closes the tab).
        if (event === 'SIGNED_OUT' && previousSessionRef.current) {
          const path = pathnameRef.current;
          const userInitiated = userInitiatedSignOutRef.current;
          userInitiatedSignOutRef.current = false;
          if (!userInitiated && path !== '/signed-out' && !path.startsWith('/sso/')) {
            // Unexpected sign-out -> possible refresh-token reuse (theft).
            const stolenEmail = lastEmailRef.current;
            if (stolenEmail) {
              void supabase.functions.invoke('report-refresh-reuse', {
                body: { email: stolenEmail },
              }).catch(() => {});
            }
            queryClient.clear();
            toast.info('Sua sessão expirou. Faça login novamente.');
            const redirect = encodeURIComponent(path || '/');
            navigateRef.current(`/sso/login?redirect=${redirect}`);
          }
        }
        
        previousSessionRef.current = newSession;
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session-guard: chama ao montar (com sessão) e a cada 30min.
  useSessionGuard(!!user, (reason) => {
    queryClient.clear();
    toast.info(
      reason === 'hub_revoked'
        ? 'Sua sessão foi encerrada pelo administrador.'
        : 'Detectamos atividade suspeita. Faça login novamente.',
    );
    const path = pathnameRef.current || '/';
    const redirect = encodeURIComponent(path);
    userInitiatedSignOutRef.current = true;
    void supabase.auth.signOut().finally(() => {
      navigateRef.current(`/sso/login?redirect=${redirect}`);
    });
  });

  // Hub push de revogação em tempo real.
  useEffect(() => {
    const email = user?.email?.toLowerCase();
    if (!email) return;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let loginAtMs = 0;
    let mySubjectHash = '';

    (async () => {
      mySubjectHash = await sha256Hex(email);
      try {
        const { data } = await supabase
          .from('session_context')
          .select('login_at')
          .eq('user_id', user!.id)
          .maybeSingle();
        loginAtMs = data?.login_at ? new Date(data.login_at).getTime() : 0;
      } catch {
        loginAtMs = 0;
      }
      if (cancelled) return;

      unsubscribe = subscribeToHubRevocations((payload) => {
        if (!payload?.subject_hash || !payload?.revoked_at) return;
        if (payload.subject_hash !== mySubjectHash) return;
        const revokedMs = new Date(payload.revoked_at).getTime();
        if (!Number.isFinite(revokedMs)) return;
        if (loginAtMs && revokedMs <= loginAtMs) return;

        queryClient.clear();
        toast.info('Sua sessão foi encerrada pelo administrador.');
        userInitiatedSignOutRef.current = true;
        const path = pathnameRef.current || '/';
        const redirect = encodeURIComponent(path);
        void supabase.auth.signOut().finally(() => {
          navigateRef.current(`/sso/login?redirect=${redirect}`);
        });
      });
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id, user?.email, queryClient]);

  const signOut = async () => {
    try {
      queryClient.clear();
      userInitiatedSignOutRef.current = true;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Try to close the tab. If the browser blocks it (most do, unless
      // the tab was opened by script), fall back to a neutral page that
      // does NOT redirect to /sso/login (which would re-auth via the Hub).
      try {
        window.close();
      } catch {
        /* ignore */
      }
      // Give the browser a tick to honor close(); if we're still here,
      // show the neutral signed-out screen.
      setTimeout(() => {
        if (!window.closed) {
          window.location.replace('/signed-out');
        }
      }, 50);
    } catch (error: any) {
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};