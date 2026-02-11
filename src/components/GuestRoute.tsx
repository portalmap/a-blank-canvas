import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

export function GuestBlockedRoute({ children }: { children: React.ReactNode }) {
  const { data: userRole, isLoading } = useUserRole();

  if (isLoading) return null;
  if (userRole?.isGuest) return <Navigate to="/" replace />;

  return <>{children}</>;
}
