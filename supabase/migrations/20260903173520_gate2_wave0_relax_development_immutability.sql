drop trigger if exists freeze_issued_document_revision on public.document_revisions;
comment on table public.document_revisions is 'Development-active document revision model. Revisions, including published/superseded/withdrawn development records, remain authorized-correctable/reseedable during active development. Production issue immutability is a future stable-build integrity target.';
