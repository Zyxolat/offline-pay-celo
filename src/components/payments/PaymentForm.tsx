import { useState, type FormEvent } from "react";
import { isAddress } from "ethers";

import Button from "@/components/UI/Button";
import Input from "@/components/UI/Input";
import { toast } from "@/components/ui/sonner";
import { createPayment } from "@/utils/contract";

interface PaymentFormProps {
  disabled?: boolean;
  onSubmit?: () => Promise<void> | void;
}

type FeedbackState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

export const PaymentForm = ({ disabled = false, onSubmit }: PaymentFormProps) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [durationHours, setDurationHours] = useState("24");
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
    const parsedDurationHours = Number(durationHours.trim());

    if (!trimmedRecipient) {
      const message = "Recipient address is required.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
      return;
    }

    if (!isAddress(trimmedRecipient)) {
      const message = "Enter a valid Celo wallet address.";
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

    if (!durationHours.trim() || Number.isNaN(parsedDurationHours) || parsedDurationHours <= 0) {
      const message = "Enter a deadline duration greater than 0 hours.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const { hash, paymentId } = await createPayment(trimmedRecipient, Math.floor(parsedDurationHours * 3600), trimmedAmount);
      const successMessage = paymentId === null
        ? `Payment created. Transaction hash: ${hash}`
        : `Payment #${paymentId} created successfully. Transaction hash: ${hash}`;

      setFeedback({ type: "success", text: successMessage });
      toast.success("Payment locked successfully", {
        description: `Transaction confirmed: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });

      await onSubmit?.();

      setRecipient("");
      setAmount("");
      setDurationHours("24");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create the payment right now. Please try again.";
      setFeedback({ type: "error", text: message });
      toast.error("Payment failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="offlinepay-form-card" onSubmit={handleSubmit}>
      <div className="offlinepay-section-heading">
        <p className="offlinepay-eyebrow">Lock payment</p>
        <h2>Create a time-locked payment</h2>
        <p>Lock real CELO in the contract, give the recipient a deadline, and let MetaMask handle signing.</p>
      </div>

      <div className="offlinepay-form-grid">
        <Input
          id="celo-recipient"
          label="Recipient wallet address"
          type="text"
          placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
          hint="Use a valid wallet address on Celo Alfajores."
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
          hint="This CELO amount will be locked in the contract until accepted or refunded."
        />
        <Input
          id="celo-duration"
          label="Deadline (hours)"
          type="number"
          min="1"
          step="1"
          placeholder="24"
          value={durationHours}
          onChange={(event) => setDurationHours(event.target.value)}
          hint="The recipient must accept before this deadline or the sender can reclaim the funds."
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
        {loading ? "Locking..." : "Create Time-Locked Payment"}
      </Button>
    </form>
  );
};

export default PaymentForm;
