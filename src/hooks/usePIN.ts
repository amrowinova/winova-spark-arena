/**
 * usePIN
 *
 * Manages 6-digit PIN and optional biometric authentication.
 *
 * Security model:
 *   - PIN is hashed server-side with bcrypt (pgcrypto). Never stored plain.
 *   - After a successful PIN verification the result is cached in memory
 *     for PIN_SESSION_TTL_MS (5 minutes). Subsequent financial ops within
 *     that window skip re-entry.
 *   - Biometrics: uses WebAuthn platform authenticator (Face ID / fingerprint).
 *     The credential is registered once per device and stored in localStorage.
 *     It acts as a "device unlock" so the user doesn't have to retype the PIN
 *     every time. The server PIN hash remains the authoritative security gate.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PIN_SESSION_TTL_MS  = 5 * 60 * 1000; // 5 min
const BIOMETRIC_CRED_KEY  = 'winova_biometric_cred';   // localStorage

// ── Session cache (module-level — survives re-renders, cleared on logout) ──
let _sessionVerifiedAt: number | null = null;

function isSessionValid(): boolean {
  if (_sessionVerifiedAt === null) return false;
  return Date.now() - _sessionVerifiedAt < PIN_SESSION_TTL_MS;
}

function markSessionVerified() {
  _sessionVerifiedAt = Date.now();
}

function clearSession() {
  _sessionVerifiedAt = null;
}

// ── WebAuthn helpers ──────────────────────────────────────────────────────────
function uint8ToBase64(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf));
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  return new Uint8Array([...bin].map(c => c.charCodeAt(0)));
}

async function registerBiometricCredential(userId: string, displayName: string): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp:   { name: 'Winova', id: window.location.hostname },
        user: {
          id:          new TextEncoder().encode(userId),
          name:        displayName,
          displayName: displayName,
        },
        pubKeyCredParams: [
          { alg: -7,   type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',  // forces Face ID / fingerprint
          userVerification:        'required',
          residentKey:             'preferred',
        },
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;

    if (!credential) return false;

    // Store only the credential ID (public, safe to keep in localStorage)
    localStorage.setItem(
      BIOMETRIC_CRED_KEY,
      uint8ToBase64(new Uint8Array(credential.rawId))
    );
    return true;
  } catch {
    return false;
  }
}

async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const storedId = localStorage.getItem(BIOMETRIC_CRED_KEY);
    if (!storedId) return false;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId:            window.location.hostname,
        userVerification: 'required',
        allowCredentials: [
          { type: 'public-key', id: base64ToUint8(storedId) },
        ],
        timeout: 60_000,
      },
    });

    return assertion !== null;
  } catch {
    return false;
  }
}

async function isBiometricsSupported(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePIN() {
  const { user } = useAuth();
  const [hasPIN, setHasPIN]                     = useState(false);
  const [isLoading, setIsLoading]               = useState(true);
  const [biometricsAvailable, setBiometrics]    = useState(false);
  const [biometricsRegistered, setBioRegistered] = useState(false);

  // Check if PIN is set and biometrics availability
  useEffect(() => {
    if (!user) {
      clearSession();
      setIsLoading(false);
      return;
    }

    Promise.all([
      supabase.rpc('has_user_pin'),
      isBiometricsSupported(),
    ]).then(([{ data: hasPinData }, supported]) => {
      setHasPIN(!!hasPinData);
      setBiometrics(supported);
      setBioRegistered(!!localStorage.getItem(BIOMETRIC_CRED_KEY));
      setIsLoading(false);
    });
  }, [user]);

  /** Set a new 6-digit PIN. Returns error string or null on success. */
  const setupPIN = useCallback(async (pin: string): Promise<string | null> => {
    if (!user) return 'Not authenticated';
    const { error } = await supabase.rpc('set_user_pin', { p_pin: pin });
    if (error) return error.message;
    setHasPIN(true);
    markSessionVerified();
    return null;
  }, [user]);

  /**
   * Verify a PIN against the server hash.
   * On success caches the session so the user isn't asked again for 5 min.
   */
  const verifyPIN = useCallback(async (pin: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.rpc('verify_user_pin', { p_pin: pin });
    if (data === true) { markSessionVerified(); }
    return data === true;
  }, [user]);

  /**
   * Register biometrics on this device (one-time).
   * Returns true on success.
   */
  const setupBiometrics = useCallback(async (): Promise<boolean> => {
    if (!user || !biometricsAvailable) return false;
    const ok = await registerBiometricCredential(user.id, user.email ?? user.id);
    if (ok) setBioRegistered(true);
    return ok;
  }, [user, biometricsAvailable]);

  /**
   * Authenticate with biometrics (Face ID / fingerprint).
   * On success also caches the session.
   */
  const verifyBiometrics = useCallback(async (): Promise<boolean> => {
    const ok = await authenticateWithBiometrics();
    if (ok) markSessionVerified();
    return ok;
  }, []);

  return {
    hasPIN,
    isLoading,
    biometricsAvailable,
    biometricsRegistered,
    isSessionValid,
    setupPIN,
    verifyPIN,
    setupBiometrics,
    verifyBiometrics,
    clearSession,
  };
}
