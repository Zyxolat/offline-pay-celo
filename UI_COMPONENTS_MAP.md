# OfflinePay UI Components Implementation Map

## Current Landing Page (Complete ✓)

### Existing Components
| Component | File | Status | Purpose |
|-----------|------|--------|---------|
| Navbar | `src/components/landing/Navbar.tsx` | ✓ Complete | Navigation with mobile menu + Get Started CTA |
| Hero | `src/components/landing/Hero.tsx` | ✓ Complete | Hero section with phone mockup |
| Features | `src/components/landing/Features.tsx` | ✓ Complete | 6 feature cards (offline, sync, QR, wallet, passkey, fees) |
| HowItWorks | `src/components/landing/HowItWorks.tsx` | ✓ Complete | 4-step flow (Login → Send → Store → Sync) |
| Security | `src/components/landing/Security.tsx` | ✓ Complete | Security highlights (Passkey, Biometric, WebAuthn, Blockchain) |
| Benefits | `src/components/landing/Benefits.tsx` | ✓ Complete | 5 benefit cards (Inclusion, Connectivity, Auth, Design, Blockchain) |
| CTASection | `src/components/landing/CTASection.tsx` | ✓ Complete | CTA with "Create Wallet" button |
| PasskeyDemo | `src/components/landing/PasskeyDemo.tsx` | ⚠️ Needs Backend | Interactive demo (Login/Payment toggle) |
| InfoModal | `src/components/landing/InfoModal.tsx` | ⚠️ Needs Backend | Wallet creation flow (Info → Creating → Success/Error) |
| Footer | `src/components/landing/Footer.tsx` | ✓ Complete | Links and social icons |

---

## Components Needing Implementation

### 1. Dashboard / Wallet Home Page (NEW)
**Purpose**: Main authenticated view after wallet creation
**Location**: `src/pages/Dashboard.tsx`

**Features**:
- [ ] Display wallet balance (cUSD + CELO conversion)
- [ ] Balance card with interactive display
- [ ] Quick action buttons (Send, Receive, Scan)
- [ ] QR code for receiving payments
- [ ] Wallet address with copy-to-clipboard
- [ ] Sync status indicator (shows offline/online and pending transactions)
- [ ] Recent transactions list (last 5)
- [ ] Empty state messaging

**UI Components Used**:
- Card, Button, Skeleton, Loader

**Backend Integration**:
- `GET /api/wallet/balance` — Get balance
- `GET /api/wallet/address` — Get QR code & address
- `GET /api/wallet/transactions?limit=5` — Recent txs
- WebSocket for real-time sync status

---

### 2. Send Payment Form Modal/Page (NEW)
**Purpose**: Create and authorize a payment
**Location**: `src/components/SendPaymentFlow.tsx` or `src/pages/Send.tsx`

**Features**:
- [ ] Recipient input (address or paste/scan QR)
- [ ] QR code scanner trigger
- [ ] Amount input (USD ↔ CELO conversion)
- [ ] Payment memo/note
- [ ] Fee estimation display
- [ ] Send button (triggers auth flow)
- [ ] Offline queue indicator if no connectivity

**UI Components Used**:
- Input, Button, Card, Dialog, Loader, Alert

**Backend Integration**:
- `POST /api/payments/authorize/challenge` — Get challenge
- `POST /api/payments/authorize/verify` — Verify passkey
- `POST /api/payments/submit` — Submit signed transaction
- `POST /api/queue/add` — Add to offline queue if offline

---

### 3. Payment Confirmation Modal (NEW)
**Purpose**: Show payment details and request biometric confirmation
**Location**: `src/components/PaymentConfirmation.tsx`

**Features**:
- [ ] Payment summary (amount, recipient, fee)
- [ ] Recipient address verification
- [ ] "Confirm with Passkey" button
- [ ] Passkey/biometric authentication step
- [ ] Loading state during auth
- [ ] Success state with tx hash
- [ ] Error handling with retry
- [ ] Cancel option

**UI Components Used**:
- Dialog, Button, Card, Loader, Alert

**Backend Integration**:
- Passkey challenge/verification from auth API
- Real-time auth status updates

---

### 4. Transaction History / Activity Page (NEW)
**Purpose**: View all past and pending transactions
**Location**: `src/pages/Transactions.tsx`

**Features**:
- [ ] Transaction list (paginated or virtual scroll)
- [ ] Filter/sort by status (pending, confirmed, failed)
- [ ] Filter by date range
- [ ] Transaction details modal on click
- [ ] Retry action for failed offline transactions
- [ ] Copy tx hash / recipient address
- [ ] Status badges (Pending, Confirmed, Failed, Queued)
- [ ] Empty state messaging

**UI Components Used**:
- Table or custom List, Badge, Dialog, Button, Pagination

**Backend Integration**:
- `GET /api/wallet/transactions?limit=50&offset=0` — Paginated txs
- `GET /api/transactions/:txId` — Detailed view
- `GET /api/queue/pending` — Pending offline txs
- `POST /api/queue/sync` — Retry sync

---

### 5. Transaction Details Modal (NEW)
**Purpose**: Show full transaction information
**Location**: `src/components/TransactionDetail.tsx`

**Features**:
- [ ] Payment amount & currency
- [ ] Sender/recipient addresses (with copy buttons)
- [ ] Transaction hash (clickable Celo block explorer link)
- [ ] Status and confirmations
- [ ] Timestamp
- [ ] Gas fee paid
- [ ] Payment memo/note if present
- [ ] Block number & confirmation count
- [ ] Share button (copy tx link)

**UI Components Used**:
- Dialog, Card, Button, Badge

**Backend Integration**:
- `GET /api/transactions/:txId` — Detailed tx info
- `GET /api/transactions/status/batch` — Batch status updates

---

### 6. Offline Queue Status View (NEW)
**Purpose**: Show transactions queued for sync
**Location**: `src/components/OfflineQueue.tsx` (or integrated in Dashboard)

**Features**:
- [ ] List of pending offline transactions
- [ ] Estimated sync time
- [ ] Manual "Sync Now" button when online
- [ ] Auto-sync indicator
- [ ] Retry failed sync attempts
- [ ] Clear error messages
- [ ] Transaction count badge

**UI Components Used**:
- Card, Button, List, Badge, Alert

**Backend Integration**:
- `GET /api/queue/pending` — Get queue
- `POST /api/queue/sync` — Sync pending txs

---

### 7. QR Code Scanner Page (NEW)
**Purpose**: Scan QR codes to get recipient addresses
**Location**: `src/components/QRScanner.tsx` or `src/pages/Scan.tsx`

**Features**:
- [ ] Camera input (mobile-optimized)
- [ ] QR code detection & parsing
- [ ] Recipient address extraction
- [ ] Validation feedback (green/red)
- [ ] Torch toggle
- [ ] Close/cancel button
- [ ] Success state with confirmation
- [ ] Fallback to manual entry

**UI Components Used**:
- Custom camera component, Button, Alert

**Libraries**:
- `qr-scanner` or `jsQR`
- Device camera API

**Backend Integration**:
- Optional: `POST /api/validate/address` — Validate recipient

---

### 8. Settings / Account Page (NEW)
**Purpose**: Manage account and preferences
**Location**: `src/pages/Settings.tsx`

**Features**:
- [ ] Passkey management (view, delete, add new)
- [ ] Wallet recovery/backup options
- [ ] Account info (address, creation date)
- [ ] App preferences (theme, language)
- [ ] Security settings (session timeout, biometric fallback)
- [ ] Logout option
- [ ] Delete account (warning modal)

**UI Components Used**:
- Form, Input, Button, Toggle, Select, Dialog, Card

**Backend Integration**:
- `GET /api/user/profile` — User info
- `GET /api/user/credentials` — List passkeys
- `DELETE /api/user/credentials/:credId` — Remove passkey
- `POST /api/user/logout` — Clear session

---

### 9. Receive Payment Page (NEW)
**Purpose**: Share wallet address & QR code
**Location**: `src/pages/Receive.tsx`

**Features**:
- [ ] Display wallet address (large, readable)
- [ ] QR code for wallet (large, printable)
- [ ] Copy address button
- [ ] Share address (OS share API)
- [ ] Payment amount input (optional, for requesting)
- [ ] Generate payment request link
- [ ] Message to include in share

**UI Components Used**:
- Card, Button, Input, Alert

**Backend Integration**:
- `GET /api/wallet/address` — Get QR code
- Optional: `POST /api/payment-requests` — Generate shareable link

---

### 10. Authentication Flow Pages (NEW)
**Purpose**: Wallet creation & login flows
**Location**: `src/pages/Auth/` (Signup, Login)

**Components**:
- **Signup/CreateWallet**: Already has InfoModal, needs connected page
- **Login**: Passkey login form
- **Landing → Auth transition**: Route handling

**Features**:
- [ ] "Create Wallet" landing redirect
- [ ] Login with Passkey
- [ ] Device support check
- [ ] Error messaging (WebAuthn not supported, etc)
- [ ] Session persistence

**UI Components Used**:
- Button, Alert, Loader, Card

**Backend Integration**:
- `POST /api/auth/register/options` — Registration challenge
- `POST /api/auth/register/verify` — Register credential
- `POST /api/auth/login/options` — Login challenge
- `POST /api/auth/login/verify` — Login verify

---

## Routing Structure (React Router)

```
/                    → Landing page
/auth/login          → Login page
/auth/signup         → Signup/wallet creation
/dashboard           → Main wallet view (protected)
/send                → Send payment flow (protected)
/receive             → Receive payment (protected)
/transactions        → Transaction history (protected)
/transactions/:txId  → Transaction details (protected)
/scan                → QR scanner (protected)
/settings            → Settings & account (protected)
*                    → 404 NotFound
```

---

## Implementation Priority

### Phase 1 (MVP - Core Functionality)
1. Dashboard with balance
2. Send Payment Form + Confirmation
3. Transaction History
4. Offline Queue status
5. Login/Signup with backend integration

### Phase 2 (Secondary Features)
1. QR Code Scanner
2. Receive Payment page
3. Transaction Details modal
4. Settings page
5. Better error handling & retry logic

### Phase 3 (Polish & Optimization)
1. Animations & transitions
2. Better UX for low connectivity scenarios
3. Transaction filtering/search
4. Notifications & alerts
5. Analytics & logging

---

## UI Kit Components Already Available

Located in `src/components/ui/`

- `button.tsx` — Button with variants
- `card.tsx` — Card container
- `input.tsx` — Text input
- `dialog.tsx` — Modal dialogs
- `toast.tsx` / `toaster.tsx` — Toast notifications
- `tabs.tsx` — Tab switching
- `pagination.tsx` — Pagination controls
- `badge.tsx` — Status badges
- `skeleton.tsx` — Loading skeletons
- `form.tsx` — Form wrapper
- `label.tsx` — Form labels
- `alert.tsx` — Alert box
- `dropdown-menu.tsx` — Dropdown menus
- `select.tsx` — Select component
- And many more...

**Setup**: These use Radix UI + Shadcn, Tailwind styling, and are TypeScript-ready.

---

## Styling & Theme Notes

- **CSS**: `src/index.css` + `src/App.css`
- **Tailwind**: `tailwind.config.ts`
- **Design System**: 
  - Primary color: Gradient (visible in existing components)
  - Dark theme support via `next-themes`
  - Animations via `framer-motion`
  - Icons via `lucide-react`

---

## Next Steps

1. Create auth routes & backend integration
2. Build Dashboard component with real balance API
3. Implement Send Payment flow
4. Connect all components to backend endpoints
5. Add error boundaries & better error handling
6. Test offline capability with service worker
