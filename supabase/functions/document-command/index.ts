import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type','Content-Type':'application/json'};
const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:cors});

Deno.serve(async (req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  if(req.method!=='POST') return respond(405,{error:'method_not_allowed'});
  const auth=req.headers.get('Authorization');
  if(!auth) return respond(401,{error:'authentication_required'});
  const url=Deno.env.get('SUPABASE_URL');
  const publishable=Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if(!url||!publishable) return respond(500,{error:'server_configuration_error'});
  const client=createClient(url,publishable,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await client.auth.getUser();
  if(userError||!user) return respond(401,{error:'authentication_required'});

  let body:any; try{body=await req.json();}catch{return respond(400,{error:'invalid_json'});}
  const command=body?.command;
  try{
    // Deliberately no service-role bypass here. The trusted function authenticates
    // the caller and delegates to private database commands once a server-side
    // database execution adapter is configured. Private functions remain
    // unreachable through PostgREST, preventing browser RPC bypass.
    if(!['createDraft','updateDraft','createRevisionFromPublished'].includes(command)) return respond(400,{error:'unsupported_command'});
    return respond(501,{error:'trusted_database_adapter_not_configured',command});
  }catch(error){
    console.error('document-command failure',{command,userId:user.id,error:error instanceof Error?error.message:String(error)});
    return respond(500,{error:'command_failed'});
  }
});
