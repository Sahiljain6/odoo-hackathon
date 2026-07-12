import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// usage: <ProtectedRoute roles={['fleet_manager']}><Vehicles /></ProtectedRoute>
// omit `roles` to just require any authenticated user
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return children;
}
