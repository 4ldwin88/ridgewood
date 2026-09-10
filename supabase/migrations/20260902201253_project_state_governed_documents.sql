create type public.project_operational_state as enum ('active','held','cancelled','terminated','closeout','closed','warranty');
create type public.document_revision_state as enum ('draft','published','superseded','withdrawn');

alter table public.projects add column if not exists operational_state public.project_operational_state not null default 'active';
alter table public.projects add column if not exists state_updated_at timestamptz not null default now();

create table public.document_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  package_key text not null,
  category_key text not null,
  document_type text not null,
  title text not null,
  sort_order integer not null default 0,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_records_context check (project_id is not null or opportunity_id is not null)
);

create table public.document_revisions (
  id uuid primary key default gen_random_uuid(),
  document_record_id uuid not null references public.document_records(id) on delete restrict,
  revision_number integer not null,
  state public.document_revision_state not null default 'draft',
  storage_provider text,
  storage_locator text,
  mime_type text,
  content_hash text,
  supersedes_revision_id uuid references public.document_revisions(id) on delete restrict,
  change_reason text,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique(document_record_id, revision_number),
  constraint published_revision_metadata check ((state <> 'published') or (published_at is not null and published_by is not null))
);

create table public.document_package_definitions (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  name text not null,
  lifecycle_scope text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.document_output_manifests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  opportunity_id uuid references public.opportunities(id) on delete restrict,
  package_definition_id uuid references public.document_package_definitions(id) on delete set null,
  output_kind text not null check (output_kind in ('print','download','save_device')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint document_output_context check (project_id is not null or opportunity_id is not null)
);

create table public.document_output_items (
  manifest_id uuid not null references public.document_output_manifests(id) on delete restrict,
  document_revision_id uuid not null references public.document_revisions(id) on delete restrict,
  output_order integer not null,
  primary key (manifest_id, document_revision_id),
  unique(manifest_id, output_order)
);

create index document_records_project_package_idx on public.document_records(project_id, package_key, category_key, sort_order);
create index document_records_opportunity_package_idx on public.document_records(opportunity_id, package_key, category_key, sort_order);
create index document_revisions_record_state_idx on public.document_revisions(document_record_id, state, revision_number desc);
create index document_output_manifests_project_idx on public.document_output_manifests(project_id, created_at desc);

alter table public.document_records enable row level security;
alter table public.document_revisions enable row level security;
alter table public.document_package_definitions enable row level security;
alter table public.document_output_manifests enable row level security;
alter table public.document_output_items enable row level security;

revoke all on public.document_records, public.document_revisions, public.document_package_definitions, public.document_output_manifests, public.document_output_items from anon, authenticated;
grant select, insert, update on public.document_records to authenticated;
grant select, insert, update on public.document_revisions to authenticated;
grant select on public.document_package_definitions to authenticated;
grant select, insert on public.document_output_manifests to authenticated;
grant select, insert on public.document_output_items to authenticated;

create policy document_records_select_own on public.document_records for select to authenticated using (owner_user_id = (select auth.uid()));
create policy document_records_insert_own on public.document_records for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy document_records_update_own on public.document_records for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

create policy document_revisions_select_owned_record on public.document_revisions for select to authenticated using (exists (select 1 from public.document_records d where d.id = document_record_id and d.owner_user_id = (select auth.uid())));
create policy document_revisions_insert_owned_record on public.document_revisions for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.document_records d where d.id = document_record_id and d.owner_user_id = (select auth.uid())));
create policy document_revisions_update_draft_owned_record on public.document_revisions for update to authenticated using (state = 'draft' and exists (select 1 from public.document_records d where d.id = document_record_id and d.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.document_records d where d.id = document_record_id and d.owner_user_id = (select auth.uid())));

create policy document_package_definitions_select on public.document_package_definitions for select to authenticated using (true);
create policy document_output_manifests_select_own on public.document_output_manifests for select to authenticated using (requested_by = (select auth.uid()));
create policy document_output_manifests_insert_own on public.document_output_manifests for insert to authenticated with check (requested_by = (select auth.uid()));
create policy document_output_items_select_own_manifest on public.document_output_items for select to authenticated using (exists (select 1 from public.document_output_manifests m where m.id = manifest_id and m.requested_by = (select auth.uid())));
create policy document_output_items_insert_own_manifest on public.document_output_items for insert to authenticated with check (exists (select 1 from public.document_output_manifests m where m.id = manifest_id and m.requested_by = (select auth.uid())));

insert into public.document_package_definitions(package_key,name,lifecycle_scope,description) values
('opportunity_qualification','Opportunity & Qualification','opportunity','Opportunity intake and qualification package'),
('preconstruction','Preconstruction','predevelopment','Predevelopment and preconstruction working/published package'),
('authorization','Authorization','authorization','Authorization and establishment package'),
('construction','Project / Construction','project','Construction delivery package'),
('closeout_warranty','Closeout & Warranty','closeout','Closeout and warranty package')
on conflict (package_key) do nothing;
