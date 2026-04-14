import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { getStoredToken, getStoredUser, isAdminUser } from '@/lib/auth';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token) {
    return <>{children}</>;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
