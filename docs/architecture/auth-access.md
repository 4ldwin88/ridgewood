# Authentication access model

Production Ridgewood OS is provisioned B2B access: a subscribed organization receives an initial administrator account and authorized administrators invite additional members in-app. There is no public production signup.

During controlled beta/human testing, `VITE_AUTH_ACCESS_MODE=testing-open-signup` exposes a self-service Create testing account view using Supabase Auth. The same portal and session boundary are retained when production switches to `production-provisioned`; the signup UI disappears rather than requiring a second authentication architecture.

The browser uses only a Supabase publishable key. Admin invitations must run in a trusted server environment and must never expose a secret/service-role key to the browser.

Before production launch, Supabase project configuration must disable new public user signup. Existing provisioned users remain able to sign in.
