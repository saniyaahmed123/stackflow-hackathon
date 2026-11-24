import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Loading } from '../components/ui';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = `${location.pathname}${location.search}${location.hash}`;

  if (loading) return <Loading label="Checking session..." />;
  if (!user) return <Navigate to="/login" replace state={{ from }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace state={{ from }} />;
  return children ?? <Outlet />;
}
