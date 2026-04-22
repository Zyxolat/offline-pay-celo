import { useAppKit, useAppKitState } from "@reown/appkit/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAddress } from "viem";
import { useAccount } from "wagmi";
import { getAccount, watchAccount } from "wagmi/actions";

import { wagmiConfig } from "@/lib/reown";
import { getMobileWalletEnvironment, resolveManualWalletOpenUrl } from "@/lib/wallet";

export type WalletConnectionStatus = "idle" | "connecting" | "connected" | "failed";

const DEFAULT_TIMEOUT_MS = 15_000;

const TIMEOUT_MESSAGES = {
  default:
    "Wallet connection timed out after 15 seconds. Retry the connection or open your wallet manually, then return to the app.",
  chrome:
    "Wallet connection timed out after 15 seconds. Chrome may not have returned from the wallet app. Retry the connection or open the wallet manually, approve the request, then switch back to Chrome.",
  miniPay:
    "Wallet connection timed out after 15 seconds. Re-open the wallet modal in MiniPay and approve the request there before returning to OfflinePay.",
} as const;

type PendingConnection = {
  reject: (error: Error) => void;
  resolve: (address: string) => void;
};

export const useWalletConnection = (timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const { open } = useAppKit();
  const appKitState = useAppKitState();
  const { address, isConnected } = useAccount();
  const browser = useMemo(() => getMobileWalletEnvironment(), []);
  const [status, setStatus] = useState<WalletConnectionStatus>(() =>
    isConnected && address ? "connected" : "idle",
  );
  const [error, setError] = useState("");
  const timeoutRef = useRef<number | null>(null);
  const statusRef = useRef<WalletConnectionStatus>(status);
  const pendingRef = useRef<PendingConnection | null>(null);
  const promiseRef = useRef<Promise<string> | null>(null);
  const appKitStateRef = useRef(appKitState);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    appKitStateRef.current = appKitState;
  }, [appKitState]);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    promiseRef.current = null;
    clearTimeoutRef();
  }, [clearTimeoutRef]);

  const resolveConnectedAddress = useCallback(
    (rawAddress: string) => {
      const normalizedAddress = getAddress(rawAddress);
      clearPending();
      setError("");
      setStatus("connected");
      return normalizedAddress;
    },
    [clearPending],
  );

  const resolvePendingConnection = useCallback(
    (rawAddress: string) => {
      const pending = pendingRef.current;
      const normalizedAddress = resolveConnectedAddress(rawAddress);
      pending?.resolve(normalizedAddress);
      return normalizedAddress;
    },
    [resolveConnectedAddress],
  );

  const rejectPendingConnection = useCallback(
    (message: string) => {
      const pending = pendingRef.current;
      clearPending();
      setError(message);
      setStatus("failed");
      pending?.reject(new Error(message));
    },
    [clearPending],
  );

  const syncFromWagmi = useCallback(() => {
    const currentAccount = getAccount(wagmiConfig);

    if (currentAccount.isConnected && currentAccount.address) {
      resolvePendingConnection(currentAccount.address);
      return;
    }

    if (!pendingRef.current && statusRef.current === "connected") {
      setStatus("idle");
    }
  }, [resolvePendingConnection]);

  useEffect(() => {
    if (isConnected && address) {
      resolvePendingConnection(address);
      return;
    }

    if (!pendingRef.current && statusRef.current === "connected") {
      setStatus("idle");
    }
  }, [address, isConnected, resolvePendingConnection]);

  useEffect(() => {
    const unwatch = watchAccount(wagmiConfig, {
      onChange(account) {
        if (account.isConnected && account.address) {
          resolvePendingConnection(account.address);
          return;
        }

        if (!pendingRef.current && statusRef.current === "connected") {
          setStatus("idle");
        }
      },
    });

    return unwatch;
  }, [resolvePendingConnection]);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        syncFromWagmi();
      }
    };

    window.addEventListener("focus", syncFromWagmi);
    window.addEventListener("pageshow", syncFromWagmi);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.removeEventListener("focus", syncFromWagmi);
      window.removeEventListener("pageshow", syncFromWagmi);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [syncFromWagmi]);

  useEffect(() => () => {
    clearPending();
  }, [clearPending]);

  const manualWalletUrl = useMemo(() => {
    const wallet = appKitState.connectingWallet;
    if (typeof window === "undefined") {
      return null;
    }

    return resolveManualWalletOpenUrl(wallet?.walletInfo?.deepLink, window.location.href, browser);
  }, [appKitState.connectingWallet, browser]);

  const hint = useMemo(() => {
    if (browser.isMiniPay) {
      return "MiniPay works best through the wallet modal flow. Approve the session in MiniPay, then return to OfflinePay.";
    }

    if (browser.isChromeAndroid) {
      return "If Chrome does not return automatically, switch back after approving the request in your wallet app.";
    }

    return "Approve the request in your wallet, then come back to OfflinePay if the browser does not return automatically.";
  }, [browser]);

  const connect = useCallback(async () => {
    const currentAccount = getAccount(wagmiConfig);
    if (currentAccount.isConnected && currentAccount.address) {
      return resolveConnectedAddress(currentAccount.address);
    }

    if (promiseRef.current) {
      return promiseRef.current;
    }

    setError("");
    setStatus("connecting");

    promiseRef.current = new Promise<string>((resolve, reject) => {
      pendingRef.current = { resolve, reject };
    });

    timeoutRef.current = window.setTimeout(() => {
      rejectPendingConnection(
        browser.isMiniPay
          ? TIMEOUT_MESSAGES.miniPay
          : browser.isChromeAndroid
            ? TIMEOUT_MESSAGES.chrome
            : TIMEOUT_MESSAGES.default,
      );
    }, timeoutMs);

    try {
      await open({ view: "Connect" });
      syncFromWagmi();

      if (!pendingRef.current) {
        const latestAccount = getAccount(wagmiConfig);
        if (latestAccount.isConnected && latestAccount.address) {
          return resolveConnectedAddress(latestAccount.address);
        }

        throw new Error("Wallet connection was cancelled before it completed.");
      }

      const { connectingWallet, open: modalOpen } = appKitStateRef.current;
      if (!modalOpen && !connectingWallet) {
        rejectPendingConnection("Wallet connection was cancelled before it completed.");
      }
    } catch (openError) {
      rejectPendingConnection(
        openError instanceof Error ? openError.message : "Wallet connection failed. Please try again.",
      );
    }

    return promiseRef.current as Promise<string>;
  }, [browser.isChromeAndroid, browser.isMiniPay, open, rejectPendingConnection, resolveConnectedAddress, syncFromWagmi, timeoutMs]);

  const retryConnection = useCallback(() => connect(), [connect]);

  const openWalletManually = useCallback(async () => {
    if (manualWalletUrl && typeof window !== "undefined") {
      window.location.assign(manualWalletUrl);
      return;
    }

    await open({ view: "Connect" });
  }, [manualWalletUrl, open]);

  return {
    browser,
    canOpenWalletManually: true,
    connect,
    connectingWallet: appKitState.connectingWallet,
    error,
    hint,
    openWalletManually,
    retryConnection,
    status,
  };
};
