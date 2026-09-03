-- Opportunity is a lifecycle stage of Project State, not an entity.
-- All canonical dependent relationships were migrated to project_state_id first.
drop function if exists public.create_opportunity_with_project_state(jsonb);
-- Unsafe legacy authorization trusted browser-supplied verification and created a second identity.
drop function if exists public.authorize_project_atomic(uuid,uuid,text,text,jsonb,jsonb,jsonb);
alter table public.actions drop column if exists opportunity_id;
alter table public.audit_events drop column if exists opportunity_id;
alter table public.authorization_records drop column if exists opportunity_id;
alter table public.decisions drop column if exists opportunity_id;
alter table public.document_output_manifests drop column if exists opportunity_id;
alter table public.document_records drop column if exists opportunity_id;
alter table public.evidence_references drop column if exists opportunity_id;
alter table public.opportunity_qualification_decisions drop column if exists opportunity_id;
alter table public.opportunity_qualification_findings drop column if exists opportunity_id;
alter table public.predevelopment_domains drop column if exists opportunity_id;
alter table public.projects drop column if exists originating_opportunity_id;
alter table public.risk_issues drop column if exists opportunity_id;
alter table public.project_states drop column if exists originating_opportunity_id;
drop table public.opportunities;
drop type if exists public.opportunity_lifecycle;
comment on table public.project_states is 'Authoritative continuous E2E state from first Opportunity-stage capture through authorized delivery and later lifecycle stages. Opportunity is a stage, not an entity.';
