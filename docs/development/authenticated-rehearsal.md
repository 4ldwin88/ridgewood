# Authenticated lifecycle rehearsal

The `acceptance` Vite development mode binds only to localhost Supabase. Other
modes remain bound to hosted Ridgewood; production acceptance mode throws rather
than connecting locally. Unit tests protect this boundary. No arbitrary backend
URL override is accepted.

The database replay workflow creates real synthetic users through the local Auth
admin API and an isolated workspace with explicit permissions and executive
authority. Only the local public API key reaches Vite. No hosted credentials or
hosted project mutations are involved. The stack and committed synthetic fixtures
are destroyed after the job. Fixture operations accept no remote URL.

`tests/acceptance/opportunity-authorize.spec.ts` exercises the actual app, local
Auth, REST API, database and Edge endpoint. It creates an opportunity, records an
action, checks persistence after reload, answers qualification, publishes all
seven domain forms, tests authorization permission revocation, and loses the
response after a real authorization commit before recovering persisted state.
It does not mock successful business responses or pre-mark project readiness.
Retries are disabled so an error cannot disappear behind an automatic rerun.

## Edge-function source reconciliation

Hosted `project-authorization` version 7 was read on 2026-09-10. Its bundle hash was
`565e39c871999c540500eb94643d5932b25fbbda3604f48a69726eb5eed20e82`.
The repo contained older CORS and AAL2 behavior. The recovered source preserves
the already-approved Gate 2A human-QA exception and authentication/database
authority checks. Its supabase-js import is pinned to 2.57.4, matching the app,
instead of the deployed source's floating major version. That pin is a candidate
change, not a claim of byte-for-byte hosted parity. No function was deployed.

The MFA exception must remain visible in the human handoff; an automated test
cannot approve it for production or restore strong-verification certification.

## Human acceptance remains separate

Use [human-test-script.md](human-test-script.md). Both testers' results start at
NOT RUN. A passed isolated rehearsal does not prove the deployed candidate works
or that a human finds it usable. Supply a verified deployment URL/version/SHA and
test account scope before asking 4ldwin or Edward to begin. Preserve the accepted
demo release while continuing lifecycle work separately.

## Verified checkpoint — 2026-09-10

Code commit: `e5f25eeac1745e9383d155a55c9a6d64efb4d79f`.
[Database replay and real authenticated rehearsal](https://github.com/4ldwin88/ridgewood/actions/runs/34536151735) passed: 129 migrations, 88 database/concurrency assertions, and the real authenticated browser scenario (17.7 seconds). The final database assertion confirms one authorization record and seven frozen published snapshots for the synthetic project.
[Frontend validation](https://github.com/4ldwin88/ridgewood/actions/runs/34536151741) also passed, including build, typecheck, unit tests and governed-form browser checks.

The initial rehearsal reached authorization but failed because the fixture used an invalid permission effect (`deny`). Correcting that fixture to the schema's `revoke` value resolved the failure. No hosted permission was changed.

This scenario deliberately loses the successful authorization response; ordinary successful-response presentation, deployment behavior, and human usability remain acceptance work. Human results remain NOT RUN. No frontend deployment, PR merge, hosted function deployment or EL8 changes occurred in this checkpoint. The remaining outcome milestone is a verified versioned demo deployment followed by human testing and any necessary fixes.
