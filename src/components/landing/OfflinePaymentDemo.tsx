import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, Wallet, WifiOff } from "lucide-react";

import ClaimSection from "@/components/ClaimSection";
import PaymentCard from "@/components/PaymentCard";
import PaymentForm from "@/components/PaymentForm";
import WhyOfflinePay from "@/components/WhyOfflinePay";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { formatWalletAddress } from "@/lib/wallet";
import { useTimeLockPayments } from "@/hooks/useTimeLockPayments";

export const OfflinePaymentDemo = () => {
  const {
    account,
    payments,
    connectWallet,
    refresh,
    acceptPayment,
    refundPayment,
    error,
    connecting,
    actingOnPaymentId,
    lastTransactionHash,
  } =
    useTimeLockPayments();
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedTransaction = useMemo(
    () => payments.find((transaction) => transaction.id === selectedTransactionId) ?? payments[0] ?? null,
    [selectedTransactionId, payments],
  );

  const handleCreateTransaction = async () => {
    await refresh();
  };

  useEffect(() => {
    if (!selectedTransaction && payments.length > 0) {
      setSelectedTransactionId(payments[0].id);
    }
  }, [payments, selectedTransaction]);

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
      toast.success("Wallet connected to Celo Mainnet.");
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "Unable to connect MetaMask.";
      toast.error(message);
    }
  };

  const handleAcceptTransaction = async (id: number) => {
    try {
      await acceptPayment(id);
      toast.success("Payment accepted successfully.");
    } catch (acceptError) {
      toast.error(acceptError instanceof Error ? acceptError.message : "Unable to accept payment.");
    }
  };

  const handleRefundTransaction = async (id: number) => {
    try {
      await refundPayment(id);
      toast.success("Refund sent back to the sender.");
    } catch (refundError) {
      toast.error(refundError instanceof Error ? refundError.message : "Unable to refund payment.");
    }
  };

  return (
    <section className="offlinepay-demo-section">
      <div className="offlinepay-demo-shell">
        <div className="offlinepay-demo-intro">
          <div className="offlinepay-demo-intro__copy">
            <span className="offlinepay-demo-intro__badge">
              <WifiOff size={16} />
              Live Celo Mainnet flow
            </span>
            <h2>Lock CELO, count down to release, and let the right wallet withdraw only after unlock</h2>
            <p>
              This version uses MetaMask plus a real Celo smart contract, so the sender never gives up custody beyond the
              contract rules you define on-chain.
            </p>
          </div>

          <div className="offlinepay-auth-card">
            <div className="offlinepay-auth-card__header">
              <div>
                <p className="offlinepay-eyebrow">Wallet connection</p>
                <h3>MetaMask on Celo Mainnet</h3>
              </div>
              {account ? (
                <span className="offlinepay-status-pill offlinepay-status-pill--claimed">
                  <CheckCircle2 size={14} />
                  Connected
                </span>
              ) : (
                <span className="offlinepay-status-pill offlinepay-status-pill--locked">Not connected</span>
              )}
            </div>

            <p className="offlinepay-auth-card__copy">
              Connect the wallet that should create, accept, or refund payments using the deployed OfflinePay contract on Celo Mainnet.
            </p>

            <Button onClick={handleConnectWallet} variant={account ? "secondary" : "default"} className="w-full" disabled={connecting}>
              <Wallet size={18} />
              {connecting ? "Connecting..." : account ? formatWalletAddress(account, 10, 8) : "Connect MetaMask"}
            </Button>

            {error ? <p style={{ marginTop: "0.75rem" }}>{error}</p> : null}
          </div>
        </div>

        <div className="offlinepay-workbench">
          <PaymentForm disabled={!account} onSubmit={handleCreateTransaction} />

          <div className="offlinepay-side-column">
            <section className="offlinepay-list-card">
              <div className="offlinepay-section-heading offlinepay-section-heading--compact">
                <p className="offlinepay-eyebrow">Transactions</p>
                <h3>Contract payments</h3>
                <p>Each card reflects live on-chain status with a real unlock countdown.</p>
              </div>

              <div className="offlinepay-transaction-list">
                {payments.length === 0 ? (
                  <div className="offlinepay-empty-state">
                    <ShieldCheck size={22} />
                    <p>No contract payments yet. Connect MetaMask, lock CELO, and the recipient will be able to withdraw after unlock.</p>
                  </div>
                ) : (
                  payments.map((transaction) => (
                    <PaymentCard
                      key={transaction.id}
                      transaction={transaction}
                      currentTime={currentTime}
                      isSelected={transaction.id === selectedTransaction?.id}
                      onSelect={setSelectedTransactionId}
                    />
                  ))
                )}
              </div>
            </section>

            <ClaimSection
              currentTime={currentTime}
              transaction={selectedTransaction}
              onAccept={handleAcceptTransaction}
              onRefund={handleRefundTransaction}
              actionLoadingId={actingOnPaymentId}
              lastTransactionHash={lastTransactionHash}
            />
          </div>
        </div>

        <WhyOfflinePay />
      </div>
    </section>
  );
};

export default OfflinePaymentDemo;
