create table public.project_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  originating_opportunity_id uuid not null unique references public.opportunities(id),
  state text not null default 'opportunity',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_states_workspace_idx on public.project_states(workspace_id);

alter table public.project_states enable row level security;
grant select, insert, update on public.project_states to authenticated;

create policy project_states_select_workspace on public.project_states
for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy project_states_insert_workspace on public.project_states
for insert to authenticated
with check (public.is_workspace_member(workspace_id) and created_by = (select auth.uid()));

create policy project_states_update_workspace on public.project_states
for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

alter table public.opportunities add column project_state_id uuid;
alter table public.opportunities add constraint opportunities_project_state_id_key unique(project_state_id);
alter table public.opportunities add constraint opportunities_project_state_id_fkey foreign key(project_state_id) references public.project_states(id) deferrable initially deferred;

insert into public.project_states (workspace_id, originating_opportunity_id, state, created_by, created_at, updated_at)
select o.workspace_id, o.id, 'opportunity', o.created_by, o.created_at, o.updated_at
from public.opportunities o
where o.project_state_id is null;

update public.opportunities o
set project_state_id = ps.id
from public.project_states ps
where ps.originating_opportunity_id = o.id
  and o.project_state_id is null;

create or replace function public.create_opportunity_with_project_state(opportunity_input jsonb)
returns public.opportunities
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  oid uuid := coalesce((opportunity_input->>'id')::uuid, gen_random_uuid());
  sid uuid := gen_random_uuid();
  created public.opportunities;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select wm.workspace_id into ws
  from public.workspace_memberships wm
  where wm.user_id = uid and wm.status = 'active'
  order by wm.created_at asc limit 1;
  if ws is null then raise exception 'workspace_required'; end if;

  insert into public.opportunities(id,workspace_id,name,lifecycle,commercial_stage,commercial_probability,priority,owner_user_id,organization_id,site_location,sector,source_context,summary,next_action,created_by,project_state_id)
  values(oid,ws,trim(opportunity_input->>'name'),coalesce((opportunity_input->>'lifecycle')::public.opportunity_lifecycle,'potential'),nullif(opportunity_input->>'commercial_stage',''),nullif(opportunity_input->>'commercial_probability','')::smallint,nullif(opportunity_input->>'priority',''),uid,nullif(opportunity_input->>'organization_id','')::uuid,nullif(opportunity_input->>'site_location',''),nullif(opportunity_input->>'sector',''),nullif(opportunity_input->>'source_context',''),nullif(opportunity_input->>'summary',''),nullif(opportunity_input->>'next_action',''),uid,sid)
  returning * into created;

  insert into public.project_states(id,workspace_id,originating_opportunity_id,state,created_by)
  values(sid,ws,oid,'opportunity',uid);

  return created;
end;
$$;

grant execute on function public.create_opportunity_with_project_state(jsonb) to authenticated;
