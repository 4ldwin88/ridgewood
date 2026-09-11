# v0.25 demo repair and evidence

## Acceptance state

v0.24: **human acceptance FAIL** (owner feedback). The UI was rudimentary, drawer swipes unreliable, and spacing/alignment inconsistent. Its previous automatic passes did not exercise touch gestures or visually review the authenticated workflow. v0.25: **human acceptance pending**. Edward readiness is not asserted.

## Authority and recovered state

- Implementation authority: https://docs.google.com/document/d/1dvoLnV5WayC2kfYPuj953oGpDXOwsJ1fVbkRJQ9GGHQ/edit
- Product & UX §50: https://docs.google.com/document/d/173StRj-BfCawO3aYnzo9f3GANcSCVAtisneXMONyxWs/edit
- Verified remote development: `205baf5de4e5142354eeb6c9988c05d005e473ce`.
- Verified remote demo: `daec611ebac51f8502407b8e525e51a8adf935d6` (v0.24).
- Live authenticated v0.24 inspected with the owner's authorized session. The active Business navigation label had poor contrast due to conflicting global styles. The intake card consumed half the page; portfolio records repeated four administrative buttons plus history.

## Implemented design work

| Authoritative pattern | v0.24 gap | v0.25 repair |
| --- | --- | --- |
| Compact desktop registers | Nested cards with repeated administration | Business and Projects tables, distinct lifecycle/status columns, search, Business stage filter, contextual Manage menu |
| Responsive transformation | Narrow desktop composition | Mobile record lists and canonical bottom navigation; project context and lifecycle remain visible |
| Clear hierarchy and next action | Competing cards, repeated purpose copy | Compact intake action, project header, lifecycle position, scannable readiness, progressive stage sections |
| Consistent forms and controls | Conflicting global styles and native-looking controls | Shared tokens, typography, spacing, input/button styles, assessment groups and status treatment |
| Guarded drawers | 22px handle; no drag feedback; edit closed after save | 44px edge target, header dragging, visible translation, direction/distance threshold, cancellation, shared dirty/busy/Escape protection; saved Edit Opportunity stays open |
| Consequential confirmations | Manually managed modal without native focus isolation | Native modal dialog for authorization/disposition confirmations |
| Truthful work state | Nondefault capture selections could remain dirty after save | Successful capture resets transient inputs; failed saves preserve pending work |

No new business readiness rule or source field is invented. Home/Network/More remain explicitly unavailable in the bounded demo; this is not a claim that every §50 capability or later lifecycle module is implemented. The commercial-stage board and fuller mode-adaptive intelligence are not part of this repair.

## Verification layers

1. Local production build, type checking and eight unit tests passed. Lint has warnings; no errors. Local browser tests could not launch because the Chromium executable was absent; this is not a product-test failure or a pass.
2. Existing CI gates retained: dependency audit, migration history integrity, full disposable Supabase replay, permission/immutability/concurrency checks, real authenticated Opportunity → Authorize scenario.
3. New gesture regression uses Chromium touch input, not synthetic DOM events: successful edge/header swipes, short/reverse/vertical gestures, dirty discard cancellation, busy guard, Escape and focus return. Intercepted synthetic form responses isolate interaction behavior; these tests do not prove hosted database persistence.
4. Authenticated lifecycle screenshots cover desktop/mobile pipeline, intake, Opportunity, Actions, Risks, Qualification, seven Predevelopment domains, published document, authorization review/confirmation, Projects, frozen history and archive. Long drawers include top/middle/bottom captures. These use a real disposable backend with synthetic records, not mocked successful business responses.
5. Agent visual review and hosted checks: pending at this checkpoint.
6. Owner human acceptance: pending. Edward acceptance/access: pending; no invitation authorized or sent.

## Release and data boundaries

The release branch remains unchanged until candidate gates and visual review complete. Follow `demo-release.md`; preserve the previous release and verify the exact deployed commit. Existing records must be retained; archive synthetic hosted verification records individually. No database reset, hosted migration, Auth/Edge change, EL8 work, or deployment-protection weakening is included.
