import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ForcePasswordChangeDialog } from '@/components/auth/ForcePasswordChangeDialog';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [checkingPasswordChange, setCheckingPasswordChange] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const checkPasswordChange = async () => {
      if (!user) {
        setCheckingPasswordChange(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_change_password')
          .eq('id', user.id)
          .single();

        setMustChangePassword(profile?.must_change_password || false);
      } catch (error) {
        console.error('Error checking password change requirement:', error);
      } finally {
        setCheckingPasswordChange(false);
      }
    };

    if (!loading) {
      checkPasswordChange();
    }
  }, [user, loading]);

  if (loading || checkingPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  return (
    <>
      <ForcePasswordChangeDialog 
        open={mustChangePassword} 
        onPasswordChanged={handlePasswordChanged} 
      />
      {children}
    </>
  );
};