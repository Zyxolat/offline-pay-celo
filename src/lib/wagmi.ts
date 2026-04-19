import { createConfig, http } from "wagmi";
import { celoAlfajores, celo } from "wagmi/chains";
import { injected } from "wagmi/connectors";

import { isInjectedAvailable, isMiniPay } from "@/lib/wallet";

const WALLETCONNECT_PROJECT_ID = "9837d116c1ffcee9874d5614c7ceef10";

export const config = createConfig({
  chains: [celoAlfajores, celo],
  connectors: [injected()],
  transports: {
    [celoAlfajores.id]: http(),
    [celo.id]: http(),
  },
});

type WagmiConnector = (typeof config.connectors)[number];

let cachedWCConnector: WagmiConnector | null = null;
let walletConnectConnectorPromise: Promise<WagmiConnector> | null = null;
let wcImportPromise: Promise<typeof import("wagmi/connectors")> | null = null;

export const getInjectedConnector = (): WagmiConnector | undefined =>
  config.connectors.find(
    (connector) =>
      connector.id === "injected" ||
      connector.type === "injected" ||
      /minipay|injected|metamask/i.test(connector.name),
  );

export const preloadWalletConnect = () => {
  if (isInjectedAvailable() || isMiniPay()) {
    return null;
  }

  if (!wcImportPromise) {
    wcImportPromise = import("wagmi/connectors");
  }

  return wcImportPromise;
};

export const getWalletConnectConnector = async (): Promise<WagmiConnector> => {
  if (cachedWCConnector) {
    return cachedWCConnector;
  }

  if (!walletConnectConnectorPromise) {
    walletConnectConnectorPromise = (preloadWalletConnect() ?? import("wagmi/connectors")).then(({ walletConnect }) => {
      cachedWCConnector = config._internal.connectors.setup(
        walletConnect({
          projectId: WALLETCONNECT_PROJECT_ID,
        }),
      ) as WagmiConnector;

      return cachedWCConnector;
    });
  }

  return walletConnectConnectorPromise;
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
