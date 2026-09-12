# v0.31 card and publication viewer candidate

Reconstructed from the prior conversation after the coding environment became unavailable. Original local commits 7ce3f08 and 39f7dd1 were not pushed; this is a new candidate requiring CI verification. User explicitly authorized pushing the feature branch and opening its PR.

Base verified: release/edward-demo remains 50e3383e4b12b0c389349aa6ddaf0bb457e52a8e (v0.30). Changes: 80px photos become 112px; management moves to a 44px vertical-ellipsis target at card top-right; existing photo and management actions remain. Published snapshots use a read-only scrollable viewer, 50–300% zoom/reset, native browser pinch zoom enabled, and a top-right Print / Save as PDF button. Printing clones only the immutable publication, removes viewing zoom, and excludes controls. Branding and database unchanged.

Historical local checks passed typecheck, lint with seven existing warnings, 11 unit tests, build and migration-history validation. These are not fresh checks of this reconstructed commit. Updated browser regression verifies viewing at 125%, printing at 100%, frozen values and actual PDF pages with text. CI results must be checked before release. Hosted authenticated verification, desktop/mobile visual review and physical pinch testing are pending because the coding/browser environment is unavailable. No deployment or human readiness is claimed.

## Next authorized work

Finish this UI slice's browser/PDF, isolated database replay and authenticated lifecycle tests. Then hosted verification with tester 4ldwin88@gmail.com; request password through supported authentication if no session is available. Do not guess credentials.

Setup through Gate 01 remains authorized but unimplemented. Continue separately from the working demo and protect the shared backend. Follow next-delivery-slice.md and current Drive authority. Repair the erroneous Gate 02 setup transition through a forward migration and explicit gate policy, not historical relabeling or moving existing projects. Project Approval Matrix category W does not grant unresolved delegation; roles and workspace membership are not gate authority. Read company Decision Authority Matrix before implementing policy. Preserve canonical identity, frozen upstream authorization, evidence, conditions, decision history and idempotent transitions.
