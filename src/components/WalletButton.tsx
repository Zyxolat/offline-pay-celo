import { Wallet } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";

import { Button } from "@/components/ui/button";
import { useCelo } from "@/providers/CeloProvider";
import { formatWalletAddress } from "@/lib/wallet";

export default function WalletButton() {
  const { open } = useAppKit();
  const {
    address,
    isConnected,
    connecting,
    connectionError,
    connectionHint,
    connectionStatus,
    retryConnection,
    connect,
    openWalletManually,
    canOpenWalletManually,
  } = useCelo();

  const handlePrimaryAction = () => {
    if (isConnected && address) {
      return open({ view: "Account" });
    }

    if (connectionStatus === "failed") {
      return retryConnection();
    }

    return connect();
  };

  const label = connecting
    ? "Connecting..."
    : isConnected && address
      ? formatWalletAddress(address, 6, 4)
      : connectionStatus === "failed"
        ? "Retry Connection"
        : "Connect Wallet";

  return (
    <div className="flex min-w-[15rem] flex-col gap-2">
      <Button
        type="button"
        onClick={() => void handlePrimaryAction()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
        variant="outline"
      >
        <Wallet size={16} />
        {label}
      </Button>

      {connecting ? (
        <p className="px-1 text-xs text-slate-500">{connectionHint}</p>
      ) : null}

      {connectionStatus === "failed" ? (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p>{connectionError}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void retryConnection()}>
              Retry connection
            </Button>
            {canOpenWalletManually ? (
              <Button type="button" size="sm" variant="outline" onClick={() => void openWalletManually()}>
                Open wallet manually
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
