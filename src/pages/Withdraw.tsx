import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Landmark, Loader2, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { walletAPI } from '@/services/apiClient';
import { getMinimumAmount, getMinimumAmountError, type SupportedToken, SUPPORTED_TOKENS } from '@/lib/wallet';

interface WalletBalance {
  cUSD: string;
  CELO: string;
  address: string;
  lastSync: string;
}

interface WithdrawResult {
  transactionId: string;
  txHash: string;
  sourceAddress: string;
  destinationAddress: string;
  token: SupportedToken;
  amount: string;
  status: string;
}

export const WithdrawPage = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [token, setToken] = useState<SupportedToken>('CELO');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawResult | null>(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const response = await walletAPI.getBalance();
        setBalance(response.data.data);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to load wallet balance.');
      } finally {
        setLoadingBalance(false);
      }
    };

    loadBalance();
  }, []);

  const minimumAmountError = useMemo(() => getMinimumAmountError(amount, token), [amount, token]);
  const amountNumber = Number(amount);

  const submitDisabled =
    loading ||
    !destinationAddress ||
    !amount ||
    !!minimumAmountError ||
    Number.isNaN(amountNumber) ||
    amountNumber <= 0;

  const handleWithdraw = async () => {
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
      const response = await walletAPI.withdraw(destinationAddress, token, amount);
      setWithdrawalResult(response.data.data);
      toast.success(`${amount} ${token} withdrawal submitted.`);
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
              Withdraw CELO or cUSD to exchanges like MEXC, Bitget, Binance, or any compatible external wallet address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Wallet address</p>
                <p className="mt-2 break-all font-mono text-sm text-slate-900">
                  {loadingBalance ? 'Loading...' : balance?.address || 'Unavailable'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Available balance</p>
                {loadingBalance ? (
                  <p className="mt-2 text-sm text-slate-600">Loading balances...</p>
                ) : (
                  <div className="mt-2 space-y-1 text-sm text-slate-900">
                    <p>{balance?.CELO || '0'} CELO</p>
                    <p>{balance?.cUSD || '0'} cUSD</p>
                  </div>
                )}
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Token</label>
                <select
                  value={token}
                  onChange={(event) => setToken(event.target.value as SupportedToken)}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
                >
                  {SUPPORTED_TOKENS.map((supportedToken) => (
                    <option key={supportedToken} value={supportedToken}>
                      {supportedToken}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-800">Amount</label>
                <Input
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder={`Minimum ${getMinimumAmount(token)}`}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <Landmark size={16} />
                Important
              </div>
              <p>Minimum {token} withdrawal is {getMinimumAmount(token)} {token}. Double-check the destination network before submitting.</p>
            </div>

            {minimumAmountError && <p className="text-sm text-red-600">{minimumAmountError}</p>}

            <Button
              onClick={handleWithdraw}
              disabled={submitDisabled}
              className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
            >
              {loading ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}
              Withdraw {token}
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
              <p><span className="font-semibold">Amount:</span> {withdrawalResult.amount} {withdrawalResult.token}</p>
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
