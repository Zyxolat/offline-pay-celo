import { Card } from '@/components/ui/card';
import { Users, DollarSign, Wallet, CheckCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}

const StatCard = ({ title, value, icon, trend, color = 'text-primary' }: StatCardProps) => (
  <Card className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </div>
      <div className={`p-3 rounded-full bg-muted ${color}`}>
        {icon}
      </div>
    </div>
  </Card>
);

export const AdminStats = ({ stats }: { stats: any }) => {
  if (!stats) {
    return (
      <div className="admin-stats-grid">
        <Card className="admin-stat-card">
          <div className="admin-stat-card__label">Loading admin statistics...</div>
        </Card>
      </div>
    );
  }

  const totalUsers = stats?.users?.total_users ?? 0;
  const newUsersToday = stats?.users?.new_users_24h ?? 0;
  const totalTransactions = stats?.transactions?.total_transactions ?? 0;
  const transactionsToday = stats?.transactions?.transactions_24h ?? 0;
  const totalWallets = stats?.wallets?.total_wallets ?? 0;
  const totalVolume = Number(stats?.transactions?.total_volume ?? 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Total Users"
        value={totalUsers}
        icon={<Users size={24} />}
        trend={`+${newUsersToday} today`}
      />
      <StatCard
        title="Total Transactions"
        value={totalTransactions}
        icon={<DollarSign size={24} />}
        trend={`+${transactionsToday} today`}
        color="text-green-600"
      />
      <StatCard
        title="Wallets"
        value={totalWallets}
        icon={<Wallet size={24} />}
        color="text-amber-600"
      />
      <StatCard
        title="Total Volume"
        value={`$${Number.isFinite(totalVolume) ? totalVolume.toFixed(2) : '0.00'}`}
        icon={<CheckCircle size={24} />}
        color="text-blue-600"
      />
    </div>
  );
};
