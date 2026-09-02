export type AuthorizationVerificationMethod = 'webauthn_passkey' | 'reauthentication' | 'dual_authorization';

export type ProtectedAction =
  | 'document.publish'
  | 'document.approve'
  | 'document.deny'
  | 'document.supersede'
  | 'document.withdraw'
  | 'proposal.approve'
  | 'proposal.deny'
  | 'project.authorize'
  | 'user.assign_role'
  | 'user.assign_position'
  | 'user.change_permission'
  | 'user.delegate_authority';

export interface AuthorizationVerificationRequest {
  action: ProtectedAction;
  targetType: string;
  targetId: string;
  revisionId?: string;
  reason?: string;
}

export interface AuthorizationVerificationResult {
  verified: boolean;
  method: AuthorizationVerificationMethod;
  verifiedAt?: string;
  verificationReference?: string;
  userVerified?: boolean;
  failureReason?: 'cancelled' | 'failed' | 'unsupported' | 'expired';
}

/**
 * Infrastructure boundary for fresh verification of a sensitive command.
 * Implementations may use WebAuthn/passkeys, but must never expose or persist
 * raw biometric data, device PINs/passwords or private credential material.
 */
export interface AuthorizationVerification {
  verify(request: AuthorizationVerificationRequest): Promise<AuthorizationVerificationResult>;
}
