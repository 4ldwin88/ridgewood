# Client privilege checkpoint — 2026-09-10

The hosted inventory found five public tables with inherited full grants to both
`anon` and `authenticated`: authorization_amendments,
project_state_disposition_events, project_state_qualification_findings,
project_state_qualification_decisions, and project_state_stage_requirements.
Every public table had RLS enabled, and no executable public SECURITY DEFINER
function or public view was found. Table reachability alone is not evidence that
anonymous users could read rows. The unnecessary grants included TRUNCATE.

The first CI run passed all 16 new assertions but failed an existing boundary
assertion: private.sync_predevelopment_readiness_from_document_revision() still
inherited PUBLIC EXECUTE. Anonymous users had no private-schema USAGE, and the
function is trigger-only. The migration now removes unnecessary client execution
from this helper as well. The publication regressions exercise its trigger path.

The incremental migration removes those inherited grants and explicitly restores
authenticated SELECT. Qualification and history mutations must use their existing
private command implementations. The stage requirement RPC is SECURITY INVOKER,
so its existing RLS-protected INSERT/UPDATE grants are retained.

Future postgres-owned public tables, sequences and functions require explicit
client grants. PostgreSQL's global PUBLIC function EXECUTE default is also revoked
for postgres, protecting future private helpers. Existing function ACLs and
service_role grants are preserved. Defaults owned by Supabase platform roles are
outside this change; all current public application objects are postgres-owned.
New application migrations must continue to run as postgres and include explicit
client grants and RLS where needed. Using another creator role requires review.

## Regression evidence

`client_privileges_test.sql` checks existing table access and creates disposable
objects to test effective defaults and PUBLIC inheritance (11 assertions).
`qualification_grants_test.sql` uses an isolated workspace to check direct-write
denial, all five finding saves, readback, stage-requirement updates and qualification
advancement (5 assertions). Both roll back their changes. The existing 33 command
boundary assertions are now also included in database replay CI.

At `6face39f693949097cc0e1b93fb6f07a5d77a2f3`,
[database CI](https://github.com/4ldwin88/ridgewood/actions/runs/34533478679)
passed all 128 migrations, 49 privilege/command/qualification assertions, five
publication guard assertions, twelve document RPC/RLS assertions and nine
concurrency checks (75 total). [App/browser CI](https://github.com/4ldwin88/ridgewood/actions/runs/34533478671)
also passed. Browser coverage remains intercepted fixtures, not live acceptance.

The exact tested migration was installed on Ridgewood as
`20260910214241_restrict_implicit_client_privileges`. The CLI-generated repo
filename was aligned from 20260910213535 to this assigned hosted version with no
SQL change. Five hosted qualification assertions then passed in a rollback-only
transaction; synthetic users were verified absent. Catalog checks reported zero
anonymous table grants, zero authenticated TRUNCATE/TRIGGER/REFERENCES grants and
zero anonymous EXECUTE privileges on private SECURITY DEFINER functions.

Security Advisor still reports only the previously documented
[leaked password protection setting](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No Auth settings changed. This is a grant-boundary checkpoint, not a comprehensive
business-authority or end-to-end demo certification.

## Remaining acceptance work

- The qualification command's reassessment branch still references nonexistent
  `public.project_state_predevelopment_domains`; the actual table is
  `public.predevelopment_domains`. Catalog and installed-function inspection
  confirmed this mismatch. The new successful workflow test covers qualification
  advancement, not editing an assessment after advancement. Reproduce and repair
  that branch next, with a readiness-regression assertion.
  **Subsequently resolved:** see qualification-reassessment.md for the tested
  repair installed as 20260910215109 and the remaining two demo milestones.
- Stage-requirement direct writes still rely on existing workspace-membership RLS;
  this change does not certify the full business-authority model.
- Permission revocation, network response loss/retry behavior and authenticated
  browser persistence through Opportunity-to-Authorize remain acceptance gates.
- No frontend deployment, demo release, PR merge or EL8 changes are part of this
  checkpoint.

References: [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api)
and [PostgreSQL default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).
