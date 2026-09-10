revoke execute on function private.advance_project_state_to_qualification_command(uuid) from authenticated;
revoke execute on function private.archive_project_state_command(uuid) from authenticated;
revoke execute on function private.authorize_project_state_command(uuid,text,jsonb) from authenticated;
revoke execute on function private.create_project_state_command(jsonb) from authenticated;
revoke execute on function private.create_project_state_document_draft_command(uuid,text,text,text,text,jsonb) from authenticated;
revoke execute on function private.enter_project_state_authorization_command(uuid) from authenticated;
revoke execute on function private.enter_project_state_preconstruction_mobilization_command(uuid) from authenticated;
revoke execute on function private.resume_held_project_state_command(uuid) from authenticated;
revoke execute on function private.set_project_state_qualification_decision_command(uuid,text,text) from authenticated;
revoke execute on function private.update_project_state_document_draft_command(uuid,jsonb) from authenticated;
revoke execute on function private.update_project_state_opportunity_basics_command(uuid,jsonb) from authenticated;

-- Membership is intentionally callable by authenticated because the public invoker helper and RLS policies depend on it.
-- Service role retains execute on privileged private commands.
