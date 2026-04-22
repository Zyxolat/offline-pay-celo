import { useCallback, useEffect, useState } from "react";

import {
  acceptPayment,
  getConnectedWalletAddress,
  getPaymentsForAddress,
  getWalletBalance,
  refundPayment,
  type TimeLockPaymentView,
} from "@/utils/contract";
import { useCelo } from "@/providers/CeloProvider";

export const useTimeLockPayments = () => {
  const {
    address,
    connectionError,
    connectionHint,
    connectionStatus,
    connect,
    connecting,
    isWrongNetwork,
    refreshWallet,
    retryConnection,
    openWalletManually,
    canOpenWalletManually,
    switchNetwork,
    switchingNetwork,
    walletAvailable,
  } = useCelo();
  const [payments, setPayments] = useState<TimeLockPaymentView[]>([]);
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(true);
  const [actingOnPaymentId, setActingOnPaymentId] = useState<number | null>(null);
  const [lastTransactionHash, setLastTransactionHash] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(
    async (addressOverride?: string) => {
      const targetAddress = addressOverride || address;

      if (!targetAddress || isWrongNetwork) {
        setPayments([]);
        setWalletBalance("0");
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [nextPayments, nextBalance] = await Promise.all([
          getPaymentsForAddress(targetAddress),
          getWalletBalance(targetAddress),
        ]);
        setPayments(nextPayments);
        setWalletBalance(nextBalance);
        setError("");
      } catch (refreshError) {
        setError(refreshError instanceof Error ? refreshError.message : "Unable to load contract payments.");
      } finally {
        setLoading(false);
      }
    },
    [address, isWrongNetwork],
  );

  const syncConnectedAccount = useCallback(async () => {
    try {
      const connectedAddress = await getConnectedWalletAddress();
      if (connectedAddress) {
        await refresh(connectedAddress);
      } else {
        setLoading(false);
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Unable to detect a connected wallet.");
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    void refreshWallet();
    void syncConnectedAccount();
  }, [refreshWallet, syncConnectedAccount]);

  useEffect(() => {
    if (!address || isWrongNetwork) {
      setPayments([]);
      setWalletBalance("0");
      setLoading(false);
      return;
    }

    void refresh(address);
  }, [address, isWrongNetwork, refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPayments((currentPayments) => currentPayments.map((payment) => {
        const unlocked = Math.floor(Date.now() / 1000) >= payment.deadline;
        const status = payment.refunded
          ? "refunded"
          : payment.claimed
            ? "accepted"
            : unlocked
              ? "ready"
              : "locked";

        return {
          ...payment,
          status,
          canAccept: payment.isRecipient && !payment.claimed && !payment.refunded && unlocked,
          canRefund: payment.isSender && !payment.claimed && !payment.refunded && !unlocked,
        };
      }));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const handleConnectWallet = useCallback(async () => {
    try {
      const nextAddress = await connect();
      setError("");
      await refresh(nextAddress);
      return nextAddress;
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "Unable to connect your wallet.";
      setError(message);
      throw new Error(message);
    }
  }, [connect, refresh]);

  const handleAcceptPayment = useCallback(
    async (paymentId: number) => {
      setActingOnPaymentId(paymentId);

      try {
        const result = await acceptPayment(paymentId);
        setLastTransactionHash(result.hash);
        setError("");
        await refresh();
        return result;
      } catch (acceptError) {
        const message = acceptError instanceof Error ? acceptError.message : "Unable to accept this payment.";
        setError(message);
        throw new Error(message);
      } finally {
        setActingOnPaymentId(null);
      }
    },
    [refresh],
  );

  const handleRefundPayment = useCallback(
    async (paymentId: number) => {
      setActingOnPaymentId(paymentId);

      try {
        const result = await refundPayment(paymentId);
        setLastTransactionHash(result.hash);
        setError("");
        await refresh();
        return result;
      } catch (refundError) {
        const message = refundError instanceof Error ? refundError.message : "Unable to refund this payment.";
        setError(message);
        throw new Error(message);
      } finally {
        setActingOnPaymentId(null);
      }
    },
    [refresh],
  );

  return {
    account: address,
    payments,
    walletBalance,
    loading,
    connecting,
    connectionError,
    connectionHint,
    connectionStatus,
    retryConnection,
    openWalletManually,
    canOpenWalletManually,
    actingOnPaymentId,
    lastTransactionHash,
    error,
    walletAvailable,
    isWrongNetwork,
    switchNetwork,
    switchingNetwork,
    connectWallet: handleConnectWallet,
    refresh,
    acceptPayment: handleAcceptPayment,
    refundPayment: handleRefundPayment,
  };
};
