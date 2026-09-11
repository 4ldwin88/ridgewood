-- Retire reusable choices without deleting identities referenced by project history.
-- Existing workspace-scoped SELECT/UPDATE policies remain authoritative.
alter table public.organizations add column is_retired boolean not null default false;
comment on column public.organizations.is_retired is 'Hidden from new selections; existing project and historical references are retained. Reversible by workspace members under existing organization update policy.';
