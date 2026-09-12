"""Setup concurrency checks. This script is restricted to the disposable local CI DB."""
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
import psycopg
from psycopg.types.json import Jsonb

DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
owner, workspace, project, authorization, authority = [uuid.uuid4() for _ in range(5)]
with psycopg.connect(DB, autocommit=True) as db:
    db.execute("insert into auth.users(id,instance_id,aud,role,email,created_at,updated_at) values(%s,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',%s,now(),now())", (owner, f'{owner}@example.invalid'))
    db.execute('insert into public.workspaces(id,name,created_by) values(%s,%s,%s)', (workspace,'Synthetic obligation concurrency',owner))
    db.execute("insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values(%s,%s,'owner','active')", (workspace,owner))
    db.execute("insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect) select %s,%s,permission_key,'grant' from public.app_permissions where permission_key in ('project.setup.edit','project.gate01.decide')", (workspace,owner))
    db.execute("insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values(%s,%s,'Obligation concurrency','project_authorization_setup','project_authorization_setup','active','medium',%s,%s)", (project,workspace,owner,owner))
    db.execute("insert into public.authorization_records(id,project_state_id,outcome,actor_user_id) values(%s,%s,'approved',%s)", (authorization,project,owner))

barrier = Barrier(2)
items = [dict(id=str(uuid.uuid4()), type='', requirement='', sourceRevisionId='', ownerUserId='', dueDate='', dueTrigger='', dueRelationship='')]
def command(request, version):
    with psycopg.connect(DB, autocommit=True) as db:
        db.execute('set role authenticated')
        db.execute("select set_config('request.jwt.claims',%s,false)", (json.dumps({'sub':str(owner),'role':'authenticated'}),))
        barrier.wait(timeout=15)
        try:
            return db.execute('select public.save_project_obligation_plan(%s,%s,%s,%s)', (project,version,request,Jsonb(items))).fetchone()[0]['savedVersion']
        except psycopg.Error as exc:
            return str(exc).splitlines()[0]
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda r: command(r,0), [uuid.uuid4(),uuid.uuid4()]))
assert sorted(map(str,results)) == ['1','obligation_version_conflict'], results
request = uuid.uuid4()
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda r: command(r,1), [request,request]))
assert results == [2,2], results
with psycopg.connect(DB) as db:
    assert db.execute('select count(*) from public.project_obligation_plan_versions where project_state_id=%s',(project,)).fetchone()[0] == 2
    assert db.execute('select count(*) from public.project_obligations where project_state_id=%s',(project,)).fetchone()[0] == 1
    assert db.execute('select stage from public.project_states where id=%s',(project,)).fetchone()[0] == 'project_authorization_setup'
print('Overlapping obligation saves reject stale writes; identical retries produce one version and preserve one obligation identity.')
