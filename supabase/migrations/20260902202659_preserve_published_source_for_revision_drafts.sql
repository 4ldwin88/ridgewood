alter table public.document_revisions add column if not exists based_on_revision_id uuid references public.document_revisions(id), add column if not exists published_source_snapshot jsonb;

update public.document_revisions set published_source_snapshot = source_data where state in ('published','superseded') and published_source_snapshot is null;

create or replace function public.ridgewood_freeze_issued_document_revision() returns trigger language plpgsql set search_path = public as $$ begin if old.state in ('published','superseded','withdrawn') then if new.source_data is distinct from old.source_data or new.published_source_snapshot is distinct from old.published_source_snapshot or new.storage_bucket is distinct from old.storage_bucket or new.storage_object_key is distinct from old.storage_object_key or new.artifact_sha256 is distinct from old.artifact_sha256 then raise exception 'Issued document revision content and artifact are immutable; create a new draft revision instead.'; end if; end if; return new; end; $$;

drop trigger if exists freeze_issued_document_revision on public.document_revisions;
create trigger freeze_issued_document_revision before update on public.document_revisions for each row execute function public.ridgewood_freeze_issued_document_revision();

comment on column public.document_revisions.published_source_snapshot is 'Immutable structured source snapshot captured at publication and retained so an authorized user can create a later editable draft revision without modifying the issued artifact.';
comment on column public.document_revisions.based_on_revision_id is 'Issued revision from which this revision draft was derived.';
