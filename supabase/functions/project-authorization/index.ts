import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
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

  const { data: assurance, error: assuranceError } = await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (assuranceError) return respond(401, { error: 'assurance_check_failed' });
  if (assurance.currentLevel !== 'aal2') {
    return respond(409, {
      error: 'strong_verification_required',
      message: 'Project authorization requires an AAL2 session.',
      currentLevel: assurance.currentLevel,
      nextLevel: assurance.nextLevel,
    });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return respond(400, { error: 'invalid_json' }); }
  const projectStateId = typeof body.projectStateId === 'string' ? body.projectStateId : '';
  const authorityBasis = typeof body.authorityBasis === 'string' ? body.authorityBasis.trim() : '';
  if (!projectStateId) return respond(400, { error: 'project_state_required' });

  // Perform the strong-session check immediately before the governed command.
  // The database independently validates permission, scoped business authority,
  // readiness, freshness and replay protection. The one-use reference binds this
  // command attempt to the server-side verification ceremony without exposing
  // credential material to the client.
  const verifiedAt = new Date().toISOString();
  const verificationReference = `project-authorize:${user.id}:${projectStateId}:${crypto.randomUUID()}`;
  const verification = {
    verified: true,
    userVerified: true,
    verifiedAt,
    verificationReference,
    method: 'supabase_aal2_edge_command',
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
