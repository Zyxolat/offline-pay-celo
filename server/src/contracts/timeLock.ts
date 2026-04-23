export const TIMELOCK_CONTRACT_ABI = [
  'event PaymentCreated(uint256 indexed paymentId, address indexed sender, address indexed recipient, uint256 amount)',
  'event PaymentClaimed(uint256 indexed paymentId, address indexed recipient, uint256 amount)',
  'event PaymentRefunded(uint256 indexed paymentId, address indexed sender, uint256 amount)',
  'function getPayment(uint256 paymentId) view returns ((address sender, address recipient, uint256 amount, bool claimed, bool refunded))',
  'function paymentCount() view returns (uint256)',
] as const;

export type IndexedPaymentEventName = 'PaymentCreated' | 'PaymentClaimed' | 'PaymentRefunded';
export type TimeLockAbiVersion = 'v1';

export const TIMELOCK_ABI_REGISTRY: Record<TimeLockAbiVersion, readonly string[]> = {
  v1: TIMELOCK_CONTRACT_ABI,
};
