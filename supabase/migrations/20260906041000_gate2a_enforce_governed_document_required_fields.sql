create or replace function private.gate2a_required_document_fields(document_type_input text, source_data_input jsonb)
returns text[]
language plpgsql
immutable
set search_path=''
as $$
declare required_fields text[]; field_key text; missing text[] := array[]::text[]; value jsonb;
begin
 required_fields := case document_type_input
  when 'predevelopment_development_site' then array['siteIdentity','siteControl','planningStatus','approvalStatus','accessStatus']
  when 'predevelopment_product_program' then array['productType','intendedUsers','programSummary','scale','qualityPositioning']
  when 'predevelopment_design_consultants' then array['designIntent','designStage','leadDesigner','consultantTeam','coordinationStatus']
  when 'predevelopment_commercial_feasibility' then array['revenueBasis','costBasis','budgetRange','fundingCapital','marginReturn']
  when 'predevelopment_schedule_phasing' then array['scheduleBasis','targetStart','targetCompletion','keyMilestones','criticalDependencies']
  when 'predevelopment_risk_decision_evidence' then array['materialRisks','materialUnknowns','openDecisions','evidenceRequired']
  when 'predevelopment_delivery_strategy' then array['deliveryModel','procurementStrategy','contractingStrategy','constructionApproach','rolesResponsibilities']
  else array[]::text[] end;
 foreach field_key in array required_fields loop
  value := coalesce(source_data_input,'{}'::jsonb) -> field_key;
  if value is null or value = 'null'::jsonb or (jsonb_typeof(value)='string' and btrim(value #>> '{}')='') then missing := array_append(missing,field_key); end if;
 end loop;
 return missing;
end $$;

create or replace function private.enforce_gate2a_document_publish_requirements()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare doc_type text; missing text[];
begin
 if new.state='published' and old.state='draft' then
  select document_type into doc_type from public.document_records where id=new.document_record_id;
  missing := private.gate2a_required_document_fields(doc_type,new.source_data);
  if coalesce(array_length(missing,1),0)>0 then raise exception 'document_required_fields_incomplete:%',array_to_string(missing,','); end if;
 end if;
 return new;
end $$;

drop trigger if exists gate2a_document_publish_requirements on public.document_revisions;
create trigger gate2a_document_publish_requirements before update of state on public.document_revisions for each row execute function private.enforce_gate2a_document_publish_requirements();