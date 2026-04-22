type WalletDebugDetails = Record<string, unknown> | undefined;

declare global {
  interface Window {
    __offlinePayWalletLogs?: Array<{
      timestamp: string;
      event: string;
      details?: WalletDebugDetails;
    }>;
  }
}

const MAX_LOG_ENTRIES = 200;

export const logWalletConnection = (event: string, details?: WalletDebugDetails) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    details,
  };

  if (typeof window !== "undefined") {
    const logs = window.__offlinePayWalletLogs ?? [];
    logs.push(entry);

    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }

    window.__offlinePayWalletLogs = logs;
  }

  if (details) {
    console.log(`[wallet-connection] ${event}`, details);
    return;
  }

  console.log(`[wallet-connection] ${event}`);
};
