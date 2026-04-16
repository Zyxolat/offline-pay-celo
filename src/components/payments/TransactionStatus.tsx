import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { formatWalletAddress } from "@/lib/wallet";

export type TransactionState = "pending" | "success" | "failed";

interface TransactionStatusProps {
  status?: string;
  timestamp?: string;
  hash?: string;
}

const normalizeStatus = (status?: string): TransactionState => {
  if (status === "confirmed" || status === "success") {
    return "success";
  }

  if (status === "failed") {
    return "failed";
  }

  return "pending";
};

const getStatusLabel = (status: TransactionState) => {
  if (status === "success") {
    return "Success";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
};

const formatTimestamp = (value?: string) => {
  if (!value) {
    return "Timestamp unavailable";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Timestamp unavailable" : parsed.toLocaleString();
};

export const TransactionStatus = ({ status, timestamp, hash }: TransactionStatusProps) => {
  const normalized = normalizeStatus(status);
  const label = getStatusLabel(normalized);

  return (
    <div className="transaction-status">
      <span className={`status-chip status-chip--${normalized}`}>
        {normalized === "pending" ? <Loader2 className="status-chip__spinner" /> : null}
        {normalized === "success" ? <CheckCircle2 /> : null}
        {normalized === "failed" ? <AlertCircle /> : null}
        {label}
      </span>
      <span className="transaction-status__meta">{formatTimestamp(timestamp)}</span>
      {hash ? <span className="transaction-status__meta transaction-status__hash">{formatWalletAddress(hash, 10, 8)}</span> : null}
    </div>
  );
};

export default TransactionStatus;
