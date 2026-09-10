-- Gate2A: canonical cross-stage records retain Project State as root identity while
-- carrying optional lifecycle/capability context for Qualification and Predevelopment.
alter table public.actions add column if not exists lifecycle_stage text, add column if not exists capability_key text;
alter table public.risk_issues add column if not exists lifecycle_stage text, add column if not exists capability_key text;
alter table public.decisions add column if not exists lifecycle_stage text, add column if not exists capability_key text;
alter table public.evidence_references add column if not exists lifecycle_stage text, add column if not exists capability_key text;

alter table public.actions add constraint actions_lifecycle_stage_check check (lifecycle_stage is null or lifecycle_stage in ('opportunity','qualification','predevelopment','authorization')) not valid;
alter table public.risk_issues add constraint risk_issues_lifecycle_stage_check check (lifecycle_stage is null or lifecycle_stage in ('opportunity','qualification','predevelopment','authorization')) not valid;
alter table public.decisions add constraint decisions_lifecycle_stage_check check (lifecycle_stage is null or lifecycle_stage in ('opportunity','qualification','predevelopment','authorization')) not valid;
alter table public.evidence_references add constraint evidence_references_lifecycle_stage_check check (lifecycle_stage is null or lifecycle_stage in ('opportunity','qualification','predevelopment','authorization')) not valid;

create index if not exists actions_project_state_context_idx on public.actions(project_state_id,lifecycle_stage,capability_key);
create index if not exists risk_issues_project_state_context_idx on public.risk_issues(project_state_id,lifecycle_stage,capability_key);
create index if not exists decisions_project_state_context_idx on public.decisions(project_state_id,lifecycle_stage,capability_key);
create index if not exists evidence_references_project_state_context_idx on public.evidence_references(project_state_id,lifecycle_stage,capability_key);
