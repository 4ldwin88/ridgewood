-- Local replay prerequisite captured from the hosted platform on 2026-09-10.
-- The second historical migration revokes this function's public execution.
-- Run only on a NEW local Supabase database before the recovered history.
create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql security definer set search_path='pg_catalog' as $$
declare cmd record;
begin
 for cmd in select * from pg_event_trigger_ddl_commands()
 where command_tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
 and object_type in ('table','partitioned table') loop
  if cmd.schema_name='public' then
   begin
    execute format('alter table if exists %s enable row level security',cmd.object_identity);
   exception when others then
    raise log 'rls_auto_enable: failed to enable RLS on %',cmd.object_identity;
   end;
  end if;
 end loop;
end;
$$;
drop event trigger if exists ensure_rls;
create event trigger ensure_rls on ddl_command_end
when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO')
execute function public.rls_auto_enable();
