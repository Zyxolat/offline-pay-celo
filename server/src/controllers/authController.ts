import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { ChallengeModel } from '../models/Challenge.js';
import { CredentialModel } from '../models/Credential.js';
import { AuthSessionModel } from '../models/AuthSession.js';
import { User, UserModel } from '../models/User.js';
import { config } from '../config/index.js';
import { webauthnConfig } from '../config/webauthn.js';
import { tokenService } from '../services/tokenService.js';
import { celoService } from '../services/celoService.js';
import { errorResponse, successResponse, validateEmail } from '../utils/validators.js';

const googleClient = new OAuth2Client(config.google.clientId || undefined);

const encodeBase64Url = (buffer: Uint8Array | Buffer) =>
  Buffer.from(buffer).toString('base64url');

const roleForUser = (user: User): 'admin' | 'user' => (user.is_admin ? 'admin' : 'user');
const localhostOriginPattern = /^https?:\/\/localhost(?::\d+)?$/;

const buildSessionUser = (user: User) => ({
  id: user.id,
  email: user.email,
  role: roleForUser(user),
  isAdmin: Boolean(user.is_admin),
  walletAddress: user.wallet_address,
});

const issueSession = async (user: User, authMethod: 'google' | 'passkey') => {
  const role = roleForUser(user);
  const sessionToken = tokenService.generateToken({
    userId: user.id,
    email: user.email,
    role,
    authMethod,
  });

  await AuthSessionModel.create(sessionToken, {
    userId: user.id,
    isAdmin: role === 'admin',
    sessionType: authMethod,
  });

  return sessionToken;
};

const parseOriginHost = (origin: string) => {
  try {
    return new URL(origin).hostname;
  } catch {
    return '';
  }
};

const getCredentialResponseOrigin = (credential?: {
  response?: { clientDataJSON?: string };
}) => {
  const clientDataJSON = credential?.response?.clientDataJSON;
  if (!clientDataJSON) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(clientDataJSON, 'base64url').toString('utf8')
    ) as { origin?: string };
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const getExpectedOrigins = (
  requestOrigin?: string,
  credential?: { response?: { clientDataJSON?: string } }
) => {
  const origins = new Set<string>();
  const credentialOrigin = getCredentialResponseOrigin(credential);

  if (config.webauthn.origin) {
    origins.add(config.webauthn.origin);
  }

  if (config.frontend.url) {
    origins.add(config.frontend.url);
  }

  if (
    config.nodeEnv !== 'production' &&
    requestOrigin &&
    localhostOriginPattern.test(requestOrigin) &&
    parseOriginHost(requestOrigin) === config.webauthn.rpID
  ) {
    origins.add(requestOrigin);
  }

  if (
    config.nodeEnv !== 'production' &&
    credentialOrigin &&
    localhostOriginPattern.test(credentialOrigin) &&
    parseOriginHost(credentialOrigin) === config.webauthn.rpID
  ) {
    origins.add(credentialOrigin);
  }

  return Array.from(origins);
};

export const authController = {
  async google(req: AuthRequest, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return errorResponse(res, 'Google ID token is required', 400);
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email || !payload.email_verified) {
        return errorResponse(res, 'Invalid Google account payload', 401);
      }

      const existingByGoogle = await UserModel.findByGoogleId(payload.sub);
      let user = existingByGoogle;

      if (!user) {
        const walletAddress = celoService.generateWalletAddress();
        user = await UserModel.upsertGoogleUser(payload.email, payload.sub, walletAddress);
      }

      const sessionToken = await issueSession(user, 'google');

      successResponse(res, {
        sessionToken,
        user: buildSessionUser(user),
      });
    } catch (error) {
      console.error('Google auth error:', error);
      errorResponse(res, 'Google authentication failed', 401);
    }
  },

  async webauthnRegisterOptions(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;
      if (!email || !validateEmail(email)) {
        return errorResponse(res, 'A valid email is required', 400);
      }

      let user = await UserModel.findByEmail(email);
      if (!user) {
        user = await UserModel.create(email, celoService.generateWalletAddress());
      }

      const existingCredentials = await CredentialModel.findByUserId(user.id);
      const excludeCredentials = existingCredentials.map((credential) => ({
        id: Buffer.from(credential.credential_id, 'base64url'),
        type: 'public-key' as const,
        transports: credential.transports as AuthenticatorTransport[],
      }));

      const options = await webauthnConfig.generateRegistrationOptions(
        user.id,
        user.email,
        excludeCredentials
      );

      await ChallengeModel.create(Buffer.from(options.challenge, 'base64url'), 'registration', user.id);

      successResponse(res, options);
    } catch (error) {
      console.error('Passkey registration options error:', error);
      errorResponse(res, 'Failed to generate passkey registration options', 500);
    }
  },

  async webauthnRegisterVerify(req: AuthRequest, res: Response) {
    try {
      const { email, credential } = req.body;
      if (!email || !credential) {
        return errorResponse(res, 'Email and credential are required', 400);
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 'User not found for passkey registration', 404);
      }

      const challenge = await ChallengeModel.findLatestActiveByUser(user.id, 'registration');
      if (!challenge) {
        return errorResponse(res, 'Registration challenge expired', 400);
      }

      const expectedOrigins = getExpectedOrigins(req.headers.origin, credential);

      const verification = (await webauthnConfig.verifyRegistrationResponse({
        response: credential,
        expectedChallenge: Buffer.from(challenge.challenge).toString('base64url'),
        expectedOrigin: expectedOrigins,
        expectedRPID: config.webauthn.rpID,
      })) as VerifiedRegistrationResponse;

      if (!verification.verified || !verification.registrationInfo) {
        return errorResponse(res, 'Passkey registration verification failed', 400);
      }

      const {
        credentialID,
        credentialPublicKey,
        counter,
        credentialDeviceType,
        credentialBackedUp,
      } = verification.registrationInfo;

      const credentialId = encodeBase64Url(credentialID);
      const existingCredential = await CredentialModel.findByCredentialId(credentialId);
      if (!existingCredential) {
        await CredentialModel.create(
          user.id,
          credentialId,
          Buffer.from(credentialPublicKey),
          {
            credentialDeviceType,
            credentialBackedUp,
          },
          credential.response?.transports || []
        );
      }

      await CredentialModel.updateCounter(credentialId, counter);
      const updatedUser = await UserModel.setPasskeyId(user.id, credentialId);
      await ChallengeModel.delete(challenge.id);

      const sessionToken = await issueSession(updatedUser, 'passkey');
      successResponse(
        res,
        {
          sessionToken,
          user: buildSessionUser(updatedUser),
        },
        201
      );
    } catch (error) {
      console.error('Passkey registration verify error:', {
        error,
        requestOrigin: req.headers.origin,
        credentialOrigin: getCredentialResponseOrigin(req.body?.credential),
        expectedOrigins: getExpectedOrigins(req.headers.origin, req.body?.credential),
      });
      errorResponse(res, 'Failed to verify passkey registration', 400);
    }
  },

  async webauthnLoginOptions(req: AuthRequest, res: Response) {
    try {
      const { email } = req.body;
      if (!email || !validateEmail(email)) {
        return errorResponse(res, 'A valid email is required', 400);
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 'No account found for that email', 404);
      }

      const credentials = await CredentialModel.findByUserId(user.id);
      if (credentials.length === 0) {
        return errorResponse(res, 'No passkey registered for this account', 404);
      }

      const allowCredentials = credentials.map((credential) => ({
        id: Buffer.from(credential.credential_id, 'base64url'),
        type: 'public-key' as const,
        transports: credential.transports as AuthenticatorTransport[],
      }));

      const options = await webauthnConfig.generateAuthenticationOptions(allowCredentials);
      await ChallengeModel.create(Buffer.from(options.challenge, 'base64url'), 'login', user.id);

      successResponse(res, options);
    } catch (error) {
      console.error('Passkey login options error:', error);
      errorResponse(res, 'Failed to generate passkey login options', 500);
    }
  },

  async webauthnLoginVerify(req: AuthRequest, res: Response) {
    try {
      const { email, credential } = req.body;
      if (!email || !credential) {
        return errorResponse(res, 'Email and credential are required', 400);
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 'No account found for that email', 404);
      }

      const storedCredential = await CredentialModel.findByCredentialId(credential.id);
      if (!storedCredential || storedCredential.user_id !== user.id) {
        return errorResponse(res, 'Passkey not found for this user', 401);
      }

      const challenge = await ChallengeModel.findLatestActiveByUser(user.id, 'login');
      if (!challenge) {
        return errorResponse(res, 'Authentication challenge expired', 400);
      }

      const expectedOrigins = getExpectedOrigins(req.headers.origin, credential);

      const verification = (await webauthnConfig.verifyAuthenticationResponse({
        response: credential,
        expectedChallenge: Buffer.from(challenge.challenge).toString('base64url'),
        expectedOrigin: expectedOrigins,
        expectedRPID: config.webauthn.rpID,
        authenticator: {
          credentialID: Buffer.from(storedCredential.credential_id, 'base64url'),
          credentialPublicKey: Buffer.from(storedCredential.public_key),
          counter: storedCredential.counter,
          transports: storedCredential.transports as AuthenticatorTransport[],
        },
      })) as VerifiedAuthenticationResponse;

      if (!verification.verified) {
        return errorResponse(res, 'Passkey authentication failed', 401);
      }

      await CredentialModel.updateCounter(storedCredential.credential_id, verification.authenticationInfo.newCounter);
      await ChallengeModel.delete(challenge.id);

      const sessionToken = await issueSession(user, 'passkey');
      successResponse(res, {
        sessionToken,
        user: buildSessionUser(user),
      });
    } catch (error) {
      console.error('Passkey login verify error:', {
        error,
        requestOrigin: req.headers.origin,
        credentialOrigin: getCredentialResponseOrigin(req.body?.credential),
        expectedOrigins: getExpectedOrigins(req.headers.origin, req.body?.credential),
      });
      errorResponse(res, 'Failed to verify passkey login', 400);
    }
  },

  async logout(req: AuthRequest, res: Response) {
    try {
      const token = tokenService.parseAuthHeader(req.headers.authorization);
      if (token) {
        await AuthSessionModel.revoke(token);
      }
      successResponse(res, { message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      errorResponse(res, 'Logout failed', 500);
    }
  },
};
