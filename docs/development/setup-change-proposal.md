# Client change proposal and owner-authorized release

Recovered PR28 `e242fccf971e8076cdb10561601f0e2a8af77d6f` before edits.
This candidate stacks on `feature/setup-change-assessment`. Release v0.32 remains
`6b9b6aa1e6311891809b4d3c4010064979b19d60`; development foundation remains
`45342a1db76b28f1f0f006851a4ab612a5d11a57`. Preserve all other workstreams.

## Authority and prerequisite

Re-read [Changes SOP](https://docs.google.com/document/d/1AcHEf6XHOxl1oM-7ijRmu0KkvTxndEMgBOLbyIWV_kk/edit),
[Company Decision Authority](https://docs.google.com/document/d/1BBcj8Ln-hIaJ-lnaM3n8hTDco-o-oH2sZhRA0Uo6f80/edit)
and [Project Approval Matrix](https://docs.google.com/document/d/1zZzWiTtw9nV7jdBz7uXHXBVh41T7GCYooAAeXWi_HnQ/edit),
including category I: client change proposals require scope, cost basis,
markup/fee, time treatment, assumptions and supporting quotations. Owner approval
remains required unless explicitly delegated. A cost assessment is not a client
price; client-facing proposal preparation/release precedes client acceptance.

Current workbook Change Field/Data/Tool Contracts preserve separate internal,
client and trade approval, and exactly-once eventual reconciliation. Source &
Decisions DEC03 estimate conversion and financial-source blocks remain intact.
The inherited checkpoint contains linked implementation, UX, lifecycle, Setup,
gate, role and document-control authorities. No delegation thresholds are added.

## Implemented candidate

5.3.6 opens from Changes. It owns the proposal recipient, signed client amount,
markup/fee treatment, offer-specific commercial terms, optional fixed validity
and exact published proposal reference. Scope, internal cost, currency, time and
assessment assumptions remain references to one immutable assessment version.
No second editable scope/time or budget total is introduced.

Drafts save/reopen independently of release. Server checks exact assessment and
proposal versions, signed money precision, finite calendar dates, project-scoped
published evidence and active organizations. Proposal payload and publication
metadata are frozen; history retains its original assessment/currency context.

Release is a shared Decisions record with an immutable extension. A separate
`project.change.proposal.release` permission, verified effective owner record,
live recent AAL2/TOTP, exact current proposal and explicit owner confirmation are
required. Recipient must be a party to the current reviewed contract; owner
verification establishes its client role and verifies the exact published offer
matches price, fee, conditions and independently reviewed scope/time. Membership
or the selected document alone never establishes that verification.

All three current internal dimensions must be approved. The release snapshots
their exact decision IDs; a later hold or replacement internal decision makes the
old release stale. Retired recipients, expired stated validity, superseded offer,
new assessment and material/current-basis blockers prevent release. Source/party
locks and the existing Project State lock order concurrent operations. Exact
payload retries recover prior records, including after archive; new writes then
fail. History remains immutable and protected by explicit grants and membership
RLS. No real owner/permission grants or Auth changes are made.

## Boundary

The command authorizes the exact proposal for release; it does not send messages
or record delivery. `clientAccepted` and `workAuthorized` remain false. Separate
client/trade authorization, binding instructions, approved scope application and
financial/schedule reconciliation are unfinished. Existing unresolved change and
Gate 01 blockers remain. This slice is not a completed Changes execution workflow.
No exceptional work-before-client-authorization policy is invented.

## Validation and deployment

Local build and 36 unit tests pass; lint has zero errors and seven existing
warnings. Disposable CI adds proposal precision/date/source/authority/currentness,
retry/concurrency, immutability, RLS and non-execution tests. Authenticated
acceptance adds real server validation correction, lost-save/release responses,
reopening, exact counts and 390/1280 visual evidence. Final exact-head CI results
will be recorded in the PR body, superseding pending wording here.

The supported browser connection again timed out refreshing tabs after 20 seconds,
before inspectable authentication. No credentials were guessed/reset or exposed.
Hosted candidate acceptance remains outstanding. Migration
`20260912115820_setup_change_proposal.sql` is disposable CI only; it has NOT been
applied to hosted `leikcvdfvovycjcjtflq`. No merge/deploy or release version bump.

Next: external authorization tied to the owner-released exact proposal, separate
trade approval and authorized instructions/application, then remaining 5.4–5.9.
