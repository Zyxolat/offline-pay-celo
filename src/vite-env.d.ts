/// <reference types="vite/client" />

interface EthereumRequestArguments {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface EthereumProvider {
  request: (args: EthereumRequestArguments) => Promise<unknown>;
}

interface Window {
  ethereum?: EthereumProvider;
}
