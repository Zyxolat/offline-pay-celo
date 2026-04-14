/**
 * Convert hex string to ArrayBuffer
 */
export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Handle URL-safe base64 (with - and _)
  const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Detect if string is hex format
 */
function isHexString(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str) && str.length % 2 === 0;
}

/**
 * Convert a string (hex or base64) to ArrayBuffer
 */
export function stringToArrayBuffer(str: string): ArrayBuffer {
  if (isHexString(str)) {
    return hexToArrayBuffer(str);
  }
  return base64ToArrayBuffer(str);
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return arrayBufferToBase64(buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Process WebAuthn credential creation options
 */
export function processCredentialCreationOptions(options: any) {
  if (!options) return options;
  
  // Convert challenge from base64/hex string to ArrayBuffer
  if (typeof options.challenge === 'string') {
    options.challenge = stringToArrayBuffer(options.challenge);
  }
  
  // Convert user ID if it's a string
  if (options.user && typeof options.user.id === 'string') {
    options.user.id = stringToArrayBuffer(options.user.id);
  }
  
  return options;
}

/**
 * Process WebAuthn credential request options
 */
export function processCredentialRequestOptions(options: any) {
  if (!options) return options;
  
  // Convert challenge from base64/hex string to ArrayBuffer
  if (typeof options.challenge === 'string') {
    options.challenge = stringToArrayBuffer(options.challenge);
  }
  
  // Convert allowed credentials
  if (options.allowCredentials && Array.isArray(options.allowCredentials)) {
    options.allowCredentials = options.allowCredentials.map((cred: any) => ({
      ...cred,
      id: typeof cred.id === 'string' ? stringToArrayBuffer(cred.id) : cred.id,
    }));
  }
  
  return options;
}

const serializeTransports = (response: AuthenticatorResponse) => {
  if ('getTransports' in response && typeof response.getTransports === 'function') {
    return response.getTransports();
  }
  return undefined;
};

export function serializePublicKeyCredential(credential: PublicKeyCredential) {
  const response = credential.response;

  if (response instanceof AuthenticatorAttestationResponse) {
    return {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        attestationObject: arrayBufferToBase64Url(response.attestationObject),
        transports: serializeTransports(response),
      },
    };
  }

  if (response instanceof AuthenticatorAssertionResponse) {
    return {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
        authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
        signature: arrayBufferToBase64Url(response.signature),
        userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : null,
      },
    };
  }

  throw new Error('Unsupported credential response type');
}
