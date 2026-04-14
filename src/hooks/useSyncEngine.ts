import { useEffect } from 'react';
import { ethers } from 'ethers';
import {
  getAcceptedIncomingPayments,
  getAcceptedOutgoingPayments,
  getOrCreateLocalWallet,
  syncPaymentToBlockchain,
} from '@/lib/offlinePayments';

export const useSyncEngine = ({
  signer,
  providerUrl,
  pollIntervalMs = 180000,
}: {
  signer?: ethers.Wallet | ethers.JsonRpcSigner;
  providerUrl?: string;
  pollIntervalMs?: number;
} = {}) => {
  useEffect(() => {
    const resolveWalletSigner = () => {
      try {
        return signer ?? getOrCreateLocalWallet();
      } catch (error) {
        console.error('[useSyncEngine] Unable to start sync engine.', error);
        return null;
      }
    };

    const syncAcceptedPayments = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }

      try {
        const [outgoingAccepted, incomingAccepted] = await Promise.all([
          getAcceptedOutgoingPayments(),
          getAcceptedIncomingPayments(),
        ]);

        const candidatePayments = [...outgoingAccepted, ...incomingAccepted];
        if (candidatePayments.length === 0) {
          return;
        }

        const walletSigner = resolveWalletSigner();
        if (!walletSigner) {
          return;
        }

        const walletAddress = (await walletSigner.getAddress()).toLowerCase();

        for (const payment of candidatePayments) {
          try {
            if (payment.from.toLowerCase() !== walletAddress) {
              continue;
            }

            const storeName = outgoingAccepted.some((item) => item.id === payment.id)
              ? 'sender_outgoing'
              : 'receiver_incoming';

            await syncPaymentToBlockchain(payment, walletSigner, storeName, providerUrl);
          } catch (error) {
            console.error('Failed to sync offline payment:', error);
          }
        }
      } catch (error) {
        console.error('Offline payment sync error:', error);
      }
    };

    syncAcceptedPayments();
    const onlineHandler = () => syncAcceptedPayments();
    window.addEventListener('online', onlineHandler);

    const intervalId = window.setInterval(syncAcceptedPayments, pollIntervalMs);
    return () => {
      window.removeEventListener('online', onlineHandler);
      window.clearInterval(intervalId);
    };
  }, [pollIntervalMs, providerUrl, signer]);
};
