create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop function if exists private.archive_preauthorization_project_state(uuid,text,text);
drop function if exists private.restore_preauthorization_project_state(uuid,text,text);
drop function if exists private.set_project_state_preauthorization_disposition(uuid,text,text,text);
drop function if exists private.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb);

alter function public.archive_preauthorization_project_state(uuid,text,text) set schema private;
alter function public.restore_preauthorization_project_state(uuid,text,text) set schema private;
alter function public.set_project_state_preauthorization_disposition(uuid,text,text,text) set schema private;
alter function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) set schema private;

revoke all on function private.archive_preauthorization_project_state(uuid,text,text) from public, anon, authenticated;
revoke all on function private.restore_preauthorization_project_state(uuid,text,text) from public, anon, authenticated;
revoke all on function private.set_project_state_preauthorization_disposition(uuid,text,text,text) from public, anon, authenticated;
revoke all on function private.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) from public, anon, authenticated;

create function public.archive_preauthorization_project_state(project_state_input uuid, reason_input text, basis_input text default null)
returns public.project_states
language sql
security invoker
set search_path = ''
as $$ select private.archive_preauthorization_project_state(project_state_input,reason_input,basis_input); $$;

create function public.restore_preauthorization_project_state(project_state_input uuid, reason_input text, basis_input text default null)
returns public.project_states
language sql
security invoker
set search_path = ''
as $$ select private.restore_preauthorization_project_state(project_state_input,reason_input,basis_input); $$;

create function public.set_project_state_preauthorization_disposition(project_state_input uuid, disposition_input text, reason_input text default null, basis_input text default null)
returns public.project_states
language sql
security invoker
set search_path = ''
as $$ select private.set_project_state_preauthorization_disposition(project_state_input,disposition_input,reason_input,basis_input); $$;

create function public.record_authorization_amendment(project_state_input uuid, amendment_type_input text, summary_input text, rationale_input text, authority_basis_input text default null, evidence_input jsonb default '[]'::jsonb, document_record_input uuid default null, original_revision_input uuid default null, changed_fields_input jsonb default null)
returns public.authorization_amendments
language sql
security invoker
set search_path = ''
as $$ select private.record_authorization_amendment(project_state_input,amendment_type_input,summary_input,rationale_input,authority_basis_input,evidence_input,document_record_input,original_revision_input,changed_fields_input); $$;

revoke all on function public.archive_preauthorization_project_state(uuid,text,text) from public, anon;
revoke all on function public.restore_preauthorization_project_state(uuid,text,text) from public, anon;
revoke all on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) from public, anon;
revoke all on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) from public, anon;
grant execute on function public.archive_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function public.restore_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) to authenticated;
grant execute on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.archive_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function private.restore_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function private.set_project_state_preauthorization_disposition(uuid,text,text,text) to authenticated;
grant execute on function private.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) to authenticated;
