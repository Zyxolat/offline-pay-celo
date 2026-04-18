import { OFFLINEPAY_CONTRACT_ADDRESS } from "@/config/celo";

export const TIMELOCK_CONTRACT_ADDRESS = OFFLINEPAY_CONTRACT_ADDRESS;

export const TIMELOCK_ABI = [
  "event PaymentCreated(uint256 indexed paymentId, address indexed sender, address indexed recipient, uint256 amount, uint256 deadline)",
  "event PaymentAccepted(uint256 indexed paymentId, address indexed recipient, uint256 amount)",
  "event PaymentRefunded(uint256 indexed paymentId, address indexed sender, uint256 amount)",
  "function paymentCount() view returns (uint256)",
  "function payments(uint256) view returns (address sender, address recipient, uint256 amount, uint256 deadline, bool claimed, bool refunded)",
  "function createPayment(address recipient, uint256 duration) payable returns (uint256)",
  "function acceptPayment(uint256 paymentId)",
  "function refundPayment(uint256 paymentId)",
  "function getPayment(uint256 paymentId) view returns ((address sender, address recipient, uint256 amount, uint256 deadline, bool claimed, bool refunded))",
  "function getUserPayments(address user) view returns (uint256[])",
] as const;
