-- Project State is the canonical E2E identity. Cross-cutting records attach to it
-- even when transitional opportunity/project columns remain during reconciliation.
alter table public.actions add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.audit_events add column if not exists project_state_id uuid references public.project_states(id) on delete set null;
alter table public.authorization_records add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.decisions add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.document_output_manifests add column if not exists project_state_id uuid references public.project_states(id) on delete set null;
alter table public.document_records add column if not exists project_state_id uuid references public.project_states(id) on delete set null;
alter table public.evidence_references add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.projects add column if not exists project_state_id uuid references public.project_states(id);
alter table public.risk_issues add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;

update public.actions x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.audit_events x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.authorization_records x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.decisions x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.document_output_manifests x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.document_records x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.evidence_references x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;
update public.projects x set project_state_id=o.project_state_id from public.opportunities o where x.originating_opportunity_id=o.id and x.project_state_id is null;
update public.risk_issues x set project_state_id=o.project_state_id from public.opportunities o where x.opportunity_id=o.id and x.project_state_id is null;

alter table public.actions alter column project_state_id set not null;
alter table public.authorization_records alter column project_state_id set not null;
alter table public.decisions alter column project_state_id set not null;
alter table public.evidence_references alter column project_state_id set not null;
alter table public.risk_issues alter column project_state_id set not null;
alter table public.projects alter column project_state_id set not null;

create unique index if not exists projects_project_state_id_key on public.projects(project_state_id);
create index if not exists actions_project_state_idx on public.actions(project_state_id);
create index if not exists audit_events_project_state_idx on public.audit_events(project_state_id);
create index if not exists authorization_records_project_state_idx on public.authorization_records(project_state_id);
create index if not exists decisions_project_state_idx on public.decisions(project_state_id);
create index if not exists document_output_manifests_project_state_idx on public.document_output_manifests(project_state_id);
create index if not exists document_records_project_state_idx on public.document_records(project_state_id);
create index if not exists evidence_references_project_state_idx on public.evidence_references(project_state_id);
create index if not exists risk_issues_project_state_idx on public.risk_issues(project_state_id);

comment on column public.projects.project_state_id is 'Existing authoritative Project State identity. Authorization enables the Project workspace; it does not create a new canonical identity.';
