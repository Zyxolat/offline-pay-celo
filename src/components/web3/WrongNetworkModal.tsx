import { ExternalLink, Loader2, Radar } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WrongNetworkModalProps {
  open: boolean;
  onSwitchNetwork: () => Promise<void> | void;
  switchError?: string;
  switching?: boolean;
}

export const WrongNetworkModal = ({
  open,
  onSwitchNetwork,
  switchError = "",
  switching = false,
}: WrongNetworkModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-xl">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_35%),linear-gradient(160deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.96))] p-8 text-white shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
        <div className="mb-5 inline-flex rounded-3xl border border-emerald-300/20 bg-white/10 p-4 text-emerald-200">
          <Radar size={26} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200">Wrong Network Detected</p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight">Switch to Celo Mainnet</h2>
        <p className="mt-4 text-sm leading-7 text-slate-200">
          OfflinePay requires Celo Mainnet to process time-locked payments.
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          If the automatic switch does not complete, manually change your wallet network to Celo Mainnet and return here.
        </p>

        {switchError ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {switchError}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => void onSwitchNetwork()}
            disabled={switching}
            className="h-12 flex-1 rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          >
            {switching ? <Loader2 className="animate-spin" size={18} /> : null}
            Switch Network
          </Button>
          <Button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.assign("/learn-more");
              }
            }}
            variant="outline"
            className="h-12 flex-1 rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            <ExternalLink size={16} />
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WrongNetworkModal;
