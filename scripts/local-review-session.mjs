// Genuine TOTP ceremony for the disposable synthetic account only.
// Session output is consumed in memory by acceptance tests, never logged/artifacted.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHmac, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const status=JSON.parse(readFileSync('/tmp/ridgewood-local-status.json','utf8'));
if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Refusing non-local authentication');
const client=createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function checked(result){if(result.error)throw new Error(`Synthetic authentication ceremony failed (${result.error.code??'unknown'}; ${result.error.status??'unknown'})`);return result.data;}
const signedIn=checked(await client.auth.signInWithPassword({email:'edward-demo@example.invalid',password:'Synthetic-local-only-2026!'}));
// Reuse the test authenticator, not an expired assurance claim. This file is local
// to the disposable runner, mode 0600, outside every artifact/upload path.
const factorPath='/tmp/ridgewood-synthetic-factor.json';
let factor;
if(existsSync(factorPath)){
 const saved=JSON.parse(readFileSync(factorPath,'utf8'));
 if(saved.api!==status.API_URL||saved.userId!==signedIn.user.id)throw new Error('Synthetic authenticator belongs to another fixture');
 factor=saved.factor;
}else{
 factor=checked(await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Disposable review authenticator'}));
 writeFileSync(factorPath,JSON.stringify({api:status.API_URL,userId:signedIn.user.id,factor}),{mode:0o600,flag:'wx'});
}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bits=[...factor.totp.secret.toUpperCase().replace(/=+$/,'')].map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join('');
const secret=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2)));
const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
const hash=createHmac('sha1',secret).update(counter).digest(),offset=hash[19]&15;
const code=String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
checked(await client.auth.mfa.challengeAndVerify({factorId:factor.id,code}));
const {session}=checked(await client.auth.getSession());
if(!session)throw new Error('Synthetic strong session missing');
if(process.argv[2]==='scope-contract'){
 const project=checked(await client.from('project_states').select('id').eq('name','Scope basis rehearsal').single()).id;
 const party=checked(await client.from('organizations').select('id').eq('name','Synthetic scope client').single()).id;
 const evidence=checked(await client.from('evidence_references').select('id').eq('project_state_id',project).eq('title','Synthetic scope contract').single()).id;
 const authority=checked(await client.from('workspace_business_owners').select('id').eq('user_id',session.user.id).is('revoked_at',null).limit(1).single()).id;
 checked(await client.rpc('save_project_contract',{project_state_input:project,expected_version_input:0,request_id_input:randomUUID(),data_input:{partyIds:[party],agreementRevisionId:'',agreementEvidenceId:evidence,compensationModel:'fee',contractValue:'',currency:'',feeBasis:'Monthly coordination fee',paymentTerms:'Monthly invoice',reviewDecisionId:'',riskAssessment:'none_identified',riskIds:[],effectiveFrom:'',effectiveUntil:''}}));
 checked(await client.rpc('request_project_contract_review',{project_state_input:project,version_input:1,request_id_input:randomUUID()}));
 checked(await client.rpc('decide_project_contract_review',{project_state_input:project,version_input:1,sequence_input:0,request_id_input:randomUUID(),authority_id_input:authority,outcome_input:'approved',rationale_input:'Synthetic current scope contract basis',confirmations_input:{agreementAuthorized:true,commercialTermsReviewed:true,effectivenessReviewed:true,noMaterialBlockers:true}}));
}
process.stdout.write(JSON.stringify(session));
