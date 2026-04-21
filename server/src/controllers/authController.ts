import {
  VerifiedAuthenticationResponse,
  VerifiedRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types';
import { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';
import { ChallengeModel } from '../models/Challenge.js';
import { CredentialModel } from '../models/Credential.js';
import { AuthSessionModel } from '../models/AuthSession.js';
import { User, UserModel } from '../models/User.js';
import { config } from '../config/index.js';
import { webauthnConfig } from '../config/webauthn.js';
import { tokenService } from '../services/tokenService.js';
import { celoService } from '../services/celoService.js';
import { log, normalizeError } from '../utils/logger.js';
import { errorResponse, successResponse, validateWithSchema } from '../utils/validators.js';

const googleClient = new OAuth2Client(config.google.clientId || undefined);
const googleLoginSchema = z.object({
  idToken: z.string().trim().min(1),
});
const passkeyEmailSchema = z.object({
  email: z.string().trim().email(),
});
const passkeyVerifySchema = z.object({
  email: z.string().trim().email(),
  credential: z.unknown(),
});

type GoogleTokenPayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRegistrationResponseJSON = (value: unknown): value is RegistrationResponseJSON =>
  isRecord(value) &&
  value.type === 'public-key' &&
  typeof value.id === 'string' &&
  typeof value.rawId === 'string' &&
  isRecord(value.response) &&
  typeof value.response.clientDataJSON === 'string' &&
  typeof value.response.attestationObject === 'string';

const isAuthenticationResponseJSON = (value: unknown): value is AuthenticationResponseJSON =>
  isRecord(value) &&
  value.type === 'public-key' &&
  typeof value.id === 'string' &&
  typeof value.rawId === 'string' &&
  isRecord(value.response) &&
  typeof value.response.clientDataJSON === 'string' &&
  typeof value.response.authenticatorData === 'string' &&
  typeof value.response.signature === 'string';

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

const logWebauthnVerificationContext = (
  stage: 'registration' | 'authentication',
  requestOrigin?: string,
  credential?: { response?: { clientDataJSON?: string } }
) => {
  const credentialOrigin = getCredentialResponseOrigin(credential);
  const expectedOrigins = getExpectedOrigins(requestOrigin, credential);
  const rpIdMatchesOriginHost = parseOriginHost(config.webauthn.origin) === config.webauthn.rpID;
  const requestOriginMatches = requestOrigin ? expectedOrigins.includes(requestOrigin) : undefined;
  const credentialOriginMatches = credentialOrigin
    ? expectedOrigins.includes(credentialOrigin)
    : undefined;

  log('INFO', 'WebAuthn verification context', {
    stage,
    requestOrigin,
    credentialOrigin,
    expectedOrigins,
    configuredOrigin: config.webauthn.origin,
    configuredRpId: config.webauthn.rpID,
    rpIdMatchesOriginHost,
    requestOriginMatches,
    credentialOriginMatches,
  });

  if (!rpIdMatchesOriginHost) {
    log('WARN', 'WebAuthn RP ID does not match configured origin host', {
      configuredOrigin: config.webauthn.origin,
      configuredRpId: config.webauthn.rpID,
    });
  }

  if (requestOrigin && !requestOriginMatches) {
    log('WARN', 'WebAuthn request Origin header does not match configured origins', {
      stage,
      requestOrigin,
      expectedOrigins,
      configuredRpId: config.webauthn.rpID,
    });
  }

  if (credentialOrigin && !credentialOriginMatches) {
    log('WARN', 'WebAuthn credential origin does not match configured origins', {
      stage,
      credentialOrigin,
      expectedOrigins,
      configuredRpId: config.webauthn.rpID,
    });
  }

  return expectedOrigins;
};

export const authController = {
  async google(req: AuthRequest, res: Response) {
    try {
      const authPayload = validateWithSchema(res, googleLoginSchema, req.body);
      if (!authPayload) {
        return;
      }

      log('INFO', 'Verifying Google ID token', {
        route: req.originalUrl,
        hasGoogleClientId: Boolean(config.google.clientId),
        requestOrigin: req.headers.origin,
      });

      const ticket = await googleClient.verifyIdToken({
        idToken: authPayload.idToken,
        audience: config.google.clientId,
      });

      const googlePayload = ticket.getPayload() as GoogleTokenPayload | undefined;
      if (!googlePayload?.sub || !googlePayload.email || !googlePayload.email_verified) {
        return errorResponse(res, 'Invalid Google account payload', 401);
      }

      const existingByGoogle = await UserModel.findByGoogleId(googlePayload.sub);
      let user = existingByGoogle;

      if (!user) {
        const walletAddress = celoService.generateWalletAddress();
        user = await UserModel.upsertGoogleUser(
          googlePayload.email,
          googlePayload.sub,
          walletAddress
        );
      }

      const sessionToken = await issueSession(user, 'google');

      successResponse(res, {
        sessionToken,
        user: buildSessionUser(user),
      });
    } catch (error) {
      console.error('Google auth error:', normalizeError(error));
      errorResponse(res, 'Google authentication failed', 401);
    }
  },

  async webauthnRegisterOptions(req: AuthRequest, res: Response) {
    try {
      console.log('Signup request received', {
        route: req.originalUrl,
        origin: req.headers.origin,
      });
      log('INFO', 'Generating WebAuthn registration options', {
        route: req.originalUrl,
        requestOrigin: req.headers.origin,
        configuredOrigin: config.webauthn.origin,
        configuredRpId: config.webauthn.rpID,
      });

      const payload = validateWithSchema(res, passkeyEmailSchema, req.body);
      if (!payload) {
        return;
      }
      const { email } = payload;

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
      console.error('Passkey registration options error:', normalizeError(error));
      errorResponse(res, 'Failed to generate passkey registration options', 500);
    }
  },

  async webauthnRegisterVerify(req: AuthRequest, res: Response) {
    try {
      const payload = validateWithSchema(res, passkeyVerifySchema, req.body);
      if (!payload) {
        return;
      }
      const { email, credential } = payload;
      if (!isRegistrationResponseJSON(credential)) {
        return errorResponse(res, 'Invalid passkey registration payload', 400);
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return errorResponse(res, 'User not found for passkey registration', 404);
      }

      const challenge = await ChallengeModel.findLatestActiveByUser(user.id, 'registration');
      if (!challenge) {
        return errorResponse(res, 'Registration challenge expired', 400);
      }

      const expectedOrigins = logWebauthnVerificationContext(
        'registration',
        req.headers.origin,
        credential
      );

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
        credential.response.transports || []
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
      const normalizedError = normalizeError(error);
      console.error('Passkey registration verify error:', {
        error: normalizedError,
        requestOrigin: req.headers.origin,
        credentialOrigin: getCredentialResponseOrigin(req.body?.credential),
        expectedOrigins: getExpectedOrigins(req.headers.origin, req.body?.credential),
      });
      errorResponse(res, 'Failed to verify passkey registration', 400);
    }
  },

  async webauthnLoginOptions(req: AuthRequest, res: Response) {
    try {
      const payload = validateWithSchema(res, passkeyEmailSchema, req.body);
      if (!payload) {
        return;
      }
      const { email } = payload;

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
      console.error('Passkey login options error:', normalizeError(error));
      errorResponse(res, 'Failed to generate passkey login options', 500);
    }
  },

  async webauthnLoginVerify(req: AuthRequest, res: Response) {
    try {
      const payload = validateWithSchema(res, passkeyVerifySchema, req.body);
      if (!payload) {
        return;
      }
      const { email, credential } = payload;
      if (!isAuthenticationResponseJSON(credential)) {
        return errorResponse(res, 'Invalid passkey authentication payload', 400);
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

      const expectedOrigins = logWebauthnVerificationContext(
        'authentication',
        req.headers.origin,
        credential
      );

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
      const normalizedError = normalizeError(error);
      console.error('Passkey login verify error:', {
        error: normalizedError,
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
      console.error('Logout error:', normalizeError(error));
      errorResponse(res, 'Logout failed', 500);
    }
  },
};
