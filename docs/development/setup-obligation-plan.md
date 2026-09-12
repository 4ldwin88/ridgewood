# 5.4.1 Obligation planning — isolated continuation

This branch starts from the stable combined 5.3 candidate PR31, commit
`4b36af262cb8b754a65efae907a53cb3de92907c`. PR31 and live v0.32 remain unchanged.
This is preparation, not completion of 5.4 or the later E2E lifecycle.

## Intended behavior and boundaries

Authority reviewed: current E2E workbook Tool Contracts 5.4 (`setup_obligations`),
Field Contracts for obligation requirement/type/source/owner/date/trigger,
Data Contracts shared Obligation/Permit/Condition, Contract Guide, Overlap
Decisions OV06/OV09, Source & Decisions, Setup SOP, implementation and Product/UX.
Workbook: https://docs.google.com/spreadsheets/d/1E1GF8LfhrIniVnmJ-6AJT5CEZ-tp3-Iu9QYaNK8TzQo/edit
Setup SOP: https://docs.google.com/document/d/1nO85zZUAPJfBe_lWx3pTTbGRjMFqmYYJ_BIRRzbUpYI/edit

One durable obligation identity is introduced for each sourced requirement.
Plan versions preserve exact references, source payloads, accountable-person
labels and frozen upstream authorization. Date or actionable trigger is required
for planning completeness; both require their relationship. Partial drafts save.
Owners must be workspace members; accountability confers no approval authority.
No removal command exists for saved obligations. Gate conditions remain read-only
in their existing decision records; upstream conditions remain in 5.1.

No issuance, expiry determination, exemption, satisfaction verification or
applicability approval is implemented here. Later stages must reuse these IDs
and introduce governed commands rather than recreate the plan. Saving a plan,
even with all planning fields recorded, retains the permit/Gate 01 blocker until
a separate verified applicability/readiness review is implemented. Untouched
legacy projects retain their existing behavior; exact historical retries remain
recoverable. No authority grants, Auth changes, external messages or hosted
migration execution are part of this change.

## Implementation and validation

Migration: `20260912192157_setup_obligation_plan.sql` (generated with pinned CLI).
Member-scoped RLS, explicit Setup edit permission, immutable rows, project locks,
exact-version writes and request/payload checks protect the command boundary.
The generic Setup permit alias becomes historical/read-only after the first plan.
The shared numbered drawer provides save/reopen, dirty/busy protection, exact
uncertain-save retries, typed selectors, dates and frozen plan history.

Local build and 36 unit tests pass. Lint has only seven pre-existing warnings.
Database contract, concurrency and authenticated acceptance validation must run
on disposable CI; final PR body supersedes pending results here. The replay also
runs all earlier Setup/scope/change suites and frozen v0.32 Opportunity-to-Authorize
and Setup/Gate 01 acceptance against the candidate database.

## Focused review after authenticated candidate verification

1. Open 5.4; add an incomplete obligation, save, close and reopen.
2. Fill a permit requirement, exact published source and accountable person.
3. Use a date or trigger; if both are entered, explain their relationship.
4. Save and reopen. Confirm identity and reference history persist.
5. Inspect mobile/desktop layout and dirty-close protection.
6. Confirm planning completeness never claims issuance or satisfaction, and Gate
   01 stays blocked. Previously saved obligations cannot be removed in preparation.

Browser control remains unavailable in this conversation: tab discovery/creation
worked but refresh-tabs inspection timed out. Hosted authentication and human
acceptance are NOT RUN. Follow demo-release and the PR31 handoff before any release.
