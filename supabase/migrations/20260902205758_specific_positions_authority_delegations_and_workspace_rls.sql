create table if not exists public.position_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_family text not null check (role_family in ('operator','manager','executive')),
  position_key text not null,
  position_title text not null,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','ended')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_until is null or effective_until > effective_from)
);

create index if not exists position_assignments_workspace_user_idx on public.position_assignments(workspace_id,user_id) where status='active';
create unique index if not exists position_assignments_active_position_idx on public.position_assignments(workspace_id,user_id,position_key) where status='active';

create table if not exists public.authority_delegations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  grantor_user_id uuid not null references auth.users(id),
  grantee_user_id uuid not null references auth.users(id),
  authority_key text not null,
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  check (grantor_user_id <> grantee_user_id),
  check (effective_until is null or effective_until > effective_from)
);

create index if not exists authority_delegations_grantee_idx on public.authority_delegations(workspace_id,grantee_user_id,authority_key) where status='active';

alter table public.position_assignments enable row level security;
alter table public.authority_delegations enable row level security;
revoke all on table public.position_assignments from anon, authenticated;
revoke all on table public.authority_delegations from anon, authenticated;
grant select on table public.position_assignments to authenticated;
grant select on table public.authority_delegations to authenticated;

create policy position_assignments_select_workspace on public.position_assignments for select to authenticated using (public.is_workspace_member(workspace_id));
create policy authority_delegations_select_workspace on public.authority_delegations for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists opportunities_authenticated_select on public.opportunities;
drop policy if exists opportunities_creator_insert on public.opportunities;
drop policy if exists opportunities_owner_update on public.opportunities;

drop policy if exists memberships_insert_own_workspace on public.workspace_memberships;
revoke insert, update, delete on table public.workspace_memberships from anon, authenticated;
revoke insert, update, delete on table public.workspaces from anon, authenticated;
