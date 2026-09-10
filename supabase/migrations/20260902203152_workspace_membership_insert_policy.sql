create policy memberships_insert_own_workspace on public.workspace_memberships for insert to authenticated with check (user_id = auth.uid());
