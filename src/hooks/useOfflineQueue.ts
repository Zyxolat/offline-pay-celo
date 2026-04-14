import { useEffect, useState } from 'react';
import { queueAPI } from '@/services/apiClient';

export const useOfflineQueue = () => {
  useEffect(() => {
    const handleOnline = async () => {
      try {
        await queueAPI.sync();
        console.log('Synced offline queue');
      } catch (error) {
        console.error('Error syncing queue:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
};
