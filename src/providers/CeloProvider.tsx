import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useSwitchChain } from "wagmi";

import WrongNetworkModal from "@/components/web3/WrongNetworkModal";
import { CELO_MAINNET_CHAIN_ID, type OfflinePayWalletState } from "@/config/celo";
import { getLastWalletType, isInjectedAvailable, setLastWalletType } from "@/lib/wallet";
import { getInjectedConnector, getPreferredConnector, getWalletConnectionErrorMessage } from "@/lib/wagmi";

interface CeloContextValue extends OfflinePayWalletState {
  connecting: boolean;
  switchingNetwork: boolean;
  switchError: string;
  connect: () => Promise<string>;
  refreshWallet: (force?: boolean) => Promise<void>;
  switchNetwork: () => Promise<void>;
}

const defaultWalletState: OfflinePayWalletState = {
  address: "",
  chainId: null,
  isConnected: false,
  isWrongNetwork: false,
  walletAvailable: false,
};

const CeloContext = createContext<CeloContextValue | null>(null);

export const CeloProvider = ({ children }: { children: ReactNode }) => {
  const { address, chainId, isConnected, isConnecting } = useAccount();
  const { connectAsync, connectors, error: connectError } = useConnect();
  const { switchChainAsync, isPending: switchingNetwork, error: switchChainError } = useSwitchChain();
  const hasAttemptedReconnectRef = useRef(false);

  const walletState = useMemo<OfflinePayWalletState>(
    () => ({
      address: address ?? "",
      chainId: chainId ?? null,
      isConnected,
      isWrongNetwork: Boolean(isConnected && chainId && chainId !== CELO_MAINNET_CHAIN_ID),
      walletAvailable: connectors.length > 0 || !isInjectedAvailable() || typeof window !== "undefined",
    }),
    [address, chainId, connectors.length, isConnected],
  );

  const switchError = switchChainError?.message || "";

  const refreshWallet = useCallback(async (_force = false) => {
    return;
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const preferredConnector = await getPreferredConnector();
      if (!preferredConnector) {
        throw new Error("No wallet connector is available.");
      }

      const result = await connectAsync({
        connector: preferredConnector,
        chainId: CELO_MAINNET_CHAIN_ID,
      });
      setLastWalletType(preferredConnector.id === "walletConnect" ? "walletconnect" : "injected");

      return result.accounts[0];
    } catch (error) {
      throw new Error(getWalletConnectionErrorMessage(error));
    }
  }, [connectAsync]);

  useEffect(() => {
    if (hasAttemptedReconnectRef.current || isConnected || isConnecting) {
      return;
    }

    hasAttemptedReconnectRef.current = true;

    if (getLastWalletType() !== "injected" || !isInjectedAvailable()) {
      return;
    }

    const injectedConnector = getInjectedConnector() ?? connectors[0];
    if (!injectedConnector) {
      return;
    }

    void connectAsync({
      connector: injectedConnector,
      chainId: CELO_MAINNET_CHAIN_ID,
    }).catch((error) => {
      console.error("Injected wallet reconnect failed:", error);
    });
  }, [connectAsync, connectors, isConnected, isConnecting]);

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
        switchError={switchError || (connectError ? getWalletConnectionErrorMessage(connectError) : "")}
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
