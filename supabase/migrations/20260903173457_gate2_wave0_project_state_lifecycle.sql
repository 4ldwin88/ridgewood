update public.project_states set commercial_stage='opportunity' where commercial_stage is null or commercial_stage='unknown';

alter table public.project_states drop constraint if exists project_states_commercial_stage_check;
alter table public.project_states add constraint project_states_commercial_stage_check check (commercial_stage in ('opportunity','qualification','predevelopment','authorization','authorized','project_authorization_setup','preconstruction_mobilization','construction_control','completion_turnover','project_closeout','warranty_final_close','closed'));

alter table public.project_states drop constraint if exists project_states_status_check;
alter table public.project_states add constraint project_states_status_check check (status in ('active','held','declined','lost','cancelled','terminated','closed'));

comment on column public.project_states.commercial_stage is 'Canonical Project State lifecycle stage. Opportunity is the initial lifecycle context; Closed is the successful terminal lifecycle state. Archived remains a separate disposition via archived_at/archived_by.';
comment on column public.project_states.status is 'Operational condition/disposition for the Project State. Closed is successful terminal completion; held, declined/lost and cancelled/terminated are non-success conditions. Archived is separate.';
