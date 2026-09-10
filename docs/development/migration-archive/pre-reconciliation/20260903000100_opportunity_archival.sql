alter table public.opportunities
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

create index if not exists opportunities_active_workspace_idx
  on public.opportunities(workspace_id, updated_at desc)
  where archived_at is null;
