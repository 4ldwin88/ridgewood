alter function public.archive_preauthorization_project_state(uuid,text,text) security definer;
alter function public.restore_preauthorization_project_state(uuid,text,text) security definer;
alter function public.set_project_state_preauthorization_disposition(uuid,text,text,text) security definer;
alter function public.record_authorization_amendment(uuid,text,text,text,text,jsonb,uuid,uuid,jsonb) security definer;
