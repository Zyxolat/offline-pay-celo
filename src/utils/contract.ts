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

import { TIMELOCK_ABI, TIMELOCK_CONTRACT_ADDRESS } from "@/contracts/TimeLock";

const ALFAJORES_CHAIN_ID_HEX = "0xaef3";
const ALFAJORES_CHAIN_ID_DECIMAL = 44787n;
const ALFAJORES_RPC_URL = import.meta.env.VITE_CELO_ALFAJORES_RPC_URL || "https://alfajores-forno.celo-testnet.org";

const contractInterface = new Interface(TIMELOCK_ABI);

interface ProviderError {
  code?: number | string;
  message?: string;
}

export type TimeLockPaymentStatus = "pending" | "accepted" | "expired" | "refunded";

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

const getFriendlyErrorMessage = (error: unknown) => {
  const providerError = error as ProviderError | undefined;
  const message = providerError?.message?.toLowerCase() ?? "";

  if (providerError?.code === 4001 || message.includes("user rejected")) {
    return "Transaction was cancelled in MetaMask.";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds to cover the locked CELO amount and gas fees.";
  }

  if (message.includes("wrong network") || message.includes("switch")) {
    return "Please switch MetaMask to Celo Alfajores.";
  }

  if (message.includes("invalid address") || message.includes("ens")) {
    return "Enter a valid Celo wallet address.";
  }

  if (message.includes("payment deadline passed")) {
    return "This payment expired before it could be accepted.";
  }

  if (message.includes("payment is still active")) {
    return "This payment has not expired yet, so it cannot be refunded.";
  }

  if (message.includes("only recipient can accept")) {
    return "Only the intended recipient can accept this payment.";
  }

  if (message.includes("only sender can refund")) {
    return "Only the sender can reclaim this expired payment.";
  }

  if (providerError?.message) {
    return providerError.message;
  }

  return "Something went wrong while talking to the contract.";
};

const assertContractConfigured = () => {
  if (!TIMELOCK_CONTRACT_ADDRESS || !isAddress(TIMELOCK_CONTRACT_ADDRESS)) {
    throw new Error("Set VITE_TIMELOCK_CONTRACT_ADDRESS to your deployed TimeLockPayments contract.");
  }
};

const getEthereumProvider = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available. Install it and try again.");
  }

  return window.ethereum;
};

export const ensureAlfajoresNetwork = async () => {
  const ethereum = getEthereumProvider();
  const provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();

  if (network.chainId === ALFAJORES_CHAIN_ID_DECIMAL) {
    return provider;
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ALFAJORES_CHAIN_ID_HEX }],
    });
  } catch (error) {
    const providerError = error as ProviderError;

    if (providerError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ALFAJORES_CHAIN_ID_HEX,
            chainName: "Celo Alfajores Testnet",
            nativeCurrency: {
              name: "CELO",
              symbol: "CELO",
              decimals: 18,
            },
            rpcUrls: [ALFAJORES_RPC_URL],
            blockExplorerUrls: ["https://alfajores.celoscan.io"],
          },
        ],
      });
    } else {
      throw new Error("Please switch MetaMask to the Celo Alfajores Testnet.");
    }
  }

  return new BrowserProvider(ethereum);
};

export const connectWallet = async () => {
  const provider = await ensureAlfajoresNetwork();
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return {
    provider,
    signer,
    address: getAddress(address),
  };
};

export const getConnectedWalletAddress = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    return "";
  }

  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  const firstAccount = Array.isArray(accounts) ? accounts[0] : "";
  if (typeof firstAccount !== "string" || !firstAccount) {
    return "";
  }

  return getAddress(firstAccount);
};

const getReadProvider = () => {
  return new JsonRpcProvider(ALFAJORES_RPC_URL);
};

const getContract = (runner: BrowserProvider | JsonRpcProvider | Awaited<ReturnType<typeof connectWallet>>["signer"]) => {
  assertContractConfigured();
  return new Contract(TIMELOCK_CONTRACT_ADDRESS, TIMELOCK_ABI, runner);
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
  const expired = now > deadline;

  let status: TimeLockPaymentStatus = "pending";
  if (payment.refunded) {
    status = "refunded";
  } else if (payment.claimed) {
    status = "accepted";
  } else if (expired) {
    status = "expired";
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
    canAccept: isRecipient && !payment.claimed && !payment.refunded && !expired,
    canRefund: isSender && !payment.claimed && !payment.refunded && expired,
  };
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

export const createPayment = async (recipient: string, duration: number, amount: string): Promise<CreatePaymentResult> => {
  const normalizedRecipient = recipient.trim();
  const normalizedAmount = amount.trim();

  if (!normalizedRecipient || !isAddress(normalizedRecipient)) {
    throw new Error("Enter a valid Celo wallet address.");
  }

  if (!normalizedAmount || Number(normalizedAmount) <= 0) {
    throw new Error("Enter an amount greater than 0.");
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Enter a deadline duration greater than 0 seconds.");
  }

  try {
    const { signer } = await connectWallet();
    const contract = getContract(signer);
    const tx = await contract.createPayment(getAddress(normalizedRecipient), BigInt(Math.floor(duration)), {
      value: parseEther(normalizedAmount),
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
