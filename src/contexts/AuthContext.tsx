import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from "@/lib/router-compat";
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
      isInitialLoadRef.current = false;
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Session loss (JWT expired). Skip when we just navigated to the
        // explicit signed-out page (user-initiated logout closes the tab).
        if (event === 'SIGNED_OUT' && previousSessionRef.current) {
          const path = pathnameRef.current;
          if (path !== '/signed-out' && !path.startsWith('/sso/')) {
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

  const signOut = async () => {
    try {
      queryClient.clear();
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