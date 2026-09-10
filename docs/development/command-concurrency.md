# Command concurrency checkpoint — 2026-09-10

An overlapping publication and draft save could previously return save success and
write `document_draft_updated` after publication had already made the draft
uneditable. The update affected zero rows. This was reproduced in the disposable
Supabase stack at `b87fa7a76ed489deadeb6811be31f6a5d984f1f8`
([baseline run](https://github.com/4ldwin88/ridgewood/actions/runs/34532030467)).

`private.update_project_state_document_draft_command` now locks the revision
before checking authority or updating it, and excludes archived revisions.
After waiting for publication, PostgreSQL rechecks the editable predicate and
the command raises `draft_not_found_or_not_editable` without a success audit.
Existing function permissions are preserved.

## Evidence

[Database run](https://github.com/4ldwin88/ridgewood/actions/runs/34532313687)
at `ec5071f9438ebd5fbe146c7809819782a308d275` passed the full 127-migration
replay, five publication guard checks, twelve RPC/RLS checks, and all nine
checks in `scripts/test-command-concurrency.py`:

- Save racing publication is rejected; no false success audit is written.
- Duplicate publication is rejected; exactly one publication audit is written.
- Overlapping revision requests leave exactly one active draft.
- A discarded draft rejects a stale save.
- Duplicate authorization is rejected; exactly one authorization record exists.

All four overlapping scenarios observed the second backend blocked by the first
using `pg_blocking_pids` before releasing the first transaction. The discarded
draft check is sequential. The script accepts only the hardcoded disposable
localhost database; committed synthetic fixtures must never run against hosted
projects. The workflow destroys the stack afterward.

[Application/browser validation](https://github.com/4ldwin88/ridgewood/actions/runs/34532313764)
also passed at that SHA. The baseline authorization assertion expected the wrong
error message; it was corrected to accept the existing backend response. No
authorization implementation was changed.

## Hosted installation

The exact tested SQL was applied to Ridgewood (`leikcvdfvovycjcjtflq`) as
`20260910213028_lock_document_draft_before_update`. The repo migration was
renamed from its CLI-generated timestamp `20260910212425` to match the assigned
hosted version; its SQL did not change. The original 126-file recovery manifest
remains an immutable historical checkpoint.

The installed function was inspected for the lock/predicate, and all twelve
authenticated RPC/RLS contract checks passed again on hosted Ridgewood inside
a transaction that rolled back every fixture and write. Concurrency tests ran
only in the isolated stack. EL8 main was untouched; remediation staging remains
paused. No frontend deployment or PR merge occurred.

## Remaining demo acceptance

Revision contention currently returns a database uniqueness error; integrity is
preserved, but a friendlier conflict response remains useful. These checks do not
establish network retry idempotency, exhaustive grant/default-privilege coverage,
or authenticated browser persistence through the entire Opportunity-to-Authorize
flow. Complete those acceptance gates before declaring Edward's demo ready, then
pin its release and keep lifecycle development on a separate branch/environment.
