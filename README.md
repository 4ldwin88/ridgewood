# Ridgewood OS

Ridgewood OS is the governed operating system for Ridgewood's end-to-end business-development and project-delivery lifecycle.

Current development version: v0.06.

Development versions start at v0.01 and increment by 0.01 for material development changes. Stable whole-number releases such as v1 and v2 are reserved for mature release gates.

## Current implementation phase

The current branch is a rudimentary functional E2E prototype. Its purpose is to validate canonical state, lifecycle progression, persistence, authority, auditability, error handling, and user interaction before the approved final Ridgewood visual/interaction design is applied broadly.

`ProjectState` is the single canonical top-level lifecycle object. Opportunity, Qualification, Predevelopment, Project Authorization, and authorized Project operation are stages or governed regions of that same identity rather than separate top-level business entities.

The currently implemented early lifecycle separates:

- `stage`: `opportunity`, `qualification`, `predevelopment`, `authorization`, `authorized`
- `status`: `active`, `held`, `declined`, `lost`

Authorization readiness is derived from governed requirements and evidence; it is not a lifecycle stage. Project Authorization must preserve the same Project State identity and must not create a second project identity.

The minimum E2E proof path is Opportunity → Qualification → Predevelopment → Project Authorization → authorized Project. Downstream lifecycle capabilities are added as coherent vertical slices where the governing operating rules are sufficiently defined.
