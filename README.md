# Ridgewood OS

Ridgewood OS is the governed operating system for Ridgewood's end-to-end business-development and project-delivery lifecycle.

Current code candidate displays v0.23. Human acceptance of the current review
candidate is pending; this is not a claim that the candidate is deployed or accepted.
See [the human test script](docs/development/human-test-script.md) and
[authenticated rehearsal](docs/development/authenticated-rehearsal.md).

The visible OS version identifies a human-test cycle, not an implementation commit or development batch. Development may continue through any number of coherent changes without changing the version. After a human test identifies work that requires another test cycle, increment the OS version by exactly 0.01 before sending the next build for human testing. Stable whole-number releases such as v1 and v2 are reserved for actual stable releases.

## Current implementation phase

The current branch is a prototype under acceptance testing. Its purpose is to validate authoritative state, lifecycle progression, persistence, authority, auditability, error handling, and user interaction before the approved final Ridgewood visual/interaction design is applied broadly.

`ProjectState` is the single top-level lifecycle object. Opportunity, Qualification, Predevelopment, Project Authorization, and authorized Project operation are stages or governed regions of that same identity rather than separate top-level business entities.

The currently implemented early lifecycle separates:

- Early `stage`: `opportunity`, `qualification`, `predevelopment`, `authorization`; successful authorization advances the same record to `project_authorization_setup`.
- `status` is separate: `active`, `held`, `declined`, `withdrawn_lost`, `lost`, `cancelled`, `terminated`, `closed`. Full stage definitions live in `src/domain/project-state/projectState.ts`.

Authorization readiness is derived from governed requirements and evidence; it is not a lifecycle stage. Project Authorization must preserve the same Project State identity and must not create a second project identity.

The minimum E2E proof path is Opportunity → Qualification → Predevelopment → Project Authorization → authorized Project. Downstream lifecycle capabilities are added as coherent vertical slices where the governing operating rules are sufficiently defined.

## Repository maintenance rule

When obsolete or legacy implementation is discovered, audit the repository for the complete dependency surface before fixing isolated failures. Remove or reconcile obsolete code, imports, adapters, types, tests, migrations, routes, assets, terminology, and dependencies as one coherent cleanup wherever practical. Do not intentionally leave known legacy dependencies behind to fail later and then repair them one at a time.

Prefer durable core modules and stable domain/application contracts over repeated rewrites. File and folder names should describe their actual responsibility. Do not add labels such as `canonical`, `current`, `legacy`, or version suffixes unless the distinction is genuinely required by the architecture or artifact lifecycle. Git history is the history mechanism for replaced implementation.
