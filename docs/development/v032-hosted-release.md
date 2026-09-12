# v0.32 hosted preparation and v1.00 direction

Owner authorized final verification using the existing Ridgewood backend after isolated CI passed. A persistent paid test branch is optional; earlier checkpoint wording treating it as mandatory is superseded. No additional project or branch was purchased.

## Compatibility and hosted migration

Tested code: `47e3b36948b299bd8d360aac881c306ea6ae5d76`; Validate 34661405246 and Database replay 34661405254 passed, including full authenticated Opportunity → Authorization → Setup → Gate 01 → Mobilization and concurrency checks. v0.31 UI has no callers for the two legacy Setup RPCs changed by this migration. Its active Business, publication, photo and archive paths remain intact.

Before application, hosted history matched all 131 baseline migrations. Gate 01 was applied on 2026-09-12 to `leikcvdfvovycjcjtflq`. Supabase assigned version `20260912004316`; the repository file was renamed from its CI-generated timestamp `20260912001003` to match the actual applied history, without changing SQL content.

Before/after preservation fingerprints match exactly:

| Records | Count | MD5 of ordered complete records |
|---|---:|---|
| Project States | 17 | 5f9d89a77ba36670ee5156fc6aa8f151 |
| Authorization records | 9 | fbd70371cea8f02d4817c96cf99bdc2e |
| Published revisions | 32 | ba9632c2d81bb522e8897b9854820ebd |

Security advisors added no new findings. The existing leaked-password-protection warning remains unchanged; Auth configuration was not changed.

Hosted candidate review uses the designated tester and disposable records. Setup editing permission is explicitly provisioned for this tester, independently of technical membership. No Gate 01 owner/delegation record is inferred or seeded for a real account. Isolated synthetic fixtures cover the successful gate paths; hosted review must also confirm that an unassigned approver is blocked.

Final candidate/deployment evidence belongs in the release PR. Do not confuse the version bump with deployment: until the protected release is merged and Pages verified, the live release remains v0.31 at `3eb1585eeb2e39fc649dd2bb7be5a00e0d55a197`.

## v1.00 clean-start target — owner direction

At v1.00, establish a clean production repository and Supabase backend, without obsolete implementation code, old test records or unused schema. Treat this as a deliberate cutover milestone, not permission to reset the current hosted database today.

Before cutover: distinguish test data from real business records; settle retention/export requirements; preserve a recoverable historical checkpoint; build and verify the clean baseline; then switch the portal deliberately. Do not carry obsolete compatibility scaffolding forward without a current use. Do not destroy current history or silently discard genuine business records while preparing that baseline.
