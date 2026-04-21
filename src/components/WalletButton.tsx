import { useState } from "react";
import { Loader2, LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { CELO_MAINNET_CHAIN_ID } from "@/config/celo";
import { toast } from "@/components/ui/sonner";
import {
  clearLastWalletType,
  formatWalletAddress,
  isInjectedAvailable,
  setLastWalletType,
} from "@/lib/wallet";
import {
  getInjectedConnector,
  getWalletConnectionErrorMessage,
  getWalletConnectConnector,
  preloadWalletConnect,
} from "@/lib/wagmi";

export default function WalletButton() {
  const { connectAsync, connectors, isPending, variables } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [loadingWalletConnect, setLoadingWalletConnect] = useState(false);

  const handleConnect = async () => {
    try {
      if (isInjectedAvailable()) {
        const injectedConnector = getInjectedConnector() ?? connectors[0];
        if (!injectedConnector) {
          throw new Error("No injected wallet connector is available.");
        }

        await connectAsync({ connector: injectedConnector, chainId: CELO_MAINNET_CHAIN_ID });
        setLastWalletType("injected");
        return;
      }

      setLoadingWalletConnect(true);
      const walletConnectConnector = await getWalletConnectConnector();
      await connectAsync({ connector: walletConnectConnector, chainId: CELO_MAINNET_CHAIN_ID });
      setLastWalletType("walletconnect");
    } catch (error) {
      const message = getWalletConnectionErrorMessage(error);
      console.error("Connection failed:", error);
      toast.error(message);
    } finally {
      setLoadingWalletConnect(false);
    }
  };

  const busy = isPending || loadingWalletConnect;
  const pendingConnectorName =
    loadingWalletConnect && !isInjectedAvailable()
      ? "WalletConnect"
      : variables?.connector?.name;

  if (isConnected && address) {
    return (
      <button
        type="button"
        onClick={() => {
          clearLastWalletType();
          disconnect();
        }}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
      >
        <LogOut size={16} />
        Disconnect {formatWalletAddress(address, 6, 4)}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onMouseEnter={() => {
          if (!isInjectedAvailable()) {
            void preloadWalletConnect().catch(() => {});
          }
        }}
        onFocus={() => {
          if (!isInjectedAvailable()) {
            void preloadWalletConnect().catch(() => {});
          }
        }}
        onClick={() => void handleConnect()}
        disabled={busy}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
        {busy ? `Connecting ${pendingConnectorName || "wallet"}...` : "Connect Wallet"}
      </button>
      {loadingWalletConnect ? (
        <p className="text-xs text-slate-500">Preparing wallet connection...</p>
      ) : null}
    </div>
  );
}
