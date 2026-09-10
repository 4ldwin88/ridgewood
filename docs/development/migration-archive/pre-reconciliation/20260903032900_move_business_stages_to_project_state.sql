-- Qualification and Predevelopment are stages of Project State.
-- Add canonical project_state_id parents before removing transitional opportunity_id.
alter table public.opportunity_qualification_findings add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.opportunity_qualification_decisions add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
alter table public.predevelopment_domains add column if not exists project_state_id uuid references public.project_states(id) on delete cascade;
update public.opportunity_qualification_findings f set project_state_id=o.project_state_id from public.opportunities o where f.opportunity_id=o.id and f.project_state_id is null;
update public.opportunity_qualification_decisions d set project_state_id=o.project_state_id from public.opportunities o where d.opportunity_id=o.id and d.project_state_id is null;
update public.predevelopment_domains p set project_state_id=o.project_state_id from public.opportunities o where p.opportunity_id=o.id and p.project_state_id is null;
alter table public.opportunity_qualification_findings alter column project_state_id set not null;
alter table public.opportunity_qualification_decisions alter column project_state_id set not null;
alter table public.predevelopment_domains alter column project_state_id set not null;
alter table public.opportunity_qualification_findings drop constraint if exists opportunity_qualification_findings_opportunity_id_area_key;
alter table public.predevelopment_domains drop constraint if exists predevelopment_domains_opportunity_id_domain_key_key;
alter table public.opportunity_qualification_findings add constraint opportunity_qualification_findings_project_state_area_key unique(project_state_id,area);
alter table public.predevelopment_domains add constraint predevelopment_domains_project_state_domain_key_key unique(project_state_id,domain_key);
create index if not exists qualification_decisions_project_state_idx on public.opportunity_qualification_decisions(project_state_id,decided_at desc);
comment on column public.opportunity_qualification_findings.project_state_id is 'Canonical parent. Qualification is a stage of Project State.';
comment on column public.opportunity_qualification_decisions.project_state_id is 'Canonical parent. Qualification decisions govern Project State stage progression.';
comment on column public.predevelopment_domains.project_state_id is 'Canonical parent. Predevelopment is a stage of Project State.';

-- Stage RLS resolves authority through Project State, not the transitional Opportunity row.
drop policy if exists qualification_findings_select_workspace on public.opportunity_qualification_findings;
drop policy if exists qualification_findings_insert_workspace on public.opportunity_qualification_findings;
drop policy if exists qualification_findings_update_workspace on public.opportunity_qualification_findings;
create policy qualification_findings_select_project_state_workspace on public.opportunity_qualification_findings for select to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy qualification_findings_insert_project_state_workspace on public.opportunity_qualification_findings for insert to authenticated with check (assessed_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy qualification_findings_update_project_state_workspace on public.opportunity_qualification_findings for update to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id))) with check (assessed_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
drop policy if exists qualification_decisions_select_workspace on public.opportunity_qualification_decisions;
drop policy if exists qualification_decisions_insert_workspace on public.opportunity_qualification_decisions;
create policy qualification_decisions_select_project_state_workspace on public.opportunity_qualification_decisions for select to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy qualification_decisions_insert_project_state_workspace on public.opportunity_qualification_decisions for insert to authenticated with check (decided_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
drop policy if exists predev_insert on public.predevelopment_domains;
drop policy if exists predev_select on public.predevelopment_domains;
drop policy if exists predev_update on public.predevelopment_domains;
drop policy if exists predevelopment_insert_workspace on public.predevelopment_domains;
drop policy if exists predevelopment_select_workspace on public.predevelopment_domains;
drop policy if exists predevelopment_update_workspace on public.predevelopment_domains;
create policy predevelopment_select_project_state_workspace on public.predevelopment_domains for select to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy predevelopment_insert_project_state_workspace on public.predevelopment_domains for insert to authenticated with check (updated_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
create policy predevelopment_update_project_state_workspace on public.predevelopment_domains for update to authenticated using (exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id))) with check (updated_by=auth.uid() and exists(select 1 from public.project_states ps where ps.id=project_state_id and public.is_workspace_member(ps.workspace_id)));
revoke delete on public.predevelopment_domains from authenticated;
