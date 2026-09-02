# Repository Architecture

## Dependency direction

Presentation → application → domain. Infrastructure implements interfaces required by application/domain and is composed at the app boundary.

Cross-domain mechanics belong in `src/core` only when they are genuinely universal to Ridgewood. Product-specific behavior stays in its bounded module/domain.

## Bounded product areas

- Business: Opportunity intake, Qualification, Predevelopment, estimating boundary, Authorization.
- Projects: authorized Project establishment and future execution/control through closeout/warranty.
- Network: organizations, people and relationships.
- Attention: deterministic aggregation of actions, blockers, overdue items and required decisions.
- Documents/Evidence: governed source references and provenance, not an uncontrolled duplicate Drive.
- Administration: identity, permissions/configuration surfaces; business authority remains a separate policy concern.

## Intelligence

Future Ridgewood intelligence should be a bounded interpretation layer, not a second operating authority. Separate deterministic rules, attention aggregation, summaries/recommendations, evaluation/regression fixtures and telemetry. Intelligence consumes canonical domain facts and must not redefine lifecycle, permissions or authorization.

## Contracts

Stable schemas/events/interfaces belong at domain/application boundaries. Do not duplicate enums or lifecycle semantics across UI, backend and persistence. External/historical translations occur only at explicit ingress/migration boundaries.

## Tests

Tests mirror governing contracts rather than source-file layout. Canonical Drive E2E scenarios are the acceptance taxonomy. Fairy Lake/STANZA is a real-state fixture and must preserve unknowns rather than manufacture completion.
