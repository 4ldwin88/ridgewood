# Delivery continuation checkpoint — v0.29

The owner has reviewed the v0.28 UI and authorized moving beyond Opportunity → Authorization after the requested card and development-note adjustments. This is permission to continue development, not a claim that Edward has completed independent acceptance or that the remaining lifecycle is implemented.

## Current release boundary

v0.29 changes presentation only: a 32px black development-note button with a 44px effective hit area; restored 80px project card images; and mobile photo-left/details-right layouts. Existing authorization, records, photos, permissions and archive behavior remain in place. The revenue chart still awaits the definition of Ridgewood revenue versus gross development revenue and numeric source records.

## Next implementation outcome

Deliver Project Authorization & Setup on the same Project State, ending in an evidence-backed Gate 01 review that advances to Pre-Construction & Mobilization. Preserve the working demo while building and testing this stage on an isolated backend.

Authority read on 2026-09-11:

- [Project State Lifecycle §§17–18](https://docs.google.com/document/d/1nHULWsQJeEWSoQ7i3zrRP488yOcnpOk3Pakq8ZgLuRw/edit)
- [Project Stage Gates — Gate 01 and conditional-go controls](https://docs.google.com/document/d/1R77ZIUblgAJNVPpbl_MMSePsRMfTlhmmpfzn3soKjds/edit)
- [New Project Setup SOP](https://docs.google.com/document/d/1nO85zZUAPJfBe_lWx3pTTbGRjMFqmYYJ_BIRRzbUpYI/edit)

Before implementing delegated roles/approval behavior, read the referenced Project Lifecycle, Approval Matrix, Roles Matrix and relevant document-control standards. These repository notes map implementation work; they do not supersede Drive business authority.

## Scope and evidence

Carry the frozen upstream authorization and published basis forward by reference. Establish contracting party, reviewed contract/written authorization, approved scope and exclusions, commercial value/fee/payment terms, material contractual risks, permits/responsibilities, project leadership, initial budget/control basis, delivery document location/access and material unresolved conditions. Setup ownership, current document locations and communication controls follow the SOP. Unknown authority stays unresolved; software must not infer signing/spending power from a completed checklist.

The gate reads authoritative module evidence rather than duplicating it. Go requires satisfied conditions. Conditional Go requires explicit permissible limits, reason, accountable owner, due date/trigger, consequence and approver, with obligations remaining visible after advancement. Hold and No-Go retain the history and do not advance the stage. A material disqualifying condition cannot be hidden by Conditional Go.

## Verified implementation gaps to resolve

1. `20260903201204_gate2_initialize_project_authorization_setup.sql` initializes Setup requirements under Gate 02. The current `private.enter_project_state_preconstruction_mobilization_command` in `20260905090028_gate2a_gateway_authorization_and_preconstruction_transitions.sql` also audits this transition as Gate 02. Current Drive authority places Gate 01 at the end of Setup; Gate 02 ends Mobilization. Repair through a forward migration without relabeling frozen historical authorization decisions as new delivery gate decisions.
2. The current transition checks active workspace membership and six manually resolved requirements. It does not by itself prove the full Gate 01 evidence, delegated decision authority, a formal delivery-gate disposition, or persistent conditional obligations. Do not expose it as a completed delivery gate UI without these controls.
3. The current Projects screen offers authorization history and archive, not a working delivery setup workspace. A stage enum or existing transition function is not an implemented stage.

## Acceptance for the next slice

One synthetic Project State must retain its ID and frozen upstream record, save/reopen Setup data, derive readiness from referenced evidence, reject missing/revoked authority and material blockers, retain conditional obligations, survive retry/lost-response cases without duplicate decisions, and advance exactly once into Mobilization. Test read-only/outsider/archived cases and desktop/mobile drawer behavior. Keep the existing complete Opportunity → Authorization and archive regression passing. Verify the authenticated candidate before a deliberate release.

After Setup: Mobilization/Gate 02; Construction & Control/repeatable Gate 03; Completion & Turnover/Gate 04; Project Closeout/Gate 05; Warranty & Final Close/Gate 06; Closed. Archive remains a separate disposition.
