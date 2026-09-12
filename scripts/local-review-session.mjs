// Genuine TOTP ceremony for the disposable synthetic account only.
// Session output is consumed in memory by acceptance tests, never logged/artifacted.
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const status=JSON.parse(readFileSync('/tmp/ridgewood-local-status.json','utf8'));
if(status.API_URL!=='http://127.0.0.1:54321')throw new Error('Refusing non-local authentication');
const client=createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function checked(result){if(result.error)throw new Error(`Synthetic authentication ceremony failed (${result.error.code??'unknown'}; ${result.error.status??'unknown'})`);return result.data;}
checked(await client.auth.signInWithPassword({email:'edward-demo@example.invalid',password:'Synthetic-local-only-2026!'}));
const factor=checked(await client.auth.mfa.enroll({factorType:'totp',friendlyName:'Disposable contract review test'}));
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bits=[...factor.totp.secret.toUpperCase().replace(/=+$/,'')].map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join('');
const secret=Buffer.from(bits.match(/.{8}/g).map(b=>parseInt(b,2)));
const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
const hash=createHmac('sha1',secret).update(counter).digest(),offset=hash[19]&15;
const code=String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
checked(await client.auth.mfa.challengeAndVerify({factorId:factor.id,code}));
const {session}=checked(await client.auth.getSession());
if(!session)throw new Error('Synthetic strong session missing');
process.stdout.write(JSON.stringify(session));
