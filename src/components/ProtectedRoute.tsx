import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const here = window.location.pathname + window.location.search;
      const redirect = encodeURIComponent(here || '/');
      window.location.replace(`/sso/login?redirect=${redirect}`);
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
};