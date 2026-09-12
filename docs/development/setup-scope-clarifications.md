# Setup 5.3 — clarifications and potential change intake

Recovered remote heads before changes, 2026-09-12: PR26
1ad2db25b84b0372c44bfad64e54b440ebf3f0ac; development
45342a1db76b28f1f0f006851a4ab612a5d11a57; release v0.32
6b9b6aa1e6311891809b4d3c4010064979b19d60. Candidate stacks on PR26.

Drive Implementation §28.3/28.10, Setup/Change Orders SOPs, Company/Project
Decision Authority, Tool Contracts 5.3/7.3/7.5, canonical Scope/RFI/Changes data
contracts and shared field/UX rules govern this slice. Previous source review
and competitor research are retained. No thresholds or delegations are invented.

5.3.4 captures a question against one exact saved Scope component/version, with
question, date identified, accountable workspace member, published source and
known affected parties. Immutable source payload and event lineage are retained.
These are Setup scope clarifications, not issued RFIs or instructions.

Responses distinguish verified no-impact clarification from potential change.
Clarification closure requires explicit scope review permission, current verified
business-owner evidence, fresh live TOTP/AAL2 and an explicit no-change/no-waiver
confirmation. Source and preparation must still be current. Operating mode,
technical ownership, membership and follow-up ownership confer no authority.
Closure changes no controlled scope facts and can only restore the previously
approved basis if all existing readiness checks still pass.

Potential-change referral requires preparation access and creates one canonical
Changes intake identity referencing the immutable query/response. It does not
copy scope descriptions into a second writable owner. Unknown commercial/time
impacts stay unassessed. No approval, financial delta, instruction, communication
or baseline replacement is implied. An already referred question cannot be
reclassified to bypass change governance.

Open questions and potential changes invalidate Scope/Setup readiness and block
both new initial-baseline approval and Gate 01 Go/Conditional Go. Exact retries
recover the original response without duplicating questions or Changes intake,
even after archive; mismatched payloads and alternative concurrent responses
are rejected. All mutations serialize on the existing Project State lock.
Historical scope versions, original baseline and authorization remain intact.

UI uses the shared numbered drawer, dirty/busy guards, typed date/member/source
selectors, blank dispositions, explicit checkbox confirmation, saved/reopened
history and frozen publication viewer with print/zoom. No notification is sent.

## Escape guard correction

Authenticated validation exposed a native Escape close after the discard prompt
was rejected. The shared drawer now intercepts Escape at keydown and invokes the
same dirty/busy guard as the close button and swipe. Repeated Escape must retain
unsaved fields; nested propagation stops at the active drawer. Native cancel
handling remains for other platform close requests. The HTML close-watcher
standard permits non-cancelable native requests after history-action activation
is consumed: https://html.spec.whatwg.org/multipage/interaction.html#close-watcher-infrastructure.

## Validation and remaining implementation

Local build/unit/lint and exact-head disposable CI results are recorded in the PR;
its body supersedes pending validation wording here. Added database checks cover
references, dates, retries, authority, assurance, immutable history, RLS,
concurrent alternative responses, readiness and Gate blocking. Authenticated
acceptance covers correction, lost capture/response recovery, no-change closure,
potential-change referral, reopening and desktop/mobile screenshots.

This completes clarification handling and canonical potential-change intake,
not governed change approval. Typed impact/pricing, separate scope/cost/time
approval, authorization instruction, approved delta application and downstream
reconciliation remain outstanding. An obsolete question cannot be closed as a
no-change response against a newer version; its potential impact must follow
change governance. No exceptional waiver path is added.

Browser page control again failed with a 20-second refresh timeout before an
inspectable sign-in form. Supported browser recovery was attempted; authentication
is unknown, so no credential selectors or handoff were guessed. Shell/GitHub/CI
remain usable. No hosted migration, Auth change, merge or deployment occurred.
The working v0.32 release remains unchanged. Hosted exact-candidate verification
and the protected release/version-bump process remain deployment prerequisites.
