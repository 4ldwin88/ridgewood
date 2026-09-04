type AssuranceLevel = 'aal1' | 'aal2' | null;

export type StrongVerificationState = {
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
  verifiedFactorId?: string;
  unverifiedFactorIds: string[];
  enrollment?: { factorId: string; qrCode: string; secret: string; uri?: string };
};

// Gate 2A human-QA exception: the prototype MFA ceremony is temporarily disabled.
// The authorization backend continues to enforce authenticated membership,
// project.authorize permission, scoped business authority, lifecycle readiness,
// confirmation, persistence and audit controls.
export async function getStrongVerificationState(): Promise<StrongVerificationState> {
  return {
    currentLevel: 'aal2',
    nextLevel: 'aal2',
    unverifiedFactorIds: [],
  };
}

export async function beginTotpEnrollment(): Promise<StrongVerificationState['enrollment']> {
  throw new Error('Strong verification enrollment is temporarily disabled for Gate 2A human QA.');
}

export async function verifyStrongFactor(_factorId: string, _code: string): Promise<void> {
  throw new Error('Strong verification is temporarily disabled for Gate 2A human QA.');
}
