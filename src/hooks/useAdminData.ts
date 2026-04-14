import { useEffect, useState } from 'react';
import { adminAPI } from '@/services/adminClient';

export const useAdminData = (
  endpoint: 'users' | 'transactions' | 'wallets',
  enabled = true,
) => {
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (page = 1, limit = 50) => {
    if (!enabled) {
      setData([]);
      setPagination(null);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let response;
      switch (endpoint) {
        case 'users':
          response = await adminAPI.getUsers(page, limit);
          break;
        case 'transactions':
          response = await adminAPI.getTransactions(page, limit);
          break;
        case 'wallets':
          response = await adminAPI.getWallets(page, limit);
          break;
      }
      setData(response.data.data[endpoint]);
      setPagination(response.data.data.pagination);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to load ${endpoint}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setPagination(null);
      setError(null);
      setLoading(false);
      return;
    }

    void loadData();
  }, [enabled, endpoint]);

  return { data, pagination, loading, error, loadData };
};
