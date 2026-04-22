import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";

import { queryClient, wagmiAdapter } from "@/lib/reown";
import { CeloProvider } from "@/providers/CeloProvider";

export const WalletProviders = ({ children }: { children: ReactNode }) => (
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <CeloProvider>{children}</CeloProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

export default WalletProviders;
