create table if not exists public.user_states (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  job_title text,
  work_status text not null default 'available' check (work_status in ('available','limited','unavailable','away')),
  availability jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  notification_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id,user_id)
);

create table if not exists public.app_roles (
  role_key text primary key,
  name text not null,
  description text
);

create table if not exists public.app_permissions (
  permission_key text primary key,
  description text not null
);

create table if not exists public.role_permissions (
  role_key text not null references public.app_roles(role_key) on delete cascade,
  permission_key text not null references public.app_permissions(permission_key) on delete cascade,
  primary key(role_key,permission_key)
);

create table if not exists public.user_role_assignments (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_key text not null references public.app_roles(role_key),
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key(workspace_id,user_id,role_key)
);

create table if not exists public.user_permission_overrides (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission_key text not null references public.app_permissions(permission_key),
  effect text not null check(effect in ('grant','revoke')),
  reason text,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key(workspace_id,user_id,permission_key)
);

insert into public.app_roles(role_key,name,description) values
('operator','Operator','Assigned operational work and permitted draft creation.'),
('manager','Manager','Operational coordination plus governed document revision capability.'),
('executive','Executive','Executive decision capability subject to separate business authority.')
on conflict(role_key) do update set name=excluded.name,description=excluded.description;

insert into public.app_permissions(permission_key,description) values
('document.create_draft','Create permitted draft documents.'),
('document.create_revision','Create a new editable revision from a governed published revision.'),
('document.publish','Publish a validated document revision when business authority also permits.'),
('proposal.submit','Submit a proposal for decision.'),
('proposal.approve','Approve a proposal when business authority also permits.'),
('proposal.deny','Deny a proposal when business authority also permits.'),
('project.authorize','Authorize Project establishment when business authority also permits.'),
('user.manage_roles','Assign and remove application roles/permissions.')
on conflict(permission_key) do update set description=excluded.description;

insert into public.role_permissions(role_key,permission_key) values
('operator','document.create_draft'),
('manager','document.create_draft'),('manager','document.create_revision'),('manager','proposal.submit'),
('executive','document.create_draft'),('executive','document.create_revision'),('executive','document.publish'),('executive','proposal.submit'),('executive','proposal.approve'),('executive','proposal.deny'),('executive','project.authorize'),('executive','user.manage_roles')
on conflict do nothing;

alter table public.user_states enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.user_permission_overrides enable row level security;

revoke all on public.user_states,public.app_roles,public.app_permissions,public.role_permissions,public.user_role_assignments,public.user_permission_overrides from anon,authenticated;
grant select,insert,update on public.user_states to authenticated;
grant select on public.app_roles,public.app_permissions,public.role_permissions to authenticated;
grant select on public.user_role_assignments,public.user_permission_overrides to authenticated;

create policy user_states_select_workspace on public.user_states for select to authenticated using(public.is_workspace_member(workspace_id));
create policy user_states_insert_self on public.user_states for insert to authenticated with check(user_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy user_states_update_self on public.user_states for update to authenticated using(user_id=(select auth.uid()) and public.is_workspace_member(workspace_id)) with check(user_id=(select auth.uid()) and public.is_workspace_member(workspace_id));
create policy app_roles_authenticated_read on public.app_roles for select to authenticated using(true);
create policy app_permissions_authenticated_read on public.app_permissions for select to authenticated using(true);
create policy role_permissions_authenticated_read on public.role_permissions for select to authenticated using(true);
create policy user_roles_workspace_read on public.user_role_assignments for select to authenticated using(public.is_workspace_member(workspace_id));
create policy user_permission_overrides_workspace_read on public.user_permission_overrides for select to authenticated using(public.is_workspace_member(workspace_id));

create or replace function public.has_app_permission(target_workspace_id uuid, requested_permission text)
returns boolean
language sql
stable
security invoker
set search_path=public
as $$
  select case
    when not public.is_workspace_member(target_workspace_id) then false
    when exists(select 1 from public.user_permission_overrides o where o.workspace_id=target_workspace_id and o.user_id=auth.uid() and o.permission_key=requested_permission and o.effect='revoke') then false
    when exists(select 1 from public.user_permission_overrides o where o.workspace_id=target_workspace_id and o.user_id=auth.uid() and o.permission_key=requested_permission and o.effect='grant') then true
    else exists(
      select 1 from public.user_role_assignments ura
      join public.role_permissions rp on rp.role_key=ura.role_key
      where ura.workspace_id=target_workspace_id and ura.user_id=auth.uid() and rp.permission_key=requested_permission
    )
  end;
$$;
revoke all on function public.has_app_permission(uuid,text) from public,anon;
grant execute on function public.has_app_permission(uuid,text) to authenticated;
