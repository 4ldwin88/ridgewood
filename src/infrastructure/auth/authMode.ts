export type AuthAccessMode = 'testing-open-signup' | 'production-provisioned';

/**
 * Testing can expose self-service signup without coupling the product UI to that policy.
 * Production is provisioned/invite-only. Change configuration, not application architecture.
 */
export const AUTH_ACCESS_MODE: AuthAccessMode =
  import.meta.env.VITE_AUTH_ACCESS_MODE === 'testing-open-signup'
    ? 'testing-open-signup'
    : 'production-provisioned';

export const isTestingSignupEnabled = AUTH_ACCESS_MODE === 'testing-open-signup';
