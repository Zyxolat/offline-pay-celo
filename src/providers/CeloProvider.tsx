import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAccount, useSwitchChain } from "wagmi";

import WrongNetworkModal from "@/components/web3/WrongNetworkModal";
import { CELO_MAINNET_CHAIN_ID, type OfflinePayWalletState } from "@/config/celo";
import { getWalletConnectionErrorMessage, requestWalletConnection } from "@/lib/reown";
import { readWalletState } from "@/utils/contract";

interface CeloContextValue extends OfflinePayWalletState {
  connecting: boolean;
  switchingNetwork: boolean;
  switchError: string;
  connect: () => Promise<string>;
  refreshWallet: (force?: boolean) => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const CeloContext = createContext<CeloContextValue | null>(null);

export const CeloProvider = ({ children }: { children: ReactNode }) => {
  const { address, chainId, isConnected, isConnecting } = useAccount();
  const { switchChainAsync, isPending: switchingNetwork, error: switchChainError } = useSwitchChain();

  const walletState = useMemo<OfflinePayWalletState>(
    () => ({
      address: address ?? "",
      chainId: chainId ?? null,
      isConnected,
      isWrongNetwork: Boolean(isConnected && chainId && chainId !== CELO_MAINNET_CHAIN_ID),
      walletAvailable: typeof window !== "undefined",
    }),
    [address, chainId, isConnected],
  );

  const switchError = switchChainError?.message || "";

  const refreshWallet = useCallback(async (force = false) => {
    await readWalletState(force);
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      if (isConnected && address) {
        return address;
      }

      return await requestWalletConnection();
    } catch (error) {
      throw new Error(getWalletConnectionErrorMessage(error));
    }
  }, [address, isConnected]);

  const handleSwitchNetwork = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: CELO_MAINNET_CHAIN_ID });
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Automatic switching was not completed. Please switch to Celo Mainnet manually in your wallet.",
      );
    }
  }, [switchChainAsync]);

  const value = useMemo<CeloContextValue>(
    () => ({
      ...walletState,
      connecting: isConnecting,
      switchingNetwork,
      switchError,
      connect: handleConnect,
      refreshWallet,
      switchNetwork: handleSwitchNetwork,
    }),
    [handleConnect, handleSwitchNetwork, isConnecting, refreshWallet, switchError, switchingNetwork, walletState],
  );

  return (
    <CeloContext.Provider value={value}>
      {children}
      <WrongNetworkModal
        open={walletState.isConnected && walletState.walletAvailable && walletState.isWrongNetwork}
        onSwitchNetwork={handleSwitchNetwork}
        switchError={switchError}
        switching={switchingNetwork}
      />
    </CeloContext.Provider>
  );
};

export const useCelo = () => {
  const value = useContext(CeloContext);

  if (!value) {
    throw new Error("useCelo must be used within a CeloProvider.");
  }

  return value;
};
