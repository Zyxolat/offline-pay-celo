import { useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Copy, Share2 } from "lucide-react";

import WalletCard from "@/components/payments/WalletCard";
import TransactionStatus from "@/components/payments/TransactionStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { useOfflinePayments } from "@/hooks/useOfflinePayments";
import { DEFAULT_PAYMENT_EXPIRY_HOURS } from "@/lib/offlinePayments";
import { copyTextToClipboard, getMinimumAmount, getMinimumAmountError, type SupportedToken } from "@/lib/wallet";

const currencyOptions = ["cUSD", "CELO"] as const;

const steps = [
  {
    title: "Enter amount",
    description: "Choose the token and define the amount you want to queue.",
  },
  {
    title: "Enter recipient",
    description: "Paste the destination wallet and add a helpful note if needed.",
  },
  {
    title: "Set scheduled time",
    description: "Pick your preferred send moment and expiry protection window.",
  },
  {
    title: "Confirm transaction",
    description: "Review the details before creating the offline payload.",
  },
] as const;

const formatLocalDateTime = (value: string) => {
  if (!value) {
    return "Send when network returns";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Send when network returns" : parsed.toLocaleString();
};

const createDefaultSchedule = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export const SendPayment = () => {
  const { createPayment, error: walletError, walletAddress } = useOfflinePayments();
  const [currentStep, setCurrentStep] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<typeof currencyOptions[number]>("cUSD");
  const [note, setNote] = useState("");
  const [scheduledAt, setScheduledAt] = useState(createDefaultSchedule);
  const [expiresInHours, setExpiresInHours] = useState(DEFAULT_PAYMENT_EXPIRY_HOURS);
  const [outputPayload, setOutputPayload] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  const canShare = typeof navigator !== "undefined" && !!navigator.share;
  const minimumAmountError = getMinimumAmountError(amount, currency as SupportedToken);
  const shareText = useMemo(() => outputPayload || "", [outputPayload]);

  const friendlyError = error || walletError || minimumAmountError;

  const validateStep = (stepIndex: number) => {
    if (stepIndex === 0) {
      if (!amount) {
        return "Enter an amount to continue.";
      }

      if (parseFloat(amount) <= 0) {
        return "Amount must be greater than zero.";
      }

      if (minimumAmountError) {
        return minimumAmountError;
      }
    }

    if (stepIndex === 1 && !recipient.trim()) {
      return "Enter the recipient wallet address to continue.";
    }

    if (stepIndex === 2) {
      if (!scheduledAt) {
        return "Choose a scheduled time for this payment.";
      }

      if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) {
        return "Expiry must be between 1 and 168 hours.";
      }
    }

    return "";
  };

  const handleNext = () => {
    const message = validateStep(currentStep);
    setError(message);

    if (message) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleCreatePayment = async () => {
    const validationMessage = validateStep(0) || validateStep(1) || validateStep(2);
    setError(validationMessage);
    setSuccess("");

    if (validationMessage) {
      return;
    }

    setLoading(true);

    try {
      const payment = await createPayment({
        recipient,
        amount,
        currency,
        expiresInSeconds: expiresInHours * 3600,
        note,
      });
      const payload = JSON.stringify(payment, null, 2);
      setOutputPayload(payload);
      setCreatedAt(new Date().toISOString());
      setSuccess("Transaction scheduled offline and ready to share with the recipient.");
      toast.success("Transaction Scheduled");
    } catch (err: any) {
      const message = err?.message || "We couldn't schedule this transaction. Please review the details and try again.";
      setError(message);
      toast.error("Transaction Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!outputPayload) {
      return;
    }

    try {
      await copyTextToClipboard(outputPayload);
      setSuccess("Transaction payload copied to clipboard.");
      toast.success("Transaction Scheduled");
    } catch (copyError: any) {
      setError(copyError?.message || "Unable to copy the transaction payload.");
      toast.error("Transaction Failed");
    }
  };

  const handleShare = async () => {
    if (!shareText || !navigator.share) {
      return;
    }

    try {
      await navigator.share({
        title: "Offline Payment Payload",
        text: shareText,
      });
      toast.success("Transaction Sent");
    } catch (shareError: any) {
      if (shareError?.name !== "AbortError") {
        setError(shareError?.message || "Unable to share the transaction payload.");
        toast.error("Transaction Failed");
      }
    }
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return (
        <section className="fintech-card flow-card">
          <h2 className="flow-card__title">{steps[0].title}</h2>
          <p className="flow-card__copy">{steps[0].description}</p>

          <div className="flow-card__body">
            <div className="field-grid">
              <div className="field-stack">
                <label htmlFor="payment-amount" className="field-stack__label">
                  Amount
                </label>
                <Input
                  id="payment-amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="0.00"
                />
                <p className="field-stack__hint">Minimum {currency}: {getMinimumAmount(currency as SupportedToken)} {currency}</p>
              </div>

              <div className="field-stack">
                <label htmlFor="payment-currency" className="field-stack__label">
                  Currency
                </label>
                <select
                  id="payment-currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as typeof currencyOptions[number])}
                  className="select-input"
                >
                  {currencyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <p className="field-stack__hint">Supported tokens are tuned for CELO and cUSD offline settlement.</p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (currentStep === 1) {
      return (
        <section className="fintech-card flow-card">
          <h2 className="flow-card__title">{steps[1].title}</h2>
          <p className="flow-card__copy">{steps[1].description}</p>

          <div className="flow-card__body">
            <div className="field-stack">
              <label htmlFor="payment-recipient" className="field-stack__label">
                Recipient wallet
              </label>
              <Input
                id="payment-recipient"
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="0x..."
              />
              <p className="field-stack__hint">Use the recipient's Celo address. Double-check it before you continue.</p>
            </div>

            <div className="field-stack">
              <label htmlFor="payment-note" className="field-stack__label">
                Payment note
              </label>
              <Input
                id="payment-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Market order, rider payout, store pickup..."
              />
              <p className="field-stack__hint">Optional, but useful when the payload is shared offline.</p>
            </div>
          </div>
        </section>
      );
    }

    if (currentStep === 2) {
      return (
        <section className="fintech-card flow-card">
          <h2 className="flow-card__title">{steps[2].title}</h2>
          <p className="flow-card__copy">{steps[2].description}</p>

          <div className="flow-card__body">
            <div className="field-stack">
              <label htmlFor="payment-schedule" className="field-stack__label">
                Scheduled time
              </label>
              <Input
                id="payment-schedule"
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
              <p className="field-stack__hint">
                This is a planning timestamp for the team using the app. Settlement still happens once connectivity returns.
              </p>
            </div>

            <div className="field-stack">
              <label htmlFor="payment-expiry" className="field-stack__label">
                Expiry protection window
              </label>
              <Input
                id="payment-expiry"
                type="number"
                min="1"
                max="168"
                value={expiresInHours}
                onChange={(event) => setExpiresInHours(Number(event.target.value))}
              />
              <p className="field-stack__hint">Set how long the payment stays valid after creation. Maximum: 168 hours.</p>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="fintech-card flow-card">
        <h2 className="flow-card__title">{steps[3].title}</h2>
        <p className="flow-card__copy">{steps[3].description}</p>

        <div className="flow-card__body">
          <div className="flow-summary">
            <div className="flow-summary__row">
              <span className="flow-summary__label">Amount</span>
              <span className="flow-summary__value">
                {amount || "0"} {currency}
              </span>
            </div>
            <div className="flow-summary__row">
              <span className="flow-summary__label">Recipient</span>
              <span className="flow-summary__value">{recipient || "Not provided"}</span>
            </div>
            <div className="flow-summary__row">
              <span className="flow-summary__label">Scheduled time</span>
              <span className="flow-summary__value">{formatLocalDateTime(scheduledAt)}</span>
            </div>
            <div className="flow-summary__row">
              <span className="flow-summary__label">Expiry</span>
              <span className="flow-summary__value">{expiresInHours} hours</span>
            </div>
            <div className="flow-summary__row">
              <span className="flow-summary__label">Note</span>
              <span className="flow-summary__value">{note || "No note added"}</span>
            </div>
          </div>

          <div className="feedback-banner">
            <CalendarClock size={18} />
            Your scheduled time helps operators plan the handoff. The blockchain transaction is still broadcast when the device reconnects.
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="payment-flow">
      <section className="fintech-card">
        <div className="fintech-card__content">
          <div className="fintech-card__eyebrow">Offline payment flow</div>
          <h1 className="fintech-card__title">Create a trusted offline payment</h1>
          <p className="fintech-card__copy">
            Move through the steps, review the details, then generate a payload that can be delivered offline and settled on Celo later.
          </p>
        </div>
      </section>

      <div className="payment-stepper">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className={`payment-stepper__item${index === currentStep ? " payment-stepper__item--active" : ""}${
              index < currentStep ? " payment-stepper__item--done" : ""
            }`}
          >
            <span className="payment-stepper__index">{index + 1}</span>
            <span className="payment-stepper__label">{step.title}</span>
            <span className="payment-stepper__copy">{step.description}</span>
          </div>
        ))}
      </div>

      <div className="payment-flow__layout">
        <div className="payment-flow__panel">
          {renderCurrentStep()}

          {friendlyError ? (
            <div className="feedback-banner feedback-banner--error">
              <AlertCircle size={18} />
              {friendlyError}
            </div>
          ) : null}

          {success ? <div className="feedback-banner feedback-banner--success">{success}</div> : null}

          <div className="flow-nav">
            <div className="field-stack__hint">
              Step {currentStep + 1} of {steps.length}
            </div>
            <div className="flow-nav__actions">
              <Button variant="secondary" onClick={handleBack} disabled={currentStep === 0 || loading}>
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>Next</Button>
              ) : (
                <Button onClick={() => void handleCreatePayment()} loading={loading}>
                  Confirm Transaction
                </Button>
              )}
            </div>
          </div>

          {outputPayload ? (
            <section className="payload-box">
              <div className="payload-box__label">Generated payload</div>
              <textarea readOnly value={outputPayload} className="textarea-input payload-box__textarea" />
              <div className="fintech-actions payload-box__actions">
                <Button variant="outline" onClick={() => void handleCopy()}>
                  <Copy size={16} />
                  Copy Payload
                </Button>
                {canShare ? (
                  <Button variant="secondary" onClick={() => void handleShare()}>
                    <Share2 size={16} />
                    Share Payload
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <div className="payment-flow__panel">
          <WalletCard
            address={walletAddress}
            balance={amount ? `${amount} ${currency}` : "--"}
            balanceLabel="Scheduled Payment"
            subtitle={scheduledAt ? `Target time: ${formatLocalDateTime(scheduledAt)}` : "Waiting for payment details"}
          />

          <section className="fintech-card flow-card">
            <h2 className="flow-card__title">Live status</h2>
            <p className="flow-card__copy">Your transaction stays in a pending state until it is shared and later synced online.</p>
            <div className="flow-card__body">
              <TransactionStatus status={outputPayload ? "pending" : undefined} timestamp={createdAt} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
