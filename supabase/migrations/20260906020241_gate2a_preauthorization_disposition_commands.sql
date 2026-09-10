create table if not exists public.project_state_disposition_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null, project_state_id uuid not null references public.project_states(id) on delete cascade, event_type text not null check (event_type in ('hold','resume','decline','withdraw_lost','archive','restore')), prior_status text, new_status text, prior_stage text, reason text, basis text, actor_user_id uuid not null, created_at timestamptz not null default now()
);
alter table public.project_state_disposition_events enable row level security;
drop policy if exists disposition_events_workspace_select on public.project_state_disposition_events;
create policy disposition_events_workspace_select on public.project_state_disposition_events for select to authenticated using (public.is_workspace_member(workspace_id));

create or replace function public.set_project_state_preauthorization_disposition(project_state_input uuid, disposition_input text, reason_input text default null, basis_input text default null) returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; next_status text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 if disposition_input not in ('hold','resume','decline','withdraw_lost') then raise exception 'invalid_disposition'; end if;
 select * into ps from public.project_states where id=project_state_input and archived_at is null for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'preauthorization_disposition_not_allowed_after_authorization'; end if;
 if disposition_input='resume' then
   if ps.status<>'held' then raise exception 'only_held_project_state_can_resume'; end if; next_status:='active';
 elsif disposition_input='hold' then
   if ps.status<>'active' then raise exception 'only_active_project_state_can_hold'; end if; next_status:='held';
 else
   if ps.status not in ('active','held') then raise exception 'inactive_project_state_required_restore'; end if;
   if nullif(trim(reason_input),'') is null then raise exception 'disposition_reason_required'; end if;
   next_status:=case disposition_input when 'decline' then 'declined' else 'withdrawn_lost' end;
 end if;
 update public.project_states set status=next_status,updated_at=now() where id=ps.id returning * into ps;
 insert into public.project_state_disposition_events(workspace_id,project_state_id,event_type,prior_status,new_status,prior_stage,reason,basis,actor_user_id) values(ps.workspace_id,ps.id,disposition_input,case when disposition_input='resume' then 'held' else case when disposition_input='hold' then 'active' else null end end,next_status,ps.stage,nullif(trim(reason_input),''),nullif(trim(basis_input),''),uid);
 return ps;
end $$;

create or replace function public.restore_preauthorization_project_state(project_state_input uuid, reason_input text, basis_input text default null) returns public.project_states language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); ps public.project_states; prior text;
begin
 if uid is null then raise exception 'authentication_required'; end if;
 select * into ps from public.project_states where id=project_state_input for update;
 if ps.id is null then raise exception 'project_state_not_found'; end if;
 if not public.is_workspace_member(ps.workspace_id) then raise exception 'workspace_access_denied'; end if;
 if ps.stage in ('project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed') then raise exception 'preauthorization_restore_not_allowed_after_authorization'; end if;
 if ps.status not in ('declined','withdrawn_lost') and ps.archived_at is null then raise exception 'project_state_not_inactive'; end if;
 if nullif(trim(reason_input),'') is null then raise exception 'restore_reason_required'; end if;
 prior:=case when ps.archived_at is not null then 'archived' else ps.status end;
 update public.project_states set status='active',archived_at=null,archived_by=null,updated_at=now() where id=ps.id returning * into ps;
 insert into public.project_state_disposition_events(workspace_id,project_state_id,event_type,prior_status,new_status,prior_stage,reason,basis,actor_user_id) values(ps.workspace_id,ps.id,'restore',prior,'active',ps.stage,trim(reason_input),nullif(trim(basis_input),''),uid);
 return ps;
end $$;

revoke all on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) from public,anon; grant execute on function public.set_project_state_preauthorization_disposition(uuid,text,text,text) to authenticated;
revoke all on function public.restore_preauthorization_project_state(uuid,text,text) from public,anon; grant execute on function public.restore_preauthorization_project_state(uuid,text,text) to authenticated;
grant select on public.project_state_disposition_events to authenticated;
