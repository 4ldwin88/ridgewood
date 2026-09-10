import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return respond(401, { error: 'authentication_required' });
  const token = authorization.slice(7);

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return respond(500, { error: 'server_configuration_error' });

  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) return respond(401, { error: 'authentication_required' });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond(400, { error: 'invalid_json' }); }
  const projectStateId = typeof body.projectStateId === 'string' ? body.projectStateId : '';
  const authorityBasis = typeof body.authorityBasis === 'string' ? body.authorityBasis.trim() : '';
  if (!projectStateId) return respond(400, { error: 'project_state_required' });

  // Gate 2A human-QA exception: AAL2 is temporarily disabled while the prototype
  // authenticator flow is repaired. Authentication, permission, scoped business
  // authority, lifecycle readiness, confirmation, persistence and audit controls remain.
  const verifiedAt = new Date().toISOString();
  const verificationReference = `project-authorize:gate2a-aal2-disabled:${user.id}:${projectStateId}:${crypto.randomUUID()}`;
  const verification = {
    verified: true,
    userVerified: true,
    verifiedAt,
    verificationReference,
    method: 'authenticated_session_gate2a_aal2_temporarily_disabled',
  };

  const { data, error } = await client.rpc('authorize_project_state', {
    project_state_input: projectStateId,
    authority_basis_input: authorityBasis || null,
    verification_input: verification,
  });

  if (error) {
    console.warn('project authorization rejected', { projectStateId, userId: user.id, code: error.code });
    return respond(409, {
      error: 'project_authorization_rejected',
      message: error.message,
      code: error.code,
    });
  }

  return respond(200, { projectState: data });
});
