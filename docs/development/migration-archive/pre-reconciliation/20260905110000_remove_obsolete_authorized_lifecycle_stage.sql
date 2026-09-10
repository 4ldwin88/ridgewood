-- Gate 2A lifecycle reconciliation: `authorized` is not a durable Project State stage.
-- Successful Project Authorization transitions directly from `authorization`
-- to `project_authorization_setup`.

alter table public.project_states
  drop constraint if exists project_states_stage_check;

alter table public.project_states
  add constraint project_states_stage_check
  check (stage = any (array[
    'opportunity'::text,
    'qualification'::text,
    'predevelopment'::text,
    'authorization'::text,
    'project_authorization_setup'::text,
    'preconstruction_mobilization'::text,
    'construction_control'::text,
    'completion_turnover'::text,
    'project_closeout'::text,
    'warranty_final_close'::text,
    'closed'::text
  ]));

alter table public.project_states
  drop constraint if exists project_states_commercial_stage_check;

alter table public.project_states
  add constraint project_states_commercial_stage_check
  check (commercial_stage is null or commercial_stage = any (array[
    'opportunity'::text,
    'qualification'::text,
    'predevelopment'::text,
    'authorization'::text,
    'project_authorization_setup'::text,
    'preconstruction_mobilization'::text,
    'construction_control'::text,
    'completion_turnover'::text,
    'project_closeout'::text,
    'warranty_final_close'::text,
    'closed'::text
  ]));
