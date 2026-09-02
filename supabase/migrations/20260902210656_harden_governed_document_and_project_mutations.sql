-- Governed mutations must not be directly available through browser table writes.
-- Draft creation/editing remains a separate capability; issued/published transitions and project authorization are command-only.

drop policy if exists document_records_insert_own on public.document_records;
drop policy if exists document_records_select_own on public.document_records;
drop policy if exists document_records_update_own on public.document_records;
drop policy if exists document_revisions_insert_owned_record on public.document_revisions;
drop policy if exists document_revisions_select_owned_record on public.document_revisions;
drop policy if exists document_revisions_update_draft_owned_record on public.document_revisions;
drop policy if exists authorization_insert on public.authorization_records;
drop policy if exists authorization_select on public.authorization_records;
drop policy if exists projects_select on public.projects;

create policy document_records_workspace_select on public.document_records
for select to authenticated
using (workspace_id is not null and public.is_workspace_member(workspace_id));

create policy document_revisions_workspace_select on public.document_revisions
for select to authenticated
using (exists (
  select 1 from public.document_records d
  where d.id = document_revisions.document_record_id
    and d.workspace_id is not null
    and public.is_workspace_member(d.workspace_id)
));

create policy authorization_records_workspace_select on public.authorization_records
for select to authenticated
using (exists (
  select 1 from public.opportunities o
  where o.id = authorization_records.opportunity_id
    and o.workspace_id is not null
    and public.is_workspace_member(o.workspace_id)
));

create policy projects_workspace_select on public.projects
for select to authenticated
using (workspace_id is not null and public.is_workspace_member(workspace_id));

drop policy if exists audit_select on public.audit_events;
create policy audit_workspace_select on public.audit_events
for select to authenticated
using (
  (opportunity_id is not null and exists (
    select 1 from public.opportunities o
    where o.id = audit_events.opportunity_id
      and o.workspace_id is not null
      and public.is_workspace_member(o.workspace_id)
  ))
  or
  (project_id is not null and exists (
    select 1 from public.projects p
    where p.id = audit_events.project_id
      and p.workspace_id is not null
      and public.is_workspace_member(p.workspace_id)
  ))
);

revoke insert, update, delete on public.authorization_records from authenticated, anon;
revoke insert, update, delete on public.projects from authenticated, anon;
revoke insert, update, delete on public.document_records from authenticated, anon;
revoke insert, update, delete on public.document_revisions from authenticated, anon;

grant select on public.document_records, public.document_revisions, public.authorization_records, public.projects to authenticated;
