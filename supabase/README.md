# Supabase

Ridgewood requires its own Supabase project/backend. Do not point this application at EL8's Supabase project.

The migration directory contains the 126 recovered hosted migrations with actual version identifiers. All 126 passed clean Supabase CI replay on 2026-09-10. Source fingerprints and the recovery report live in `docs/development/recovered-migration-manifest.json` and `docs/development/migration-recovery.md`.

The old 77 repo files are archived outside migration execution in `docs/development/migration-archive/pre-reconciliation`. Do not copy those files back into the active chain or repair hosted history to their former timestamps.

For a fresh local replay, follow `.github/workflows/database-replay.yml`: initialize/start a new unlinked local Supabase stack with application migrations temporarily outside the migration directory, install `platform/replay-prerequisites.sql`, restore the migration directory, then run `supabase migration up --local`. The prerequisite reproduces the hosted automatic-RLS helper expected by the second migration. The CI job then checks five guard and twelve RPC/RLS assertions.

This recovery does not require applying historical SQL to the hosted project: those versions are already applied there. New changes must use new migrations, local replay and meaningful tests before deployment. Drive remains the authority for intended product behavior.
