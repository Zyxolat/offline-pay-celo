import { Wallet } from "lucide-react";

import { formatWalletAddress } from "@/lib/wallet";

interface WalletCardProps {
  address?: string;
  balance?: string;
  balanceLabel?: string;
  subtitle?: string;
  loading?: boolean;
  statusLabel?: string;
}

export const WalletCard = ({
  address,
  balance,
  balanceLabel = "Available Balance",
  subtitle,
  loading = false,
  statusLabel = "Connected",
}: WalletCardProps) => {
  return (
    <section className="wallet-card">
      <div className="wallet-card__top">
        <div>
          <p className="wallet-card__label text-black">{balanceLabel}</p>
        </div>
        <div className="wallet-card__status">
          <span className="wallet-card__status-dot" aria-hidden="true" />
          {statusLabel}
        </div>
      </div>

      {loading ? (
        <div className="wallet-card__loading" aria-live="polite">
          <div className="wallet-card__skeleton wallet-card__skeleton--lg" />
          <div className="wallet-card__skeleton wallet-card__skeleton--sm" />
          <div className="wallet-card__skeleton wallet-card__skeleton--md" />
        </div>
      ) : (
        <>
          <div className="wallet-card__amount wallet-balance">{balance ?? "--"}</div>
          {subtitle ? <p className="wallet-card__meta">{subtitle}</p> : null}
          <div className="wallet-card__address">
            <span className="wallet-card__label">Wallet</span>
            <div>{address ? formatWalletAddress(address, 10, 8) : "Address unavailable"}</div>
          </div>
        </>
      )}

      <div className="wallet-card__bottom">
        <div className="wallet-card__meta">Secure local wallet for offline-ready settlement</div>
        <Wallet size={18} color="#0f172a" />
      </div>
    </section>
  );
};

export default WalletCard;
