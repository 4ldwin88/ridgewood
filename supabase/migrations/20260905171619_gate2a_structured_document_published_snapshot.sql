alter table public.document_revisions
  drop constraint if exists document_revision_published_artifact_required;

alter table public.document_revisions
  add constraint document_revision_published_artifact_required
  check (
    state not in ('published','superseded','withdrawn')
    or (
      published_at is not null
      and (
        (storage_bucket is not null and storage_object_key is not null)
        or published_source_snapshot is not null
      )
    )
  ) not valid;

comment on constraint document_revision_published_artifact_required on public.document_revisions is
  'Published historical revisions require either a persisted storage artifact or an immutable structured published_source_snapshot, plus published_at.';
