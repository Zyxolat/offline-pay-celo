import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdminStats } from '@/components/admin/AdminStats';
import { DataTable } from '@/components/admin/DataTable';
import { RecentActivity } from '@/components/admin/RecentActivity';
import { useAdminStats } from '@/hooks/useAdminStats';
import { adminAPI } from '@/services/adminClient';
import { clearSession, getStoredUser, isAdminUser, storeSession } from '@/lib/auth';

const formatShortValue = (value?: string | null, head = 6, tail = 4) =>
  value ? `${value.slice(0, head)}...${value.slice(-tail)}` : '-';

const formatDateValue = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? '-' : parsedDate.toLocaleDateString();
};

const formatDateTimeValue = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? '-' : parsedDate.toLocaleString();
};

const formatCurrencyValue = (value: unknown) => {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : '0.00';
};

export const AdminDashboard = () => {
  const [email, setEmail] = useState('admin@offlinepay.local');
  const [password, setPassword] = useState('admin123');
  const [authError, setAuthError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { stats, loading, error } = useAdminStats(isAdminAuthed);

  useEffect(() => {
    const user = getStoredUser();
    setHasSession(Boolean(user));
    if (!user) {
      setIsAdminAuthed(false);
      return;
    }

    setIsAdminAuthed(isAdminUser(user));
  }, []);

  const handleAdminLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoggingIn(true);
    setAuthError('');

    try {
      const response = await adminAPI.login(email, password);
      const result = response.data.data;

      storeSession(result.sessionToken, {
        ...result.admin,
        authMethod: 'admin',
      });

      setHasSession(true);
      setIsAdminAuthed(true);
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Admin login failed');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsAdminAuthed(false);
    setHasSession(false);
  };

  if (!isAdminAuthed && hasSession) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!isAdminAuthed) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="mx-auto max-w-md pt-12">
          <Card className="p-6">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Admin Login</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Sign in to access `/admin`.
            </p>

            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-4" onSubmit={handleAdminLogin}>
              <div>
                <label className="mb-2 block text-sm font-medium">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={loggingIn} type="submit">
                {loggingIn ? 'Signing in...' : 'Sign in as admin'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card className="p-6 text-center">
          <p className="mb-4 text-destructive">{error}</p>
          <Button onClick={handleLogout} variant="outline">
            Clear session
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Users, transactions, wallet balances, and stats</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse">
                    <div className="mb-2 h-4 rounded bg-muted"></div>
                    <div className="mb-2 h-8 rounded bg-muted"></div>
                    <div className="h-3 rounded bg-muted"></div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <AdminStats stats={stats} />
            <RecentActivity stats={stats} />

            <div className="mt-8">
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="wallets">Wallets</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                  <DataTable
                    title="User Management"
                    endpoint="users"
                    enabled={isAdminAuthed}
                    columns={[
                      { key: 'email', label: 'Email' },
                      {
                        key: 'wallet_address',
                        label: 'Wallet',
                        render: (value) => formatShortValue(value),
                      },
                      {
                        key: 'created_at',
                        label: 'Joined',
                        render: (value) => formatDateValue(value),
                      },
                      { key: 'transaction_count', label: 'Transactions' },
                      {
                        key: 'total_volume',
                        label: 'Volume',
                        render: (value) => formatCurrencyValue(value),
                      },
                    ]}
                  />
                </TabsContent>

                <TabsContent value="transactions" className="mt-6">
                  <DataTable
                    title="Transaction History"
                    endpoint="transactions"
                    enabled={isAdminAuthed}
                    columns={[
                      { key: 'user_email', label: 'User' },
                      {
                        key: 'recipient',
                        label: 'Recipient',
                        render: (value) => formatShortValue(value),
                      },
                      {
                        key: 'amount',
                        label: 'Amount',
                        render: (value, row) => `${value ?? '0'} ${row.currency ?? 'CELO'}`,
                      },
                      { key: 'status', label: 'Status' },
                      {
                        key: 'created_at',
                        label: 'Date',
                        render: (value) => formatDateValue(value),
                      },
                    ]}
                  />
                </TabsContent>

                <TabsContent value="wallets" className="mt-6">
                  <DataTable
                    title="Wallet Balances"
                    endpoint="wallets"
                    enabled={isAdminAuthed}
                    columns={[
                      { key: 'user_email', label: 'User' },
                      { key: 'address', label: 'Address' },
                      { key: 'celo_balance', label: 'CELO' },
                      { key: 'cusd_balance', label: 'cUSD' },
                      {
                        key: 'updated_at',
                        label: 'Updated',
                        render: (value) => formatDateTimeValue(value),
                      },
                    ]}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
