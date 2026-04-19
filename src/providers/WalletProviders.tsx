import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { config as wagmiConfig } from "@/lib/wagmi";
import { CeloProvider } from "@/providers/CeloProvider";

export const WalletProviders = ({ children }: { children: ReactNode }) => (
  <WagmiProvider config={wagmiConfig}>
    <CeloProvider>{children}</CeloProvider>
  </WagmiProvider>
);

export default WalletProviders;
