import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthSelection } from '@/components/auth/AuthSelection';

export const Login = () => {
  const location = useLocation();

  useEffect(() => {
    console.log('[Login] mounted', { path: location.pathname });
  }, [location.pathname]);

  return <AuthSelection pageMode="login" />;
};
