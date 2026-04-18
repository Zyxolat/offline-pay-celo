import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  CreditCard,
  Download,
  Loader2,
  LogOut,
  RefreshCcw,
  Send,
  ShieldCheck,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import TransactionListItem from '@/components/payments/TransactionListItem';
import WalletCard from '@/components/payments/WalletCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { authAPI } from '@/services/apiClient';
import { clearSession, getStoredUser } from '@/lib/auth';
import { formatWalletAddress } from '@/lib/wallet';
import { useTimeLockPayments } from '@/hooks/useTimeLockPayments';

interface WalletTransaction {
  id: string;
  recipient: string;
  amount: string;
  currency: string;
  status: string;
  timestamp: string;
}

interface SessionUser {
  email?: string;
}

const quickActions = [
  {
    label: 'Send',
    description: 'Create a timed payment payload',
    icon: Send,
    href: '/send',
    className: 'bg-slate-950 text-white hover:bg-slate-800',
  },
  {
    label: 'Receive',
    description: 'Share your wallet address',
    icon: Download,
    href: '/receive',
    className: 'bg-white text-slate-950 border border-slate-200 hover:bg-slate-50',
  },
  {
    label: 'Withdraw',
    description: 'Move funds to an exchange wallet',
    icon: ArrowUpRight,
    href: '/withdraw',
    className: 'bg-emerald-500 text-white hover:bg-emerald-400',
  },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { account, walletBalance, payments, loading, connectWallet, refresh } = useTimeLockPayments();

  const recentTransactions = useMemo<WalletTransaction[]>(
    () =>
      payments.slice(0, 5).map((payment) => ({
        id: String(payment.id),
        recipient: payment.recipient,
        amount: payment.amount,
        currency: 'CELO',
        status: payment.status,
        timestamp: new Date(payment.deadline * 1000).toISOString(),
      })),
    [payments],
  );

  const totalLocked = useMemo(
    () => payments.filter((payment) => payment.status === 'locked' || payment.status === 'ready').reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  );

  const claimableCount = useMemo(
    () => payments.filter((payment) => payment.canAccept).length,
    [payments],
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setUser(getStoredUser());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!account) {
      return;
    }

    void refresh(account);
    const interval = window.setInterval(() => {
      void refresh(account);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [account, refresh]);

  const loadData = async () => {
    setRefreshing(true);

    try {
      const activeAccount = account || await connectWallet();
      await refresh(activeAccount);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to refresh dashboard data.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await authAPI.logout();
    clearSession();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_52%,_#f8fafc_100%)] pb-20">
      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-950">
              Offline<span className="text-emerald-500">Pay</span>
            </h1>
            <p className="text-xs text-slate-500">Wallet dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <Button variant="ghost" size="sm" onClick={() => void loadData()}>
              {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCcw size={16} />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="grid gap-8 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(30,41,59,0.98))] p-6 text-white lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
            <div>
              <div className="mb-5 inline-flex rounded-2xl bg-white/10 p-3 text-emerald-200">
                <Wallet size={22} />
              </div>
              <WalletCard
                address={account || 'Connect your wallet'}
                balance={`${walletBalance || '0'} CELO`}
                subtitle={loading ? 'Loading wallet balances...' : `${account ? formatWalletAddress(account, 10, 8) : 'Connect wallet'} • ${user?.email || 'Wallet user'}`}
                loading={loading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Locked in escrow</p>
                <p className="mt-3 text-3xl font-semibold text-white">{totalLocked.toFixed(4)} CELO</p>
                <p className="mt-2 text-sm text-slate-300">Active delayed-settlement payments currently held by the contract.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Ready to claim</p>
                <div className="mt-3 flex items-center gap-3 text-white">
                  <ShieldCheck className="text-emerald-300" />
                  <span className="font-medium">{claimableCount} incoming payment{claimableCount === 1 ? '' : 's'} available</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">Claimable transfers appear here as soon as the intended recipient wallet is connected.</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {quickActions.map(({ label, description, icon: Icon, href, className }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              className={`rounded-3xl p-5 text-left shadow-lg transition hover:-translate-y-0.5 ${className}`}
            >
              <div className="mb-4 inline-flex rounded-2xl bg-black/10 p-3">
                <Icon size={20} />
              </div>
              <p className="text-xl font-semibold">{label}</p>
              <p className="mt-2 text-sm opacity-80">{description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="text-slate-950">Recent activity</CardTitle>
              <CardDescription>Latest contract payments and settlement status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <Loader2 className="animate-spin" />
                  Loading activity...
                </div>
              ) : recentTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No transactions yet. Use Send, Receive, or Withdraw to start moving funds.
                </div>
              ) : (
                recentTransactions.map((transaction) => (
                  <TransactionListItem
                    key={transaction.id}
                    amount={transaction.amount || '0'}
                    currency={transaction.currency || 'CELO'}
                    recipient={transaction.recipient}
                    status={transaction.status}
                    timestamp={transaction.timestamp}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-slate-950">
                <CreditCard className="text-emerald-600" size={20} />
                Wallet highlights
              </CardTitle>
              <CardDescription>Key details for fast day-to-day use.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Receive assets</p>
                <p className="mt-2">Use the same Celo Mainnet wallet to receive direct CELO transfers and OfflinePay settlements.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Offline capture</p>
                <p className="mt-2">OfflinePay captures payment intent in unstable environments, then settles on-chain once connectivity returns.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Withdrawal ready</p>
                <p className="mt-2">Move funds to external wallets or exchange deposit addresses using the CELO withdrawal flow.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
