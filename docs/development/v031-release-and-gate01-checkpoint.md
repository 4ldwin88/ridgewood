# v0.31 release and Gate 01 continuation

## Released UI

PR #17 merged at `3eb1585eeb2e39fc649dd2bb7be5a00e0d55a197` and deployed as v0.31 to GitHub Pages, using hosted backend `leikcvdfvovycjcjtflq`. The tested candidate was `c5983988a5e054ba2a6433892b9ec0713d37968f`; its tree equals the release tree.

- Validation: https://github.com/4ldwin88/ridgewood/actions/runs/34658654454 — passed.
- Disposable database and authenticated acceptance: https://github.com/4ldwin88/ridgewood/actions/runs/34658654481 — passed.
- Protected deployment and deployed asset/version checks: https://github.com/4ldwin88/ridgewood/actions/runs/34658904280 — passed.

Authenticated candidate inspection found and repaired an inherited 76px menu minimum width, insufficient title clearance, and a 105px empty-photo placeholder. Final image/placeholder dimensions are 112px; the menu target is 44px. Added real layout regression coverage at 390px and 1280px. Checked candidate publication viewing, zoom, toolbar wrapping and isolated print content. CI verifies PDF text and unscaled frozen print content.

The signed-in deployed portal reports v0.31 and opens the existing frozen Development & Site publication; live zoom reaches 125%. A cross-origin mobile wrapper displayed the deployed sign-in screen, not an authenticated mobile session. Authenticated 390px layout inspection was on the same-tree candidate using the hosted backend. Physical-device pinch and independent owner/Edward acceptance remain unverified. `release.json` correctly retains humanAcceptance NOT RUN.

Disposable hosted project `c04b1866-52e1-4f5c-934e-4e3bcee87ea3` saved an action, reopened with exactly one action, completed readiness, and advanced to Qualification. The initial post-save refresh failed with Failed to fetch; reload recovered the persisted record. Only that synthetic project was archived with a verification rationale; it remains in history. This was not a complete hosted Opportunity-to-Authorization rerun; the complete flow passed on the isolated CI backend.

## Gate 01 bounded slice

The feature branch combines the development checkpoint with the released UI, preserving the development-only v025 repair document. It adds a pure Setup readiness/decision contract and 22 unit cases (33 unit tests total pass), with typecheck passing. It does not yet add a usable Setup stage, persistence, database enforcement, authority grants or a migration. No hosted schema, Auth configuration or existing project stage was changed.

The contract requires frozen authorization, accountable evidence, explicit owner authority, permission and active context. Missing/revoked authority fails closed. Hold/No-Go do not advance. Conditional obligations require scope, limits, reason, owner, deadline/trigger and consequence, and cannot waive material or contractual blockers. Candidate conditional categories are limited to communications and controls and still require explicit authority; these descriptors do not themselves confer permission.

Authority consulted: Project State Lifecycle, Stage Gates, Project Authorization & Setup SOP, Approval Matrix, Roles Matrix, Document Control Standard, company Decision Authority Matrix (01.01.02, Drive `1BBcj8Ln-hIaJ-lnaM3n8hTDco-o-oH2sZhRA0Uo6f80`), and Project Lifecycle (02.05.01.01, Drive `18tHzDEvDS7ycrXcBIaUO6zQzhGYHNDqn`). Company authority reserves unresolved authority to Edward. Approval category W remains TBD/escalation. Do not bind the tester account or existing executive role to Gate 01 without confirmed owner identity or documented delegation.

## Remaining implementation

Build saved/reopened Setup forms, authoritative referenced evidence and responsibilities, database-derived readiness, immutable decisions/conditions and history, and exactly-once controlled transition. Replace the old membership-and-six-checkbox transition through a forward migration without rewriting frozen history or moving projects. Keep conditional obligations visible after advancement. Independently enforce all authority and readiness rules in the database; the TypeScript function is not a security boundary.

Use an isolated backend/CI for migration replay, outsider/read-only/archived access, missing/revoked authority, retained snapshots, duplicate requests, lost-response recovery, concurrent transition and compatibility with the frozen release. Hosted Supabase has no branch yet. Local Supabase CLI acquisition did not succeed because network approval was cancelled; repository/shell, browser control, authenticated portal access and GitHub CI remain working.

Before activating any real Gate 01 approver, obtain Edward's confirmed account or his recorded delegation with category, scope, limits, dates, exclusions and approval reference. Do not infer authority from the tester's existing access.
