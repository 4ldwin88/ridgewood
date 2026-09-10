# Qualification reassessment repair — 2026-09-10

Changing a qualification assessment during Predevelopment or Authorization
failed because the private command referenced the nonexistent table
`public.project_state_predevelopment_domains`. The actual table is
`public.predevelopment_domains`. A rollback-only hosted reproduction returned
PostgreSQL 42P01 and confirmed the assessment did not persist.

The repair changes that reference and records `updated_by=auth.uid()` when
invalidating readiness, matching the existing opportunity-edit behavior. It
preserves the existing command signature, grants, workspace checks, status and
stage restrictions, and project-row lock. No compatibility table is introduced.

Changed assessments invalidate previously started domains to `in_progress`;
unstarted domains remain `not_started`. Editing only a note does not invalidate
readiness. Other projects are unaffected. This preserves the existing intended
reassessment rule rather than introducing a new lifecycle transition.

The 13 regression assertions cover persisted assessment and readiness changes in
both stages, actor attribution, unstarted-domain preservation, another project's
isolation, unchanged-assessment note edits, outsider denial, the post-authorization
freeze and held-project denial. The test rolls back every fixture and write. CI
runs it before the separate concurrency suite, which commits disposable fixtures.

## Demo milestones

1. Completed: reassessment repair and installation checks (evidence below).
2. Verify authenticated Opportunity-to-Authorize browser persistence, permission
   revocation and failure/retry paths; fix any confirmed blockers. Current browser
   tests use intercepted fixtures. A local authenticated harness must explicitly
   bind a disposable backend without weakening the hosted Ridgewood identity guard.
3. Prepare and verify a versioned Edward demo deployment, provide a short human
   test script, and pin its release separately from further lifecycle development.

These are outcome milestones, not a promise of three turns. Do not declare human
acceptance, freeze a demo release or advance lifecycle gates from SQL checks alone.
EL8 main and its paused remediation staging are outside this repair.

## Verified checkpoint

At `f781058b0730bf4e004ad7d917e6c34597cf2b8e`,
[database CI](https://github.com/4ldwin88/ridgewood/actions/runs/34534162425)
passed all 129 migrations and 88 database/concurrency assertions, including the
13 new reassessment assertions. [App/browser CI](https://github.com/4ldwin88/ridgewood/actions/runs/34534162598)
also passed. Existing browser tests still use intercepted fixtures.

Exact tested SQL installed on Ridgewood as
`20260910215109_repair_qualification_reassessment`; the original CLI filename
20260910214605 was aligned to the hosted version without changing SQL. All 13
assertions passed again on hosted Ridgewood; the transaction rolled back and
synthetic users/workspace were verified absent. Catalog inspection found no
remaining application-function reference to the nonexistent table.

Security Advisor has only the already recorded
[leaked password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
No Auth setting, frontend deployment, release or EL8 project changed.
Two outcome milestones remain; their duration depends on authenticated acceptance
results and any defects those tests reveal.
