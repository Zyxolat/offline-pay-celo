import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { normalizeError } from '../utils/logger.js';

const provider = new ethers.JsonRpcProvider(config.celo.rpcUrl);

const ERC20_ABI = [
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function approve(address spender, uint256 amount) public returns (bool)',
];

function getCUSDContractAddress() {
  return config.celo.cUSDAddress;
}

function getWithdrawSigner() {
  if (!config.celo.withdrawPrivateKey) {
    return null;
  }

  return new ethers.Wallet(config.celo.withdrawPrivateKey, provider);
}

export const celoService = {
  async getBalance(address: string): Promise<{ cUSD: string; CELO: string }> {
    try {
      // Get CELO balance
      const celoBalance = await provider.getBalance(address);
      const celoFormatted = ethers.formatEther(celoBalance);

      // Get cUSD balance
      const cUSDContract = new ethers.Contract(getCUSDContractAddress(), ERC20_ABI, provider);
      const cUSDBalance = await cUSDContract.balanceOf(address);
      const cUSDFormatted = ethers.formatUnits(cUSDBalance, 18);

      return {
        CELO: celoFormatted,
        cUSD: cUSDFormatted,
      };
    } catch (error) {
      console.error('Error fetching balance:', normalizeError(error));
      return { CELO: '0', cUSD: '0' };
    }
  },

  async validateAddress(address: string): Promise<boolean> {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  },

  async normalizeAddress(address: string): Promise<string> {
    return ethers.getAddress(address);
  },

  async estimateGasFee(): Promise<string> {
    try {
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        const gasEstimate = BigInt(21000); // Standard transfer cost
        const totalFee = gasEstimate * feeData.gasPrice;
        return ethers.formatEther(totalFee);
      }
      return '0.001'; // Default estimate
    } catch (error) {
      console.error('Error estimating gas:', normalizeError(error));
      return '0.001';
    }
  },

  async getTransactionStatus(txHash: string): Promise<{ status: string; confirmations: number } | null> {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) return null;

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
      };
    } catch (error) {
      console.error('Error getting transaction status:', normalizeError(error));
      return null;
    }
  },

  async submitTransaction(signedTx: string): Promise<string> {
    try {
      const response = await provider.broadcastTransaction(signedTx);
      return response.hash;
    } catch (error) {
      const normalizedError = normalizeError(error);
      console.error('Error submitting transaction:', normalizedError);
      throw new Error(`Failed to submit transaction: ${normalizedError.message}`);
    }
  },

  async verifyTransaction(signedTx: string): Promise<boolean> {
    try {
      const tx = ethers.Transaction.from(signedTx);
      return tx !== null;
    } catch {
      return false;
    }
  },

  async getConfiguredSignerAddress(): Promise<string | null> {
    return getWithdrawSigner()?.address ?? null;
  },

  async withdraw(params: { token: 'CELO' | 'cUSD'; destinationAddress: string; amount: string }): Promise<string> {
    const signer = getWithdrawSigner();

    if (!signer) {
      throw new Error('Withdraw signer is not configured. Set CELO_WITHDRAW_PRIVATE_KEY on the backend.');
    }

    const parsedAmount = ethers.parseUnits(params.amount, 18);

    if (params.token === 'CELO') {
      const tx = await signer.sendTransaction({
        to: params.destinationAddress,
        value: parsedAmount,
      });
      return tx.hash;
    }

    const contract = new ethers.Contract(getCUSDContractAddress(), ERC20_ABI, signer);
    const tx = await contract.transfer(params.destinationAddress, parsedAmount);
    return tx.hash;
  },

  // Derive wallet from credential (simplified - in real scenario use more secure methods)
  generateWalletAddress(): string {
    const wallet = ethers.Wallet.createRandom();
    return wallet.address;
  },
};
