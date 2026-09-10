create table public.opportunity_qualification_findings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  area text not null check (area in ('fit','stakeholders','site','commercial')),
  assessment text not null check (assessment in ('yes','unclear','no')),
  note text null,
  assessed_by uuid not null references auth.users(id),
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, area)
);
create table public.opportunity_qualification_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  decision text not null check (decision in ('advance','hold','decline')),
  rationale text null,
  decided_by uuid not null references auth.users(id),
  decided_at timestamptz not null default now()
);
alter table public.opportunity_qualification_findings enable row level security;
alter table public.opportunity_qualification_decisions enable row level security;
create policy qualification_findings_select_workspace on public.opportunity_qualification_findings for select to authenticated using (public.is_workspace_member(workspace_id));
create policy qualification_findings_insert_workspace on public.opportunity_qualification_findings for insert to authenticated with check (public.is_workspace_member(workspace_id) and assessed_by=auth.uid());
create policy qualification_findings_update_workspace on public.opportunity_qualification_findings for update to authenticated using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id) and assessed_by=auth.uid());
create policy qualification_decisions_select_workspace on public.opportunity_qualification_decisions for select to authenticated using (public.is_workspace_member(workspace_id));
create policy qualification_decisions_insert_workspace on public.opportunity_qualification_decisions for insert to authenticated with check (public.is_workspace_member(workspace_id) and decided_by=auth.uid());
grant select,insert,update on public.opportunity_qualification_findings to authenticated;
grant select,insert on public.opportunity_qualification_decisions to authenticated;