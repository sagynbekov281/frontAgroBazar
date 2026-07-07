import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export default function ProtectedRoute({ children, role }: { children: ReactNode; role?: UserRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="py-32 text-center text-muted">Жүктөлүүдө...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
