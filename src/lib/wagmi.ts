import { createConfig, http } from "wagmi";
import { celoAlfajores, celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { isInjectedAvailable, isMiniPay } from "@/lib/wallet";

const WALLETCONNECT_PROJECT_ID = "9837d116c1ffcee9874d5614c7ceef10";

export const config = createConfig({
  chains: [celoAlfajores, celo],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
    }),
  ],
  transports: {
    [celoAlfajores.id]: http(),
    [celo.id]: http(),
  },
});

type WagmiConnector = (typeof config.connectors)[number];

export const getInjectedConnector = (): WagmiConnector | undefined =>
  config.connectors.find(
    (connector) =>
      connector.id === "injected" ||
      connector.type === "injected" ||
      /minipay|injected|metamask/i.test(connector.name),
  );

export const preloadWalletConnect = async () => {
  if (isInjectedAvailable() || isMiniPay()) {
    return null;
  }

  return getWalletConnectConnector();
};

export const getWalletConnectConnector = async (): Promise<WagmiConnector> => {
  const connector = config.connectors.find((item) => item.id === "walletConnect");
  if (!connector) {
    throw new Error("WalletConnect connector is not configured.");
  }

  return connector as WagmiConnector;
};

export const getPreferredConnector = async (): Promise<WagmiConnector> => {
  if (isInjectedAvailable()) {
    const injectedConnector = getInjectedConnector();
    if (injectedConnector) {
      return injectedConnector;
    }
  }

  return getWalletConnectConnector();
};
