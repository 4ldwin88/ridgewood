# Card navigation and menu dismissal candidate

Base recovered from origin/release/edward-demo: 6b9b6aa1e6311891809b4d3c4010064979b19d60 (v0.32). Live release.json independently matched this commit/version/backend on 2026-09-12. Development head remains 45342a1db76b28f1f0f006851a4ab612a5d11a57. Existing worktrees and untracked review fixtures preserved.

Drive contract: E2E Capability & Interaction Register, Contract Guide R17 and Acceptance Cases AT-11/12. Whole active Business/Projects card uses the existing native title button with an extended hit target. Management remains a separate sibling control; no nested interactive card button. Existing archived Business opening restriction is retained. Project menus dismiss on outside pointer-down, Escape (returning focus), action selection, and unmount/navigation.

No database, Auth, branding, release version or deployment change in this slice. LLM implementation remains deferred by owner. Distinct Setup redesign is the next separate slice from the current Drive Tool/Field Contracts, not included here.

Local checks: typecheck PASS; 36 unit tests PASS; lint zero errors (7 existing warnings); production build PASS (existing chunk-size warning). Ten desktop/mobile layout and interaction browser cases are checked in. Local execution could not launch because Playwright Chromium is absent; installation download timed out. Browser-control setup also timed out before returning documentation/session. These are separate failures from the working shell/repository. No hosted candidate login or visual acceptance is claimed. CI results on the PR supersede pending automated status here.

Release gate: obtain passing CI, inspect authenticated candidate desktop/mobile behavior and menu clipping, then follow protected release process with deliberate version bump. Do not merge/deploy this draft while hosted/visual verification remains blocked.
