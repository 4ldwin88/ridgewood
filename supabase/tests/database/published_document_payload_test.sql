-- Tests the trigger itself in isolation. Does not substitute for tenant/RPC tests.
begin;
select plan(5);
create temporary table publication_guard_fixture (
 id int primary key, state text, source_data jsonb, published_source_snapshot jsonb,
 published_at timestamptz, updated_at timestamptz, archived_at timestamptz
);
create trigger publication_guard_fixture before update or delete on publication_guard_fixture
for each row execute function private.protect_published_document_payload();
insert into publication_guard_fixture values (1,'published','{"site":"Original"}','{"site":"Original"}',now(),now(),null);
select throws_ok($$update publication_guard_fixture set source_data='{"site":"Changed"}' where id=1$$,'P0001','published_document_payload_immutable','source payload cannot change');
select throws_ok($$update publication_guard_fixture set published_source_snapshot='{}' where id=1$$,'P0001','published_document_payload_immutable','frozen snapshot cannot change');
select throws_ok($$delete from publication_guard_fixture where id=1$$,'P0001','published_document_delete_forbidden','publication cannot be deleted');
select throws_ok($$update publication_guard_fixture set state='draft' where id=1$$,'P0001','published_document_transition_forbidden','publication cannot become editable');
select lives_ok($$update publication_guard_fixture set state='superseded' where id=1$$,'supersession preserves payload');
select * from finish();
rollback;
