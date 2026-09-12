# Setup 5.3 — canonical scope preparation

Recovered 2026-09-12 before changes: release/edward-demo remains v0.32 at
6b9b6aa1e6311891809b4d3c4010064979b19d60; development remains
45342a1db76b28f1f0f006851a4ab612a5d11a57. This branch stacks on PR24
69f058f81df7a5be936f6f66b6659e69359947d6. Other workstreams remain unchanged.

## Authority and implementation

Drive Tool Contracts 5.3, Field Contracts scope.*, Data Contracts Scope,
Overlap Decision OV-02, Contract Guide R02/R07–R16, implementation §28.3,
New Project Setup SOP and Change Orders SOP govern this slice. The repository
had document-based program context but no canonical Scope Item/Basis records.
This adds Scope-owned identities and immutable preparation versions, not a
second editable program summary or an automatically approved scope baseline.

5.3.1 captures individual delivery components with stable IDs, classifications
(inclusion, exclusion, allowance, interface, owner-supplied), responsible-party
selectors, exact governing publication revisions, acceptance specification or
criterion, and optional related Product & Program publication. Existing program
requirements remain in their source. Selected source payloads and party references
are frozen with the saved preparation; the upstream authorization ID is retained.

5.3.2 submits the exact saved version for authorized review. Incomplete drafts can
save; submission requires descriptions/classifications, governing source and
acceptance basis. Included work, allowances, interfaces and owner-supplied items
must name their responsible party. Proposed assignments do not award a contract.
Requests send no messages and grant no authority. New preparations supersede
pending requests while preserving their immutable source versions.

Membership alone cannot save; explicit Setup-edit permission and active Setup
are required. All writes use server commands with the Project State lock,
optimistic versions, exact idempotent retries and audit events. Foreign-project
references/identities and invalid selectors are rejected. RLS restricts reads;
direct table mutations and historical rewrites are revoked. Removing a component
from a subsequent preparation retains its identity and earlier versions.

Once scope preparation exists, the legacy Setup scope fact is read-only in UI
and normalized from earlier saved evidence on the server. Go/Conditional Go remain
blocked pending an authorized baseline command; existing projects that have not
used the new module retain their current behavior. No migration advances projects. First Setup saves also work when contract/scope
preparation already exists: missing aliases initialize as unresolved, while existing
historical facts and retry ordering remain intact.

## Validation and known limits

Local build, 36 unit tests and lint passed (zero errors, seven existing warnings).
Database tests cover partial saves/submission denial, typed references, foreign
identity rejection, idempotency, stale edits, immutable snapshots, supersession,
archive/outsider denial and continued gate blocking. Authenticated disposable CI
covers validation correction, lost save and request responses, exact retries,
reopening, stable identity and desktop/mobile captures. Final CI/visual results
and exact commit are recorded in the PR; they supersede pending wording here.

Not implemented: authoritative baseline approval, approved scope deltas,
clarification/change distinction, contractual responsibility acceptance or
propagation into procurement/field/quality. These must use their governing
approval/change contracts; generic decisions and existing publications are not
proof of scope approval. This candidate does not claim complete 5.3 E2E readiness.

Migration 20260912090913_setup_scope_basis.sql is for disposable CI only. No hosted
migration/Auth change, merge or deployment occurred. The supported browser recovery
again discovered Chrome but page control failed after 20 seconds before a visible
sign-in form could be inspected. Secure credential handoff cannot be constructed
without that form. Authentication is unknown; shell/GitHub/CI remain available.
Preserve live v0.32 pending exact authenticated candidate/backend verification and
the protected release/version-bump process. LLM stays deferred.
