import { useMemo } from 'react';
import { CheckCircle2, Clock3, RefreshCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOfflinePayments } from '@/hooks/useOfflinePayments';

function formatCountdown(expiresAt: number) {
  const remainingMs = Math.max(0, expiresAt - Date.now());
  const seconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const leftoverSeconds = seconds % 60;
  return `${hours}h ${minutes}m ${leftoverSeconds}s`;
}

export const PendingList = () => {
  const { pendingSent, pendingReceived, expired, acceptPayment, error, refresh } = useOfflinePayments();

  const pendingSentCount = pendingSent.length;
  const pendingReceivedCount = pendingReceived.length;

  const sortedPendingSent = useMemo(
    () => [...pendingSent].sort((a, b) => a.expiresAt - b.expiresAt),
    [pendingSent],
  );

  const sortedPendingReceived = useMemo(
    () => [...pendingReceived].sort((a, b) => a.expiresAt - b.expiresAt),
    [pendingReceived],
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Pending payments</h3>
            <p className="text-sm text-muted-foreground">Manage offline payments before they expire.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="border-border">
            <RefreshCcw size={16} />
            Refresh
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <Clock3 size={18} />
          <span>{pendingSentCount} pending sent</span>
        </div>

        {sortedPendingSent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending outgoing payments right now.</p>
        ) : (
          <div className="space-y-3">
            {sortedPendingSent.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">To {payment.to.slice(0, 12)}...</p>
                    <p className="text-xs text-muted-foreground">{payment.currency} {payment.amount}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{payment.status}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  <p>Nonce: {payment.nonce}</p>
                  <p>Expires in: {formatCountdown(payment.expiresAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <CheckCircle2 size={18} />
          <span>{pendingReceivedCount} pending received</span>
        </div>

        {sortedPendingReceived.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending incoming payments. Paste payload to receive one.</p>
        ) : (
          <div className="space-y-3">
            {sortedPendingReceived.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">From {payment.from.slice(0, 12)}...</p>
                    <p className="text-xs text-muted-foreground">{payment.currency} {payment.amount}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatCountdown(payment.expiresAt)}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  <p>Nonce: {payment.nonce}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptPayment(payment.id)}
                      className="h-9 rounded-lg"
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3 text-sm font-medium text-foreground">
          <XCircle size={18} />
          <span>{expired.length} expired transactions</span>
        </div>

        {expired.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expired offline payments.</p>
        ) : (
          <div className="space-y-3">
            {expired.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{payment.currency} {payment.amount}</p>
                  <span className="text-xs uppercase tracking-wide text-destructive">Expired</span>
                </div>
                <p className="text-xs text-muted-foreground">{payment.from} → {payment.to}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
