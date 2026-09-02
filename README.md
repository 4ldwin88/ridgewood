# Ridgewood OS

Ridgewood OS is Ridgewood's operating application for business development, project establishment, project control, and institutional knowledge.

## Authority

Ridgewood Drive is authoritative for business semantics, lifecycle, authority, UX behavior, and acceptance. Drive is challengeable when a rule is contradictory, technically unsound, impractical, ambiguous, unsupported by operating evidence, or unnecessarily complex. Code must never silently diverge: resolve the governing Drive specification first, then implement it.

## Current milestone

Potential Opportunity → Qualification → Predevelopment → Authorization → Established Project.

Construction execution and closeout remain future product domains. GAP-07 estimating issue/release and GAP-08 estimate-to-project-budget handoff remain validation-blocked and must not be fabricated in code.

## Architecture

The application is organized by durable product responsibility rather than screen ownership:

- `src/app` — composition, routing, providers and shell only.
- `src/core` — cross-domain Ridgewood mechanics: lifecycle, authority, attention, audit.
- `src/modules` — bounded product capabilities such as Business, Projects and Network.
- `src/domain` — canonical business entities and invariants.
- `src/application` — commands, queries and policies coordinating domain behavior.
- `src/infrastructure` — database, repositories, authentication, storage and telemetry adapters.
- `src/shared` — genuinely reusable UI/form/validation primitives.
- `tests` — unit, integration and canonical E2E scenarios.
- `supabase` — migrations, seed data and future server-side functions for Ridgewood's own backend.

UI navigation does not define system architecture. Home, Business, Projects, Network and More compose capabilities from these layers.

## Legacy policy

The former static prototype runtime is intentionally removed. Git history preserves it. Do not introduce `legacy`, `old`, `deprecated`, `v1`, compatibility aliases, commented-out implementations, or duplicate internal semantics.

## Development rule

Material lifecycle changes are named commands/use cases, not arbitrary record updates. UI components do not directly mutate canonical persistence. Mode (Operate / Control / Direct) changes presentation and emphasis only; it never grants permission or business authority.
