create table if not exists public.workspaces (id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) > 0), created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.workspace_memberships (workspace_id uuid not null references public.workspaces(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, technical_role text not null check (technical_role in ('owner','admin','member')), status text not null default 'active' check (status in ('active','suspended','revoked')), created_at timestamptz not null default now(), primary key(workspace_id,user_id));
alter table public.workspaces enable row level security; alter table public.workspace_memberships enable row level security;
revoke all on public.workspaces, public.workspace_memberships from anon, authenticated; grant select,insert,update on public.workspaces to authenticated; grant select,insert,update on public.workspace_memberships to authenticated;
create or replace function public.is_workspace_member(target_workspace_id uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.workspace_memberships m where m.workspace_id=target_workspace_id and m.user_id=(select auth.uid()) and m.status='active') $$;
revoke all on function public.is_workspace_member(uuid) from public, anon; grant execute on function public.is_workspace_member(uuid) to authenticated;
drop policy if exists workspaces_select_member on public.workspaces; create policy workspaces_select_member on public.workspaces for select to authenticated using (public.is_workspace_member(id) or created_by=(select auth.uid()));
drop policy if exists workspaces_insert_creator on public.workspaces; create policy workspaces_insert_creator on public.workspaces for insert to authenticated with check (created_by=(select auth.uid()));
drop policy if exists memberships_select_member on public.workspace_memberships; create policy memberships_select_member on public.workspace_memberships for select to authenticated using (public.is_workspace_member(workspace_id));

alter table public.organizations add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.people add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.opportunities add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.document_records add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.document_package_definitions add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.document_output_manifests add column if not exists workspace_id uuid references public.workspaces(id);
create index if not exists opportunities_workspace_idx on public.opportunities(workspace_id); create index if not exists projects_workspace_idx on public.projects(workspace_id); create index if not exists document_records_workspace_idx on public.document_records(workspace_id);
comment on column public.workspace_memberships.technical_role is 'Technical SaaS membership role only. It does not itself confer Ridgewood business decision, signing, publication, or project authorization authority.';
