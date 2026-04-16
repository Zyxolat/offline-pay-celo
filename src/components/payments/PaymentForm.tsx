import { useState, type FormEvent } from "react";

import type { OfflineTransaction } from "@/components/PaymentCard";
import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import { toast } from "@/components/ui/sonner";
import { sendCelo } from "@/utils/sendCelo";

interface PaymentFormProps {
  disabled?: boolean;
  onSubmit?: (transaction: OfflineTransaction) => void;
}

type FeedbackState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const createTransactionId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `payment-${Date.now()}`;
};

export const PaymentForm = ({ disabled = false, onSubmit }: PaymentFormProps) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (disabled || loading) {
      return;
    }

    const trimmedRecipient = recipient.trim();
    const trimmedAmount = amount.trim();
    const parsedAmount = Number(trimmedAmount);

    if (!trimmedRecipient) {
      const message = "Recipient address is required.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
      return;
    }

    if (!trimmedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      const message = "Enter an amount greater than 0.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const { hash } = await sendCelo(trimmedRecipient, trimmedAmount);
      const successMessage = `Payment sent successfully. Transaction hash: ${hash}`;

      console.log("Payment confirmed:", hash);

      setFeedback({ type: "success", text: successMessage });
      toast.success("CELO sent successfully", {
        description: `Transaction confirmed: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      onSubmit?.({
        id: createTransactionId(),
        amount: parsedAmount,
        recipient: trimmedRecipient,
        unlockTime: Date.now(),
        status: "claimed",
      });

      setRecipient("");
      setAmount("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send CELO right now. Please try again.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="offlinepay-form-card" onSubmit={handleSubmit}>
      <div className="offlinepay-section-heading">
        <p className="offlinepay-eyebrow">Send payment</p>
        <h2>Transfer real CELO on Alfajores</h2>
        <p>Enter a wallet address and amount, approve the MetaMask prompt, and wait for confirmation.</p>
      </div>

      <div className="offlinepay-form-grid">
        <Input
          id="celo-recipient"
          label="Recipient wallet address"
          type="text"
          placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          hint="Use a valid Celo wallet address on the Alfajores Testnet."
          autoComplete="off"
          spellCheck={false}
        />
        <Input
          id="celo-amount"
          label="Amount (CELO)"
          type="number"
          min="0"
          step="0.0001"
          placeholder="0.1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          hint="The transaction will send native CELO from your connected MetaMask wallet."
        />
      </div>

      {feedback ? (
        <div aria-live="polite" role={feedback.type === "error" ? "alert" : "status"}>
          <span className={`offlinepay-status-pill ${feedback.type === "success" ? "offlinepay-status-pill--claimed" : "offlinepay-status-pill--locked"}`}>
            {feedback.type === "success" ? "Success" : "Error"}
          </span>
          <p style={{ marginTop: "0.75rem" }}>{feedback.text}</p>
        </div>
      ) : null}

      <Button type="submit" disabled={disabled || loading} fullWidth>
        {loading ? "Sending..." : "Send CELO"}
      </Button>
    </form>
  );
};

export default PaymentForm;
