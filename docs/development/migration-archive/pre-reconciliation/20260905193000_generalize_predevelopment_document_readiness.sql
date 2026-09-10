create or replace function private.sync_predevelopment_readiness_from_document_revision()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  ps uuid;
  dtype text;
  domain text;
  has_draft boolean;
  has_published boolean;
begin
  select d.project_state_id, d.document_type into ps, dtype
  from public.document_records d
  where d.id = new.document_record_id;

  domain := case dtype
    when 'predevelopment_development_site' then 'development_site'
    when 'predevelopment_product_program' then 'product_program'
    when 'predevelopment_design_consultants' then 'design_consultants'
    when 'predevelopment_commercial_feasibility' then 'commercial_feasibility'
    when 'predevelopment_schedule_phasing' then 'schedule_phasing'
    when 'predevelopment_risk_decision_evidence' then 'risk_decision_evidence'
    when 'predevelopment_delivery_strategy' then 'delivery_strategy'
    else null
  end;
  if domain is null then return new; end if;

  select
    exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where d.project_state_id=ps and d.document_type=dtype and r.state='draft' and r.archived_at is null),
    exists(select 1 from public.document_revisions r join public.document_records d on d.id=r.document_record_id where d.project_state_id=ps and d.document_type=dtype and r.state='published' and r.archived_at is null)
  into has_draft, has_published;

  update public.predevelopment_domains
  set readiness = case when has_draft then 'in_progress'::public.readiness_state when has_published then 'satisfied'::public.readiness_state else 'not_started'::public.readiness_state end,
      updated_by = coalesce(new.published_by,new.created_by),
      updated_at = now()
  where project_state_id=ps and domain_key=domain;
  return new;
end;
$$;

drop trigger if exists trg_sync_development_site_readiness on public.document_revisions;
drop trigger if exists trg_sync_predevelopment_readiness on public.document_revisions;
create trigger trg_sync_predevelopment_readiness
after insert or update of state, archived_at on public.document_revisions
for each row execute function private.sync_predevelopment_readiness_from_document_revision();

drop function if exists private.sync_development_site_readiness_from_document_revision();

update public.predevelopment_domains pd
set readiness = case
  when exists(select 1 from public.document_records d join public.document_revisions r on r.document_record_id=d.id where d.project_state_id=pd.project_state_id and d.document_type='predevelopment_'||pd.domain_key and r.state='draft' and r.archived_at is null) then 'in_progress'::public.readiness_state
  when exists(select 1 from public.document_records d join public.document_revisions r on r.document_record_id=d.id where d.project_state_id=pd.project_state_id and d.document_type='predevelopment_'||pd.domain_key and r.state='published' and r.archived_at is null) then 'satisfied'::public.readiness_state
  else pd.readiness
end,
updated_at=now();
