# Setup 5.1 — authorized basis viewer checkpoint

Authority: Drive E2E Capability & Interaction Register, Tool Contracts 5.0–5.9, read 2026-09-12. https://docs.google.com/spreadsheets/d/1E1GF8LfhrIniVnmJ-6AJT5CEZ-tp3-Iu9QYaNK8TzQo/edit

Base release v0.32: 6b9b6aa1e6311891809b4d3c4010064979b19d60. Development remains 45342a1db76b28f1f0f006851a4ab612a5d11a57. PR20 card/menu candidate is separate; this branch neither overwrites nor includes it.

Implemented read-only 5.1 Authorized Basis / 5.1.1 Frozen mandate drawer, reused from opened Projects and Setup. Setup requests its exact recorded authorization ID AND Project State ID. Documents render the authorization's captured sourceSnapshot, not current document revisions. Reuses publication zoom/print and missing-snapshot protections. Conditions, evidence, decisions, verification, readiness and amendments are inspectable. Amendments are filtered to the selected authorization. Explicit loading, missing-record, retry and missing-publication states replace the old endless loading fallback. No input or command can modify the mandate.

Partial tool delivery: current linked obligation tracking and amendment-request commands are NOT connected. Historical conditions are explicitly identified as historical, with no inferred completion. Setup 5.2–5.9 still need distinct canonical-record workflows; generic evidence editing remains until replaced in later slices. Do not claim full Setup completion.

No schema migration, hosted writes, Auth changes, version bump or deployment. Existing RLS and authenticated repository context apply; optional exact-record filter further narrows the read. Supabase changelog and select documentation reviewed; no relevant API breaking change for this existing select path.

Local typecheck, 36 unit tests and build PASS. Lint has 0 errors / 7 pre-existing warnings. Added five browser tests covering desktop/mobile frozen contents, zoom, read-only state, Escape/focus, missing record, failed read and missing publication. Updated real authenticated acceptance selectors to numbered tools. CI results on the PR supersede pending status here.

Browser discovery works, but supported browser tab refresh still times out after 20 seconds. No hosted candidate visual/authenticated verification is claimed. Keep draft until review and protected release verification. No Edward approval is needed to continue implementation. LLM remains deferred.
