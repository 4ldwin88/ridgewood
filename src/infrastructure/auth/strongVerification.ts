import { supabase } from './supabaseClient';

type AssuranceLevel = 'aal1' | 'aal2' | null;

export type StrongVerificationState = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
  verifiedFactorId?: string;
  enrollment?: { factorId: string; qrCode: string; secret: string };
};

function normalizeAssuranceLevel(level: string | null): AssuranceLevel {
  return level === 'aal1' || level === 'aal2' ? level : null;
}

export async function getStrongVerificationState(): Promise<StrongVerificationState> {
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  const verified = [...factors.totp, ...factors.phone].find((factor) => factor.status === 'verified');
  return {
    currentLevel: normalizeAssuranceLevel(assurance.currentLevel),
    nextLevel: normalizeAssuranceLevel(assurance.nextLevel),
    verifiedFactorId: verified?.id,
  };
}

export async function beginTotpEnrollment(): Promise<StrongVerificationState['enrollment']> {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ridgewood OS' });
  if (error) throw error;
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function verifyStrongFactor(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (verifyError) throw verifyError;
}
