create or replace function public.record_authorization_correction(project_state_input uuid, authorization_record_input uuid, document_record_input uuid, original_revision_input uuid, reason_input text, changed_fields_input jsonb)
returns public.authorization_corrections
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  workspace uuid;
  row_out public.authorization_corrections;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if reason_input is null or btrim(reason_input) = '' then raise exception 'correction_reason_required'; end if;
  if changed_fields_input is null or jsonb_typeof(changed_fields_input) <> 'object' or changed_fields_input = '{}'::jsonb then raise exception 'changed_fields_required'; end if;
  select ps.workspace_id into workspace from public.project_states ps where ps.id = project_state_input and ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed');
  if workspace is null or not public.is_workspace_member(workspace) then raise exception 'authorized_project_state_required'; end if;
  if not exists(select 1 from public.authorization_records ar where ar.id=authorization_record_input and ar.project_state_id=project_state_input) then raise exception 'authorization_record_mismatch'; end if;
  if not exists(select 1 from public.document_records dr where dr.id=document_record_input and dr.project_state_id=project_state_input) then raise exception 'document_record_mismatch'; end if;
  if not exists(select 1 from public.document_revisions r where r.id=original_revision_input and r.document_record_id=document_record_input and r.state in ('published','superseded')) then raise exception 'frozen_published_revision_required'; end if;
  if not exists(select 1 from public.authorization_records ar where ar.id=authorization_record_input and (ar.evidence_snapshot::text like '%' || original_revision_input::text || '%' or ar.readiness_snapshot::text like '%' || original_revision_input::text || '%')) then raise exception 'revision_not_in_authorization_snapshot'; end if;
  insert into public.authorization_corrections(workspace_id,project_state_id,authorization_record_id,document_record_id,original_revision_id,reason,changed_fields,actor_user_id)
  values(workspace,project_state_input,authorization_record_input,document_record_input,original_revision_input,btrim(reason_input),changed_fields_input,actor)
  returning * into row_out;
  insert into public.audit_events(project_state_id,event_type,actor_user_id,payload)
  values(project_state_input,'authorization_evidence_corrected',actor,jsonb_build_object('authorization_record_id',authorization_record_input,'document_record_id',document_record_input,'original_revision_id',original_revision_input,'correction_id',row_out.id,'reason',btrim(reason_input),'changed_fields',changed_fields_input));
  return row_out;
end;
$$;
revoke all on function public.record_authorization_correction(uuid,uuid,uuid,uuid,text,jsonb) from public, anon;
grant execute on function public.record_authorization_correction(uuid,uuid,uuid,uuid,text,jsonb) to authenticated, service_role;
