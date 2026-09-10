# Development & Site reference form

Implements the owner's approved drawer → saved draft → published view → new revision flow on `feature/governed-form-drawer`, based on `37d7228612bf7f3bbe7dfa4d7cdb29c9957ef4e0`.

## Behavior

- Right drawer with retained project context; full width on mobile; optional expand.
- Native modal dialog supplies focus containment and background inertness. Close button/Escape and deliberate rightward edge swipe use the same unsaved-work check; commands in progress block closing.
- Drafts persist through the existing governed RPCs. Closing without saving requires explicit discard confirmation. No form text is stored in local browser storage.
- Publication no longer dispatches a global window-close event. The reference form verifies a published revision and snapshot on readback before reporting success.
- Published/superseded views use `published_source_snapshot`, never mutable `source_data`. Missing evidence is visibly unavailable. New site-form payloads carry versioned field labels/order and project identity. Older snapshots show original stored keys; current project facts are not substituted.
- Publication and Project Authorization remain separate. Editing creates a new revision through the existing command; authorized baseline corrections remain controlled amendments.
- Product telemetry records capability, operation, outcome and elapsed milliseconds. It does not include form text, project names or documents. Set `VITE_DEV_TELEMETRY_ENABLED=false` to disable collection. Audit evidence remains separate.

## Verification and deployment boundary

Browser and application CI passed at 0df7d908660f47599347aaff16f69aa9326bce1f. The browser fixture uses intercepted synthetic responses. Its first run found a dirty-state timing gap; the synchronized drawer guard passed the next run.

On 2026-09-10, Ridgewood was restored with owner approval; EL8 remediation staging was paused to free the active-project slot. EL8 main remains active.

The hosted publication RPC freezes exact source_data (including presentation metadata), and new revision commands copy the snapshot. All 19 existing published/superseded revisions had snapshots. Document tables have RLS enabled and workspace-scoped SELECT policies.

Migration 20260910210233_protect_published_document_payload was applied to Ridgewood after transaction-isolated testing. The repo filename matches the actual hosted version. It rejects issued-payload/identity updates, deletion and return to draft; state-only supersession/withdrawal and the explicitly allowed timestamp metadata remain possible. It preserves existing post-authorization controls.

Validation against hosted PostgreSQL:
- Twelve authenticated RPC/RLS/trigger contract assertions passed before and after installation, using a separate synthetic workspace and users.
- Five isolated pgTAP immutability assertions passed.
- Fixtures rolled back; zero synthetic users/workspaces remained. Existing counts stayed at 17 published and two superseded.
- Security advisor returned only the leaked-password-protection-disabled warning. See https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. This setting was not changed.

The original document-table placeholder now contains exact SQL recovered from remote migration 20260902201253. Its historical repo filename differs from remote and is explicitly labeled. This recovers source; it does not certify fresh-database replay.

The ledger comparison in migration-reconciliation-2026-09-10.json records 126 remote migrations, 77 repo files, 52 remote-only names, four local-only names and 63 differing timestamps among matching names. Names/timestamps are not proof of SQL equivalence. Do not bulk push migrations or repair remote history from this inventory.

Remaining release gates: reconstruct and replay the complete migration chain in isolation; test concurrency, permission revocation and failure/retry behavior; verify the actual browser against hosted authenticated persistence; then test the complete Opportunity → Authorize path and produce a versioned Edward demo candidate. No frontend merge/deployment occurred in this slice. Other forms retain their existing windows until the reference interaction is accepted.
