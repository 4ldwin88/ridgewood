-- Gate 2A human-QA reconciliation.
-- The canonical Project State continues beyond Authorization; retain the obsolete
-- `authorized` value only for compatibility while admitting the durable lifecycle.

alter table public.project_states drop constraint if exists project_states_stage_check;
alter table public.project_states add constraint project_states_stage_check check (stage = any (array[
  'opportunity'::text,
  'qualification'::text,
  'predevelopment'::text,
  'authorization'::text,
  'authorized'::text,
  'project_authorization_setup'::text,
  'preconstruction_mobilization'::text,
  'construction_control'::text,
  'completion_turnover'::text,
  'project_closeout'::text,
  'warranty_final_close'::text,
  'closed'::text
]));
