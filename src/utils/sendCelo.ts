import { formatEther, isAddress, parseEther } from "ethers";

import { connectWallet } from "@/utils/contract";

interface ProviderError {
  code?: number | string;
  message?: string;
  data?: unknown;
}

export interface SendCeloResult {
  hash: string;
}

const toFriendlyErrorMessage = (error: unknown) => {
  const providerError = error as ProviderError | undefined;
  const message = providerError?.message?.toLowerCase() ?? "";

  if (providerError?.code === 4001 || message.includes("user rejected")) {
    return "Transaction was cancelled in your wallet.";
  }

  if (message.includes("invalid address") || message.includes("ens name")) {
    return "Enter a valid recipient wallet address.";
  }

  if (message.includes("insufficient funds")) {
    return "Insufficient funds to complete this transaction, including gas fees.";
  }

  if (message.includes("network") || message.includes("chain")) {
    return "Please connect your wallet to Celo Mainnet and try again.";
  }

  if (providerError?.message) {
    return providerError.message;
  }

  return "Unable to send CELO right now. Please try again.";
};

const validateTransferInput = (recipient: string, amount: string) => {
  const normalizedRecipient = recipient.trim();
  const normalizedAmount = amount.trim();

  if (!normalizedRecipient) {
    throw new Error("Recipient address is required.");
  }

  if (!isAddress(normalizedRecipient)) {
    throw new Error("Enter a valid recipient wallet address.");
  }

  if (!normalizedAmount || Number.isNaN(Number(normalizedAmount)) || Number(normalizedAmount) <= 0) {
    throw new Error("Enter an amount greater than 0.");
  }
};

export async function estimateSendCeloGas(recipient: string, amount: string) {
  validateTransferInput(recipient, amount);

  const { signer, provider } = await connectWallet();
  const txRequest = {
    to: recipient.trim(),
    value: parseEther(amount.trim()),
  };
  const gasLimit = await signer.estimateGas(txRequest);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
  const feeWei = gasLimit * gasPrice;

  return {
    gasLimit,
    gasPrice,
    feeWei,
    feeCelo: formatEther(feeWei),
  };
}

export async function sendCelo(recipient: string, amount: string): Promise<SendCeloResult> {
  validateTransferInput(recipient, amount);

  try {
    const { signer } = await connectWallet();
    const txResponse = await signer.sendTransaction({
      to: recipient.trim(),
      value: parseEther(amount.trim()),
    });

    const receipt = await txResponse.wait();

    if (!receipt) {
      throw new Error("Transaction was submitted but no receipt was returned.");
    }

    return {
      hash: receipt.hash,
    };
  } catch (error) {
    throw new Error(toFriendlyErrorMessage(error));
  }
}
