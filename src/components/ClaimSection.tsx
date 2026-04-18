import type { TimeLockPaymentView } from "@/utils/contract";
import { Button } from "@/components/ui/button";

interface ClaimSectionProps {
  currentTime: number;
  transaction: TimeLockPaymentView | null;
  onAccept: (id: number) => void | Promise<void>;
  onRefund: (id: number) => void | Promise<void>;
  actionLoadingId?: number | null;
  lastTransactionHash?: string;
  gasEstimate?: string;
}

export const ClaimSection = ({
  currentTime,
  onAccept,
  onRefund,
  transaction,
  actionLoadingId,
  lastTransactionHash,
  gasEstimate,
}: ClaimSectionProps) => {
  if (!transaction) {
    return (
      <section className="offlinepay-claim-card offlinepay-empty-state">
        <p className="offlinepay-eyebrow">Payment actions</p>
        <h3>Select a payment</h3>
        <p>Connect MetaMask, create a payment, then manage recipient acceptance or sender refunds here.</p>
      </section>
    );
  }

  const deadlineMs = transaction.deadline * 1000;
  const isLocked = transaction.status === "locked";
  const isWorking = actionLoadingId === transaction.id;
  const statusLabel =
    transaction.status === "accepted"
      ? "accepted"
      : transaction.status === "refunded"
        ? "refunded"
        : transaction.status === "ready"
          ? "ready to withdraw"
          : "locked";

  return (
    <section className="offlinepay-claim-card">
      <div className="offlinepay-section-heading offlinepay-section-heading--compact">
        <p className="offlinepay-eyebrow">Payment actions</p>
        <h3>Selected payment</h3>
        <p>Recipients can withdraw only after the timer reaches zero. Senders can cancel only while funds are still locked.</p>
      </div>

      <dl className="offlinepay-claim-details">
        <div>
          <dt>Amount</dt>
          <dd>{transaction.amount} CELO</dd>
        </div>
        <div>
          <dt>Recipient</dt>
          <dd>{transaction.recipient}</dd>
        </div>
        <div>
          <dt>Sender</dt>
          <dd>{transaction.sender}</dd>
        </div>
        <div>
          <dt>Unlock time</dt>
          <dd>{new Date(deadlineMs).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt>Countdown</dt>
          <dd>{isLocked ? `${Math.max(0, Math.floor((deadlineMs - currentTime) / 1000))}s` : "0s"}</dd>
        </div>
      </dl>

      <p className="text-sm text-slate-600">
        Estimated gas fee: {gasEstimate ? `${gasEstimate} CELO` : "Available when an action can be estimated"}
      </p>

      {transaction.canAccept ? (
        <Button onClick={() => onAccept(transaction.id)} disabled={isWorking} className="w-full">
          {isWorking ? "Withdrawing..." : "Withdraw Payment"}
        </Button>
      ) : null}

      {transaction.canRefund ? (
        <Button onClick={() => onRefund(transaction.id)} disabled={isWorking} className="w-full">
          {isWorking ? "Refunding..." : "Refund"}
        </Button>
      ) : null}

      {!transaction.canAccept && !transaction.canRefund ? (
        <Button disabled className="w-full">
          {transaction.status === "accepted"
            ? "Payment Accepted"
            : transaction.status === "refunded"
              ? "Payment Refunded"
              : transaction.status === "ready"
                ? "Recipient Wallet Required"
                : "Funds Still Locked"}
        </Button>
      ) : null}

      {lastTransactionHash ? <p style={{ marginTop: "0.75rem" }}>Latest transaction: {lastTransactionHash}</p> : null}
    </section>
  );
};

export default ClaimSection;
