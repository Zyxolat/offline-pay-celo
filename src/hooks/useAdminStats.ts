import { useEffect, useState } from 'react';
import { adminAPI } from '@/services/adminClient';

export const useAdminStats = (enabled = true) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    if (!enabled) {
      setStats(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.getStats();
      setStats(response.data.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Admin access required');
      } else {
        setError(err.response?.data?.error || 'Failed to load admin stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setStats(null);
      setError(null);
      setLoading(false);
      return;
    }

    void loadStats();
  }, [enabled]);

  return { stats, loading, error, refresh: loadStats };
};
