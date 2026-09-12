# Combined 5.3 review candidate

Status: isolated validation pending; hosted verification and human acceptance NOT RUN.

## Composition and preservation

2026-09-12 remote recovery verified all branch heads and PR20–30 bodies. PR21–30
form the expected ancestry. Combine PR30 `90cacb7a06d1e165b0c612668c6ada3168b067dc`
and separate PR20 `e712a5e100d904fa6c1cc76d52eff1fcffee1e24` in a new candidate
branch. Preserve both parents, all original feature branches, development foundation
`45342a1db76b28f1f0f006851a4ab612a5d11a57` and live v0.32
`6b9b6aa1e6311891809b4d3c4010064979b19d60`.

Two merge conflicts required reconciliation: Projects keeps the newer Authorized
Basis viewer and adds the extended native card button; portfolio CSS keeps all
Setup/contract/scope/proposal styles and adds card hit-target/menu rules.
No application behavior beyond those reviewed parent changes is introduced.

## Authority and milestone

Current E2E workbook Tool Contracts 5.0–5.9, Contract Guide and Overlap Decisions
were re-read. 5.3 reviews scope and interfaces; complete Changes execution belongs
to 7.5. Existing blockers are retained. Use the focused script in
[setup-scope-human-review.md](setup-scope-human-review.md).

The owner now permits later isolated E2E development if hosted testing stays
blocked. Keep this 5.3 candidate separate and stable for feedback; later work must
not silently enter this review/release. No full Changes completion is claimed.

## Database compatibility plan

Eight added migration files, no changes to baseline migration contents. New tables,
permissions catalog entries and private command wrappers do not grant real users
business authority. Existing Setup read/save/Gate commands are deliberately
wrapped: projects using new preparation derive governed readiness; other projects
retain the legacy path. Original authorization/publication/scope history must stay
immutable. This is not a purely frontend release.

The existing clean replay, 291 Setup/contract/scope/change assertions, document,
qualification, concurrency and three authenticated tests run on the combined tree.
An additional CI step checks out the exact v0.32 release in a separate directory
and runs its original authenticated Opportunity-to-Authorize/Setup/Gate acceptance
against the candidate database. Only its synthetic test email identities change,
preventing collision with candidate fixtures. Application sources and assertions
stay at v0.32. This verifies backward UI compatibility for the covered workflow;
it does not prove a populated hosted upgrade or authorize deployment.

Before any hosted application: compare live migration history/content, capture
record-preservation fingerprints, verify additive rollout compatibility, then
exercise the exact candidate with the designated account and intended backend.
No hosted reset, migration, Auth change, real grant or release occurs here.
Supabase migration guidance: https://supabase.com/docs/guides/deployment/database-migrations

| Migration | SHA-256 |
| --- | --- |
| `20260912064810_setup_contract_preparation.sql` | `ec2c5fb5c069675a5b1a548875eeb82691e353f98ed376d4eb43249860853117` |
| `20260912074524_setup_contract_review_requests.sql` | `6737f1cdb937facfda2b5dbb082c04e6d16daf1bb7f1da78ff275f8fa87e2f62` |
| `20260912081944_setup_contract_owner_review.sql` | `273c918c5419b207b40eed18d4a93df7dae4ff50fb05fb77b28da3cfd1c1b62b` |
| `20260912090913_setup_scope_basis.sql` | `1d890240233405ca9293e8d2a93fd079fc035cf6cd2256fdf3c8b93448a78abd` |
| `20260912094510_setup_scope_owner_review.sql` | `3c52d6c3107d9e88fb73dd18b0674d849f2ae121e34a15d3e22a7a4d65b06525` |
| `20260912101335_setup_scope_clarifications.sql` | `50e79be668ccea22c5295855839219b3cd5c87c553fdbaf508df29953d5f3935` |
| `20260912111515_setup_change_assessment.sql` | `1f372f172edabd7ec2c0b5d8201709fc39d1e86a1e55fc8604ede30c5afd3489` |
| `20260912115820_setup_change_proposal.sql` | `4b7b9d56c0ed4c0def7861bdb00591dc43f71743051efb0f2006d18912d98ef2` |

## Validation and release

Local combined build/typecheck and all 36 unit tests passed. Lint: zero errors,
seven existing warnings. Recovered migration history and diff checks passed.
Final exact-commit CI outcomes belong in the PR body and supersede pending wording.
No local browser acceptance is claimed. Supported Chrome discovery and blank-tab
creation worked; listing and fresh-tab inspection both failed at refresh-tabs
with a 20-second timeout in this new conversation. No repeated retry or login.

Only release/edward-demo deploys; version bump and protected review remain required.
Do not label live v0.32 as containing this candidate. Human-test readiness remains
blocked until authenticated candidate/backend and final deployment checks pass.
