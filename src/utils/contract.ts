import {
  BrowserProvider,
  Contract,
  Interface,
  JsonRpcProvider,
  formatEther,
  getAddress,
  isAddress,
  parseEther,
} from "ethers";
import {
  connect as wagmiConnect,
  getAccount,
  switchChain,
  watchChainId,
  watchConnection,
} from "wagmi/actions";

import {
  CELO_MAINNET_CHAIN_ID,
  CELO_MAINNET_CHAIN_ID_BIGINT,
  CELO_MAINNET_RPC_URL,
  OFFLINEPAY_WALLET_CACHE_KEY,
  type OfflinePayWalletState,
} from "@/config/celo";
import { TIMELOCK_ABI, TIMELOCK_CONTRACT_ADDRESS } from "@/contracts/TimeLock";
import {
  config as wagmiConfig,
  getPreferredConnector,
} from "@/lib/wagmi";
import { isInjectedAvailable, setLastWalletType } from "@/lib/wallet";

const contractInterface = new Interface(TIMELOCK_ABI);
const readProvider = new JsonRpcProvider(CELO_MAINNET_RPC_URL);

interface ProviderError {
  code?: number | string;
  message?: string;
  shortMessage?: string;
  reason?: string;
  info?: {
    error?: {
      message?: string;
    };
  };
}

export type TimeLockPaymentStatus = "locked" | "ready" | "accepted" | "refunded";

export interface TimeLockPaymentView {
  id: number;
  sender: string;
  recipient: string;
  amount: string;
  amountWei: bigint;
  deadline: number;
  claimed: boolean;
  refunded: boolean;
  status: TimeLockPaymentStatus;
  isSender: boolean;
  isRecipient: boolean;
  canAccept: boolean;
  canRefund: boolean;
}

export interface CreatePaymentResult {
  hash: string;
  paymentId: number | null;
}

export interface ContractActionResult {
  hash: string;
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  feeWei: bigint;
  feeCelo: string;
}

const assertContractConfigured = () => {
  if (!TIMELOCK_CONTRACT_ADDRESS || !isAddress(TIMELOCK_CONTRACT_ADDRESS)) {
    throw new Error("OfflinePay contract configuration is invalid.");
  }
};

const getRawErrorMessage = (error: unknown): string => {
  const providerError = error as ProviderError | undefined;
  if (!providerError) {
    return "";
  }

  return (
    providerError.reason ||
    providerError.shortMessage ||
    providerError.info?.error?.message ||
    providerError.message ||
    ""
  );
};

const getFriendlyErrorMessage = (error: unknown) => {
  const providerError = error as ProviderError | undefined;
  const message = getRawErrorMessage(error).toLowerCase();

  if (providerError?.code === 4001 || message.includes("user rejected")) {
    return "Transaction was cancelled in your wallet.";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds to cover the locked CELO amount and gas fees.";
  }

  if (message.includes("wrong network") || message.includes("chain") || message.includes("switch")) {
    return "Switch your wallet to Celo Mainnet to continue.";
  }

  if (message.includes("invalid address") || message.includes("ens")) {
    return "Enter a valid Celo wallet address.";
  }

  if (message.includes("payment is still locked")) {
    return "This payment is still locked. Wait for the timer to reach zero.";
  }

  if (message.includes("payment already unlocked")) {
    return "This payment is already unlocked, so the sender can no longer cancel it.";
  }

  if (message.includes("only recipient can accept")) {
    return "Only the intended recipient can accept this payment.";
  }

  if (message.includes("only sender can refund")) {
    return "Only the original sender can cancel this payment while it is still locked.";
  }

  if (message.includes("call exception")) {
    return "The contract rejected this request. Double-check the recipient, amount, and unlock time.";
  }

  if (providerError?.message || providerError?.shortMessage || providerError?.reason) {
    return getRawErrorMessage(error);
  }

  return "Something went wrong while talking to the OfflinePay contract.";
};

const getEthereumProvider = () => {
  const { connector } = getAccount(wagmiConfig);
  if (!connector) {
    throw new Error("Connect a compatible wallet like MiniPay or MetaMask to continue.");
  }

  return connector.getProvider({ chainId: CELO_MAINNET_CHAIN_ID });
};

const saveWalletState = (state: OfflinePayWalletState) => {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(OFFLINEPAY_WALLET_CACHE_KEY, JSON.stringify(state));
};

const getCachedWalletState = (): OfflinePayWalletState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(OFFLINEPAY_WALLET_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as OfflinePayWalletState;
  } catch {
    return null;
  }
};

export const readWalletState = async (force = false): Promise<OfflinePayWalletState> => {
  const cached = getCachedWalletState();

  if (cached && !force) {
    return cached;
  }

  const account = getAccount(wagmiConfig);

  if (typeof window === "undefined") {
    const emptyState = {
      address: "",
      chainId: null,
      isConnected: false,
      isWrongNetwork: false,
      walletAvailable: false,
    };

    saveWalletState(emptyState);
    return emptyState;
  }

  const state = {
    address: account.address ? getAddress(account.address) : "",
    chainId: account.chainId ?? null,
    isConnected: account.isConnected,
    isWrongNetwork: account.chainId !== undefined && account.chainId !== CELO_MAINNET_CHAIN_ID,
    walletAvailable: true,
  };

  saveWalletState(state);
  return state;
};

export const switchToCeloMainnet = async () => {
  try {
    await switchChain(wagmiConfig, {
      chainId: CELO_MAINNET_CHAIN_ID,
    });
  } catch (error) {
    const providerError = error as ProviderError;

    throw new Error(
      providerError.message || "Automatic switching failed. Please switch your wallet to Celo Mainnet manually.",
    );
  }
};

export const ensureCeloMainnet = async () => {
  const ethereum = await getEthereumProvider();
  const provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== CELO_MAINNET_CHAIN_ID_BIGINT) {
    await switchToCeloMainnet();
  }

  return new BrowserProvider(await getEthereumProvider());
};

export const connectWallet = async () => {
  const account = getAccount(wagmiConfig);

  if (!account.isConnected) {
    const connector = await getPreferredConnector();

    if (!connector) {
      throw new Error("No wallet connector is available.");
    }

    await wagmiConnect(wagmiConfig, {
      connector,
      chainId: CELO_MAINNET_CHAIN_ID,
    });

    setLastWalletType(isInjectedAvailable() ? "injected" : "walletconnect");
  }

  const provider = await ensureCeloMainnet();
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  const result = {
    provider,
    signer,
    address: getAddress(address),
    chainId: Number(network.chainId),
  };

  saveWalletState({
    address: result.address,
    chainId: result.chainId,
    isConnected: true,
    isWrongNetwork: result.chainId !== CELO_MAINNET_CHAIN_ID,
    walletAvailable: true,
  });

  return result;
};

export const getConnectedWalletAddress = async () => {
  const state = await readWalletState();
  return state.address;
};

const getReadProvider = () => readProvider;

const getContract = (runner: BrowserProvider | JsonRpcProvider | Awaited<ReturnType<typeof connectWallet>>["signer"]) => {
  assertContractConfigured();
  return new Contract(TIMELOCK_CONTRACT_ADDRESS, TIMELOCK_ABI, runner);
};

const buildGasEstimate = async (gasLimit: bigint, provider: BrowserProvider | JsonRpcProvider): Promise<GasEstimate> => {
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
  const feeWei = gasLimit * gasPrice;

  return {
    gasLimit,
    gasPrice,
    feeWei,
    feeCelo: formatEther(feeWei),
  };
};

const mapPayment = (
  paymentId: number,
  payment: {
    sender: string;
    recipient: string;
    amount: bigint;
    deadline: bigint;
    claimed: boolean;
    refunded: boolean;
  },
  viewer: string,
): TimeLockPaymentView => {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(payment.deadline);
  const normalizedViewer = viewer ? getAddress(viewer) : "";
  const sender = getAddress(payment.sender);
  const recipient = getAddress(payment.recipient);
  const isSender = normalizedViewer === sender;
  const isRecipient = normalizedViewer === recipient;
  const unlocked = now >= deadline;

  let status: TimeLockPaymentStatus = "locked";
  if (payment.refunded) {
    status = "refunded";
  } else if (payment.claimed) {
    status = "accepted";
  } else if (unlocked) {
    status = "ready";
  }

  return {
    id: paymentId,
    sender,
    recipient,
    amount: formatEther(payment.amount),
    amountWei: payment.amount,
    deadline,
    claimed: payment.claimed,
    refunded: payment.refunded,
    status,
    isSender,
    isRecipient,
    canAccept: isRecipient && !payment.claimed && !payment.refunded && unlocked,
    canRefund: isSender && !payment.claimed && !payment.refunded && !unlocked,
  };
};

export const getWalletBalance = async (address: string) => {
  if (!address || !isAddress(address)) {
    return "0";
  }

  const balance = await getReadProvider().getBalance(getAddress(address));
  return formatEther(balance);
};

export const getPayment = async (paymentId: number, viewerAddress = ""): Promise<TimeLockPaymentView> => {
  try {
    const provider = getReadProvider();
    const contract = getContract(provider);
    const payment = await contract.getPayment(paymentId);
    return mapPayment(paymentId, payment, viewerAddress);
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

export const getPaymentsForAddress = async (address: string): Promise<TimeLockPaymentView[]> => {
  if (!address || !isAddress(address)) {
    return [];
  }

  try {
    const normalizedAddress = getAddress(address);
    const provider = getReadProvider();
    const contract = getContract(provider);
    const paymentCount = Number(await contract.paymentCount());
    const incomingIds = ((await contract.getUserPayments(normalizedAddress)) as bigint[]).map((value) => Number(value));
    const paymentIds = new Set<number>(incomingIds);

    const allPayments = await Promise.all(
      Array.from({ length: paymentCount }, (_, index) => contract.getPayment(index).then((payment) => ({ index, payment }))),
    );

    allPayments.forEach(({ index, payment }) => {
      if (getAddress(payment.sender) === normalizedAddress) {
        paymentIds.add(index);
      }
    });

    const payments = await Promise.all(Array.from(paymentIds).map((paymentId) => getPayment(paymentId, normalizedAddress)));
    return payments.sort((left, right) => right.id - left.id);
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

const parsePaymentCreatedEvent = (logs: readonly { topics: readonly string[]; data: string }[]) => {
  for (const log of logs) {
    try {
      const parsed = contractInterface.parseLog(log);
      if (parsed?.name === "PaymentCreated") {
        return Number(parsed.args.paymentId);
      }
    } catch {
      continue;
    }
  }

  return null;
};

const validateCreatePaymentInput = (recipient: string, duration: number, amount: string) => {
  const normalizedRecipient = recipient.trim();
  const normalizedAmount = amount.trim();
  const parsedAmount = Number(normalizedAmount);

  if (!normalizedRecipient || !isAddress(normalizedRecipient)) {
    throw new Error("Enter a valid Celo wallet address.");
  }

  if (!normalizedAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Enter an amount greater than 0 CELO.");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Enter a valid lock duration greater than zero.");
  }
};

export const estimateCreatePaymentGas = async (recipient: string, duration: number, amount: string) => {
  validateCreatePaymentInput(recipient, duration, amount);

  const { signer, provider } = await connectWallet();
  const contract = getContract(signer);
  const gasLimit = await contract.createPayment.estimateGas(getAddress(recipient.trim()), BigInt(Math.floor(duration)), {
    value: parseEther(amount.trim()),
  });

  return buildGasEstimate(gasLimit, provider);
};

export const createPayment = async (recipient: string, duration: number, amount: string): Promise<CreatePaymentResult> => {
  validateCreatePaymentInput(recipient, duration, amount);

  try {
    const { signer } = await connectWallet();
    const contract = getContract(signer);
    const tx = await contract.createPayment(getAddress(recipient.trim()), BigInt(Math.floor(duration)), {
      value: parseEther(amount.trim()),
    });
    const receipt = await tx.wait();

    return {
      hash: receipt?.hash || tx.hash,
      paymentId: receipt ? parsePaymentCreatedEvent(receipt.logs) : null,
    };
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

export const estimatePaymentActionGas = async (paymentId: number, action: "accept" | "refund") => {
  const { signer, provider } = await connectWallet();
  const contract = getContract(signer);
  const gasLimit = action === "accept"
    ? await contract.acceptPayment.estimateGas(paymentId)
    : await contract.refundPayment.estimateGas(paymentId);

  return buildGasEstimate(gasLimit, provider);
};

export const acceptPayment = async (paymentId: number): Promise<ContractActionResult> => {
  try {
    const { signer } = await connectWallet();
    const contract = getContract(signer);
    const tx = await contract.acceptPayment(paymentId);
    const receipt = await tx.wait();

    return {
      hash: receipt?.hash || tx.hash,
    };
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

export const refundPayment = async (paymentId: number): Promise<ContractActionResult> => {
  try {
    const { signer } = await connectWallet();
    const contract = getContract(signer);
    const tx = await contract.refundPayment(paymentId);
    const receipt = await tx.wait();

    return {
      hash: receipt?.hash || tx.hash,
    };
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
};

export const subscribeToWalletEvents = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const unwatchConnection = watchConnection(wagmiConfig, {
    onChange: () => listener(),
  });
  const unwatchChain = watchChainId(wagmiConfig, {
    onChange: () => listener(),
  });

  return () => {
    unwatchConnection();
    unwatchChain();
  };
};
