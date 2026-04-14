import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { walletAPI, queueAPI, authAPI } from '@/services/apiClient';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import { formatWalletAddress } from '@/lib/wallet';
import { clearSession, getStoredUser } from '@/lib/auth';

interface WalletBalance {
  cUSD: string;
  CELO: string;
  address: string;
}

interface WalletTransaction {
  id: string;
  recipient: string;
  amount: string;
  currency: string;
  status: string;
  timestamp: string;
  txHash?: string;
}

interface QueueStatus {
  pendingCount: number;
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
    description: 'Share your address or QR code',
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
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useOfflineQueue();
  useSyncEngine();

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
    void loadData();
    const interval = setInterval(() => {
      void loadData(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async (showRefreshState = false) => {
    if (showRefreshState) {
      setRefreshing(true);
    }

    try {
      const [balanceRes, txRes, queueRes] = await Promise.all([
        walletAPI.getBalance(),
        walletAPI.getTransactions(5, 0),
        queueAPI.getPending(),
      ]);

      setBalance(balanceRes.data.data);
      setTransactions(txRes.data.data.transactions);
      setQueueStatus(queueRes.data.data);
    } catch (error: any) {
      setBalance({ cUSD: '0', CELO: '0', address: 'Unavailable' });
      setTransactions([]);
      setQueueStatus({ pendingCount: 0 });
      toast.error(error?.message || 'Failed to refresh dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await authAPI.logout();
    clearSession();
    navigate('/auth/login');
  };

  const formatStatusLabel = (status?: string) => (status ? status.replace(/_/g, ' ') : 'unknown');

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) {
      return 'Unknown time';
    }

    const parsedDate = new Date(timestamp);
    return Number.isNaN(parsedDate.getTime()) ? 'Unknown time' : parsedDate.toLocaleString();
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
            <Button variant="ghost" size="sm" onClick={() => void loadData(true)}>
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
              <p className="text-sm uppercase tracking-[0.28em] text-slate-300">Available balance</p>
              {loading ? (
                <div className="mt-4 flex items-center gap-3 text-slate-300">
                  <Loader2 className="animate-spin" />
                  Loading wallet balances...
                </div>
              ) : (
                <>
                  <h2 className="mt-4 font-display text-5xl font-bold">${balance?.cUSD || '0'}</h2>
                  <p className="mt-2 text-sm text-slate-300">≈ {balance?.CELO || '0'} CELO</p>
                  <div className="mt-6 space-y-1 text-sm text-slate-300">
                    <p>{user?.email || 'Wallet user'}</p>
                    <p>{balance?.address ? formatWalletAddress(balance.address, 10, 8) : 'Address unavailable'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Pending sync</p>
                <p className="mt-3 text-3xl font-semibold text-white">{queueStatus?.pendingCount || 0}</p>
                <p className="mt-2 text-sm text-slate-300">Queued transfers waiting for network settlement.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Security</p>
                <div className="mt-3 flex items-center gap-3 text-white">
                  <ShieldCheck className="text-emerald-300" />
                  <span className="font-medium">Google + Passkey auth preserved</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">Wallet actions stay inside the existing authenticated flow.</p>
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
              <CardDescription>Latest wallet transactions and settlement status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <Loader2 className="animate-spin" />
                  Loading activity...
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No transactions yet. Use Send, Receive, or Withdraw to start moving funds.
                </div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-950">{transaction.amount || '0'} {transaction.currency || 'CELO'}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {transaction.recipient ? formatWalletAddress(transaction.recipient, 10, 8) : 'Recipient unavailable'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-slate-700">
                        {formatStatusLabel(transaction.status)}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{formatTimestamp(transaction.timestamp)}</p>
                    </div>
                  </div>
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
                <p className="mt-2">One wallet address can receive both CELO and cUSD on the Celo network.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Offline capture</p>
                <p className="mt-2">Payments can be staged locally and synchronized when the device comes back online.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Withdrawal ready</p>
                <p className="mt-2">Move funds to external wallets or exchange deposit addresses from the new withdraw flow.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
