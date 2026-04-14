import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export const RecentActivity = ({ stats }: { stats: any }) => {
  if (!stats) {
    return (
      <div className="admin-activity-grid">
        <Card className="admin-activity-card">
          <p className="admin-activity__meta">Loading recent activity...</p>
        </Card>
      </div>
    );
  }

  const formatAddress = (address?: string) => {
    if (!address) {
      return 'Address unavailable';
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'Unknown date';
    }

    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? 'Unknown date' : format(parsedDate, 'MMM dd, HH:mm');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Users */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <User size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">Recent Users</h3>
        </div>
        <div className="space-y-3">
          {stats.recentUsers?.slice(0, 5).map((user: any) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">{formatAddress(user.wallet_address)}</p>
              </div>
              <Badge variant="outline">{formatDate(user.created_at)}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={20} className="text-green-600" />
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
        </div>
        <div className="space-y-3">
          {stats.recentTransactions?.slice(0, 5).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{tx.amount} {tx.currency}</p>
                <p className="text-sm text-muted-foreground">
                  {tx.user_email} → {formatAddress(tx.recipient)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={tx.status === 'confirmed' ? 'default' : tx.status === 'submitted' ? 'secondary' : 'destructive'}
                >
                  {tx.status}
                </Badge>
                {tx.tx_hash && (
                  <a
                    href={`https://explorer.celo.org/tx/${tx.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
