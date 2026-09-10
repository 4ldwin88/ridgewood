update public.position_assignments
set scope = jsonb_build_object('type','workspace'), updated_at = now()
where status='active'
  and role_family='executive'
  and scope = '{"workspace": true}'::jsonb;
