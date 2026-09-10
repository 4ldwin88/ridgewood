alter table public.document_revisions
  add column if not exists source_data jsonb,
  add column if not exists storage_bucket text,
  add column if not exists storage_object_key text,
  add column if not exists artifact_mime_type text,
  add column if not exists artifact_size_bytes bigint,
  add column if not exists artifact_sha256 text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_reason text;

alter table public.document_revisions
  add constraint document_revision_published_artifact_required
  check (
    state not in ('published','superseded','withdrawn')
    or (storage_bucket is not null and storage_object_key is not null and published_at is not null)
  ) not valid;

create unique index if not exists document_revisions_storage_object_unique
  on public.document_revisions(storage_bucket, storage_object_key)
  where storage_object_key is not null;

insert into storage.buckets (id, name, public)
values ('ridgewood-published-documents', 'ridgewood-published-documents', false)
on conflict (id) do update set public = false;

create policy "ridgewood published documents authenticated read"
on storage.objects for select to authenticated
using (bucket_id = 'ridgewood-published-documents');

-- Publishing/upload is intentionally not granted to browser clients. A later trusted
-- PublishDocumentRevision command will render and upload the immutable artifact.
