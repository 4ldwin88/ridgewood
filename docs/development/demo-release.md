# Edward demo release policy

Only `release/edward-demo` deploys GitHub Pages. The workflow refuses other refs, including manual dispatch on a development branch. Development continues on `gate2/reconciliation-foundation` and feature branches. Moving the demo release branch is a deliberate candidate update; do not move it for unrelated lifecycle work. Human acceptance remains NOT RUN until the actual tester records results.

The Pages artifact includes `release.json` with displayed app version, exact build commit, and Ridgewood backend reference. The post-deployment browser gate checks that exact commit, the rendered sign-in screen, logo loading and viewport fit on desktop and mobile. It does not log in as a human or certify the hosted business workflow.

## Candidate handoff

- App version: v0.23 (keep until a human test leads to another iteration).
- Backend: `leikcvdfvovycjcjtflq`, verified ACTIVE_HEALTHY on 2026-09-10.
- Workspace: Ridgewood.
- Initial tester: 4ldwin's existing account; active owner membership and current workspace executive authority, with project.authorize permission verified by read-only inspection.
- Edward: no current workspace membership observed. Provision his own approved account before his independent test; do not share the owner's login or send an invitation without authorization.
- Human script: [human-test-script.md](human-test-script.md).
- Candidate URL, build SHA and deployment result: recorded in the authoritative Drive plan and release handoff after successful deployment.

## Database boundary

A frozen frontend branch alone cannot freeze a shared database. Later lifecycle work must use disposable local Supabase/CI stacks, or a separately provisioned development backend, until its migrations and RPC changes are shown to preserve this demo's contracts. Do not replay history, reset the hosted project, or introduce breaking schema/Auth/Edge changes into the demo backend. Any deliberate hosted change requires the Opportunity-to-Authorize regression gate and a recorded demo compatibility decision. No second paid project is required for local/CI development.

## Rollback

Preserve the previous deployable commit before any release update. Restore its frontend content in a new release commit and rerun Pages verification if necessary; do not rewrite the database or delete test/decision records to roll back the UI. Before the first release-branch deployment, the prior prototype baseline is `37d7228612bf7f3bbe7dfa4d7cdb29c9957ef4e0`; this is a source rollback reference, not a claim that its old UI implements the new publication workflow.

The existing Gate 2A MFA exception remains unchanged and visible in the test script. No new hosted migration or Edge Function deployment is part of this frontend release.

## Deployment verified — 2026-09-10

Candidate v0.23 is live at https://4ldwin88.github.io/ridgewood/ at commit `fc0d1cf26b8bded4448609ec7c865be71f15af38`. The exact commit and desktop/mobile sign-in, logo and viewport checks passed in [attempt 2](https://github.com/4ldwin88/ridgewood/actions/runs/34538177379/attempts/2). The initial rejection was confirmed by the owner's screenshot: release/edward-demo was not permitted by the github-pages environment. The owner added its exact branch rule; the failed jobs were then rerun successfully.

The frontend deployment milestone is complete. Human tests remain NOT RUN. 4ldwin can begin with the existing account; Edward's independent test requires his own provisioned access. This documentation update belongs to the development branch and does not move either release branch or redeploy the tested candidate. No demo has been human-accepted yet.
