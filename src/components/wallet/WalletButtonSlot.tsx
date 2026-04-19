import WalletButton from "@/components/WalletButton";
import WalletProviders from "@/providers/WalletProviders";

const WalletButtonSlot = () => (
  <WalletProviders>
    <WalletButton />
  </WalletProviders>
);

export default WalletButtonSlot;
