-- Governed document draft/revision commands. Draft data remains database-native; issued revisions remain immutable.
create or replace function public.create_document_draft_atomic(target_workspace_id uuid, target_project_id uuid, target_opportunity_id uuid, package_key_input text, category_key_input text, document_type_input text, title_input text, initial_data jsonb default '{}'::jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid(); record_id uuid := gen_random_uuid(); revision_id uuid := gen_random_uuid();
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  if not public.has_app_permission(target_workspace_id,'document.create_draft') then raise exception 'permission_denied'; end if;
  if not public.is_workspace_member(target_workspace_id) then raise exception 'workspace_denied'; end if;
  if (target_project_id is null) = (target_opportunity_id is null) then raise exception 'exactly_one_parent_required'; end if;
  if target_project_id is not null and not exists(select 1 from public.projects p where p.id=target_project_id and p.workspace_id=target_workspace_id) then raise exception 'project_scope_denied'; end if;
  if target_opportunity_id is not null and not exists(select 1 from public.opportunities o where o.id=target_opportunity_id and o.workspace_id=target_workspace_id) then raise exception 'opportunity_scope_denied'; end if;
  insert into public.document_records(id,project_id,opportunity_id,package_key,category_key,document_type,title,sort_order,owner_user_id,created_at,updated_at,workspace_id) values(record_id,target_project_id,target_opportunity_id,package_key_input,category_key_input,document_type_input,title_input,0,actor,now(),now(),target_workspace_id);
  insert into public.document_revisions(id,document_record_id,revision_number,state,created_by,created_at,source_data) values(revision_id,record_id,1,'draft',actor,now(),coalesce(initial_data,'{}'::jsonb));
  insert into public.audit_events(opportunity_id,project_id,event_type,actor_user_id,payload) values(target_opportunity_id,target_project_id,'document_draft_created',actor,jsonb_build_object('workspaceId',target_workspace_id,'documentRecordId',record_id,'revisionId',revision_id));
  return revision_id;
end $$;

create or replace function public.update_document_draft_atomic(target_revision_id uuid, source_data_input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); ws uuid; opp uuid; proj uuid;
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select d.workspace_id,d.opportunity_id,d.project_id into ws,opp,proj from public.document_revisions r join public.document_records d on d.id=r.document_record_id where r.id=target_revision_id and r.state='draft';
  if ws is null then raise exception 'draft_not_found_or_not_editable'; end if;
  if not public.has_app_permission(ws,'document.create_draft') then raise exception 'permission_denied'; end if;
  update public.document_revisions set source_data=coalesce(source_data_input,'{}'::jsonb) where id=target_revision_id and state='draft';
  update public.document_records d set updated_at=now() from public.document_revisions r where r.id=target_revision_id and d.id=r.document_record_id;
  insert into public.audit_events(opportunity_id,project_id,event_type,actor_user_id,payload) values(opp,proj,'document_draft_updated',actor,jsonb_build_object('workspaceId',ws,'revisionId',target_revision_id));
  return target_revision_id;
end $$;

create or replace function public.create_revision_from_published_atomic(target_published_revision_id uuid, reason_input text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); ws uuid; record_id uuid; next_no int; snapshot jsonb; new_id uuid:=gen_random_uuid(); opp uuid; proj uuid;
begin
  if actor is null then raise exception 'unauthenticated'; end if;
  select d.workspace_id,d.id,d.opportunity_id,d.project_id,coalesce(r.published_source_snapshot,r.source_data),coalesce(max(r2.revision_number),0)+1 into ws,record_id,opp,proj,snapshot,next_no from public.document_revisions r join public.document_records d on d.id=r.document_record_id join public.document_revisions r2 on r2.document_record_id=d.id where r.id=target_published_revision_id and r.state in ('published','superseded','withdrawn') group by d.workspace_id,d.id,d.opportunity_id,d.project_id,r.published_source_snapshot,r.source_data;
  if ws is null then raise exception 'published_revision_not_found'; end if;
  if not public.has_app_permission(ws,'document.create_revision') then raise exception 'permission_denied'; end if;
  insert into public.document_revisions(id,document_record_id,revision_number,state,supersedes_revision_id,based_on_revision_id,change_reason,created_by,created_at,source_data) values(new_id,record_id,next_no,'draft',target_published_revision_id,target_published_revision_id,reason_input,actor,now(),coalesce(snapshot,'{}'::jsonb));
  insert into public.audit_events(opportunity_id,project_id,event_type,actor_user_id,payload) values(opp,proj,'document_revision_draft_created',actor,jsonb_build_object('workspaceId',ws,'revisionId',new_id,'basedOnRevisionId',target_published_revision_id));
  return new_id;
end $$;

revoke all on function public.create_document_draft_atomic(uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon;
revoke all on function public.update_document_draft_atomic(uuid,jsonb) from public,anon;
revoke all on function public.create_revision_from_published_atomic(uuid,text) from public,anon;
grant execute on function public.create_document_draft_atomic(uuid,uuid,uuid,text,text,text,text,jsonb) to authenticated;
grant execute on function public.update_document_draft_atomic(uuid,jsonb) to authenticated;
grant execute on function public.create_revision_from_published_atomic(uuid,text) to authenticated;