import { Wallet } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";

import { formatWalletAddress } from "@/lib/wallet";

export default function WalletButton() {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  return (
    <button
      type="button"
      onClick={() => void open()}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
    >
      <Wallet size={16} />
      {isConnected && address ? formatWalletAddress(address, 6, 4) : "Connect Wallet"}
    </button>
  );
}
