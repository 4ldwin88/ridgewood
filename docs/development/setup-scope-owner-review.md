# Setup 5.3 — initial scope baseline decision

Recovered remote checkpoint 2026-09-12 before changes: PR25 at
d31d09724a0ad65102cc3a46bf60d4ae2f5f5047; PR24 at
69f058f81df7a5be936f6f66b6659e69359947d6; development at
45342a1db76b28f1f0f006851a4ab612a5d11a57; release v0.32 at
6b9b6aa1e6311891809b4d3c4010064979b19d60. This candidate stacks on PR25.
Other branches, hosted data, Auth and the working release are preserved.

## Governing source and implemented boundary

Drive implementation §28.3, Tool Contract 5.3, scope Field/Data Contracts,
Contract Guide R02/R07/R08/R12–R14, OV-02/05/09, Company Decision Authority,
Project Approval Matrix, Roles Matrix, Lifecycle/Stage Gates, Setup SOP,
Document Control and Change Orders SOP were read. Competitor research remains
in the existing requirements workbook; it was not restarted.

5.3.3 records Approve, Hold or Reject against an exact submitted scope version.
Explicit project.scope.review permission, separately confirmed effective owner
evidence and fresh live AAL2/TOTP assurance are all required. This reuses the
existing controlled owner-evidence and strong-session mechanisms; no real owner,
permission, delegation, authentication factor or authority limit is seeded.

Approval requires current authorized contract review from the same frozen
upstream authorization, complete scope fields, current referenced publications,
explicit scope/boundary/no-material-blocker confirmations and no stored material
scope disqualifier. Publication, Project Lead membership or role alone is not
approval. Shared Decisions own outcomes/reasons; the Scope extension owns exact
version/request, authority, contract and verification context. Hold/Reject create
no approved baseline. Optimistic sequence/version checks and exact idempotent
recovery prevent double decisions after lost responses.

The initial baseline references the original approved scope version. Saving a
later preparation leaves that baseline untouched and visibly requires governed
change approval. This initial-baseline command cannot approve a replacement
version. New source, contract or risk state can invalidate readiness without
rewriting historical approval. A same-version reconsideration retains the original
baseline and records the new decision separately.

Scope readiness projects into the read-only Setup alias and Gate 01 evidence.
The existing gate authority, conditional limits, material blockers and other
requirements remain independent. Scope approval itself does not advance the
Project State. Gate 01 snapshots the actual scope decision reference.

## UI and validation

Numbered review section, blank outcome/authority choices, explicit checkboxes,
red required markers, shared drawer guards, confirmation before decision,
locked preparation while deciding, exact retry, saved/reopened decision history
and a retained original-baseline view. No notification is sent.

Local build, unit and lint checks and disposable CI results are recorded in the
PR against its exact final head; PR evidence supersedes this pending wording.
Tests cover authority/assurance denial, stale scope/source, current contract
prerequisite, Hold, approval, duplicate recovery, immutable baseline/history,
separate Gate authority, pending-change blocking and outsider/archive denial.
Authenticated CI uses genuine TOTP for a synthetic localhost account only.

## Remaining boundary

This does not implement Changes impact/pricing, approved scope deltas,
clarification versus change disposition, exceptional risk resolution or downstream
Procurement/Field/Quality adoption. Those require their canonical module commands;
do not treat this initial-baseline approval as a commercial change order.
Actual owner activation and any delegated authority still require verified
identity/evidence through controlled administration. No such grant is made here.

Browser discovery succeeded but page control again returned a 20-second refresh
timeout before an inspectable sign-in form. Hosted authentication remains unknown;
secure credential handoff cannot be based on guessed form controls. Shell,
GitHub and disposable CI remain usable. No hosted migration, merge or deployment
occurred. Migration 20260912094510_setup_scope_owner_review.sql is tested only in
disposable CI. Exact authenticated candidate/backend verification and protected
release/versioning remain required. LLM stays deferred.
