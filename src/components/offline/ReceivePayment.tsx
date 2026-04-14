import { useState } from 'react';
import { ArrowRight, Copy, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { useOfflinePayments } from '@/hooks/useOfflinePayments';
import { copyTextToClipboard } from '@/lib/wallet';

export const ReceivePayment = () => {
  const { error: walletError, receivePayment, walletAddress } = useOfflinePayments();
  const [payload, setPayload] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReceive = async () => {
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      await receivePayment(payload);
      setStatusMessage('Payment received and stored as pending. Accept it from the pending list.');
      setPayload('');
      toast.success('Offline payment payload received.');
    } catch (err: any) {
      setError(err?.message || 'Failed to receive offline payment.');
      toast.error(err?.message || 'Failed to receive offline payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) {
      return;
    }

    try {
      await copyTextToClipboard(walletAddress);
      setStatusMessage('Recipient address copied to clipboard.');
      toast.success('Address copied!');
    } catch (error: any) {
      setError(error?.message || 'Unable to copy address.');
      toast.error(error?.message || 'Unable to copy address.');
    }
  };

  return (
    <Card className="space-y-4 border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Offline recipient wallet</p>
        <p className="mt-2 break-all rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900">{walletAddress}</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-800">Paste incoming payment payload</p>
        <textarea
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
          placeholder="Paste the offline payment JSON payload here"
          className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-900"
        />
      </div>

      {walletError && <p className="text-sm text-red-600">{walletError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {statusMessage && <p className="text-sm text-slate-700">{statusMessage}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleReceive} disabled={loading || !payload} className="h-12 flex-1 rounded-xl bg-slate-950 text-white hover:bg-slate-800">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight size={16} />}
          Receive Payment
        </Button>
        <Button onClick={handleCopyAddress} variant="outline" className="h-12 flex-1 rounded-xl border-slate-200">
          <Copy size={16} />
          Copy Address
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p>After receiving a payment payload, confirm it in your pending list before it expires.</p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-3 text-green-900">
          <CheckCircle size={18} />
          <span>Payment payload accepted locally.</span>
        </div>
      )}
    </Card>
  );
};
