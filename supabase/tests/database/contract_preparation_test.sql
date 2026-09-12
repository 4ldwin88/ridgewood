begin;
select plan(16);
insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at) values
('00000000-0000-4000-8000-00000000f001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','setup-editor@example.invalid',now(),now()),
('00000000-0000-4000-8000-00000000f002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','setup-outsider@example.invalid',now(),now());
insert into public.workspaces(id,name,created_by) values ('00000000-0000-4000-8000-00000000f010','Setup contract','00000000-0000-4000-8000-00000000f001');
insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values ('00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001','owner','active');
insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values ('00000000-0000-4000-8000-00000000f020','00000000-0000-4000-8000-00000000f010','Setup fixture','project_authorization_setup','project_authorization_setup','active','medium','00000000-0000-4000-8000-00000000f001','00000000-0000-4000-8000-00000000f001');
insert into public.authorization_records(id,project_state_id,outcome,actor_user_id) values ('00000000-0000-4000-8000-00000000f030','00000000-0000-4000-8000-00000000f020','approved','00000000-0000-4000-8000-00000000f001');

select set_config('test.contract_data','{"partyIds":[],"agreementRevisionId":"","agreementEvidenceId":"","compensationModel":"fee","contractValue":"","currency":"","feeBasis":"Monthly management fee","paymentTerms":"Monthly invoice","reviewDecisionId":"","riskAssessment":"","riskIds":[],"effectiveFrom":"","effectiveUntil":""}',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
select is((public.read_project_contract('00000000-0000-4000-8000-00000000f020')->>'version')::integer,0,'contract starts unsaved');
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f040',current_setting('test.contract_data')::jsonb)$$,'P0001','missing_setup_edit_permission','role alone cannot save');
reset role;
insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect) values ('00000000-0000-4000-8000-00000000f010','00000000-0000-4000-8000-00000000f001','project.setup.edit','grant');
set local role authenticated;
select is((public.save_project_contract('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f040',current_setting('test.contract_data')::jsonb)->>'version')::integer,1,'preparation saves incomplete draft');
select is(public.read_project_contract('00000000-0000-4000-8000-00000000f020')->'data',current_setting('test.contract_data')::jsonb,'reopen retains typed data');
select is((public.save_project_contract('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f040',current_setting('test.contract_data')::jsonb)->>'version')::integer,1,'same request recovers without duplicate version');
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f040',current_setting('test.contract_data')::jsonb||'{"feeBasis":"changed"}')$$,'P0001','request_id_payload_mismatch','request id cannot change payload');
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f041',current_setting('test.contract_data')::jsonb)$$,'P0001','contract_version_conflict','stale editor cannot overwrite');
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',1,'00000000-0000-4000-8000-00000000f041',current_setting('test.contract_data')::jsonb||'{"partyIds":["00000000-0000-4000-8000-00000000f999"]}')$$,'P0001','invalid_contract_party','foreign or missing parties rejected');
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',1,'00000000-0000-4000-8000-00000000f041',current_setting('test.contract_data')::jsonb||'{"contractValue":"-5","currency":"CAD"}')$$,'P0001','invalid_contract_money','invalid money rejected');
select is(public.read_project_contract('00000000-0000-4000-8000-00000000f020')->>'approvalVerified','false','saving never claims approval');
select ok(public.read_project_setup('00000000-0000-4000-8000-00000000f020')->'unmet' ? 'contract_review','canonical preparation leaves gate blocked');
select throws_ok($$select public.decide_project_gate01('00000000-0000-4000-8000-00000000f020',0,'00000000-0000-4000-8000-00000000f050',null,'go','Cannot bypass','[]')$$,'P0001','contract_authorized_review_required','legacy checklist cannot bypass review');
select is((select authorization_record_id::text from public.project_contract_versions limit 1),'00000000-0000-4000-8000-00000000f030','frozen upstream identity retained');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f002","role":"authenticated"}',true);
select is((select count(*)::integer from public.project_contract_versions),0,'outsider RLS denies records');
select throws_ok($$select public.read_project_contract('00000000-0000-4000-8000-00000000f020')$$,'P0001','project_state_not_found_or_access_denied','outsider read RPC denied');
reset role;
update public.project_states set archived_at=now() where id='00000000-0000-4000-8000-00000000f020';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-00000000f001","role":"authenticated"}',true);
select throws_ok($$select public.save_project_contract('00000000-0000-4000-8000-00000000f020',1,'00000000-0000-4000-8000-00000000f041',current_setting('test.contract_data')::jsonb)$$,'P0001','contract_edit_not_allowed','archived contract cannot change');
select * from finish();
rollback;
