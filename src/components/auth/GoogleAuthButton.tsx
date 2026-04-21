import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '@/config/env';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
}

export const GoogleAuthButton = ({ onCredential, text = 'continue_with' }: GoogleAuthButtonProps) => {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const initializedClientIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.accounts?.id));

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptReady(true);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existingScript) {
      const handleLoad = () => setScriptReady(true);
      const handleError = () => setScriptReady(false);

      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);

      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.addEventListener('load', () => setScriptReady(true), { once: true });
    script.addEventListener('error', () => setScriptReady(false), { once: true });
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!scriptReady || !window.google || !buttonRef.current) {
      return;
    }

    const clientId = GOOGLE_CLIENT_ID;
    if (!clientId) {
      return;
    }

    if (initializedClientIdRef.current !== clientId) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }: { credential: string }) => {
          onCredentialRef.current(credential);
        },
      });
      initializedClientIdRef.current = clientId;
    }

    buttonRef.current.innerHTML = '';
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      text,
      shape: 'pill',
      width: 320,
    });
  }, [scriptReady, text]);

  return <div ref={buttonRef} className="flex justify-center" />;
};
