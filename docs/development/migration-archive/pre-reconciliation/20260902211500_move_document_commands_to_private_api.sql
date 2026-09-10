-- SECURITY DEFINER governed mutations are trusted-server commands, not browser RPCs.
create schema if not exists private;
alter function public.create_document_draft_atomic(uuid,uuid,uuid,text,text,text,text,jsonb) set schema private;
alter function public.update_document_draft_atomic(uuid,jsonb) set schema private;
alter function public.create_revision_from_published_atomic(uuid,text) set schema private;
revoke all on function private.create_document_draft_atomic(uuid,uuid,uuid,text,text,text,text,jsonb) from public,anon,authenticated;
revoke all on function private.update_document_draft_atomic(uuid,jsonb) from public,anon,authenticated;
revoke all on function private.create_revision_from_published_atomic(uuid,text) from public,anon,authenticated;