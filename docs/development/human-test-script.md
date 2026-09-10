# Ridgewood Opportunity → Authorize human test

**Human testing: NOT RUN. Deployed candidate verified and ready for 4ldwin’s test.** Automated
rehearsals do not change this status. 4ldwin and Edward must record their own
results before the demo is accepted. Use a designated synthetic project and test
accounts, never an actual commitment or client record.

## Verified candidate — 2026-09-10

- URL: https://4ldwin88.github.io/ridgewood/
- Displayed version: **v0.23**.
- Deployed commit: `fc0d1cf26b8bded4448609ec7c865be71f15af38`.
- Backend: `leikcvdfvovycjcjtflq`; workspace: **Ridgewood**.
- Initial tester: 4ldwin's existing account, with active owner membership and current workspace executive authorization authority verified read-only.
- Edward: separate account/workspace access remains pending; do not share the owner's login.
- [Deployment and live desktop/mobile browser checks passed](https://github.com/4ldwin88/ridgewood/actions/runs/34538177379/attempts/2). This checks exact commit, sign-in rendering, assets and viewport fit; it does not certify the hosted authenticated workflow or human usability.
- The owner added the exact release branch to the Pages environment allowlist after the first deployment was rejected. No application or backend change was needed for the successful retry.

## Before starting

The release handoff must supply the verified URL, displayed version, commit SHA,
backend ref, test workspace and account roles. Record tester, date, browser and
device. This candidate retains the existing Gate 2A exception: authorization uses
an authenticated session without the MFA ceremony. Passing this test does not
certify production MFA. No new accounts or invitations to Edward are sent by this
script; access must be provisioned before the human session.

## Walkthrough

| Step | Do this | Expected result |
| --- | --- | --- |
| 1 | Sign in; open Business. Create `HUMAN TEST — <initials/date>` with a synthetic site and summary. | One Project State exists; its identity remains consistent throughout. |
| 2 | Try advancing before adding a next-step action. Add an Opportunity action, then return to the project. | The missing requirement blocks advancement; the saved action satisfies it. Record any need to reload manually. |
| 3 | Reload and reopen the project, then advance to Qualification. | Saved identity and action persist; the correct stage opens. |
| 4 | Answer all five qualification areas. Try Unclear without an advance rationale, then supply a rationale. Continue to Predevelopment. | Incomplete findings or missing required rationale prevent advancement; uncertainty remains visible. |
| 5 | Open Development & Site. Change a field and try Close, Escape on desktop, and an intentional rightward edge swipe on mobile. Decline discard. | The unsaved work stays open. On mobile the form fits, buttons remain reachable, and swipe does not accidentally lose edits. |
| 6 | Save a draft. Close, reload and reopen it. Complete required fields and publish. | Saved answers persist; published content is view-only. Publication alone does not authorize the project. |
| 7 | Print/preview the published document. Create a revision and change a value. Inspect the previous publication. | The previous document stays unchanged and readable. Print layout is legible. Publish the revision with a change note, or discard it before authorization. |
| 8 | Complete and publish the other six Predevelopment forms using clearly synthetic information. | All seven domains show the expected readiness. No failed save is presented as success. |
| 9 | Change a qualification assessment after advancing. | Downstream readiness reopens for reassessment. Restore/review the affected domain work before proceeding. |
| 10 | Enter Authorization and review its package. Open Authorize, then Cancel. | No authorization or stage transition occurs on Cancel. Required blockers and open drafts prevent authorization. |
| 11 | Using the authorized test account, enter an authority basis and confirm once. | The same project moves to Projects, with one frozen authorization record and the expected published evidence. |
| 12 | Sign out/in and reopen the authorization record. | Persisted state and decision basis match. Preauthorization evidence cannot be overwritten. |

The coordinator additionally runs a restricted-account check: a test user lacking
Project Authorization permission or scoped authority cannot authorize. Never
remove real users' permissions to perform this check. For a connection error,
reload and inspect persisted state before deciding whether a retry is needed.

## Record the result

For each step record **PASS / FAIL / NOT RUN**, expected versus observed behavior,
and a screenshot if useful. Record usability issues even when persistence works.
Do not include passwords, access tokens or private client content in screenshots.

| Tester | Candidate version/SHA/URL | Device | Failed steps | Overall result | Date |
| --- | --- | --- | --- | --- | --- |
| 4ldwin | Pending | Pending | Not run | NOT RUN | — |
| Edward | Pending | Pending | Not run | NOT RUN | — |

Acceptance requires no unresolved data-loss, authorization, identity, publication
immutability or blocking workflow defect. Record any accepted minor issues
explicitly. Pin the accepted demo release; test later lifecycle changes separately.
