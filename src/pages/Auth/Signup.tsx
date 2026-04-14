import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthSelection } from '@/components/auth/AuthSelection';

export const Signup = () => {
  const location = useLocation();

  useEffect(() => {
    console.log('[Signup] mounted', { path: location.pathname });
  }, [location.pathname]);

  return <AuthSelection pageMode="signup" />;
};
