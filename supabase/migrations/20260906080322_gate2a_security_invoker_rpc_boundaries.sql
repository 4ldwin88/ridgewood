create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter function public.archive_preauthorization_project_state(uuid,text,text) security invoker;
alter function public.restore_preauthorization_project_state(uuid,text,text) security invoker;
alter function public.set_project_state_preauthorization_disposition(uuid,text,text,text) security invoker;
alter function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) security invoker;

revoke all on function public.archive_preauthorization_project_state(uuid,text,text) from public, anon;
revoke all on function public.restore_preauthorization_project_state(uuid,text,text) from public, anon;
revoke all on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) from public, anon;
revoke all on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) from public, anon;
grant execute on function public.archive_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function public.restore_preauthorization_project_state(uuid,text,text) to authenticated;
grant execute on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) to authenticated;
grant execute on function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) to authenticated;
