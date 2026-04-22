import { QueryClient } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { celo } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { getAddress } from "viem";
import { getAccount, watchAccount } from "wagmi/actions";

import { getWalletConnectProjectId } from "@/config/env";
import { logWalletConnection } from "@/lib/walletConnectionDebug";

const projectId = getWalletConnectProjectId();

const resolveWalletMetadataUrl = () => {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return "https://offline-pay-celo.vercel.app";
};

export const walletMetadata = {
  name: "OfflinePay",
  description: "Offline payments on Celo",
  url: resolveWalletMetadataUrl(),
  icons: ["https://offline-pay-celo.vercel.app/favicon.ico"],
} as const;

export const supportedNetworks = [celo] as const;

type ReownSingleton = {
  appKit: ReturnType<typeof createAppKit>;
  queryClient: QueryClient;
  wagmiAdapter: WagmiAdapter;
};

const globalReown = globalThis as typeof globalThis & {
  __offlinePayReown?: ReownSingleton;
};

const reownSingleton =
  globalReown.__offlinePayReown ??
  (() => {
    const queryClient = new QueryClient();
    const wagmiAdapter = new WagmiAdapter({
      projectId,
      networks: supportedNetworks,
      ssr: false,
    });
    const appKit = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      metadata: walletMetadata,
      networks: supportedNetworks,
      features: {
        analytics: true,
      },
    });

    logWalletConnection("appkit.initialized", {
      metadataUrl: walletMetadata.url,
      currentOrigin: typeof window !== "undefined" ? window.location.origin : "server",
    });

    const singleton = {
      appKit,
      queryClient,
      wagmiAdapter,
    };

    globalReown.__offlinePayReown = singleton;
    return singleton;
  })();

export const { appKit, queryClient, wagmiAdapter } = reownSingleton;

export const getWalletConnectionErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message || "Wallet connection failed. Please try again.";
};

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const openWalletConnectionModal = () => appKit.open({ view: "Connect" });

export const waitForWalletConnection = (timeoutMs = 15000) =>
  new Promise<string>((resolve, reject) => {
    const currentAccount = getAccount(wagmiConfig);

    if (currentAccount.isConnected && currentAccount.address) {
      resolve(getAddress(currentAccount.address));
      return;
    }

    const unsubscribe = watchAccount(wagmiConfig, {
      onChange(account) {
        if (account.isConnected && account.address) {
          window.clearTimeout(timeout);
          unsubscribe();
          resolve(getAddress(account.address));
        }
      },
    });

    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Wallet connection was not completed."));
    }, timeoutMs);
  });

export const requestWalletConnection = async (timeoutMs?: number) => {
  await openWalletConnectionModal();
  return waitForWalletConnection(timeoutMs);
};
