# OfflinePay Implementation Guide

## Quick Start

This guide maps UI components to backend API endpoints for implementation.

---

## Phase 1: Core Setup

### 1.1 Backend Setup
```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv pg jsonwebtoken @simplewebauthn/server ethers
npm install --save-dev typescript ts-node @types/express @types/node
```

### 1.2 Frontend Setup
```bash
# Already using Vite + React
npm install axios zustand react-query
# For QR codes
npm install qrcode.react
# For camera access
npm install qr-scanner
```

### 1.3 Environment Configuration
Create `.env` files in both frontend and server directories.

---

## Phase 2: Authentication Flow

### 2.1 Signup Flow (Frontend)
**Location**: `src/pages/Auth/Signup.tsx`

**UI Flow**:
1. User clicks "Create Wallet" on landing
2. InfoModal shows (already exists)
3. On "Create Wallet" click:
   - GET `/api/auth/register/options` → Get challenge
   - Call WebAuthn `navigator.credentials.create()`
   - POST `/api/auth/register/verify` → Register credential
   - Redirect to Dashboard

**Component Structure**:
```tsx
export const Signup = () => {
  const handleCreateWallet = async () => {
    // 1. Get options
    const options = await fetch('/api/auth/register/options').then(r => r.json());
    
    // 2. Create credential
    const credential = await navigator.credentials.create(options);
    
    // 3. Verify & register
    const result = await fetch('/api/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify(credential)
    }).then(r => r.json());
    
    // 4. Store session & redirect
    sessionStorage.setItem('sessionToken', result.sessionToken);
    navigate('/dashboard');
  };
};
```

---

### 2.2 Login Flow (Frontend)
**Location**: `src/pages/Auth/Login.tsx`

**UI Flow**:
1. User navigates to `/auth/login`
2. Click "Login with Passkey"
3. GET `/api/auth/login/options` → Get challenge
4. Call WebAuthn `navigator.credentials.get()`
5. POST `/api/auth/login/verify` → Verify & get session
6. Redirect to Dashboard

---

## Phase 3: Wallet Dashboard

### 3.1 Dashboard Page
**Location**: `src/pages/Dashboard.tsx`

**API Integration**:
```tsx
export const Dashboard = () => {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const sessionToken = sessionStorage.getItem('sessionToken');

  useEffect(() => {
    // Get balance
    fetch('/api/wallet/balance', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(r => r.json())
    .then(data => setBalance(data));

    // Get recent transactions
    fetch('/api/wallet/transactions?limit=5', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(r => r.json())
    .then(data => setTransactions(data.transactions));
  }, []);

  return (
    <div>
      {/* Balance Card */}
      <BalanceCard balance={balance} />
      
      {/* Quick Actions: Send, Receive, Scan */}
      <QuickActions />
      
      {/* Recent Transactions */}
      <TransactionList transactions={transactions} />
      
      {/* Offline Queue Status */}
      <OfflineQueueStatus />
    </div>
  );
};
```

---

## Phase 4: Send Payment

### 4.1 Send Payment Flow
**Location**: `src/pages/Send.tsx` or `src/components/SendPaymentFlow.tsx`

**Step 1: Input Details**
```tsx
const SendPayment = () => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleNext = () => {
    // Validate inputs
    // Move to confirmation
  };
};
```

**Step 2: Payment Confirmation + Auth**
```tsx
const PaymentConfirmation = ({ recipient, amount }) => {
  const handleConfirm = async () => {
    const sessionToken = sessionStorage.getItem('sessionToken');

    // 1. Get payment authorization challenge
    const challenge = await fetch('/api/payments/authorize/challenge', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify({ recipient, amount, currency: 'cUSD', note })
    }).then(r => r.json());

    // 2. User authorizes with biometric
    const credential = await navigator.credentials.get({
      publicKey: challenge
    });

    // 3. Verify authorization
    const auth = await fetch('/api/payments/authorize/verify', {
      method: 'POST',
      body: JSON.stringify({
        paymentId: challenge.paymentId,
        ...credential
      })
    }).then(r => r.json());

    // 4. Submit payment (sign transaction locally, then submit)
    const signedTx = signTransaction(...);  // Use ethers.js
    const result = await fetch('/api/payments/submit', {
      method: 'POST',
      body: JSON.stringify({
        paymentId: challenge.paymentId,
        signedTx,
        offline: !navigator.onLine
      })
    }).then(r => r.json());

    // 5. Show success
    showSuccess(result.txHash);
  };
};
```

---

## Phase 5: Transaction History

### 5.1 Transactions Page
**Location**: `src/pages/Transactions.tsx`

**API Integration**:
```tsx
export const Transactions = () => {
  const [txs, setTxs] = useState([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    fetch(`/api/wallet/transactions?limit=20&offset=${page * 20}`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(r => r.json())
    .then(data => setTxs(data.transactions));
  }, [page]);

  return (
    <div>
      <TransactionList transactions={txs} />
      <Pagination page={page} onPageChange={setPage} />
    </div>
  );
};
```

### 5.2 Transaction Details Modal
**Location**: `src/components/TransactionDetail.tsx`

```tsx
export const TransactionDetail = ({ txId }) => {
  const [tx, setTx] = useState(null);

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    fetch(`/api/transactions/${txId}`, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(r => r.json())
    .then(setTx);
  }, [txId]);

  return tx ? (
    <Dialog>
      <TransactionInfo tx={tx} />
      <a href={`https://celoscan.io/tx/${tx.txHash}`} target="_blank">
        View on Explorer
      </a>
    </Dialog>
  ) : <Skeleton />;
};
```

---

## Phase 6: Offline Support

### 6.1 Offline Queue Service
**Location**: `src/services/queueService.ts`

```typescript
export const queueService = {
  async addToQueue(transaction: Transaction) {
    const sessionToken = sessionStorage.getItem('sessionToken');
    return fetch('/api/queue/add', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
      body: JSON.stringify(transaction)
    }).then(r => r.json());
  },

  async getPendingQueue() {
    const sessionToken = sessionStorage.getItem('sessionToken');
    return fetch('/api/queue/pending', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    }).then(r => r.json());
  },

  async syncQueue() {
    const sessionToken = sessionStorage.getItem('sessionToken');
    return fetch('/api/queue/sync', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    }).then(r => r.json());
  }
};
```

### 6.2 Offline Detection
**Location**: `src/hooks/useOfflineQueue.ts`

```typescript
export const useOfflineQueue = () => {
  useEffect(() => {
    const onOnline = () => {
      queueService.syncQueue();
    };
    
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);
};
```

---

## Phase 7: QR Code Features

### 7.1 QR Code Scanner
**Location**: `src/pages/Scan.tsx`

```tsx
import QrScanner from 'qr-scanner';

export const Scan = () => {
  const videoRef = useRef(null);

  useEffect(() => {
    const scanner = new QrScanner(
      videoRef.current,
      result => {
        // Parse Celo address from QR
        const address = result.data;
        navigate('/send', { state: { recipient: address } });
      }
    );
    scanner.start();
    return () => scanner.stop();
  }, []);

  return <video ref={videoRef} />;
};
```

### 7.2 QR Code Display
**Location**: `src/pages/Receive.tsx`

```tsx
import QRCode from 'qrcode.react';

export const Receive = () => {
  const [walletAddress, setWalletAddress] = useState('');

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('sessionToken');
    fetch('/api/wallet/address', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    })
    .then(r => r.json())
    .then(data => setWalletAddress(data.address));
  }, []);

  return (
    <div>
      <QRCode value={walletAddress} size={256} />
      <CopyButton text={walletAddress} />
    </div>
  );
};
```

---

## API Client Setup

### Using Axios with Interceptors
**Location**: `src/services/api.ts`

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Add auth token to all requests
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('sessionToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('sessionToken');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Routing Structure

**Location**: `src/App.tsx`

```tsx
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import Receive from './pages/Receive';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import NotFound from './pages/NotFound';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth/*" element={<Auth />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/send" element={<ProtectedRoute><Send /></ProtectedRoute>} />
            <Route path="/receive" element={<ProtectedRoute><Receive /></ProtectedRoute>} />
            <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Catch All */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};
```

---

## Implementation Checklist

### Backend
- [ ] Setup Express server structure
- [ ] Configure PostgreSQL connection
- [ ] Implement auth endpoints (register, login)
- [ ] Implement wallet endpoints (balance, address)
- [ ] Implement payment endpoints (authorize, submit)
- [ ] Implement queue endpoints (add, pending, sync)
- [ ] Integrate Celo SDK for blockchain calls
- [ ] Error handling & logging
- [ ] Rate limiting & security middleware
- [ ] CORS configuration

### Frontend
- [ ] Create auth pages (signup, login)
- [ ] Create dashboard with balance display
- [ ] Create send payment flow (form → confirmation → auth)
- [ ] Create transaction history & details
- [ ] Create receive page with QR code
- [ ] Create QR scanner page
- [ ] Create settings page
- [ ] Add offline detection & queue sync
- [ ] Add error boundaries
- [ ] Add loading states & skeletons

### Testing
- [ ] Test auth flow end-to-end
- [ ] Test payment flow with testnet
- [ ] Test offline queue functionality
- [ ] Test WebAuthn on different devices
- [ ] Test on mobile (both iOS & Android)

---

## Key Libraries Reference

| Purpose | Library | Usage |
|---------|---------|-------|
| Auth | @simplewebauthn | WebAuthn challenge/verify |
| Blockchain | ethers.js or web3.js | Celo transactions |
| QR Scanner | qr-scanner | Camera-based QR reading |
| QR Code | qrcode.react | Display QR codes |
| HTTP | axios | API requests |
| State | zustand or useContext | App state |
| Async | react-query | Server state |

---

## Deployment

### Backend (e.g., Railway, Render, AWS)
1. Push code to git
2. Set environment variables
3. Configure PostgreSQL
4. Deploy

### Frontend (e.g., Vercel, Netlify)
1. Connect repo
2. Set API endpoint env var
3. Auto-deploy on push

---

## Security Notes

1. **Private keys never transmitted**: Only signed transactions sent to server
2. **Biometric protection**: Payment requires passkey confirmation
3. **Token expiry**: JWT expires in 1 hour, user must re-auth
4. **HTTPS only**: All API calls encrypted
5. **CORS restricted**: Only frontend origin allowed
6. **Input validation**: All addresses, amounts validated on server

---

## Debugging Tips

1. Check WebAuthn support: `console.log(window.PublicKeyCredential)`
2. Browser DevTools → Security tab for passkey status
3. Network tab to inspect API requests
4. Test on localhost first before deployment
5. Use SimpleWebAuthn debugger: https://usernameless.github.io/SimpleWebAuthn/

---

## Next Steps

1. Start with backend auth endpoints
2. Test WebAuthn on your devices
3. Build frontend auth pages
4. Connect to Celo testnet
5. Test payment flow
6. Deploy to staging
7. User testing & iterate
8. Deploy to production
