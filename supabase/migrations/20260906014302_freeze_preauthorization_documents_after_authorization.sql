create or replace function private.enforce_preauthorization_document_freeze()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  record_id uuid;
  ps_stage text;
  package_key_value text;
begin
  record_id := case when tg_op = 'DELETE' then old.document_record_id else new.document_record_id end;
  select p.stage, d.package_key into ps_stage, package_key_value
  from public.document_records d
  join public.project_states p on p.id = d.project_state_id
  where d.id = record_id;

  if package_key_value = 'predevelopment'
     and ps_stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then
    raise exception 'preauthorization_document_frozen_after_authorization';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.enforce_preauthorization_document_freeze() from public, anon, authenticated;

drop trigger if exists enforce_preauthorization_document_freeze on public.document_revisions;
create trigger enforce_preauthorization_document_freeze
before insert or update or delete on public.document_revisions
for each row execute function private.enforce_preauthorization_document_freeze();
