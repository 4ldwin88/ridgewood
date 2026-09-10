-- Project State is the authoritative E2E object. Opportunity is a lifecycle stage,
-- not a peer canonical entity. This migration mirrors the live development schema
-- reconciliation and intentionally retains the old opportunity pointer only while
-- runtime/stage records are migrated to project_state_id.

alter table public.project_states add column if not exists name text;
alter table public.project_states add column if not exists organization_id uuid references public.organizations(id);
alter table public.project_states add column if not exists site_location text;
alter table public.project_states add column if not exists project_type text;
alter table public.project_states add column if not exists sector text;
alter table public.project_states add column if not exists source_context text;
alter table public.project_states add column if not exists summary text;
alter table public.project_states add column if not exists priority text;
alter table public.project_states add column if not exists commercial_stage text;
alter table public.project_states add column if not exists commercial_probability smallint check (commercial_probability between 0 and 100);
alter table public.project_states add column if not exists next_action text;
alter table public.project_states add column if not exists owner_user_id uuid references auth.users(id);
alter table public.project_states add column if not exists archived_at timestamptz;
alter table public.project_states add column if not exists archived_by uuid references auth.users(id);

update public.project_states ps
set name=o.name,
    organization_id=o.organization_id,
    site_location=o.site_location,
    project_type=o.opportunity_type,
    sector=o.sector,
    source_context=o.source_context,
    summary=o.summary,
    priority=o.priority,
    commercial_stage=o.commercial_stage,
    commercial_probability=o.commercial_probability,
    next_action=o.next_action,
    owner_user_id=o.owner_user_id,
    archived_at=o.archived_at,
    archived_by=o.archived_by,
    state=o.lifecycle::text,
    updated_at=greatest(ps.updated_at,o.updated_at)
from public.opportunities o
where o.project_state_id=ps.id;

alter table public.project_states alter column name set not null;
alter table public.project_states alter column owner_user_id set not null;
alter table public.project_states drop constraint if exists project_states_originating_opportunity_id_fkey;
alter table public.project_states drop constraint if exists project_states_originating_opportunity_id_key;
alter table public.project_states alter column originating_opportunity_id drop not null;

create index if not exists project_states_workspace_state_idx on public.project_states(workspace_id,state);
create index if not exists project_states_workspace_archived_idx on public.project_states(workspace_id,archived_at);

comment on table public.project_states is 'Authoritative continuous E2E state for Ridgewood work from Opportunity through final lifecycle completion. Opportunity is a stage, not a peer entity.';
comment on column public.project_states.state is 'Current lifecycle stage of the authoritative Project State; opportunity-stage values are stages, not separate entity identity.';
comment on column public.project_states.originating_opportunity_id is 'Temporary legacy reconciliation pointer only. New architecture must not depend on Opportunity as a separate identity.';

create table if not exists public.project_state_stage_requirements (
  id uuid primary key default gen_random_uuid(),
  project_state_id uuid not null references public.project_states(id) on delete cascade,
  stage text not null,
  requirement_key text not null,
  label text not null,
  status public.readiness_state not null default 'not_started',
  required boolean not null default true,
  notes text,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(project_state_id,stage,requirement_key)
);

alter table public.project_state_stage_requirements enable row level security;
create policy project_state_stage_requirements_select_workspace on public.project_state_stage_requirements for select to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy project_state_stage_requirements_insert_workspace on public.project_state_stage_requirements for insert to authenticated with check (updated_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy project_state_stage_requirements_update_workspace on public.project_state_stage_requirements for update to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id))) with check (updated_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
grant select,insert,update on public.project_state_stage_requirements to authenticated;

comment on table public.project_state_stage_requirements is 'Governed requirement state used by Project State to determine stage completion, blockers, unknowns and required next work.';

insert into public.project_state_stage_requirements(project_state_id,stage,requirement_key,label,status,required,updated_by)
select ps.id,'opportunity',v.requirement_key,v.label,'not_started'::public.readiness_state,true,ps.created_by
from public.project_states ps
cross join (values
  ('basic_identity','Basic project identity captured'),
  ('initial_context','Initial context captured'),
  ('next_step','Next step identified')
) v(requirement_key,label)
on conflict(project_state_id,stage,requirement_key) do nothing;

update public.project_state_stage_requirements r
set status=case
  when r.requirement_key='basic_identity' and nullif(trim(ps.name),'') is not null then 'satisfied'::public.readiness_state
  when r.requirement_key='initial_context' and (nullif(trim(ps.site_location),'') is not null or nullif(trim(ps.sector),'') is not null or nullif(trim(ps.source_context),'') is not null or nullif(trim(ps.summary),'') is not null) then 'satisfied'::public.readiness_state
  when r.requirement_key='next_step' and nullif(trim(ps.next_action),'') is not null then 'satisfied'::public.readiness_state
  else r.status end,
  updated_at=now()
from public.project_states ps
where ps.id=r.project_state_id and r.stage='opportunity';
