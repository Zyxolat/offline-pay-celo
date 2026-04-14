# OfflinePay Backend API Design

## Technology Stack

```
Framework: Node.js + Express.js (or Fastify, Hono)
Database: PostgreSQL
WebAuthn: SimpleWebAuthn
Blockchain: Celo SDK (Web3.js or Ethers.js)
Auth: JWT tokens
Environment: .env config
```

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.ts         # PostgreSQL connection
│   │   ├── webauthn.ts         # WebAuthn config
│   │   ├── celo.ts             # Celo blockchain config
│   │   └── jwt.ts              # JWT secrets & config
│   ├── routes/
│   │   ├── auth.ts             # /api/auth/* endpoints
│   │   ├── wallet.ts            # /api/wallet/* endpoints
│   │   ├── payments.ts         # /api/payments/* endpoints
│   │   ├── transactions.ts     # /api/transactions/* endpoints
│   │   └── queue.ts            # /api/queue/* endpoints
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── walletController.ts
│   │   ├── paymentController.ts
│   │   ├── transactionController.ts
│   │   └── queueController.ts
│   ├── services/
│   │   ├── webauthnService.ts
│   │   ├── celoService.ts       # Blockchain interactions
│   │   ├── walletService.ts
│   │   ├── transactionService.ts
│   │   └── queueService.ts
│   ├── models/
│   │   ├── User.ts
│   │   ├── Credential.ts
│   │   ├── Transaction.ts
│   │   ├── OfflineQueue.ts
│   │   └── Session.ts
│   ├── middleware/
│   │   ├── auth.ts             # JWT verification
│   │   ├── errorHandler.ts
│   │   ├── rateLimit.ts
│   │   └── cors.ts
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── logger.ts
│   │   └── helpers.ts
│   └── app.ts                  # Express app setup
├── migrations/                  # Database migrations
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Core API Endpoints

### 1. Authentication Endpoints

#### `POST /api/auth/register/options`
**Purpose**: Generate WebAuthn registration options
**Auth**: None (public)

```typescript
Request: {}

Response (200): {
  challenge: "base64_encoded_32_bytes",
  rp: {
    name: "OfflinePay",
    id: "example.com"
  },
  user: {
    id: "base64_encoded_user_id",
    name: "user@example.com",
    displayName: "User"
  },
  pubKeyCredParams: [
    { alg: -7, type: "public-key" },   // ES256
    { alg: -257, type: "public-key" }  // RS256
  ],
  timeout: 120000,
  authenticatorSelection: {
    authenticatorAttachment: "platform",
    residentKey: "preferred",
    userVerification: "required"
  },
  attestation: "none"
}
```

---

#### `POST /api/auth/register/verify`
**Purpose**: Verify WebAuthn registration credential
**Auth**: None (public)

```typescript
Request: {
  name?: "John Doe",              // Optional user display name
  id: "credential_id_base64",
  rawId: "credential_id_base64",
  response: {
    clientDataJSON: "base64_encoded",
    attestationObject: "base64_encoded"
  },
  type: "public-key"
}

Response (200): {
  success: true,
  userId: "uuid",
  credentialId: "credential_id",
  wallet: {
    address: "0x...",
    balance: "0"
  },
  sessionToken: "jwt_token"
}

Error (400): {
  error: "Invalid credential",
  details: "..."
}
```

**Server Logic**:
1. Verify challenge matches stored challenge
2. Verify attestation object
3. Create user in DB if not exists
4. Store credential with public key
5. Create Celo wallet on-chain or derive from credential
6. Create JWT session token
7. Return user info + session token

---

#### `POST /api/auth/login/options`
**Purpose**: Generate WebAuthn login challenge
**Auth**: None (public)

```typescript
Request: {}

Response (200): {
  challenge: "base64_encoded_32_bytes",
  allowCredentials: [
    { id: "base64_credential_id", type: "public-key", transports: ["usb", "nfc"] }
  ],
  timeout: 60000,
  userVerification: "required"
}
```

---

#### `POST /api/auth/login/verify`
**Purpose**: Verify WebAuthn login assertion
**Auth**: None (public)

```typescript
Request: {
  id: "credential_id",
  rawId: "base64",
  response: {
    clientDataJSON: "base64",
    authenticatorData: "base64",
    signature: "base64",
    userHandle: "base64"
  },
  type: "public-key"
}

Response (200): {
  success: true,
  sessionToken: "jwt_token",
  user: {
    id: "uuid",
    email: "user@example.com"
  },
  wallet: {
    address: "0x...",
    balance: "1000.50"
  }
}
```

**Server Logic**:
1. Verify challenge matches
2. Verify signature using stored public key
3. Check counter for cloned authenticator detection
4. Create JWT session token
5. Return session + wallet info

---

#### `POST /api/auth/logout`
**Purpose**: Invalidate session (optional, can be client-side token deletion)
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  sessionToken: "jwt_token"
}

Response (200): {
  success: true,
  message: "Logged out"
}
```

---

### 2. Wallet Management Endpoints

#### `GET /api/wallet/balance`
**Purpose**: Get current wallet balance
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  headers: {
    Authorization: "Bearer jwt_token"
  }
}

Response (200): {
  balance: {
    cUSD: "1000.50",
    CELO: "5.25"
  },
  address: "0x...",
  lastSync: "2026-04-08T10:30:00Z"
}
```

**Server Logic**:
1. Verify JWT token
2. Get user's Celo wallet address
3. Query Celo blockchain for balance (cUSD + CELO)
4. Cache result (30 seconds)
5. Return balance

---

#### `GET /api/wallet/address`
**Purpose**: Get wallet address + QR code
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {}

Response (200): {
  address: "0x1234567890abcdef1234567890abcdef12345678",
  qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
}
```

---

#### `GET /api/wallet/transactions?limit=50&offset=0`
**Purpose**: Get paginated transaction history
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  query: {
    limit: 50,
    offset: 0,
    status?: "pending|confirmed|failed"
  }
}

Response (200): {
  transactions: [
    {
      id: "tx_uuid",
      type: "send",
      recipient: "0x...",
      amount: "100.00",
      currency: "cUSD",
      status: "confirmed",
      timestamp: "2026-04-08T10:00:00Z",
      txHash: "0x...",
      note: "Payment memo",
      confirmations: 12
    }
  ],
  total: 150,
  limit: 50,
  offset: 0
}
```

---

### 3. Payment Authorization Endpoints

#### `POST /api/payments/authorize/challenge`
**Purpose**: Generate challenge for payment authorization
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  recipient: "0x...",
  amount: "100.00",
  currency: "cUSD",
  note?: "Payment memo"
}

Response (200): {
  challenge: "base64_challenge",
  paymentId: "pay_uuid",
  timeout: 60000,
  details: {
    recipient: "0x...",
    amount: "100.00",
    currency: "cUSD",
    estimatedFee: "0.01"
  }
}
```

**Server Logic**:
1. Verify user has sufficient balance
2. Validate recipient address (is it a valid Celo address?)
3. Generate random challenge
4. Store challenge + payment details in DB (TTL: 5 min)
5. Estimate gas fee from Celo
6. Return challenge + paymentId

---

#### `POST /api/payments/authorize/verify`
**Purpose**: Verify payment authorization with WebAuthn
**Auth**: None (challenge already issued)

```typescript
Request: {
  paymentId: "pay_uuid",
  credentialId: "credential_id",
  response: {
    clientDataJSON: "base64",
    authenticatorData: "base64",
    signature: "base64"
  }
}

Response (200): {
  success: true,
  paymentId: "pay_uuid",
  authorized: true,
  expiresAt: "2026-04-08T10:05:00Z"
}

Error (401): {
  error: "Biometric verification failed",
  attemptsRemaining: 2
}
```

**Server Logic**:
1. Retrieve stored challenge for paymentId
2. Verify WebAuthn signature
3. Mark payment as "authorized" (not yet submitted)
4. Return authorization token (expires in 5 minutes)

---

#### `POST /api/payments/submit`
**Purpose**: Submit authorized payment to blockchain
**Auth**: None (authorization token required in body)

```typescript
Request: {
  paymentId: "pay_uuid",
  signedTx: "0x...",
  offline: false
}

Response (200): {
  txHash: "0x...",
  status: "submitted",
  confirmations: 0,
  estimatedTime: "~30 seconds"
}

Response (202): {  // If offline
  queueId: "queue_uuid",
  status: "pending_sync",
  message: "Transaction queued. Will sync when online."
}
```

**Server Logic**:
1. Verify payment was authorized
2. Validate signed transaction
3. Submit to Celo blockchain via Web3.js
4. Store transaction record with txHash
5. Start monitoring for confirmations
6. Return txHash + estimated time

---

### 4. Offline Queue Endpoints

#### `POST /api/queue/add`
**Purpose**: Add transaction to offline queue
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  recipient: "0x...",
  amount: "50.00",
  currency: "cUSD",
  signedTx: "0x...",
  note?: "memo",
  timestamp: "2026-04-08T09:00:00Z"
}

Response (201): {
  queueId: "queue_uuid",
  status: "pending_sync",
  createdAt: "2026-04-08T09:00:00Z"
}
```

---

#### `GET /api/queue/pending`
**Purpose**: Get pending offline transactions awaiting sync
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {}

Response (200): {
  pendingCount: 3,
  transactions: [
    {
      queueId: "queue_uuid",
      recipient: "0x...",
      amount: "50.00",
      currency: "cUSD",
      status: "pending_sync",
      createdAt: "2026-04-08T09:00:00Z",
      attempts: 0
    }
  ]
}
```

---

#### `POST /api/queue/sync`
**Purpose**: Sync pending offline transactions to blockchain
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  queueIds?: ["queue_uuid_1", "queue_uuid_2"]  // Optional: sync specific ones
}

Response (200): {
  synced: 3,
  failed: 0,
  transactions: [
    {
      queueId: "queue_uuid",
      txHash: "0x...",
      status: "submitted",
      syncedAt: "2026-04-08T10:00:00Z"
    }
  ]
}
```

**Server Logic**:
1. Get all pending queue items for user
2. For each item:
   - Validate signed Tx is still valid
   - Submit to Celo
   - If success: mark as "synced", store txHash
   - If fail: increment attempts, mark as "failed" after 3 retries
3. Return sync results

---

### 5. Transaction Status Endpoints

#### `GET /api/transactions/:txId`
**Purpose**: Get detailed transaction information
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  params: { txId: "tx_uuid" }
}

Response (200): {
  id: "tx_uuid",
  status: "confirmed",
  confirmations: 12,
  txHash: "0x...",
  from: "0x...",
  to: "0x...",
  amount: "100.00",
  currency: "cUSD",
  gasUsed: "21000",
  gasFee: "0.01",
  timestamp: "2026-04-08T10:00:00Z",
  blockNumber: 15000000,
  note: "Optional memo"
}
```

---

#### `GET /api/transactions/status/batch`
**Purpose**: Get status of multiple transactions (for polling)
**Auth**: `Authorization: Bearer <token>`

```typescript
Request: {
  query: {
    txHashes: ["0x...", "0x...", "0x..."]
  }
}

Response (200): {
  transactions: [
    {
      txHash: "0x...",
      status: "confirmed",
      confirmations: 12
    }
  ]
}
```

---

## Database Models (PostgreSQL)

### User Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,  -- Celo address
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Credentials Table (WebAuthn)
```sql
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id VARCHAR(1000) UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  credential_public_key JSONB NOT NULL,
  transports TEXT[] DEFAULT array[]::text[],  -- usb, nfc, ble, internal
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_id (user_id)
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient VARCHAR(255) NOT NULL,  -- Celo address
  amount DECIMAL(36, 18) NOT NULL,
  currency VARCHAR(10) NOT NULL,  -- cUSD, CELO
  status VARCHAR(50) NOT NULL,  -- draft, pending_sync, submitted, confirmed, failed
  tx_hash VARCHAR(255) UNIQUE,
  signed_tx TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  confirmations INT DEFAULT 0,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_tx_hash (tx_hash)
);
```

### Offline Queue Table
```sql
CREATE TABLE offline_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  signed_tx TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,  -- pending, synced, failed
  error TEXT,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

### WebAuthn Challenges Table
```sql
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge BYTEA NOT NULL,
  purpose VARCHAR(50) NOT NULL,  -- registration, login, payment
  user_id UUID REFERENCES users(id),
  payment_id UUID,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Middleware & Security

### JWT Middleware
```typescript
// Verify Authorization header
// Decode JWT
// Check expiry (1 hour)
// Attach user to request
```

### Error Handler
```typescript
// Catch all errors
// Return appropriate status codes
// Log errors
// Don't expose sensitive info
```

### Rate Limiting
```typescript
// 10 requests/second per IP
// 100 failed login attempts/hour per IP -> lockout
```

### CORS Configuration
```typescript
// Allow only frontend origin
// Allow credentials
// Expose rate-limit headers
```

---

## Environment Variables (.env)

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/offlinepay

# JWT
JWT_SECRET=your_secure_random_secret_here
JWT_EXPIRY=1h

# WebAuthn
WEBAUTHN_RP_NAME=OfflinePay
WEBAUTHN_RP_ID=example.com
WEBAUTHN_ORIGIN=https://example.com

# Celo
CELO_NETWORK=mainnet  # or alfajores (testnet)
CELO_RPC_URL=https://forno.celo.org
CELO_CONTRACT_ADDRESS=0x...

# Frontend
FRONTEND_URL=https://example.com
FRONTEND_ORIGIN=https://example.com
```

---

## Error Codes & Status

| Status | Error | Meaning |
|--------|-------|---------|
| 200 | OK | Success |
| 201 | Created | Resource created |
| 202 | Accepted | Async request accepted (offline queue) |
| 400 | BadRequest | Invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Not authorized |
| 404 | NotFound | Resource not found |
| 409 | Conflict | Duplicate email/credential |
| 429 | TooManyRequests | Rate limit exceeded |
| 500 | ServerError | Internal error |

---

## Service Implementation Notes

### celoService.ts
- Connect to Celo RPC endpoint
- Get balance (cUSD + CELO)
- Estimate gas fees
- Submit signed transactions
- Monitor tx status & confirmations

### webauthnService.ts
- Generate challenges (crypto.getRandomValues)
- Verify registration attestation
- Verify assertion signatures
- Detect cloned authenticators via counter

### walletService.ts
- Derive wallet from credential
- Generate QR code for address
- Format balance for display

### transactionService.ts
- Create transaction record
- Calculate fees
- Format responses

### queueService.ts
- Store offline txs
- Retry logic with exponential backoff
- Batch sync when online

---

## Deployment Checklist

- [ ] Database migrations run
- [ ] Environment variables set
- [ ] CORS origin configured
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Error logging setup (Sentry, etc)
- [ ] Monitoring setup (uptime, logs)
- [ ] Backup strategy for DB
- [ ] WebAuthn RP ID matches domain
- [ ] Celo network (mainnet/testnet) configured
