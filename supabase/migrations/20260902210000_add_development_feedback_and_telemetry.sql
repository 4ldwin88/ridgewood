create table if not exists public.development_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page_path text not null,
  page_title text,
  note text not null check (char_length(note) between 1 and 5000),
  app_version text not null,
  viewport_width integer,
  viewport_height integer,
  user_agent text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists development_notes_user_created_idx on public.development_notes (user_id, created_at desc);
create index if not exists development_notes_page_created_idx on public.development_notes (page_path, created_at desc);
alter table public.development_notes enable row level security;
revoke all on table public.development_notes from anon, authenticated;
grant insert, select on table public.development_notes to authenticated;
create policy "users insert own development notes" on public.development_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users read own development notes" on public.development_notes for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.development_telemetry (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_name text not null check (event_name in ('route_view','form_started','form_section_saved','validation_blocked','command_attempted','command_rejected','command_succeeded','unexpected_error','dead_end_detected','auth_signed_in','auth_signed_up','auth_signed_out','dev_note_submitted')),
  page_path text not null,
  app_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists development_telemetry_user_created_idx on public.development_telemetry (user_id, created_at desc);
create index if not exists development_telemetry_session_created_idx on public.development_telemetry (session_id, created_at);
create index if not exists development_telemetry_event_created_idx on public.development_telemetry (event_name, created_at desc);
alter table public.development_telemetry enable row level security;
revoke all on table public.development_telemetry from anon, authenticated;
grant insert, select on table public.development_telemetry to authenticated;
create policy "users insert own development telemetry" on public.development_telemetry for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users read own development telemetry" on public.development_telemetry for select to authenticated using ((select auth.uid()) = user_id);
