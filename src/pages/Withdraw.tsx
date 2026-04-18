import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Landmark, Loader2, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { getMinimumAmount, getMinimumAmountError } from '@/lib/wallet';
import { useTimeLockPayments } from '@/hooks/useTimeLockPayments';
import { estimateSendCeloGas, sendCelo } from '@/utils/sendCelo';

interface WithdrawResult {
  txHash: string;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
}

export const WithdrawPage = () => {
  const navigate = useNavigate();
  const { account, walletBalance, connectWallet, connecting } = useTimeLockPayments();
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('');
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawResult | null>(null);

  useEffect(() => {
    if (!account || !destinationAddress || !amount || !ethers.isAddress(destinationAddress) || Number(amount) <= 0) {
      setGasEstimate('');
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setEstimatingGas(true);

      try {
        const estimate = await estimateSendCeloGas(destinationAddress, amount);
        setGasEstimate(estimate.feeCelo);
      } catch {
        setGasEstimate('');
      } finally {
        setEstimatingGas(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [account, amount, destinationAddress]);

  const minimumAmountError = useMemo(() => getMinimumAmountError(amount, 'CELO'), [amount]);
  const amountNumber = Number(amount);

  const submitDisabled =
    !account ||
    loading ||
    !destinationAddress ||
    !amount ||
    !!minimumAmountError ||
    Number.isNaN(amountNumber) ||
    amountNumber <= 0;

  const handleWithdraw = async () => {
    if (!account) {
      try {
        await connectWallet();
      } catch (error: any) {
        toast.error(error?.message || 'Connect your wallet to continue.');
        return;
      }
    }

    if (!ethers.isAddress(destinationAddress)) {
      toast.error('Enter a valid destination wallet address.');
      return;
    }

    if (minimumAmountError) {
      toast.error(minimumAmountError);
      return;
    }

    setLoading(true);
    setWithdrawalResult(null);

    try {
      const response = await sendCelo(destinationAddress, amount);
      setWithdrawalResult({
        txHash: response.hash,
        sourceAddress: account,
        destinationAddress,
        amount,
      });
      toast.success(`${amount} CELO withdrawal submitted.`);
      setAmount('');
      setDestinationAddress('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to submit withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_45%,_#f8fafc_100%)] pb-20">
      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="flex-1 text-center font-display text-xl font-semibold text-slate-950">Withdraw</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <CardHeader className="bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.98))] text-white">
            <div className="mb-4 inline-flex w-fit rounded-2xl bg-white/10 p-3 text-emerald-200">
              <WalletCards size={22} />
            </div>
            <CardTitle className="text-3xl">Move funds to an external wallet</CardTitle>
            <CardDescription className="max-w-2xl text-slate-200">
              Withdraw CELO to exchanges like Binance, OKX, Coinbase, or any compatible external Celo wallet address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Wallet address</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-900">
                  {connecting ? 'Connecting...' : account || 'Connect your Celo Mainnet wallet'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-black">Available balance</p>
                <div className="mt-2 space-y-1 text-sm text-slate-900">
                  <p>{walletBalance || '0'} CELO</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Destination address</label>
              <Input
                value={destinationAddress}
                onChange={(event) => setDestinationAddress(event.target.value)}
                placeholder="0x..."
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
              <p className="text-xs text-slate-500">Use the exact address provided by your exchange or external wallet.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Amount</label>
              <Input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                step="0.0001"
                placeholder={`Minimum ${getMinimumAmount('CELO')}`}
                className="h-12 rounded-xl border-slate-200 bg-slate-50"
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Landmark size={16} />
                Important
              </div>
              <p>Minimum CELO withdrawal is {getMinimumAmount('CELO')} CELO. Confirm the destination deposit address supports the Celo network before submitting.</p>
            </div>

            {minimumAmountError && <p className="text-sm text-red-600">{minimumAmountError}</p>}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-900">Transfer summary</p>
              <p className="mt-2">Destination: {destinationAddress || 'Waiting for destination address'}</p>
              <p className="mt-1">Amount: {amount || '0'} CELO</p>
              <p className="mt-1 flex items-center gap-2">
                {estimatingGas ? <Loader2 size={14} className="animate-spin" /> : null}
                Estimated gas fee: {gasEstimate ? `${gasEstimate} CELO` : 'Enter a valid address and amount to estimate'}
              </p>
            </div>

            <Button
              onClick={handleWithdraw}
              disabled={submitDisabled}
              className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
              Withdraw CELO
            </Button>
          </CardContent>
        </Card>

        {withdrawalResult && (
          <Card className="border-emerald-200 bg-emerald-50 shadow-lg shadow-emerald-100/80">
            <CardHeader>
              <CardTitle className="text-emerald-950">Withdrawal submitted</CardTitle>
              <CardDescription className="text-emerald-800">
                The transaction has been sent to the network and recorded in your wallet history.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-emerald-950">
              <p><span className="font-semibold">Amount:</span> {withdrawalResult.amount} CELO</p>
              <p><span className="font-semibold">Destination:</span> {withdrawalResult.destinationAddress}</p>
              <p><span className="font-semibold">Tx hash:</span> {withdrawalResult.txHash}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WithdrawPage;
