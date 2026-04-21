import { createConfig, http } from "wagmi";
import { celoAlfajores, celo } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

import { getWalletConnectProjectId } from "@/config/env";
import { isInjectedAvailable, isMiniPay } from "@/lib/wallet";

const walletConnectProjectId = getWalletConnectProjectId();

const isLocalhost = (hostname: string) =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

export const isSecureWalletConnectContext = () => {
  if (typeof window === "undefined") {
    return true;
  }

  return window.isSecureContext || isLocalhost(window.location.hostname);
};

export const getWalletConnectUnavailableReason = () => {
  if (!walletConnectProjectId) {
    return "WalletConnect is not configured. Set VITE_WALLETCONNECT_PROJECT_ID and try again.";
  }

  if (!isSecureWalletConnectContext()) {
    return "WalletConnect requires HTTPS on mobile. Open this app over HTTPS, then try again.";
  }

  return "";
};

export const getWalletConnectionErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (
    normalized.includes("walletconnect is not configured") ||
    normalized.includes("requires https on mobile") ||
    normalized.includes("relay.walletconnect.com") ||
    normalized.includes("websocket connection failed") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("network request failed") ||
    normalized.includes("transport closed")
  ) {
    return "Wallet connection failed. Please use Chrome or Safari.";
  }

  return message || "Wallet connection failed. Please use Chrome or Safari.";
};

const assertWalletConnectReady = () => {
  const reason = getWalletConnectUnavailableReason();

  if (reason) {
    throw new Error(reason);
  }
};

const connectors = [
  injected(),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
        }),
      ]
    : []),
];

export const config = createConfig({
  chains: [celoAlfajores, celo],
  connectors,
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

  assertWalletConnectReady();
  return getWalletConnectConnector();
};

export const getWalletConnectConnector = async (): Promise<WagmiConnector> => {
  assertWalletConnectReady();
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
