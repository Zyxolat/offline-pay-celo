import { BrowserProvider, isAddress, parseEther } from "ethers";

const ALFAJORES_CHAIN_ID = "0xaef3";
const ALFAJORES_CHAIN_ID_DECIMAL = 44787n;

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
}

interface ProviderError {
  code?: number | string;
  message?: string;
  data?: unknown;
}

export interface SendCeloResult {
  hash: string;
}

const getEthereumProvider = () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available. Install it and try again.");
  }

  return window.ethereum as EthereumProvider;
};

const ensureAlfajoresNetwork = async (ethereum: EthereumProvider) => {
  const provider = new BrowserProvider(ethereum);
  const network = await provider.getNetwork();

  if (network.chainId === ALFAJORES_CHAIN_ID_DECIMAL) {
    return;
  }

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ALFAJORES_CHAIN_ID }],
    });
  } catch (error) {
    const providerError = error as ProviderError;

    if (providerError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: ALFAJORES_CHAIN_ID,
            chainName: "Celo Alfajores Testnet",
            nativeCurrency: {
              name: "CELO",
              symbol: "CELO",
              decimals: 18,
            },
            rpcUrls: ["https://alfajores-forno.celo-testnet.org"],
            blockExplorerUrls: ["https://alfajores.celoscan.io"],
          },
        ],
      });
      return;
    }

    throw new Error("Please switch MetaMask to the Celo Alfajores Testnet.");
  }
};

const toFriendlyErrorMessage = (error: unknown) => {
  const providerError = error as ProviderError | undefined;
  const message = providerError?.message?.toLowerCase() ?? "";

  if (providerError?.code === 4001 || message.includes("user rejected")) {
    return "Transaction was cancelled in MetaMask.";
  }

  if (message.includes("invalid address") || message.includes("ens name")) {
    return "Enter a valid recipient wallet address.";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds to complete this transaction, including gas fees.";
  }

  if (message.includes("network") || message.includes("chain")) {
    return "Please connect MetaMask to the Celo Alfajores Testnet and try again.";
  }

  if (providerError?.message) {
    return providerError.message;
  }

  return "Unable to send CELO right now. Please try again.";
};

export async function sendCelo(recipient: string, amount: string): Promise<SendCeloResult> {
  const normalizedRecipient = recipient.trim();
  const normalizedAmount = amount.trim();

  if (!normalizedRecipient) {
    throw new Error("Recipient address is required.");
  }

  if (!isAddress(normalizedRecipient)) {
    throw new Error("Enter a valid recipient wallet address.");
  }

  if (!normalizedAmount || Number(normalizedAmount) <= 0) {
    throw new Error("Enter an amount greater than 0.");
  }

  try {
    const ethereum = getEthereumProvider();
    await ensureAlfajoresNetwork(ethereum);

    const provider = new BrowserProvider(ethereum);
    await provider.send("eth_requestAccounts", []);

    const signer = await provider.getSigner();
    const txResponse = await signer.sendTransaction({
      to: normalizedRecipient,
      value: parseEther(normalizedAmount),
    });

    console.log("CELO transaction submitted:", txResponse.hash);

    const receipt = await txResponse.wait();

    if (!receipt) {
      throw new Error("Transaction was submitted but no receipt was returned.");
    }

    console.log("CELO transaction confirmed:", receipt.hash);

    return {
      hash: receipt.hash,
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error));
  }
}
