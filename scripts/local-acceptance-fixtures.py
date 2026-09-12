"""Synthetic auth/authority fixtures for the disposable localhost stack only."""
import json
import sys
import uuid
from pathlib import Path
from urllib.request import Request, urlopen
import psycopg

API = 'http://127.0.0.1:54321'
DB = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
EMAIL = 'edward-demo@example.invalid'
PASSWORD = 'Synthetic-local-only-2026!'
root = Path(__file__).resolve().parents[1]
command = sys.argv[1] if len(sys.argv) > 1 else 'setup'
with psycopg.connect(DB) as db:
    if command in ('deny-authorization', 'allow-authorization'):
        effect = 'revoke' if command.startswith('deny') else 'grant'
        changed = db.execute("update public.user_permission_overrides set effect=%s where permission_key='project.authorize' and user_id=(select id from auth.users where email=%s)", (effect, EMAIL))
        assert changed.rowcount == 1, 'Expected one synthetic permission override'
    elif command == 'verify-result':
        project = db.execute("select p.id,p.stage from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='QA rehearsal · v0.25'", (EMAIL,)).fetchall()
        assert len(project) == 1 and project[0][1] == 'project_authorization_setup', project
        assert db.execute('select count(*) from public.authorization_records where project_state_id=%s', (project[0][0],)).fetchone()[0] == 1
        assert db.execute("select count(*) from public.document_revisions r join public.document_records d on d.id=r.document_record_id where d.project_state_id=%s and r.state='published' and r.published_source_snapshot is not null", (project[0][0],)).fetchone()[0] == 7
    elif command == 'setup-gate-authority':
        owner, workspace = db.execute("select m.user_id,m.workspace_id from public.workspace_memberships m join auth.users u on u.id=m.user_id where u.email=%s", (EMAIL,)).fetchone()
        db.execute("insert into public.project_gate01_authorities(workspace_id,user_id,basis,owner_approval_reference,effective_from) values(%s,%s,'confirmed_owner','Synthetic isolated owner identity',now()-interval '1 minute')", (workspace,owner))
    elif command == 'verify-gate':
        project = db.execute("select p.id,p.stage from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='QA rehearsal · v0.25'", (EMAIL,)).fetchone()
        assert project[1] == 'preconstruction_mobilization', project
        assert db.execute("select count(*) from public.project_gate01_decisions where project_state_id=%s and disposition='go'", (project[0],)).fetchone()[0] == 1
        assert db.execute("select count(*) from public.authorization_records where project_state_id=%s", (project[0],)).fetchone()[0] == 1
    elif command == 'contract-setup':
        owner, workspace = db.execute("select m.user_id,m.workspace_id from public.workspace_memberships m join auth.users u on u.id=m.user_id where u.email=%s", (EMAIL,)).fetchone()
        project = str(uuid.uuid4())
        db.execute("insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values(%s,%s,'Contract preparation rehearsal','project_authorization_setup','project_authorization_setup','active','medium',%s,%s)", (project,workspace,owner,owner))
        db.execute("insert into public.authorization_records(project_state_id,outcome,actor_user_id) values(%s,'approved',%s)", (project,owner))
        db.execute("insert into public.organizations(workspace_id,name,created_by) values(%s,'Synthetic legal client',%s)", (workspace,owner))
        db.execute("insert into public.evidence_references(project_state_id,title,created_by) values(%s,'Synthetic contract evidence',%s)", (project,owner))
    elif command == 'contract-verify':
        project = db.execute("select p.id from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='Contract preparation rehearsal'", (EMAIL,)).fetchone()[0]
        rows = db.execute("select version,data,authorization_record_id from public.project_contract_versions where project_state_id=%s", (project,)).fetchall()
        assert len(rows)==1 and rows[0][0]==1 and rows[0][1]['feeBasis']=='Monthly management fee', rows
        assert db.execute("select count(*) from public.project_gate01_decisions where project_state_id=%s", (project,)).fetchone()[0]==0
    elif command == 'contract-review-verify':
        project = db.execute("select p.id from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='Contract preparation rehearsal'", (EMAIL,)).fetchone()[0]
        rows = db.execute("select c.version,c.data from public.project_contract_review_requests r join public.project_contract_versions c on c.id=r.contract_version_id where r.project_state_id=%s", (project,)).fetchall()
        assert len(rows)==1 and rows[0][0]==1 and rows[0][1]['feeBasis']=='Monthly management fee', rows
        assert db.execute("select max(version) from public.project_contract_versions where project_state_id=%s", (project,)).fetchone()[0]==2
        assert db.execute("select count(*) from public.project_gate01_decisions where project_state_id=%s", (project,)).fetchone()[0]==0
    elif command == 'contract-owner-setup':
        owner, workspace = db.execute("select m.user_id,m.workspace_id from public.workspace_memberships m join auth.users u on u.id=m.user_id where u.email=%s", (EMAIL,)).fetchone()
        db.execute("insert into public.workspace_business_owners(workspace_id,user_id,evidence_reference,effective_from) values(%s,%s,'Synthetic confirmed business owner',now()-interval '1 minute')", (workspace,owner))
    elif command == 'contract-owner-verify':
        project = db.execute("select p.id,p.stage from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='Contract preparation rehearsal'", (EMAIL,)).fetchone()
        rows = db.execute("select c.version,d.outcome,r.verification_snapshot from public.project_contract_review_decisions r join public.decisions d on d.id=r.decision_id join public.project_contract_versions c on c.id=r.contract_version_id where r.project_state_id=%s", (project[0],)).fetchall()
        assert len(rows)==1 and rows[0][0]==2 and rows[0][1]=='approved' and rows[0][2]['aal']=='aal2', rows
        assert project[1]=='project_authorization_setup'
        assert db.execute("select count(*) from public.project_gate01_decisions where project_state_id=%s", (project[0],)).fetchone()[0]==0
    elif command == 'scope-setup':
        owner, workspace = db.execute("select m.user_id,m.workspace_id from public.workspace_memberships m join auth.users u on u.id=m.user_id where u.email=%s", (EMAIL,)).fetchone()
        project, document = str(uuid.uuid4()), str(uuid.uuid4())
        db.execute("insert into public.project_states(id,workspace_id,name,stage,commercial_stage,status,priority,created_by,owner_user_id) values(%s,%s,'Scope basis rehearsal','project_authorization_setup','project_authorization_setup','active','medium',%s,%s)", (project,workspace,owner,owner))
        db.execute("insert into public.authorization_records(project_state_id,outcome,actor_user_id) values(%s,'approved',%s)", (project,owner))
        db.execute("insert into public.organizations(workspace_id,name,created_by) values(%s,'Synthetic flooring partner',%s)", (workspace,owner))
        db.execute("insert into public.document_records(id,project_state_id,package_key,category_key,document_type,title,owner_user_id) values(%s,%s,'predevelopment','product_program','predevelopment_product_program','Synthetic scope specification',%s)", (document,project,owner))
        db.execute("insert into public.document_revisions(document_record_id,revision_number,state,created_by,published_by,published_at,source_data,published_source_snapshot) values(%s,1,'published',%s,%s,now(),%s::jsonb,%s::jsonb)", (document,owner,owner,json.dumps({'programSummary':'Preserve the lobby access route'}),json.dumps({'programSummary':'Preserve the lobby access route'})))
    elif command == 'scope-verify':
        project = db.execute("select p.id,p.stage from public.project_states p join auth.users u on u.id=p.created_by where u.email=%s and p.name='Scope basis rehearsal'", (EMAIL,)).fetchone()
        versions = db.execute("select version,items,authorization_record_id from public.project_scope_versions where project_state_id=%s order by version", (project[0],)).fetchall()
        assert len(versions)==3 and len({v[1][0]['id'] for v in versions})==1 and len({v[2] for v in versions})==1
        requests = db.execute("select v.version from public.project_scope_review_requests r join public.project_scope_versions v on v.id=r.scope_version_id where r.project_state_id=%s", (project[0],)).fetchall()
        assert requests==[(2,)] and project[1]=='project_authorization_setup'
        assert db.execute("select count(*) from public.scope_items where project_state_id=%s", (project[0],)).fetchone()[0]==1
    elif command == 'setup':
        status = json.loads(Path('/tmp/ridgewood-local-status.json').read_text())
        assert status['API_URL'] == API, 'Refusing non-local API'
        headers = {'Authorization': 'Bearer '+status['SERVICE_ROLE_KEY'], 'apikey': status['SERVICE_ROLE_KEY'], 'Content-Type': 'application/json'}
        def user(email):
            request = Request(API+'/auth/v1/admin/users', data=json.dumps({'email':email,'password':PASSWORD,'email_confirm':True}).encode(), headers=headers)
            with urlopen(request, timeout=15) as response:
                return str(uuid.UUID(json.load(response)['id']))
        owner, outsider = user(EMAIL), user('outsider-demo@example.invalid')
        workspace = str(uuid.uuid4())
        db.execute('insert into public.workspaces(id,name,created_by) values(%s,%s,%s)', (workspace,'Synthetic browser acceptance',owner))
        db.execute("insert into public.workspace_memberships(workspace_id,user_id,technical_role,status) values(%s,%s,'owner','active')", (workspace,owner))
        db.execute("insert into public.user_permission_overrides(workspace_id,user_id,permission_key,effect,assigned_by) select %s,%s,permission_key,'grant',%s from public.app_permissions", (workspace,owner,owner))
        db.execute("insert into public.position_assignments(workspace_id,user_id,role_family,position_key,position_title,scope,status,effective_from,assigned_by) values(%s,%s,'executive','acceptance_exec','Synthetic executive','{\"type\":\"workspace\"}','active',now()-interval '1 minute',%s)", (workspace,owner,owner))
        # Only the public local key reaches Vite. No service credential is written.
        (root/'.env.acceptance.local').write_text('VITE_SUPABASE_PUBLISHABLE_KEY='+status['ANON_KEY']+'\nVITE_DEV_TELEMETRY_ENABLED=false\nVITE_DEV_FEEDBACK_ENABLED=false\n')
    else:
        raise SystemExit('Unknown local fixture operation')
print('Local acceptance fixture operation completed.')
