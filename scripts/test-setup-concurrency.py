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
    db.execute('insert into public.workspaces(id,name,created_by) values(%s,%s,%s)', (workspace,'Synthetic Setup concurrency',owner))
    db.execute("insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values(%s,%s,'owner','active')", (workspace,owner))
    db.execute("insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect) select %s,%s,permission_key,'grant' from public.app_permissions where permission_key in ('project.setup.edit','project.gate01.decide')", (workspace,owner))
    db.execute("insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values(%s,%s,'Setup concurrency','project_authorization_setup','project_authorization_setup','active','medium',%s,%s)", (project,workspace,owner,owner))
    db.execute("insert into public.authorization_records(id,project_state_id,outcome,actor_user_id) values(%s,%s,'approved',%s)", (authorization,project,owner))
    db.execute("insert into public.project_gate01_authorities(id,workspace_id,user_id,basis,owner_approval_reference,effective_from) values(%s,%s,%s,'confirmed_owner','Synthetic owner record',now()-interval '1 day')", (authority,workspace,owner))
    keys = db.execute('select private.setup_requirement_keys()').fetchone()[0]
    evidence = [dict(requirement=k,state='satisfied',details='Reviewed synthetic basis',evidenceReference='fixture:approved',accountableUserId=str(owner),materialBlocker=False) for k in keys]

barrier = Barrier(2)
def command(kind, request):
    with psycopg.connect(DB, autocommit=True) as db:
        db.execute('set role authenticated')
        db.execute("select set_config('request.jwt.claims',%s,false)", (json.dumps({'sub':str(owner),'role':'authenticated'}),))
        barrier.wait(timeout=15)
        try:
            if kind == 'save':
                return db.execute('select public.save_project_setup(%s,0,%s,%s)', (project,request,Jsonb(evidence))).fetchone()[0]['version']
            return str(db.execute("select (public.decide_project_gate01(%s,1,%s,%s,'go','Synthetic reviewed basis','[]')).id", (project,request,authority)).fetchone()[0])
        except psycopg.Error as exc:
            return str(exc).splitlines()[0]

with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda r: command('save',r), [uuid.uuid4(),uuid.uuid4()]))
assert sorted(map(str,results)) == ['1','setup_version_conflict'], results
request = uuid.uuid4()
with ThreadPoolExecutor(max_workers=2) as pool:
    results = list(pool.map(lambda r: command('decide',r), [request,request]))
assert results[0] == results[1] and uuid.UUID(results[0]), results
with psycopg.connect(DB) as db:
    assert db.execute('select count(*) from public.project_setup_versions where project_state_id=%s',(project,)).fetchone()[0] == 1
    assert db.execute('select count(*) from public.project_gate01_decisions where project_state_id=%s',(project,)).fetchone()[0] == 1
    assert db.execute('select stage from public.project_states where id=%s',(project,)).fetchone()[0] == 'preconstruction_mobilization'
print('Concurrent Setup saves reject stale writes; overlapping Gate 01 retries return one decision and one transition.')
