"""Destructive fixtures for the disposable CI stack ONLY; never accepts a remote URL."""
import concurrent.futures
import json
import time
from pathlib import Path
import psycopg

URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
OWNER = '00000000-0000-4000-8000-00000000f001'
PROJECT = '00000000-0000-4000-8000-00000000f020'
root = Path(__file__).resolve().parents[1]
admin = psycopg.connect(URL, autocommit=True)
fixture = (root / 'supabase/tests/database/governed_form_live_contract_test.sql').read_text()
admin.execute(fixture[fixture.index('insert into auth.users'):fixture.index('create temporary table form_ids')])
results = []

def actor(uid=OWNER):
    c = psycopg.connect(URL)
    c.execute("set local statement_timeout='15s'")
    c.execute('set local role authenticated')
    c.execute("select set_config('request.jwt.claims',%s,true)", (json.dumps({'sub':uid,'role':'authenticated'}),))
    return c

def call(sql, params=(), uid=OWNER):
    with actor(uid) as c:
        return c.execute(sql, params).fetchone()[0]

def race(label, first_sql, second_sql, params, expected, uid=OWNER):
    first, second = actor(uid), actor(uid)
    first_pid, second_pid = first.info.backend_pid, second.info.backend_pid
    first.execute(first_sql, params).fetchone()
    def run_second():
        try:
            second.execute(second_sql, params).fetchone()
            second.commit()
            return 'success'
        except psycopg.Error as error:
            second.rollback()
            return error.diag.message_primary
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(run_second)
        blocked = False
        try:
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline and not future.done():
                blockers = admin.execute('select pg_blocking_pids(%s)', (second_pid,)).fetchone()[0]
                if first_pid in blockers:
                    blocked = True
                    break
                time.sleep(0.02)
            first.commit()
            result = future.result(timeout=20)
            passed = blocked and result in expected
            results.append({'case':label,'overlap_observed':blocked,'second_result':result,'passed':passed})
        finally:
            first.close()
            second.close()

def draft():
    data={'siteIdentity':'Synthetic','siteControl':'Owned','planningStatus':'Unknown','approvalStatus':'Not assessed','accessStatus':'Suitable'}
    return call("select public.create_project_state_document_draft(%s,'predevelopment','development_site','predevelopment_development_site','Concurrency fixture',%s::jsonb)",(PROJECT,json.dumps(data)))

publish='select public.publish_project_state_document_revision(%s)'
r = draft()
race('save racing publication rejects stale draft',publish,"select public.update_project_state_document_draft(%s,'{}')",(r,),{'draft_not_found_or_not_editable'})
updates=admin.execute("select count(*) from public.audit_events where event_type='document_draft_updated' and payload->>'revisionId'=%s",(str(r),)).fetchone()[0]
results.append({'case':'rejected stale save produces no success audit','passed':updates==0})

r = draft()
race('duplicate publication rejects second command',publish,publish,(r,),{'draft_not_found_or_not_publishable'})
count=admin.execute("select count(*) from public.audit_events where event_type='document_revision_published' and payload->>'revisionId'=%s",(str(r),)).fetchone()[0]
results.append({'case':'duplicate publication emits one audit event','passed':count==1})

revision='select public.create_project_state_document_revision(%s)'
race('overlapping revision requests leave one draft',revision,revision,(r,),{'revision_draft_already_exists','duplicate key value violates unique constraint "document_revisions_document_record_id_revision_number_key"'})
count=admin.execute("select count(*) from public.document_revisions where document_record_id=(select document_record_id from public.document_revisions where id=%s) and state='draft' and archived_at is null",(r,)).fetchone()[0]
results.append({'case':'one active revision draft','passed':count==1})

# Prepare independent authorization fixtures from the existing behavioral test.
auth_fixture=(root/'supabase/tests/database/project_state_authorization_success_replay_test.sql').read_text()
auth_setup=auth_fixture[auth_fixture.index('insert into auth.users'):auth_fixture.index('select lives_ok(')]
with psycopg.connect(URL) as setup:
    setup.execute(auth_setup)
uid='00000000-0000-4000-8000-0000000000c6'
authorize="select public.authorize_project_state(%s,'Concurrency test',jsonb_build_object('verified',true,'userVerified',true,'verificationReference','concurrency-auth-ref','verifiedAt',now()::text))"
race('duplicate authorization cannot authorize twice',authorize,authorize,('00000000-0000-4000-8000-000000000306',),{'project_authorization_not_allowed_from_stage:project_authorization_setup','verification_replay_detected'},uid)
count=admin.execute("select count(*) from public.authorization_records where project_state_id='00000000-0000-4000-8000-000000000306'").fetchone()[0]
results.append({'case':'one authorization record','passed':count==1})
admin.close()
print(json.dumps(results,indent=2))
if not all(r['passed'] for r in results):
    raise SystemExit('Command concurrency checks failed')
