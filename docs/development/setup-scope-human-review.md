# 5.3 human review milestone

Status: NOT READY FOR HOSTED HUMAN TESTING. Human acceptance: NOT RUN.

## Recovered checkpoint

2026-09-12: all remote branch heads recovered before changes. PR29 remains draft,
unmerged at `c4c0ba98099722cad8683e1f9dfb381b020d82fe`. Release remains v0.32,
`6b9b6aa1e6311891809b4d3c4010064979b19d60`; development foundation remains
`45342a1db76b28f1f0f006851a4ab612a5d11a57`. Working tree was clean. This checkpoint
stacks on PR29 and preserves every existing candidate and workstream.

The user requested finishing 5.3 and testing progress before starting 5.4.
No further permission to push a draft PR is required. This is not permission to
bypass hosted acceptance or release protection.

## Scope correction from current authority

[E2E workbook](https://docs.google.com/spreadsheets/d/1E1GF8LfhrIniVnmJ-6AJT5CEZ-tp3-Iu9QYaNK8TzQo/edit),
Tool Contracts: 5.3 confirms the current approved execution boundary, reviews the
linked baseline, proposes governed deltas and resolves interface responsibility.
7.5 owns the full Changes process through implementation and reconciliation.
Data Contracts preserve one Scope record with baseline versions and approved
deltas. Changes apply throughout delivery, so this distinction does not excuse
an unresolved change or permit a second register.

[New Project Setup SOP](https://docs.google.com/document/d/1nO85zZUAPJfBe_lWx3pTTbGRjMFqmYYJ_BIRRzbUpYI/edit)
requires applicable controls and visible unresolved information, not completion
of every later delivery module before an early human review.
[Changes SOP](https://docs.google.com/document/d/1AcHEf6XHOxl1oM-7ijRmu0KkvTxndEMgBOLbyIWV_kk/edit)
and [Project Approval Matrix](https://docs.google.com/document/d/1zZzWiTtw9nV7jdBz7uXHXBVh41T7GCYooAAeXWi_HnQ/edit)
still require separate authority and evidence before binding work. DEC-03 financial
source and estimate conversion validation blocks remain in effect.

The earlier next-step statement expanded full Changes execution into a prerequisite
for this review. Correct that implementation sequencing: review the working 5.3
baseline/interface flow and the blocked-change path now, once a hosted candidate
can actually be verified. Do not claim full Changes completion or readiness for a
project whose scope remains unresolved. External acceptance, trade commitments,
instructions and applied/reconciled deltas remain unfinished.

The small UI change displays server-derived scope approval blockers at the top of
5.3 and explains the unresolved-change boundary. It introduces no new writable
facts, permissions, authority, schema or readiness calculation.

## Hosted handoff gates

1. Recover supported browser page control. Latest attempt failed refreshing tabs
   after 20 seconds, before any inspectable authentication. Reuse an authenticated
   tester session or browserAuth secure handoff; never guess/reset credentials.
2. Assemble and identify an exact candidate from reviewed stacked PRs. Evaluate
   PR20 navigation separately: it is not an ancestor of PR29. Preserve the known
   working release and record the selected frontend SHA and migration set.
3. Verify intended backend `leikcvdfvovycjcjtflq`, migration compatibility and the
   Opportunity-to-Authorize regression gate before any additive hosted rollout.
   The candidate's Setup migrations have only run on disposable CI. No reset,
   Auth change, paid backend or automatic authority grant is authorized here.
4. Exercise the exact authenticated candidate and intended backend. Confirm the
   tester's existing permissions separately from verified business authority and
   strong verification. Missing authority is an expected denial, not a reason to
   grant signing/spending/gate authority to the tester.
5. Follow protected release/version rules; verify deployed assets, `release.json`,
   exact SHA/backend and desktop/mobile views. Only then provide a working URL
   for this script. The current live v0.32 URL does not contain these candidates.

## Focused human test script

Tester: 4ldwin88@gmail.com. Use explicitly identified disposable test records;
retain them and their decision history. Do not delete or repurpose existing projects.
Record displayed version, build SHA, backend, device and test Project State ID first.
If the candidate or backend differs, stop this test and report the mismatch.

| Step | Action | Expected result |
| --- | --- | --- |
| 1 | Open the authorized test project's 5.1 drawer. | Same Project State identity and frozen upstream basis; readable zoomable documents and print view. |
| 2 | Open 5.2; inspect preparation and review. | Saved exact version reopens; preparation is distinct from owner approval; legacy checklist cannot bypass new governance. |
| 3 | Open 5.3 and describe an inclusion, exclusion and interface. | Appropriate selectors, source references, acceptance criteria and required party assignments; no duplicate contract or program inputs. |
| 4 | Save an incomplete scope draft, close, reopen. | Exact entered data returns; missing review requirements remain visible. Saving does not approve it. |
| 5 | Edit a field; attempt close by button, Escape and mobile swipe. Cancel the discard prompt. | Unsaved work remains; controls fit the screen and busy commands resist dismissal. |
| 6 | Complete and save the scope; request review. | Request refers to the exact saved version, appears once and grants no authority. |
| 7 | With an ordinary preparation account, attempt owner approval. | Missing authority/permission/verification prevents approval. Do not alter access to make this test pass. |
| 8 | With legitimately verified owner access and recent strong verification, approve a complete in-basis scope. | Original immutable baseline is established; current scope readiness updates; project stays in Setup. |
| 9 | Prepare a later scope version and reopen baseline/history. | Original baseline remains unchanged; later draft cannot become approved work silently. |
| 10 | On a separate suitable test record, capture a technical question. | The question, responsible owner, source and parties persist; unresolved scope is visible. |
| 11 | Record an authorized, evidenced no-impact clarification where true. | Clarification restores readiness only if all other requirements remain satisfied. |
| 12 | Record an answer with potential scope/cost/time impact. | Exactly one linked potential change is created; no-impact confirmation cannot waive it. Scope/Gate readiness remains blocked. |
| 13 | Open its 5.3.5 assessment; save distinct cost/time/scope treatment, including reviewed zero where appropriate. | Typed signed money/day values and exact source references reopen; separate internal approvals do not authorize work. |
| 14 | Open 5.3.6; prepare a client offer with a price distinct from internal cost. | Recipient, exact publication, fee, terms and validity persist; owner release is separate from client acceptance. |
| 15 | Save/reopen; inspect the original baseline and readiness again. | No baseline replacement, budget posting, work instruction or Gate advancement occurred. |

Owner-only positive tests remain NOT RUN if the necessary legitimate authority is
unavailable. Automated disposable-fixture evidence must not be substituted for them.
The unresolved-change path is an expected protected boundary, not an accepted
completed execution workflow.

## Feedback to collect before 5.4

For each failed or confusing step: step number, expected result, actual result and
a screenshot if useful. First assess whether the sequence matches how Ridgewood
would prepare and review a real project, whether terminology is clear, whether the
same fact is requested twice, and whether saved records are easy to find again.
Record PASS / FAIL / BLOCKED / NOT RUN per step. Do not call the candidate accepted
until the tester reports results. Hold 5.4 implementation for that feedback.

## Evidence

PR29's final body contains exact-head green build, database, authenticated isolated
acceptance and eight inspected desktop/mobile screenshots. Those prove its isolated
candidate behavior, not this hosted handoff. This checkpoint's final PR body will
record its own validation. Browser access remains a genuine hosted delivery blocker;
shell, Drive, GitHub and disposable CI remain available.
