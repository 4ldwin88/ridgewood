create or replace function private.sync_development_site_readiness_from_document_revision()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  ps uuid;
  dtype text;
begin
  select d.project_state_id,d.document_type into ps,dtype
  from public.document_records d where d.id=new.document_record_id;
  if dtype <> 'predevelopment_development_site' then return new; end if;
  if tg_op='UPDATE' and new.state='published' and old.state is distinct from new.state then
    update public.predevelopment_domains
      set readiness='satisfied', updated_by=coalesce(new.published_by,new.created_by), updated_at=now()
      where project_state_id=ps and domain_key='development_site';
  elsif tg_op='INSERT' and new.state='draft' and new.based_on_revision_id is not null then
    update public.predevelopment_domains
      set readiness='in_progress', updated_by=new.created_by, updated_at=now()
      where project_state_id=ps and domain_key='development_site';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_development_site_readiness on public.document_revisions;
create trigger trg_sync_development_site_readiness
after insert or update of state on public.document_revisions
for each row execute function private.sync_development_site_readiness_from_document_revision();

update public.predevelopment_domains pd
set readiness='satisfied', updated_at=now()
where pd.domain_key='development_site'
and exists (
  select 1 from public.document_records d
  join public.document_revisions r on r.document_record_id=d.id
  where d.project_state_id=pd.project_state_id
    and d.document_type='predevelopment_development_site'
    and r.state='published' and r.archived_at is null
);