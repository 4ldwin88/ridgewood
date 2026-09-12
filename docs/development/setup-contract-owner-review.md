# Setup 5.2 — owner review candidate

Recovered 2026-09-12: release remains v0.32 at
6b9b6aa1e6311891809b4d3c4010064979b19d60; development remains
45342a1db76b28f1f0f006851a4ab612a5d11a57. This candidate stacks on PR23
549d5eba97f0258edeb62d46f70129f92a76bfc2. Existing workstream heads were preserved.

## Implemented boundary

5.2.3 records immutable Approve, Hold or Reject decisions against an exact saved,
submitted contract version, with reason, reviewer, time, confirmed owner evidence,
risk snapshot and authentication assurance. The common decision record owns the
outcome; a contract extension owns its version-specific context. Prior decisions
remain visible. Stale sequence/version commands fail; an identical lost-response
retry recovers its original decision without recording another.

Company Decision Authority reserves undelegated contract approval to the confirmed
owner. Neither technical owner, Project Lead, executive position nor membership
grants business authority. This migration creates no real owner record or permission
grant. A separately controlled administration process must verify actual identity
and evidence before activation. Delegated signing/spending limits remain unresolved
and are not inferred. This is internal contract-basis review, not legal execution,
payment authorization or a Gate decision.

The command requires explicit review permission, currently effective owner evidence,
a live Supabase session and AAL2 with TOTP verification in the preceding five minutes.
It does not use or extend the Gate2A QA assurance exception. No hosted Auth setting,
credential or factor is changed. The UI exposes the verification requirement but
does not implement factor enrollment or a new authentication flow.

Approval additionally requires the submitted contract basis, four explicit review
confirmations, effective dates and current agreement publication when selected.
Linked risks and any material blocker require a future governed resolution path;
manually closing a risk does not supply authority to waive it. Risk changes serialize
with decisions and invalidate current readiness while preserving historical review.
Subsequent Hold/Reject or a newer preparation also removes current approval.

The four contractual Setup checks project from the canonical current decision.
Setup saves ignore read-only contract aliases and preserve earlier material flags.
Other Setup facts retain their existing owner. Gate 01 still requires its own
permission, authority, complete conditions and explicit conditional limits; its
snapshot captures the projected contract decision and frozen upstream authorization.
Contract approval alone does not move the same Project State out of Setup.

## Validation and release boundary

Local build, 36 unit tests and lint (zero errors, seven existing warnings) passed.
New database tests cover permission versus authority, owner effectiveness/revocation,
live and fresh assurance, missing confirmations, Hold/approval, concurrency conflicts,
lost-response recovery, immutable history, risk invalidation, separate Gate authority,
same-identity advancement and outsider denial. Authenticated acceptance uses genuine
TOTP for a synthetic disposable localhost account (enabled only in generated CI
configuration), then checks lost-response approval,
exactly one decision, reopen and mobile/desktop screenshots. CI outcome and exact
commit are recorded in the PR and supersede pending validation language here.

Migration 20260912081944_setup_contract_owner_review.sql is a disposable-CI candidate.
No hosted migration, merge or deployment occurred. Supported browser recovery still
fails page refresh/control after 20 seconds; hosted session and candidate verification
remain unobserved. Shell/GitHub/CI work. Preserve live v0.32 and follow protected
release/versioning only after exact authenticated candidate/backend verification.

Remaining: governed risk/exception resolution and any actual delegation policy;
secure hosted assurance handoff and verified owner activation; unfinished 5.1
obligation/amendment commands; distinct Setup 5.3–5.9 workflows. LLM remains deferred.
