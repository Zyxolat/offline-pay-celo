import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GOOGLE_CLIENT_ID } from '@/config/env';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { authAPI } from '@/services/apiClient';
import { storeSession } from '@/lib/auth';
import {
  processCredentialCreationOptions,
  processCredentialRequestOptions,
  serializePublicKeyCredential,
} from '@/utils/webauthn';
import { AuthLayout } from '@/components/auth/AuthLayout';

type PasskeyMode = 'login' | 'register';

function resolveGoogleAvailability() {
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId) {
    return {
      enabled: false,
      message: 'Google client ID is missing in local env.',
    };
  }

  if (typeof window === 'undefined') {
    return {
      enabled: true,
      message: '',
    };
  }

  const { hostname, protocol } = window.location;
  const isSecureOrigin = protocol === 'https:' || hostname === 'localhost';

  if (!isSecureOrigin) {
    return {
      enabled: false,
      message: 'Google sign-in requires HTTPS or localhost during local development.',
    };
  }

  return {
    enabled: true,
    message: '',
  };
}

export const AuthSelection = ({
  adminOnly = false,
  pageMode = 'login',
}: {
  adminOnly?: boolean;
  pageMode?: 'login' | 'signup';
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<null | 'google' | PasskeyMode>(null);
  const [error, setError] = useState('');

  const destination = adminOnly ? '/admin' : '/dashboard';
  const title = adminOnly
    ? 'Admin Access'
    : pageMode === 'signup'
      ? 'Create Your Account'
      : 'Welcome Back';
  const description = adminOnly
    ? 'Continue with Google or a registered passkey for your admin account.'
    : pageMode === 'signup'
      ? 'Register a passkey to create your OfflinePay account. Passwords and OTPs are disabled.'
      : 'Use your registered passkey or Google account to access OfflinePay.';
  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const primaryPasskeyMode: PasskeyMode = pageMode === 'signup' ? 'register' : 'login';
  const secondaryPasskeyMode: PasskeyMode = pageMode === 'signup' ? 'login' : 'register';
  const primaryButtonLabel =
    primaryPasskeyMode === 'register' ? 'Create Account with Passkey' : 'Login with Passkey';
  const secondaryButtonLabel =
    secondaryPasskeyMode === 'register' ? 'Register Passkey Instead' : 'Use Existing Passkey';
  const switchHref = pageMode === 'signup' ? '/auth/login' : '/auth/signup';
  const switchLabel =
    pageMode === 'signup' ? 'Already have an account? Login' : 'Need a new account? Sign up';

  const requireValidEmail = () => {
    if (!emailIsValid) {
      setError('Enter a valid email address to use a passkey');
      return false;
    }

    return true;
  };

  const finishSession = (result: any) => {
    storeSession(result.sessionToken, result.user);
    navigate(result.user.role === 'admin' ? '/admin' : destination);
  };

  const handleGoogleCredential = async (credential: string) => {
    setLoading('google');
    setError('');

    try {
      const response = await authAPI.googleLogin(credential);
      const result = response.data.data;
      if (adminOnly && result.user.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      finishSession(result);
    } catch (err: any) {
      console.error('[AuthSelection] Google auth failed', err);
      setError(err.response?.data?.error || 'Google authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const runPasskey = async (mode: PasskeyMode) => {
    if (!requireValidEmail()) {
      return;
    }

    setLoading(mode);
    setError('');

    try {
      if (!window.PublicKeyCredential) {
        throw new Error('This browser does not support passkeys');
      }

      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('Passkeys require HTTPS or localhost');
      }

      if (mode === 'register') {
        const optionsResponse = await authAPI.registerOptions(normalizedEmail);
        const options = processCredentialCreationOptions(optionsResponse.data.data);
        const credential = await navigator.credentials.create({ publicKey: options });
        if (!credential) {
          throw new Error('Passkey registration was cancelled');
        }

        const verifyResponse = await authAPI.registerVerify(
          normalizedEmail,
          serializePublicKeyCredential(credential as PublicKeyCredential)
        );
        const result = verifyResponse.data.data;
        if (adminOnly && result.user.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        finishSession(result);
        return;
      }

      const optionsResponse = await authAPI.loginOptions(normalizedEmail);
      const options = processCredentialRequestOptions(optionsResponse.data.data);
      const credential = await navigator.credentials.get({ publicKey: options });
      if (!credential) {
        throw new Error('Passkey login was cancelled');
      }

      const verifyResponse = await authAPI.loginVerify(
        normalizedEmail,
        serializePublicKeyCredential(credential as PublicKeyCredential)
      );
      const result = verifyResponse.data.data;
      if (adminOnly && result.user.role !== 'admin') {
        navigate('/dashboard');
        return;
      }
      finishSession(result);
    } catch (err: any) {
      console.error('[AuthSelection] Passkey auth failed', err);
      setError(err.response?.data?.error || err.message || 'Passkey authentication failed');
    } finally {
      setLoading(null);
    }
  };

  const googleAvailability = useMemo(() => resolveGoogleAvailability(), []);
  const googleEnabled = googleAvailability.enabled;

  useEffect(() => {
    console.log('[AuthSelection] mounted', {
      path: location.pathname,
      adminOnly,
      googleEnabled,
      loading,
    });
  }, [adminOnly, googleEnabled, loading, location.pathname]);

  return (
    <AuthLayout title={title} description={description}>
      <div className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Email address</label>
          <Input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) {
                setError('');
              }
            }}
            placeholder={adminOnly ? 'admin@yourcompany.com' : 'you@example.com'}
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Passkey flows use this email to find your account or create a new one.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <ShieldCheck size={16} />
            Google OAuth
          </div>
          {googleEnabled ? (
            <GoogleAuthButton
              onCredential={handleGoogleCredential}
              text={adminOnly ? 'signin_with' : pageMode === 'signup' ? 'signup_with' : 'continue_with'}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background/80 p-4 text-center">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setError(googleAvailability.message)}
              >
                Continue with Google
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {googleAvailability.message}
              </p>
            </div>
          )}
          {loading === 'google' && (
            <div className="mt-3 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 animate-spin" size={16} />
              Signing in with Google...
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium">
            <KeyRound size={16} />
            Passkey
          </div>
          <div className="grid gap-3">
            <Button
              type="button"
              onClick={() => runPasskey(primaryPasskeyMode)}
              disabled={loading !== null || !emailIsValid}
            >
              {loading === primaryPasskeyMode
                ? primaryPasskeyMode === 'register'
                  ? 'Registering passkey...'
                  : 'Checking passkey...'
                : primaryButtonLabel}
            </Button>
            <Button
              type="button"
              onClick={() => runPasskey(secondaryPasskeyMode)}
              disabled={loading !== null || !emailIsValid}
              variant="outline"
            >
              {loading === secondaryPasskeyMode
                ? secondaryPasskeyMode === 'register'
                  ? 'Registering passkey...'
                  : 'Checking passkey...'
                : secondaryButtonLabel}
            </Button>
          </div>
          {!emailIsValid && (
            <p className="mt-3 text-xs text-muted-foreground">
              Enter a valid email address to enable passkey login and sign up.
            </p>
          )}
        </div>

        {!adminOnly && (
          <div className="text-center text-xs text-muted-foreground">
            <Link className="underline-offset-4 hover:underline" to={switchHref}>
              {switchLabel}
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
};
