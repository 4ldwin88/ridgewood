# Setup 5.2 — contract preparation checkpoint

Authority: Drive E2E Capability & Interaction Register, Tool/Data/Field Contracts for 5.2 and canonical contract record, verified 2026-09-12. https://docs.google.com/spreadsheets/d/1E1GF8LfhrIniVnmJ-6AJT5CEZ-tp3-Iu9QYaNK8TzQo/edit

Stacked on PR21 candidate a98005eaf1996aca38879457383edb621c69945f. Live release remains v0.32 / 6b9b6aa1e6311891809b4d3c4010064979b19d60; PR20 card/menu work remains separate.

Implemented the preparation portion of 5.2 in a numbered drawer (5.2.1), with organization references, exact published agreement revision, supporting evidence, compensation model/value/currency/fee basis, payment terms, effective dates, existing risk links and review-decision reference. Inputs start unassessed/blank. Typed dates, checkboxes, selectors and grey examples replace generic repeated narrative fields. No approved revenue statistics are derived from a preparation record.

Dedicated append-only project_contract_versions preserves Project State and frozen authorization identities, selected reference snapshots, request/version lineage and audit history. Read/save RPCs independently enforce active workspace access, explicit Setup-edit permission, project state, reference scope, field shape, amount/date validity, version conflicts and same-request recovery. No client/table direct writes. Removed organizations cannot become new parties but already-referenced parties are preserved. New preparation blocks Go/Conditional Go until a separately governed contract-review connection is implemented. No historical decisions or existing projects are moved or rewritten; projects without a contract preparation retain their prior behavior. Corresponding old checklist fields become read-only once this record exists, rather than creating two writable sources.

NOT COMPLETE: governed review decision verification/submission, authorized signing/spending limits, live risk acceptance, downstream budget/cashflow wiring and the rest of Setup. Linking an existing decision is not proof of authority. UI and backend explicitly keep this as preparation; do not claim full 5.2 approval or full Gate 01 readiness.

Migration 20260912064810_setup_contract_preparation.sql was generated with Supabase CLI 2.117.0 using migration new. Local Docker/database is unavailable; new migration is for clean disposable CI replay ONLY. No hosted migration, data write, Auth configuration, paid backend branch, deployment/version bump or branding change. Hosted compatibility still requires review before applying. Shared backend is not isolated by a frontend branch.

Local typecheck, 36 unit tests, lint (0 errors / 7 existing warnings) and build PASS. Added 16 database contract tests and real authenticated lost-response/save/reopen/desktop/mobile coverage. CI results on PR supersede pending status here. Supported hosted browser control remains unavailable due tab-refresh timeouts; no hosted visual verification claimed.

Continue with governed contract review against company Decision Authority / Project Approval Matrix and valid delegation; never infer power from Project Lead, membership, operating mode or a free-text decision label. Keep LLM deferred. Preserve frozen publication and authorization snapshots.
