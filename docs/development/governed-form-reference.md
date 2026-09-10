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

Local typecheck/build and six unit tests pass. Browser test uses synthetic intercepted responses and never intentionally calls a hosted database. Local browser execution is blocked by unavailable Chromium/download errors; CI runs the checked-in browser test.

The new immutable-payload trigger rejects publication payload/identity edits, deletion and return to draft; it permits state-only supersession/withdrawal and archival metadata. A pgTAP trigger test is included. Neither migration nor SQL test has been applied/run on the hosted project.

The original `20260902203000_project_state_governed_documents.sql` is a non-executable placeholder. Restore/recover the actual schema and relevant RPCs first, then replay in isolation and validate this migration against them. Recheck grants, RLS, unauthorized publication, direct update/delete, concurrent publish/revise, and post-authorization amendment behavior. The trigger deliberately does not grant publication authority or replace those controls.

Do not merge/deploy this candidate to Edward's pilot until browser CI and actual database verification pass. No EL8 project was paused or modified by this slice. This is one reference form; remaining forms retain their current window until this pattern is accepted.
