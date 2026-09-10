-- Workstream A / Wave 0: close known tenant leakage while preserving the universal workspace model.

alter table public.organizations alter column workspace_id set not null;
alter table public.people alter column workspace_id set not null;

comment on column public.organizations.workspace_id is 'Required tenant boundary for reusable organization identities.';
comment on column public.people.workspace_id is 'Required tenant boundary for reusable person identities.';

-- Replace global authenticated visibility and creator-only tenancy with workspace-scoped policies.
drop policy if exists organizations_authenticated_select on public.organizations;
drop policy if exists organizations_creator_insert on public.organizations;
drop policy if exists organizations_creator_update on public.organizations;

create policy organizations_select_workspace
on public.organizations for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy organizations_insert_workspace
on public.organizations for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_workspace_member(workspace_id)
);

create policy organizations_update_workspace
on public.organizations for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists people_authenticated_select on public.people;
drop policy if exists people_creator_insert on public.people;
drop policy if exists people_creator_update on public.people;

create policy people_select_workspace
on public.people for select to authenticated
using (public.is_workspace_member(workspace_id));

create policy people_insert_workspace
on public.people for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_workspace_member(workspace_id)
  and (
    organization_id is null
    or exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.workspace_id = people.workspace_id
    )
  )
);

create policy people_update_workspace
on public.people for update to authenticated
using (public.is_workspace_member(workspace_id))
with check (
  public.is_workspace_member(workspace_id)
  and (
    organization_id is null
    or exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.workspace_id = people.workspace_id
    )
  )
);

-- Public/anonymous RPC exposure is unnecessary for authenticated Ridgewood operating commands.
revoke execute on function public.create_project_state(jsonb) from public, anon;
revoke execute on function public.advance_project_state_to_qualification(uuid) from public, anon;
revoke execute on function public.ensure_project_state_predevelopment_domains(uuid) from public, anon;
revoke execute on function public.enter_project_state_authorization(uuid) from public, anon;
revoke execute on function public.record_project_state_qualification_finding(uuid,text,text,text) from public, anon;
revoke execute on function public.refresh_project_state_opportunity_requirements(uuid) from public, anon;
revoke execute on function public.set_project_state_qualification_decision(uuid,text,text) from public, anon;
revoke execute on function public.update_project_state_opportunity_basics(uuid,jsonb) from public, anon;
revoke execute on function public.update_project_state_predevelopment_domain(uuid,text,public.readiness_state,text) from public, anon;

grant execute on function public.create_project_state(jsonb) to authenticated;
grant execute on function public.advance_project_state_to_qualification(uuid) to authenticated;
grant execute on function public.ensure_project_state_predevelopment_domains(uuid) to authenticated;
grant execute on function public.enter_project_state_authorization(uuid) to authenticated;
grant execute on function public.record_project_state_qualification_finding(uuid,text,text,text) to authenticated;
grant execute on function public.refresh_project_state_opportunity_requirements(uuid) to authenticated;
grant execute on function public.set_project_state_qualification_decision(uuid,text,text) to authenticated;
grant execute on function public.update_project_state_opportunity_basics(uuid,jsonb) to authenticated;
grant execute on function public.update_project_state_predevelopment_domain(uuid,text,public.readiness_state,text) to authenticated;
