import OfflinePaymentDemo from "@/components/landing/OfflinePaymentDemo";
import WalletProviders from "@/providers/WalletProviders";

const OfflinePaymentDemoSection = () => (
  <WalletProviders>
    <OfflinePaymentDemo />
  </WalletProviders>
);

export default OfflinePaymentDemoSection;
