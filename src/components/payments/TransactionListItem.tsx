import { ChevronRight } from "lucide-react";

import TransactionStatus from "@/components/payments/TransactionStatus";
import { formatWalletAddress } from "@/lib/wallet";

interface TransactionListItemProps {
  amount: string;
  currency?: string;
  recipient?: string;
  status?: string;
  timestamp?: string;
  onClick?: () => void;
}

const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown date";
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? "Unknown date" : parsedDate.toLocaleDateString();
};

export const TransactionListItem = ({
  amount,
  currency = "CELO",
  recipient,
  status,
  timestamp,
  onClick,
}: TransactionListItemProps) => {
  return (
    <article
      className={`transaction-row${onClick ? " transaction-row--interactive" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="transaction-row__main">
        <div className="transaction-row__top">
          <div className="transaction-row__amount">
            {amount} {currency}
          </div>
          <TransactionStatus status={status} timestamp={timestamp} />
        </div>
        <div className="transaction-row__address">
          {recipient ? formatWalletAddress(recipient, 10, 8) : "Recipient unavailable"}
        </div>
        <div className="transaction-row__date">{formatDate(timestamp)}</div>
      </div>
      {onClick ? (
        <div className="transaction-row__side">
          <ChevronRight size={18} className="transaction-row__chevron" />
        </div>
      ) : null}
    </article>
  );
};

export default TransactionListItem;
