import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, role, profileComplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Only admin and owner roles can access
  if (role && role !== 'admin' && role !== 'owner') {
    return <Navigate to="/signin" replace />;
  }

  // Force profile completion for new users
  const isProfilePage = location.pathname === '/dashboard/profile';
  if (!profileComplete && !isProfilePage && role) {
    return <Navigate to="/dashboard/profile?setup=true" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
