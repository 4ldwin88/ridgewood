create extension if not exists pgcrypto;

create type public.opportunity_lifecycle as enum ('potential','qualification','predevelopment','authorization_ready','authorized','held','declined','lost');
create type public.knowledge_state as enum ('known','unknown','unverified','not_applicable');
create type public.readiness_state as enum ('not_started','in_progress','satisfied','blocked','unknown');
create type public.work_status as enum ('open','in_progress','blocked','done','cancelled');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  organization_id uuid references public.organizations(id),
  role_title text,
  email text,
  phone text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lifecycle public.opportunity_lifecycle not null default 'potential',
  commercial_stage text,
  commercial_probability smallint check (commercial_probability between 0 and 100),
  priority text,
  owner_user_id uuid not null references auth.users(id),
  organization_id uuid references public.organizations(id),
  site_location text,
  opportunity_type text,
  sector text,
  source_context text,
  summary text,
  next_action text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.predevelopment_domains (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  domain_key text not null check (domain_key in ('development_site','product_program','design_consultants','commercial_feasibility','schedule_phasing','risk_decision_evidence','delivery_strategy')),
  readiness public.readiness_state not null default 'not_started',
  notes text,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(opportunity_id, domain_key)
);

create table public.evidence_references (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  predevelopment_domain_id uuid references public.predevelopment_domains(id) on delete set null,
  title text not null,
  source_url text,
  source_system text not null default 'google_drive',
  provenance_note text,
  knowledge_state public.knowledge_state not null default 'known',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  predevelopment_domain_id uuid references public.predevelopment_domains(id) on delete set null,
  title text not null,
  owner_user_id uuid references auth.users(id),
  due_date date,
  status public.work_status not null default 'open',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.risk_issues (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  predevelopment_domain_id uuid references public.predevelopment_domains(id) on delete set null,
  kind text not null check (kind in ('risk','issue','blocker')),
  title text not null,
  severity text,
  status public.work_status not null default 'open',
  owner_user_id uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  decision_type text not null,
  outcome text not null,
  rationale text,
  authority_basis text,
  actor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.authorization_records (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  outcome text not null check (outcome in ('approved','held','declined','returned','rejected_unauthorized','rejected_incomplete')),
  authority_basis text,
  readiness_snapshot jsonb not null default '{}'::jsonb,
  evidence_snapshot jsonb not null default '[]'::jsonb,
  actor_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  originating_opportunity_id uuid not null unique references public.opportunities(id),
  authorization_record_id uuid not null unique references public.authorization_records(id),
  name text not null,
  organization_id uuid references public.organizations(id),
  site_location text,
  established_by uuid not null references auth.users(id),
  established_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  event_type text not null,
  actor_user_id uuid not null references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index opportunities_owner_idx on public.opportunities(owner_user_id);
create index predevelopment_opportunity_idx on public.predevelopment_domains(opportunity_id);
create index evidence_opportunity_idx on public.evidence_references(opportunity_id);
create index actions_opportunity_idx on public.actions(opportunity_id);
create index risk_issues_opportunity_idx on public.risk_issues(opportunity_id);
create index decisions_opportunity_idx on public.decisions(opportunity_id);
create index audit_opportunity_idx on public.audit_events(opportunity_id);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.people enable row level security;
alter table public.opportunities enable row level security;
alter table public.predevelopment_domains enable row level security;
alter table public.evidence_references enable row level security;
alter table public.actions enable row level security;
alter table public.risk_issues enable row level security;
alter table public.decisions enable row level security;
alter table public.authorization_records enable row level security;
alter table public.projects enable row level security;
alter table public.audit_events enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.organizations, public.people, public.opportunities, public.predevelopment_domains, public.evidence_references, public.actions, public.risk_issues to authenticated;
grant select, insert on public.decisions, public.authorization_records, public.audit_events to authenticated;
grant select on public.projects to authenticated;
grant usage, select on all sequences in schema public to authenticated;

create policy profiles_self_select on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_self_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_self_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy organizations_authenticated_select on public.organizations for select to authenticated using ((select auth.uid()) is not null);
create policy organizations_creator_insert on public.organizations for insert to authenticated with check ((select auth.uid()) = created_by);
create policy organizations_creator_update on public.organizations for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy people_authenticated_select on public.people for select to authenticated using ((select auth.uid()) is not null);
create policy people_creator_insert on public.people for insert to authenticated with check ((select auth.uid()) = created_by);
create policy people_creator_update on public.people for update to authenticated using ((select auth.uid()) = created_by) with check ((select auth.uid()) = created_by);

create policy opportunities_authenticated_select on public.opportunities for select to authenticated using ((select auth.uid()) is not null);
create policy opportunities_creator_insert on public.opportunities for insert to authenticated with check ((select auth.uid()) = created_by and (select auth.uid()) = owner_user_id);
create policy opportunities_owner_update on public.opportunities for update to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);

create policy predev_select on public.predevelopment_domains for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy predev_insert on public.predevelopment_domains for insert to authenticated with check ((select auth.uid()) = updated_by and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy predev_update on public.predevelopment_domains for update to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid()))) with check ((select auth.uid()) = updated_by);

create policy evidence_select on public.evidence_references for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy evidence_insert on public.evidence_references for insert to authenticated with check ((select auth.uid()) = created_by and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy evidence_update on public.evidence_references for update to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));

create policy actions_select on public.actions for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy actions_insert on public.actions for insert to authenticated with check ((select auth.uid()) = created_by and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy actions_update on public.actions for update to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));

create policy risks_select on public.risk_issues for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy risks_insert on public.risk_issues for insert to authenticated with check ((select auth.uid()) = created_by and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy risks_update on public.risk_issues for update to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));

create policy decisions_select on public.decisions for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy decisions_insert on public.decisions for insert to authenticated with check ((select auth.uid()) = actor_user_id and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy authorization_select on public.authorization_records for select to authenticated using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy authorization_insert on public.authorization_records for insert to authenticated with check ((select auth.uid()) = actor_user_id and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.owner_user_id = (select auth.uid())));
create policy projects_select on public.projects for select to authenticated using ((select auth.uid()) is not null);
create policy audit_select on public.audit_events for select to authenticated using ((select auth.uid()) is not null);
create policy audit_insert on public.audit_events for insert to authenticated with check ((select auth.uid()) = actor_user_id);
