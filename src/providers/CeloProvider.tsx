import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import WrongNetworkModal from "@/components/web3/WrongNetworkModal";
import type { OfflinePayWalletState } from "@/config/celo";
import {
  connectWallet,
  readWalletState,
  subscribeToWalletEvents,
  switchToCeloMainnet,
} from "@/utils/contract";

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
  const [walletState, setWalletState] = useState<OfflinePayWalletState>(defaultWalletState);
  const [connecting, setConnecting] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const refreshWallet = useCallback(async (force = false) => {
    const nextState = await readWalletState(force);
    setWalletState(nextState);
  }, []);

  useEffect(() => {
    void refreshWallet();

    const unsubscribe = subscribeToWalletEvents(() => {
      setSwitchError("");
      void refreshWallet(true);
    });

    return unsubscribe;
  }, [refreshWallet]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);

    try {
      const result = await connectWallet();
      setWalletState({
        address: result.address,
        chainId: result.chainId,
        isConnected: true,
        isWrongNetwork: result.chainId !== 42220,
        walletAvailable: true,
      });
      setSwitchError("");
      return result.address;
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleSwitchNetwork = useCallback(async () => {
    setSwitchingNetwork(true);
    setSwitchError("");

    try {
      await switchToCeloMainnet();
      await refreshWallet(true);
    } catch (error) {
      setSwitchError(
        error instanceof Error
          ? error.message
          : "Automatic switching was not completed. Please switch to Celo Mainnet manually in your wallet.",
      );
    } finally {
      setSwitchingNetwork(false);
    }
  }, [refreshWallet]);

  const value = useMemo<CeloContextValue>(
    () => ({
      ...walletState,
      connecting,
      switchingNetwork,
      switchError,
      connect: handleConnect,
      refreshWallet,
      switchNetwork: handleSwitchNetwork,
    }),
    [connecting, handleConnect, handleSwitchNetwork, refreshWallet, switchError, switchingNetwork, walletState],
  );

  return (
    <CeloContext.Provider value={value}>
      {children}
      <WrongNetworkModal
        open={walletState.walletAvailable && walletState.isWrongNetwork}
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
