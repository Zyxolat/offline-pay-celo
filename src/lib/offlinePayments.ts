import { ethers, type Wallet, type JsonRpcSigner } from 'ethers';

export type OfflinePaymentStatus = 'pending' | 'accepted' | 'expired' | 'broadcasted';
export type OfflinePaymentCurrency = 'cUSD' | 'CELO';

export interface OfflinePayment {
  id: string;
  from: string;
  to: string;
  amount: string;
  nonce: number;
  createdAt: number;
  expiresAt: number;
  status: OfflinePaymentStatus;
  signature: string;
  currency: OfflinePaymentCurrency;
  note?: string;
  acceptedAt?: number;
  broadcastTxHash?: string;
  lastError?: string;
}

const DB_NAME = 'offline-payments';
const DB_VERSION = 1;
const STORE_OUTGOING = 'sender_outgoing';
const STORE_INCOMING = 'receiver_incoming';
const LOCAL_WALLET_STORAGE_KEY = 'offlinePay_local_wallet_private_key';
const DEFAULT_CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// Default expiration: 24 hours in seconds
export const DEFAULT_PAYMENT_EXPIRY_SECONDS = 24 * 3600;
export const DEFAULT_PAYMENT_EXPIRY_HOURS = 24;

function getCUSDAddress() {
  return import.meta.env.VITE_CELO_CUSD_ADDRESS || DEFAULT_CUSD_ADDRESS;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_OUTGOING)) {
        db.createObjectStore(STORE_OUTGOING, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_INCOMING)) {
        db.createObjectStore(STORE_INCOMING, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);

  const result = await callback(store);

  return new Promise<T>((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getAllFromStore(storeName: string): Promise<OfflinePayment[]> {
  return withStore(storeName, 'readonly', (store) =>
    new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as OfflinePayment[]);
      request.onerror = () => reject(request.error);
    }),
  );
}

async function getPaymentFromStore(storeName: string, id: string): Promise<OfflinePayment | null> {
  return withStore(storeName, 'readonly', (store) =>
    new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    }),
  );
}

async function putPaymentInStore(storeName: string, payment: OfflinePayment): Promise<void> {
  return withStore(storeName, 'readwrite', (store) =>
    new Promise((resolve, reject) => {
      const request = store.put(payment);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
  );
}

async function deletePaymentFromStore(storeName: string, id: string): Promise<void> {
  return withStore(storeName, 'readwrite', (store) =>
    new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    }),
  );
}

function normalizeAddress(address: string): string {
  return ethers.getAddress(address.trim());
}

function buildSignaturePayload(payment: OfflinePayment): Uint8Array {
  const sanitizedNote = payment.note?.trim() ?? '';
  const payload = [
    payment.id,
    payment.from,
    payment.to,
    payment.amount,
    payment.nonce.toString(),
    payment.createdAt.toString(),
    payment.expiresAt.toString(),
    payment.currency,
    sanitizedNote,
  ].join('|');

  return ethers.toUtf8Bytes(payload);
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error('[offlinePayments] Local storage is unavailable.', error);
    return null;
  }
}

function generateLocalPrivateKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    return ethers.hexlify(bytes);
  }

  return ethers.hexlify(Uint8Array.from(ethers.randomBytes(32)));
}

function buildOfflinePaymentId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `offline-payment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateLocalWallet(): Wallet {
  const storage = getLocalStorage();
  if (!storage) {
    throw new Error('Local wallet storage is not available in this environment.');
  }

  const savedKey = storage.getItem(LOCAL_WALLET_STORAGE_KEY);
  if (savedKey) {
    try {
      return new ethers.Wallet(savedKey);
    } catch (error) {
      console.error('[offlinePayments] Stored wallet key is invalid. Regenerating wallet.', error);
      storage.removeItem(LOCAL_WALLET_STORAGE_KEY);
    }
  }

  const wallet = new ethers.Wallet(generateLocalPrivateKey());
  storage.setItem(LOCAL_WALLET_STORAGE_KEY, wallet.privateKey);
  return wallet;
}

export function getStoredLocalWalletAddress(): string | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  const savedKey = storage.getItem(LOCAL_WALLET_STORAGE_KEY);
  if (!savedKey) {
    return null;
  }

  try {
    return new ethers.Wallet(savedKey).address;
  } catch (error) {
    console.error('[offlinePayments] Stored wallet key is invalid. Clearing corrupted wallet.', error);
    storage.removeItem(LOCAL_WALLET_STORAGE_KEY);
    return null;
  }
}

export function serializePayment(payment: OfflinePayment): string {
  return JSON.stringify(payment);
}

export function parsePayment(serialized: string): OfflinePayment {
  try {
    return JSON.parse(serialized) as OfflinePayment;
  } catch (error) {
    throw new Error('Offline payment payload is not valid JSON.');
  }
}

export async function signPayment(
  payment: OfflinePayment,
  signer: Wallet | JsonRpcSigner,
): Promise<string> {
  const payload = buildSignaturePayload(payment);
  return signer.signMessage(payload);
}

export function verifyPayment(payment: OfflinePayment): boolean {
  try {
    const payload = buildSignaturePayload({ ...payment, signature: '' });
    const recovered = ethers.verifyMessage(payload, payment.signature);
    return normalizeAddress(recovered) === normalizeAddress(payment.from);
  } catch (error) {
    return false;
  }
}

export async function getAllOutgoingPayments(): Promise<OfflinePayment[]> {
  return getAllFromStore(STORE_OUTGOING);
}

export async function getAllIncomingPayments(): Promise<OfflinePayment[]> {
  return getAllFromStore(STORE_INCOMING);
}

export async function getPendingOutgoingPayments(): Promise<OfflinePayment[]> {
  return (await getAllOutgoingPayments()).filter((payment) => payment.status === 'pending' || payment.status === 'accepted');
}

export async function getPendingIncomingPayments(): Promise<OfflinePayment[]> {
  return (await getAllIncomingPayments()).filter((payment) => payment.status === 'pending');
}

export async function getAcceptedOutgoingPayments(): Promise<OfflinePayment[]> {
  return (await getAllOutgoingPayments()).filter((payment) => payment.status === 'accepted');
}

export async function getAcceptedIncomingPayments(): Promise<OfflinePayment[]> {
  return (await getAllIncomingPayments()).filter((payment) => payment.status === 'accepted');
}

export async function getExpiredPayments(): Promise<OfflinePayment[]> {
  const outgoing = await getAllOutgoingPayments();
  const incoming = await getAllIncomingPayments();
  return [...outgoing, ...incoming].filter((payment) => payment.status === 'expired');
}

export async function getNextNonce(senderAddress: string): Promise<number> {
  const outgoing = await getAllOutgoingPayments();
  const filtered = outgoing.filter((payment) => normalizeAddress(payment.from) === normalizeAddress(senderAddress));
  if (filtered.length === 0) {
    return 0;
  }
  return Math.max(...filtered.map((payment) => payment.nonce)) + 1;
}

export function parseTokenAmount(amount: string) {
  return ethers.parseUnits(amount, 18);
}

export async function getPendingOutgoingAmount(senderAddress: string, currency: OfflinePaymentCurrency): Promise<bigint> {
  const outgoing = await getPendingOutgoingPayments();
  return outgoing
    .filter((payment) => normalizeAddress(payment.from) === normalizeAddress(senderAddress) && payment.currency === currency)
    .reduce((sum, payment) => sum + parseTokenAmount(payment.amount), 0n);
}

export async function canCreatePayment(
  senderAddress: string,
  amount: string,
  currency: OfflinePaymentCurrency,
  currentBalance: string,
): Promise<boolean> {
  const balanceUnits = parseTokenAmount(currentBalance);
  const lockedAmount = await getPendingOutgoingAmount(senderAddress, currency);
  const amountUnits = parseTokenAmount(amount);
  return balanceUnits - lockedAmount >= amountUnits;
}

export async function createOfflinePayment({
  from,
  to,
  amount,
  currency,
  expiresInSeconds = DEFAULT_PAYMENT_EXPIRY_SECONDS,
  note,
  signer,
}: {
  from: string;
  to: string;
  amount: string;
  currency: OfflinePaymentCurrency;
  expiresInSeconds?: number;
  note?: string;
  signer?: Wallet | JsonRpcSigner;
}): Promise<OfflinePayment> {
  const fromAddress = normalizeAddress(from);
  const toAddress = normalizeAddress(to);

  if (fromAddress === toAddress) {
    throw new Error('Sender and recipient cannot be the same wallet address.');
  }

  const walletSigner = signer ?? getOrCreateLocalWallet();
  const nonce = await getNextNonce(fromAddress);
  const now = Date.now();
  const expiresAt = now + expiresInSeconds * 1000;
  const payment: OfflinePayment = {
    id: buildOfflinePaymentId(),
    from: fromAddress,
    to: toAddress,
    amount,
    nonce,
    createdAt: now,
    expiresAt,
    status: 'pending',
    signature: '',
    currency,
    note,
  };

  payment.signature = await signPayment(payment, walletSigner);
  await putPaymentInStore(STORE_OUTGOING, payment);
  return payment;
}

export async function receiveOfflinePayment(serialized: string, recipientAddress: string): Promise<OfflinePayment> {
  const parsed = parsePayment(serialized);
  const normalizedRecipient = normalizeAddress(recipientAddress);
  const normalizedTo = normalizeAddress(parsed.to);

  if (normalizedRecipient !== normalizedTo) {
    throw new Error('This payment was not intended for this recipient wallet address.');
  }

  if (!verifyPayment(parsed)) {
    throw new Error('Payment signature is invalid.');
  }

  if (parsed.expiresAt <= Date.now()) {
    throw new Error('This payment has already expired.');
  }

  const existing = await getPaymentFromStore(STORE_INCOMING, parsed.id);
  if (existing) {
    throw new Error('This payment has already been received.');
  }

  const pendingPayment: OfflinePayment = {
    ...parsed,
    status: 'pending',
    acceptedAt: undefined,
    broadcastTxHash: undefined,
    lastError: undefined,
  };

  await putPaymentInStore(STORE_INCOMING, pendingPayment);
  return pendingPayment;
}

export async function acceptIncomingPayment(paymentId: string): Promise<OfflinePayment> {
  const payment = await getPaymentFromStore(STORE_INCOMING, paymentId);
  if (!payment) {
    throw new Error('Payment not found in incoming payments.');
  }

  if (payment.status !== 'pending') {
    throw new Error('Only pending payments can be accepted.');
  }

  payment.status = 'accepted';
  payment.acceptedAt = Date.now();
  await putPaymentInStore(STORE_INCOMING, payment);
  return payment;
}

export async function markOutgoingAccepted(paymentId: string): Promise<OfflinePayment> {
  const payment = await getPaymentFromStore(STORE_OUTGOING, paymentId);
  if (!payment) {
    throw new Error('Payment not found in outgoing payments.');
  }
  payment.status = 'accepted';
  payment.acceptedAt = Date.now();
  await putPaymentInStore(STORE_OUTGOING, payment);
  return payment;
}

export async function expirePayments(): Promise<void> {
  const now = Date.now();
  const outgoing = await getAllOutgoingPayments();
  const incoming = await getAllIncomingPayments();

  const expirables = [...outgoing, ...incoming].filter(
    (payment) => payment.status === 'pending' && payment.expiresAt <= now,
  );

  await Promise.all(
    expirables.map(async (payment) => {
      payment.status = 'expired';
      payment.lastError = 'Payment expired before acceptance.';
      const storeName = outgoing.some((item) => item.id === payment.id)
        ? STORE_OUTGOING
        : STORE_INCOMING;
      await putPaymentInStore(storeName, payment);
    }),
  );
}

function resolveSigner(
  signer: Wallet | JsonRpcSigner,
  providerUrl?: string,
): Wallet | JsonRpcSigner {
  if ('provider' in signer && signer.provider) {
    return signer;
  }

  if (providerUrl) {
    return signer.connect(new ethers.JsonRpcProvider(providerUrl));
  }

  throw new Error('Signer has no provider and no providerUrl was provided.');
}

export async function syncPaymentToBlockchain(
  payment: OfflinePayment,
  signer: Wallet | JsonRpcSigner,
  storeName: 'sender_outgoing' | 'receiver_incoming',
  providerUrl?: string,
): Promise<OfflinePayment> {
  if (payment.status !== 'accepted') {
    throw new Error('Only accepted payments can be broadcast to Celo.');
  }

  const walletSigner = resolveSigner(signer, providerUrl);
  const provider = 'provider' in walletSigner ? walletSigner.provider : new ethers.JsonRpcProvider(providerUrl);
  if (!provider) {
    throw new Error('Unable to resolve provider for transaction broadcast.');
  }

  const signerAddress = normalizeAddress(await walletSigner.getAddress());
  if (signerAddress !== normalizeAddress(payment.from)) {
    throw new Error('Signer does not control the payment sender address.');
  }

  const chainNonce = await provider.getTransactionCount(payment.from, 'pending');
  const nonce = payment.nonce >= chainNonce ? payment.nonce : chainNonce;
  const amount = parseTokenAmount(payment.amount);

  let txResponse: ethers.providers.TransactionResponse;
  if (payment.currency === 'CELO') {
    txResponse = await walletSigner.sendTransaction({
      to: payment.to,
      value: amount,
      nonce,
      gasLimit: 210000,
    });
  } else {
    const contract = new ethers.Contract(
      getCUSDAddress(),
      ['function transfer(address to, uint256 amount) public returns (bool)'],
      walletSigner,
    );
    txResponse = await contract.transfer(payment.to, amount, { nonce, gasLimit: 210000 });
  }

  const receipt = await txResponse.wait();
  payment.status = 'broadcasted';
  payment.broadcastTxHash = receipt.transactionHash;
  payment.lastError = undefined;
  await putPaymentInStore(storeName, payment);
  return payment;
}

export async function getAllExpiredPaymentsByStore(): Promise<OfflinePayment[]> {
  return getExpiredPayments();
}
