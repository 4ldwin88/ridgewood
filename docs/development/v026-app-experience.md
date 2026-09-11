# v0.26 application experience — candidate, not deployed

## Source and scope

Based on the exact current `release/edward-demo` commit `49624b9` (including the public homepage and portal entry). Work branch: `feat/os-app-experience`.

Product authority: [Product & UX §50](https://docs.google.com/document/d/173StRj-BfCawO3aYnzo9f3GANcSCVAtisneXMONyxWs/edit). Lifecycle authority: [Project State Lifecycle](https://docs.google.com/document/d/1nHULWsQJeEWSoQ7i3zrRP488yOcnpOk3Pakq8ZgLuRw/edit). Implementation authority: [Beta implementation plan](https://docs.google.com/document/d/1dvoLnV5WayC2kfYPuj953oGpDXOwsJ1fVbkRJQ9GGHQ/edit).

This candidate replaces the test-harness presentation with a charcoal navigation rail, readable application typography, compact registers, a focused stage navigator with active content beside it, responsive mobile stage navigation, consistent action/selection colors, and less nested drawer spacing. Profile now uses the same native dialog drawer and keyboard/focus handling as the other workspaces. Home, Network and More remain explicitly unavailable; no invented data or false working modules are introduced.

All existing lifecycle commands, permissions, schemas, publications and readiness calculations remain unchanged. The same project identity and evidence boundaries continue to apply. Public page markup/copy is unchanged.

## Repairs found in review

- Optional telemetry invoked `crypto.randomUUID()` at module load without checking support, crashing the app in the HTTP preview. It now skips optional telemetry when unavailable and does not interfere with business operations.
- The release's primary wordmark was a corrupt 98,310-byte PNG. Chrome reported natural dimensions but displayed no image; Pillow failed to decode the data stream. Restored the exact 32,770-byte source from Drive file `18aTcfTYcnUkEylNRlD1-1Cs9m3SDOmWv`, without editing artwork. SHA-256: `380767169819a01145a323c109190ea8984f8e785c8182dfd2860222a9102bbb`. This shared asset repair also corrects the public site's logo.
- Added a regression check for exact approved bytes and successful PNG IDAT decompression. A naturalWidth-only check was insufficient.

## Verification completed

- Production build and TypeScript pass.
- Nine unit tests pass, including the new image integrity check.
- Lint: zero errors; five existing warnings.
- Agent visual inspection of actual application components using isolated, clearly labeled synthetic fixtures: desktop pipeline, project stage navigation, Development & Site drawer; 390px embedded viewport pipeline, stage workspace, Development & Site and Qualification drawers.
- Fixture entrypoints live only in `tests/fixtures/app`; production does not import them. Fixture network writes fail; they do not simulate successful database persistence or authenticate into a hosted backend.
- Live v0.25 hosted baseline: existing tester session verified; fresh synthetic record `469b4c44-ae7f-4f4f-824f-859dbb755cdb`, named `QA v0.26 · hosted baseline`, created. Saved action `Validate synthetic pursuit` remained visible in the open drawer. Setting it Done updated Opportunity readiness without reload and enabled advancement into Qualification. Reloading the live app confirmed the same record remained in Qualification.

## Protected verification and human handoff

User approved branch/PR publication and then requested deployment for their own test before any lifecycle extension. [PR #11](https://github.com/4ldwin88/ridgewood/pull/11) targets the demo release branch.

The initial candidate `10815dcf278df639a43f9fa84296ad4b1ae23a71` passed [Validate](https://github.com/4ldwin88/ridgewood/actions/runs/34629138614) and [Database replay](https://github.com/4ldwin88/ridgewood/actions/runs/34629138612), including authenticated Opportunity → Authorization and archive behavior. Its captured desktop/mobile screens were inspected. A final CSS-only refinement reduces stacked mobile context spacing while retaining stage and status information; protected checks must also pass on that final candidate.

The earlier command-line push lacked credentials after approval; the connected GitHub app published the exact reviewed tree instead. The secure local preview authentication request had returned `locator_invalid` before credential submission; disposable CI provided the authenticated candidate evidence.

Human acceptance remains pending. No hosted migrations, Auth/Edge changes, invitations, or database resets are included. Later lifecycle implementation is explicitly on hold until the user tests the deployed candidate. The previous release `49624b9aa2a68fe55bbd36473dd58112fde39942` remains the frontend rollback reference.

## Remaining delivery implementation sequence

This is a proposed implementation sequence under existing Drive authority, not a replacement for that authority. Read each stage's delegated standards before implementation. Use an isolated backend for later lifecycle work and retain the current demo's contracts.

| Slice | Work to deliver | Required proof |
| --- | --- | --- |
| 1 — Current demo | Finish v0.26 verification, fix confirmed defects, perform hosted Opportunity → Authorization rehearsal and archive the synthetic case individually | Same project ID, evidence/publication integrity, live save/reload, negative gate tests, desktop/mobile acceptance |
| 2 — Authorization & Setup | Delivery workspace, scope/budget/schedule/team basis and Gate 01 requirements | Authorization evidence carried forward; setup gate blocks missing authority/evidence |
| 3 — Preconstruction & Mobilization | Relevant planning, procurement, responsibilities and readiness; Gate 02 | Required readiness and conditional obligations enforced before construction |
| 4 — Construction & Control | Thin connected scope, financial, schedule, procurement, change, field and quality controls; repeatable Gate 03 | A representative change/decision and field issue affect the same governed records and derived attention |
| 5 — Completion & Turnover | Deficiencies, handover and acceptance evidence; Gate 04 | Unresolved required turnover evidence blocks advancement |
| 6 — Project Closeout | Commercial closure, document completion, lessons and Gate 05 | Financial/document/learning obligations remain traceable |
| 7 — Warranty & Final Close | Warranty obligations and final closure; Gate 06 | Closed is reached only with satisfied obligations; archive remains separate; full lineage retained |

Across slices: map entry/exit conditions, active modules, evidence ownership, permitted dispositions, authority, conditional obligations and re-gate triggers. The final fictional end-to-end proof must cover all thirteen modules at thin depth, shared actions/history, derived schedule/attention and user-state differences. Do not equate a label in the stage enum with an implemented stage.
