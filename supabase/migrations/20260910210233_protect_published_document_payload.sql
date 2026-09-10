-- Review against restored schema before applying. The earlier document-table
-- migration in this repository is a placeholder, so a fresh replay is blocked.
-- Preserve issued payload/identity while permitting governed supersession,
-- withdrawal and archival metadata. Privileged development resets are separate.
create or replace function private.protect_published_document_payload()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.state::text in ('published', 'superseded', 'withdrawn') then
      raise exception 'published_document_delete_forbidden';
    end if;
    return old;
  end if;

  if old.state::text in ('published', 'superseded', 'withdrawn') then
    if (to_jsonb(new) - array['state','updated_at','archived_at'])
       is distinct from (to_jsonb(old) - array['state','updated_at','archived_at']) then
      raise exception 'published_document_payload_immutable';
    end if;
    if new.state::text is distinct from old.state::text
       and not (old.state::text = 'published' and new.state::text in ('superseded','withdrawn')) then
      raise exception 'published_document_transition_forbidden';
    end if;
  elsif new.state::text = 'published' then
    if new.published_source_snapshot is null or new.published_at is null then
      raise exception 'published_document_snapshot_required';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.protect_published_document_payload() from public, anon, authenticated;
drop trigger if exists protect_published_document_payload on public.document_revisions;
create trigger protect_published_document_payload
before update or delete on public.document_revisions
for each row execute function private.protect_published_document_payload();
