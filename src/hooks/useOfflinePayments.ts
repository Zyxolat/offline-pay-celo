import { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import {
  OfflinePayment,
  OfflinePaymentCurrency,
  acceptIncomingPayment,
  canCreatePayment,
  createOfflinePayment,
  DEFAULT_PAYMENT_EXPIRY_SECONDS,
  expirePayments,
  getAcceptedIncomingPayments,
  getAllExpiredPaymentsByStore,
  getAllIncomingPayments,
  getAllOutgoingPayments,
  getPendingIncomingPayments,
  getPendingOutgoingPayments,
  getOrCreateLocalWallet,
  getStoredLocalWalletAddress,
  receiveOfflinePayment,
  serializePayment,
} from '@/lib/offlinePayments';

export interface OfflinePaymentsHook {
  outgoing: OfflinePayment[];
  incoming: OfflinePayment[];
  pendingSent: OfflinePayment[];
  pendingReceived: OfflinePayment[];
  expired: OfflinePayment[];
  walletAddress: string;
  error?: string;
  createPayment: (params: {
    recipient: string;
    amount: string;
    currency: OfflinePaymentCurrency;
    expiresInSeconds?: number;
    note?: string;
  }) => Promise<OfflinePayment>;
  receivePayment: (serialized: string) => Promise<OfflinePayment>;
  acceptPayment: (paymentId: string) => Promise<OfflinePayment>;
  refresh: () => Promise<void>;
  canCreatePayment: (amount: string, currency: OfflinePaymentCurrency, currentBalance: string) => Promise<boolean>;
  serializePayment: (payment: OfflinePayment) => string;
}

export const useOfflinePayments = ({
  signer,
  walletAddress,
}: {
  signer?: ethers.Wallet | ethers.JsonRpcSigner;
  walletAddress?: string;
} = {}): OfflinePaymentsHook => {
  const [walletState] = useState(() => {
    try {
      return {
        address: walletAddress ?? getStoredLocalWalletAddress() ?? getOrCreateLocalWallet().address,
        error: undefined as string | undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Offline wallet is unavailable.';
      console.error('[useOfflinePayments] Failed to resolve offline wallet.', error);
      return {
        address: walletAddress ?? '',
        error: message,
      };
    }
  });

  const [outgoing, setOutgoing] = useState<OfflinePayment[]>([]);
  const [incoming, setIncoming] = useState<OfflinePayment[]>([]);
  const [pendingSent, setPendingSent] = useState<OfflinePayment[]>([]);
  const [pendingReceived, setPendingReceived] = useState<OfflinePayment[]>([]);
  const [expired, setExpired] = useState<OfflinePayment[]>([]);
  const [error, setError] = useState<string | undefined>(walletState.error);
  const currentWalletAddress = walletState.address;

  const refresh = useCallback(async () => {
    try {
      const [allOutgoing, allIncoming, allExpired] = await Promise.all([
        getAllOutgoingPayments(),
        getAllIncomingPayments(),
        getAllExpiredPaymentsByStore(),
      ]);
      setOutgoing(allOutgoing);
      setIncoming(allIncoming);
      setPendingSent(allOutgoing.filter((item) => item.status === 'pending' || item.status === 'accepted'));
      setPendingReceived(allIncoming.filter((item) => item.status === 'pending'));
      setExpired(allExpired);
    } catch (err: any) {
      setError(err?.message || 'Failed to refresh offline payments');
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(async () => {
      try {
        await expirePayments();
        await refresh();
      } catch (err) {
        console.error('Expiry job failed:', err);
      }
    }, 120000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const createPayment = useCallback(
    async ({ recipient, amount, currency, expiresInSeconds = DEFAULT_PAYMENT_EXPIRY_SECONDS, note }: {
      recipient: string;
      amount: string;
      currency: OfflinePaymentCurrency;
      expiresInSeconds?: number;
      note?: string;
    }): Promise<OfflinePayment> => {
      try {
        if (!currentWalletAddress) {
          throw new Error('Offline wallet address is unavailable.');
        }

        const signerToUse = signer ?? getOrCreateLocalWallet();
        const payment = await createOfflinePayment({
          from: currentWalletAddress,
          to: recipient,
          amount,
          currency,
          expiresInSeconds,
          note,
          signer: signerToUse,
        });
        await refresh();
        return payment;
      } catch (err: any) {
        setError(err?.message || 'Unable to create offline payment');
        throw err;
      }
    },
    [currentWalletAddress, refresh, signer],
  );

  const receivePayment = useCallback(
    async (serialized: string): Promise<OfflinePayment> => {
      try {
        if (!currentWalletAddress) {
          throw new Error('Offline wallet address is unavailable.');
        }

        const payment = await receiveOfflinePayment(serialized, currentWalletAddress);
        await refresh();
        return payment;
      } catch (err: any) {
        setError(err?.message || 'Unable to receive payment');
        throw err;
      }
    },
    [currentWalletAddress, refresh],
  );

  const acceptPayment = useCallback(
    async (paymentId: string): Promise<OfflinePayment> => {
      try {
        const payment = await acceptIncomingPayment(paymentId);
        await refresh();
        return payment;
      } catch (err: any) {
        setError(err?.message || 'Unable to accept payment');
        throw err;
      }
    },
    [refresh],
  );

  const canCreate = useCallback(
    async (amount: string, currency: OfflinePaymentCurrency, currentBalance: string) => {
      try {
        return await canCreatePayment(currentWalletAddress, amount, currency, currentBalance);
      } catch (err) {
        console.error('Balance validation failed:', err);
        return false;
      }
    },
    [currentWalletAddress],
  );

  return {
    outgoing,
    incoming,
    pendingSent,
    pendingReceived,
    expired,
    walletAddress: currentWalletAddress,
    error,
    createPayment,
    receivePayment,
    acceptPayment,
    refresh,
    canCreatePayment: canCreate,
    serializePayment,
  };
};
