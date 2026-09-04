import { supabase } from './supabaseClient';

type AssuranceLevel = 'aal1' | 'aal2' | null;

type ListedFactor = {
  id: string;
  status: string;
};

export type StrongVerificationState = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
  verifiedFactorId?: string;
  unverifiedFactorIds: string[];
  enrollment?: { factorId: string; qrCode: string; secret: string; uri?: string };
};

function normalizeAssuranceLevel(level: string | null): AssuranceLevel {
  return level === 'aal1' || level === 'aal2' ? level : null;
}

function listedFactors<T extends { id: string; status: string }>(factors: T[]): ListedFactor[] {
  return factors.map((factor) => ({ id: factor.id, status: String(factor.status) }));
}

export async function getStrongVerificationState(): Promise<StrongVerificationState> {
  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) throw assuranceError;
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) throw factorsError;
  const totpFactors = listedFactors(factors.totp);
  const phoneFactors = listedFactors(factors.phone);
  const allFactors = [...totpFactors, ...phoneFactors];
  const verified = allFactors.find((factor) => factor.status === 'verified');
  const unverifiedFactorIds = totpFactors.filter((factor) => factor.status === 'unverified').map((factor) => factor.id);
  return {
    currentLevel: normalizeAssuranceLevel(assurance.currentLevel),
    nextLevel: normalizeAssuranceLevel(assurance.nextLevel),
    verifiedFactorId: verified?.id,
    unverifiedFactorIds,
  };
}

async function removeUnverifiedTotpFactors(): Promise<void> {
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const staleFactors = listedFactors(factors.totp).filter((factor) => factor.status === 'unverified');
  for (const factor of staleFactors) {
    const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (cleanupError) throw cleanupError;
  }
}

export async function beginTotpEnrollment(): Promise<StrongVerificationState['enrollment']> {
  await removeUnverifiedTotpFactors();
  let result = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ridgewood OS' });
  if (result.error && /friendly name|already exists|factor/i.test(result.error.message)) {
    await removeUnverifiedTotpFactors();
    result = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Ridgewood OS' });
  }
  if (result.error) throw result.error;
  return { factorId: result.data.id, qrCode: result.data.totp.qr_code, secret: result.data.totp.secret, uri: result.data.totp.uri };
}

export async function verifyStrongFactor(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
  if (verifyError) throw verifyError;
}
