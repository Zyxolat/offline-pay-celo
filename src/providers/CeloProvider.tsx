import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useAccount, useSwitchChain } from "wagmi";

import WrongNetworkModal from "@/components/web3/WrongNetworkModal";
import { type WalletConnectionStatus, useWalletConnection } from "@/hooks/useWalletConnection";
import { CELO_MAINNET_CHAIN_ID, type OfflinePayWalletState } from "@/config/celo";
import { readWalletState } from "@/utils/contract";
import type { MobileWalletEnvironment } from "@/lib/wallet";

interface CeloContextValue extends OfflinePayWalletState {
  connecting: boolean;
  connectionError: string;
  connectionHint: string;
  connectionStatus: WalletConnectionStatus;
  mobileWallet: MobileWalletEnvironment;
  switchingNetwork: boolean;
  switchError: string;
  retryConnection: () => Promise<string>;
  openWalletManually: () => Promise<void>;
  canOpenWalletManually: boolean;
  connect: () => Promise<string>;
  refreshWallet: (force?: boolean) => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const CeloContext = createContext<CeloContextValue | null>(null);

export const CeloProvider = ({ children }: { children: ReactNode }) => {
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending: switchingNetwork, error: switchChainError } = useSwitchChain();
  const walletConnection = useWalletConnection();

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
    return walletConnection.connect();
  }, [walletConnection]);

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
      connecting: walletConnection.status === "connecting",
      connectionError: walletConnection.error,
      connectionHint: walletConnection.hint,
      connectionStatus: walletConnection.status,
      mobileWallet: walletConnection.browser,
      switchingNetwork,
      switchError,
      retryConnection: walletConnection.retryConnection,
      openWalletManually: walletConnection.openWalletManually,
      canOpenWalletManually: walletConnection.canOpenWalletManually,
      connect: handleConnect,
      refreshWallet,
      switchNetwork: handleSwitchNetwork,
    }),
    [handleConnect, handleSwitchNetwork, refreshWallet, switchError, switchingNetwork, walletConnection, walletState],
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
