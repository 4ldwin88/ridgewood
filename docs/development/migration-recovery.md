# Migration recovery checkpoint — 2026-09-10

The executable migration directory now contains all 126 migrations recovered from Ridgewood's hosted `supabase_migrations.schema_migrations`, in the actual recorded order with the actual version identifiers. SQL is preserved with terminal whitespace normalized to one newline. `recovered-migration-manifest.json` records SHA-256 fingerprints.

The prior 77 repo files are preserved in `migration-archive/pre-reconciliation`, outside CLI execution. The earlier inventory remains a historical checkpoint. Among matching names, 28 old files differed even after removing line comments and normalizing whitespace; a name match was not treated as SQL equivalence.

## Reconciliation evidence

- All 126 recovered migrations executed in an isolated PGlite PostgreSQL 17.5 smoke harness. Hosted Ridgewood is PostgreSQL 17.6.
- All 75 application function definition fingerprints matched hosted `public`/`private` functions (extension functions and the platform RLS helper excluded).
- All 513 checked column definitions, constraints and RLS policy fingerprints matched hosted state; no missing or additional entries in this comparison.
- Smoke limitations: minimal Auth/Storage schema prerequisites; pgcrypto/pgTAP installation omitted; no service, extension, grant/default-privilege, concurrent-session or browser parity claim.
- Docker-backed Supabase CI PASSED at 270582164d9e09555de0ab348e8f02601888734a: all 126 recovered migrations applied, followed by five guard assertions and twelve real RPC/RLS contract assertions. Extensions installed normally and the contract fixture rolled back. Run: https://github.com/4ldwin88/ridgewood/actions/runs/34531221127.

## Platform prerequisite

The second historical migration revokes execute on `public.rls_auto_enable()`, an existing hosted platform helper that is not introduced by the application history. `supabase/platform/replay-prerequisites.sql` supplies its RLS-enabling behavior and the observed `ensure_rls` event trigger to a NEW LOCAL stack before migration replay. This file is not an application migration or an instruction to modify the hosted project.

The CI stack is initialized without app migrations, receives that prerequisite, then applies the recovered history with `supabase migration up --local`. It never links to a hosted project and has no hosted credentials.

## Four former repo-only names

- `project_state_canonical_e2e_root`: an aggregate historical migration; the remote sequence splits canonical identity and requirement setup across several records. Final checked structure/functions match.
- `project_state_native_stage_commands`: historical transitional stage logic; final stage functions match the later recovered definitions.
- `gate2a_remove_anon_project_state_privileges`: live anon SELECT/INSERT/UPDATE/DELETE privileges on project_states are all false. Retained for review of default-privilege differences on fresh stacks; not blindly reapplied as a historical migration.
- `strengthen_project_authorization_evidence_snapshot`: final private authorization function fingerprint matches the recovered live history. The previous file remains available for comparison.

## Operating boundary

No live data, live migration ledger, EL8 environment or frontend deployment was changed during recovery. The preceding slice's publication guard remains installed. Do not repair hosted migration history or bulk-push historical SQL: these versions are already applied there.

The migration-chain replay gate is passed. Remaining demo gates include comprehensive grant/default-privilege checks, concurrency/retry behavior, authenticated browser persistence and complete Opportunity-to-Authorize acceptance. Drive continues to control intended product semantics; recovered live SQL is evidence of implementation, not automatic approval of every historical behavior.
