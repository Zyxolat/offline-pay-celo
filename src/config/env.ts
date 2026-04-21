function getViteEnv(name: keyof ImportMetaEnv) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
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
    if (!isAbsoluteHttpUrl(configured)) {
      throw new Error('VITE_API_URL must be an absolute http(s) URL.');
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

  if (projectId) {
    return projectId;
  }

  if (import.meta.env.PROD) {
    throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required in production.');
  }

  console.warn('[env] WalletConnect is disabled until VITE_WALLETCONNECT_PROJECT_ID is set.');
  return null;
}
