import { supabase } from './supabaseClient';

type AssuranceLevel = 'aal1' | 'aal2' | null;

export type StrongVerificationState = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
  verifiedFactorId?: string;
  unverifiedFactorId?: string;
  enrollment?: { factorId: string; qrCode: string; secret: string; uri?: string };
};

function normalizeAssuranceLevel(level: string | null): AssuranceLevel {
  return level === 'aal1' || level === 'aal2' ? level : null;
}

export async function getStrongVerificationState(): Promise<StrongVerificationState> {
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  const allFactors = [...factors.totp, ...factors.phone];
  const verified = allFactors.find((factor) => factor.status === 'verified');
  const unverified = factors.totp.find((factor) => factor.status === 'unverified');
  return {
    currentLevel: normalizeAssuranceLevel(assurance.currentLevel),
    nextLevel: normalizeAssuranceLevel(assurance.nextLevel),
    verifiedFactorId: verified?.id,
    unverifiedFactorId: unverified?.id,
  };
}

export async function beginTotpEnrollment(existingUnverifiedFactorId?: string): Promise<StrongVerificationState['enrollment']> {
  if (existingUnverifiedFactorId) {
    const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: existingUnverifiedFactorId });
    if (cleanupError) throw cleanupError;
  }
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ridgewood OS' });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri };
}

export async function verifyStrongFactor(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (verifyError) throw verifyError;
}
