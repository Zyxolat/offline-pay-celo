import api from './api.js';

export const authAPI = {
  googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),
  registerOptions: (email: string) => api.post('/auth/webauthn/register/options', { email }),
  registerVerify: (email: string, credential: any) =>
    api.post('/auth/webauthn/register/verify', { email, credential }),
  loginOptions: (email: string) => api.post('/auth/webauthn/login/options', { email }),
  loginVerify: (email: string, credential: any) =>
    api.post('/auth/webauthn/login/verify', { email, credential }),
  logout: () => api.post('/auth/logout'),
};

export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  
  getAddress: () => api.get('/wallet/address'),
  
  getTransactions: (limit = 50, offset = 0) =>
    api.get('/wallet/transactions', { params: { limit, offset } }),

  withdraw: (destinationAddress: string, token: 'CELO' | 'cUSD', amount: string) =>
    api.post('/wallet/withdraw', { destinationAddress, token, amount }),
};

export const paymentAPI = {
  authorizeChallenge: (recipient: string, amount: string, currency: string, note?: string) =>
    api.post('/payments/authorize/challenge', { recipient, amount, currency, note }),
  
  authorizeVerify: (paymentId: string, credentialId: string, response: any) =>
    api.post('/payments/authorize/verify', { paymentId, credentialId, response }),
  
  submitPayment: (paymentId: string, signedTx: string, offline = false) =>
    api.post('/payments/submit', { paymentId, signedTx, offline }),
};

export const queueAPI = {
  addToQueue: (recipient: string, amount: string, currency: string, signedTx: string, note?: string) =>
    api.post('/queue/add', { recipient, amount, currency, signedTx, note, timestamp: new Date() }),
  
  getPending: () => api.get('/queue/pending'),
  
  sync: (queueIds?: string[]) => 
    api.post('/queue/sync', { queueIds }),
};

export const transactionAPI = {
  getDetail: (txId: string) => api.get(`/transactions/${txId}`),
  
  getStatusBatch: (txHashes: string[]) =>
    api.get('/transactions/status/batch', { params: { txHashes } }),
};
