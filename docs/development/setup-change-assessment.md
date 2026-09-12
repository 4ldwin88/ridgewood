# Changes assessment and independent internal review

Recovered PR27 at `e34d6d4295658c4e6a44c08259f139ea8c7c2192` before implementation.
Release remains v0.32 at `6b9b6aa1e6311891809b4d3c4010064979b19d60`;
development foundation remains `45342a1db76b28f1f0f006851a4ab612a5d11a57`.
This candidate stacks on `feature/setup-scope-clarifications` and preserves the
other feature branches. Its PR body supersedes pending validation wording here.

## Source authority

Re-read the current [implementation authority](https://docs.google.com/document/d/1dvoLnV5WayC2kfYPuj953oGpDXOwsJ1fVbkRJQ9GGHQ/edit),
[Company Decision Authority](https://docs.google.com/document/d/1BBcj8Ln-hIaJ-lnaM3n8hTDco-o-oH2sZhRA0Uo6f80/edit),
[Project Approval Matrix](https://docs.google.com/document/d/1zZzWiTtw9nV7jdBz7uXHXBVh41T7GCYooAAeXWi_HnQ/edit),
[Changes SOP](https://docs.google.com/document/d/1AcHEf6XHOxl1oM-7ijRmu0KkvTxndEMgBOLbyIWV_kk/edit),
[Module Architecture](https://docs.google.com/document/d/1cJ9ieftdjAPdbwZZFmib9z7rZWMqB-MQiI0FMpHYbWA/edit),
and the linked Setup, gates, roles, document-control and product/UX authorities.
Read all rows of Tool Contracts, Field Contracts, Data Contracts, Contract Guide,
Overlap Decisions, Metric Contracts, Report Blueprints and Source & Decisions in
the [E2E workbook](https://docs.google.com/spreadsheets/d/1E1GF8LfhrIniVnmJ-6AJT5CEZ-tp3-Iu9QYaNK8TzQo/edit).
Existing competitor research was retained.

Cost and time decisions are independent. Internal, client and trade approval,
instruction and implementation are distinct. Unknown impacts cannot default to
zero. No amount threshold or blank delegation grants authority. Original scope
and frozen upstream authorization remain unchanged. Source & Decisions DEC03
financial integration limitations remain visible; no ledger/commitment updates
are introduced here.

## Implemented candidate

- 5.3.5 Changes drawer opens the existing canonical change from scope-question
  history. Versioned assessment owns description, proposed saved scope reference,
  signed cost/currency, signed time/calendar basis, assumptions, other impacts,
  material assessment and frozen published evidence references.
- Blank drafts save and reopen. Submission requires complete exact saved data.
  Reviewed zero and negative credits/day deltas remain explicit values.
- Separate scope/cost/time decisions use shared Decisions with immutable typed
  extensions. Explicit `project.change.review`, a verified effective business
  owner record and a live recent AAL2 TOTP session are required. No real user
  grants, owner records or Auth changes are provisioned.
- Approval rechecks the exact latest proposed scope, original baseline, matching
  frozen authorization, current contract decision/risk context and published
  evidence. Material blockers remain hard blockers. Source locks prevent a
  publication supersession racing approval insertion.
- Project State locking orders version/request/decision writes. Payload-matched
  retries recover prior results; stale versions and sequences fail. A later
  assessment cannot inherit prior dimension approval. History remains immutable
  with membership RLS and explicit grants; clients cannot write tables directly.
- Drawer retains entries after validation errors, preserves exact uncertain
  requests, registers dirty/busy guards, and reopens saved state. Numbered shared
  drawer supplies swipe/close and focus behavior. Published evidence renders
  through the shared document viewer.

## Explicit delivery boundary

Even three approved internal dimensions return `workAuthorized: false`.
Client/trade authorization, authorized instructions, reconciliation and applied
scope deltas remain unfinished. No change status, original baseline, budget,
commitment, schedule or Gate decision is mutated by internal review. The PR27
unresolved-change blocker remains in Scope/Setup, including Conditional Go.
This is not a completed Changes execution workflow or completed 5.3.

Next: verify external authorization/instruction authorities and implement governed
application of approved deltas, then continue distinct 5.4–5.9 tools. Gate 01 ends
Setup; Gate 02 ends Mobilization. LLM remains deferred.

## Validation and deployment

Local build and 36 unit tests pass; lint has zero errors and seven existing
warnings. Database replay adds independent-dimension, permission/assurance,
material/source, retry/version, immutability, RLS and Gate-blocking regression
checks. Authenticated disposable acceptance adds correction, lost-save/request/
decision recovery, reviewed credit/zero, independent approvals, reopening and
390/1280 screenshot evidence. Exact remote results are pending in this checkpoint;
the PR body will record the final candidate SHA and completed run links.

The supported browser runtime again failed `refresh tabs` after 20 seconds before
an inspectable sign-in form. No credentials were guessed, reset or exposed. Shell,
Drive and GitHub remain usable. Migration `20260912111515_setup_change_assessment.sql`
is for disposable CI only and has NOT been applied to hosted Supabase
`leikcvdfvovycjcjtflq`. No merge/deploy: exact authenticated hosted candidate/backend
verification and protected release/version-bump checks remain outstanding.
