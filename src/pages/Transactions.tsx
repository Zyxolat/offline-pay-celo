import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { walletAPI } from '@/services/apiClient';
import { copyTextToClipboard, formatWalletAddress } from '@/lib/wallet';

export const TransactionsPage = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    void loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const res = await walletAPI.getTransactions(100, 0);
      setTransactions(Array.isArray(res.data?.data?.transactions) ? res.data.data.transactions : []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = transactions.filter((tx) => filter === 'all' || tx?.status === filter);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'pending_sync':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Unknown date';
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? 'Unknown date' : parsedDate.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="flex-1 text-center font-display text-xl font-semibold">Transactions</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['all', 'confirmed', 'pending', 'failed'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize whitespace-nowrap"
            >
              {f === 'pending' ? 'Pending Sync' : f}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={40} className="animate-spin mx-auto text-primary" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(tx => (
              <Card
                key={tx.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/transactions/${tx.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-semibold text-foreground">Sent {tx.currency || 'CELO'}</p>
                      <Badge variant="outline" className={getStatusColor(tx?.status)}>
                        {tx?.status === 'pending_sync' ? 'Queued' : tx?.status || 'unknown'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tx?.recipient ? formatWalletAddress(tx.recipient, 14, 10) : 'Recipient unavailable'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(tx?.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">-{tx?.amount || '0'}</p>
                    <p className="text-xs text-muted-foreground">Confirmations: {tx?.confirmations ?? 0}</p>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground ml-4" />
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No transactions found</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export const TransactionDetailPage = () => {
  const navigate = useNavigate();
  const { txId } = useParams<{ txId: string }>();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDetail();
  }, [txId]);

  const loadDetail = async () => {
    if (!txId) {
      setLoading(false);
      return;
    }

    try {
      // In production, would call API
      const allRes = await walletAPI.getTransactions(1000, 0);
      const allTransactions = Array.isArray(allRes.data?.data?.transactions) ? allRes.data.data.transactions : [];
      const found = allTransactions.find((t: any) => t?.id === txId);
      setTx(found);
    } catch (error) {
      console.error('Error loading detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text?: string) => {
    if (!text) {
      return;
    }

    try {
      await copyTextToClipboard(text);
      toast.success('Copied to clipboard.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to copy value.');
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) {
      return 'Unknown date';
    }

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? 'Unknown date' : parsedDate.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="flex-1 text-center font-display text-xl font-semibold">Transaction Details</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-md mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <Loader2 size={40} className="animate-spin mx-auto text-primary" />
          </div>
        ) : tx ? (
          <div className="space-y-4">
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="text-3xl font-bold text-foreground">{tx.amount || '0'} {tx.currency || 'CELO'}</p>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge>{tx.status || 'unknown'}</Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted p-2 rounded flex-1 truncate">{tx.recipient || 'Recipient unavailable'}</code>
                    <Button size="sm" variant="ghost" onClick={() => void handleCopy(tx.recipient)}>
                      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2'%3E%3C/path%3E%3Cpath d='M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z'%3E%3C/path%3E%3C/svg%3E" alt="copy" />
                    </Button>
                  </div>
                </div>

                {tx.txHash && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted p-2 rounded flex-1 truncate">{tx.txHash}</code>
                      <Button size="sm" variant="ghost" onClick={() => void handleCopy(tx.txHash)}>
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="text-sm">{formatDateTime(tx.timestamp)}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Confirmations</p>
                  <p className="text-sm">{tx.confirmations ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Transaction not found</p>
          </Card>
        )}
      </div>
    </div>
  );
};
