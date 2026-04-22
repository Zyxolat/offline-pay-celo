function getViteEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isRootRelativeUrl(value: string) {
  return value.startsWith('/');
}

function isPlaceholderValue(value: string) {
  return /^(your_|replace_|example|changeme)/i.test(value);
}

function normalizeApiBaseUrl(value: string) {
  const normalized = value.replace(/\/+$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function getGoogleClientId() {
  const clientId = getViteEnv('VITE_GOOGLE_CLIENT_ID');

  if (clientId) {
    return clientId;
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is required in production.');
  }

  return '';
}

export const GOOGLE_CLIENT_ID = getGoogleClientId();

export function getApiBaseUrl() {
  const configured = getViteEnv('VITE_API_URL');

  if (configured) {
    if (!isAbsoluteHttpUrl(configured) && !isRootRelativeUrl(configured)) {
      throw new Error('VITE_API_URL must be an absolute http(s) URL or a root-relative path such as /api.');
    }

    return normalizeApiBaseUrl(configured);
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_API_URL is required in production.');
  }

  return 'http://localhost:3001/api';
}

export function getWalletConnectProjectId() {
  const projectId = getViteEnv('VITE_WALLETCONNECT_PROJECT_ID');

  if (projectId && !isPlaceholderValue(projectId)) {
    return projectId;
  }

  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required and must contain a real Reown project id.');
}

export function getTimeLockContractAddress() {
  const configured = getViteEnv('VITE_TIMELOCK_CONTRACT_ADDRESS');

  if (!configured) {
    return null;
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(configured)) {
    throw new Error('VITE_TIMELOCK_CONTRACT_ADDRESS must be a valid 0x-prefixed address.');
  }

  return configured;
}
