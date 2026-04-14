import { useMemo, useState } from 'react';
import { Copy, Share2, CheckCircle, Clock3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { useOfflinePayments } from '@/hooks/useOfflinePayments';
import { DEFAULT_PAYMENT_EXPIRY_HOURS } from '@/lib/offlinePayments';
import { copyTextToClipboard, getMinimumAmount, getMinimumAmountError, type SupportedToken } from '@/lib/wallet';

const currencyOptions = ['cUSD', 'CELO'] as const;

export const SendPayment = () => {
  const { createPayment, error: walletError, walletAddress } = useOfflinePayments();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<typeof currencyOptions[number]>('cUSD');
  const [note, setNote] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(DEFAULT_PAYMENT_EXPIRY_HOURS);
  const [outputPayload, setOutputPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const shareText = useMemo(() => outputPayload || '', [outputPayload]);
  const minimumAmountError = getMinimumAmountError(amount, currency as SupportedToken);

  const handleCreatePayment = async () => {
    setError('');
    setSuccess('');

    if (!recipient || !amount) {
      setError('Recipient and amount are required.');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (minimumAmountError) {
      setError(minimumAmountError);
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
      const payload = JSON.stringify(payment);
      setOutputPayload(payload);
      setSuccess('Offline payment created. Share this payload with the recipient.');
      toast.success('Offline payment created successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to create payment.');
      toast.error(err?.message || 'Failed to create offline payment.');
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
      setSuccess('Payment payload copied to clipboard.');
      toast.success('Payment payload copied.');
    } catch (error: any) {
      setError(error?.message || 'Unable to copy payment payload.');
      toast.error(error?.message || 'Unable to copy payment payload.');
    }
  };

  const handleShare = async () => {
    if (!shareText || !navigator.share) {
      return;
    }

    try {
      await navigator.share({
        title: 'Offline Payment Payload',
        text: shareText,
      });
      toast.success('Payment payload shared.');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setError(error?.message || 'Unable to share payment payload.');
        toast.error(error?.message || 'Unable to share payment payload.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/70">
        <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.04),_rgba(59,130,246,0.08))] p-6">
          <div className="mb-4 inline-flex rounded-2xl bg-slate-950 p-3 text-emerald-300">
            <Clock3 size={18} />
          </div>
          <h2 className="font-display text-2xl font-semibold text-slate-950">Create a time-locked offline payment</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The recipient must accept this payment before it expires. If they do not, the funds remain protected instead of being lost.
          </p>
        </div>

        <div className="p-6">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sender wallet</p>
            <p className="mt-2 break-all rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900">{walletAddress}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Recipient address</label>
            <Input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="0x..."
              className="h-12 rounded-xl border-slate-200 bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Amount</label>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                step="0.0001"
                placeholder="0.00"
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
              <p className="mt-2 text-xs text-slate-500">Minimum {currency}: {getMinimumAmount(currency as SupportedToken)} {currency}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-800">Currency</label>
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value as typeof currencyOptions[number])}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-slate-900"
              >
                {currencyOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">Note (optional)</label>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Payment description"
              className="h-12 rounded-xl border-slate-200 bg-slate-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-800">
              Expires in (hours) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="1"
              max="168"
              value={expiresInHours}
              onChange={(event) => setExpiresInHours(Number(event.target.value))}
              placeholder="Enter hours (1-168)"
              className="h-12 rounded-xl border-slate-200 bg-slate-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              Payment expires in {expiresInHours} hour{expiresInHours !== 1 ? 's' : ''} from creation.
              Maximum: 7 days (168 hours).
            </p>
          </div>

          {minimumAmountError && <p className="text-sm text-red-600">{minimumAmountError}</p>}
          {walletError && <p className="text-sm text-red-600">{walletError}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-slate-700">{success}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleCreatePayment}
              disabled={loading || !!minimumAmountError}
              className="h-12 rounded-xl bg-slate-950 font-semibold text-white hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : 'Create Payment'}
            </Button>
            <Button
              onClick={handleCopy}
              disabled={!outputPayload}
              variant="outline"
              className="h-12 rounded-xl border-slate-200"
            >
              <Copy size={16} />
              Copy Payload
            </Button>
          </div>

          {canShare && outputPayload && (
            <Button onClick={handleShare} variant="outline" className="h-12 w-full rounded-xl border-slate-200">
              <Share2 size={16} />
              Share Payload
            </Button>
          )}

          {outputPayload && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Offline payment payload</p>
              <textarea
                readOnly
                value={outputPayload}
                className="min-h-[150px] w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-900"
              />
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-green-800">
              <CheckCircle size={18} />
              <span>Payment object created locally and ready for offline transfer.</span>
            </div>
          )}
        </div>
        </div>
      </Card>
    </div>
  );
};
