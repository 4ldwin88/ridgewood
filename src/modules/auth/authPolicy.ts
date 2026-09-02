export const AUTH_POLICY = {
  publicSignupEnabled: false,
  accountProvisioning: 'subscription_or_in_app_invite',
  primarySignInMethod: 'email_password',
} as const;

export type AccountProvisioningMethod =
  (typeof AUTH_POLICY)['accountProvisioning'];

/**
 * Ridgewood OS is an invite/provisioned B2B product. Public self-service signup
 * is deliberately not part of the canonical product flow. A subscribed
 * business receives its initial account; additional members are invited from
 * inside the authenticated application by an authorized administrator.
 */
export function canShowPublicSignup(): boolean {
  return AUTH_POLICY.publicSignupEnabled;
}
