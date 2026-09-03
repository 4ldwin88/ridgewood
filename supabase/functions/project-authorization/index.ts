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

  // AAL2 proves strong authentication, but the database command also requires
  // a fresh, command-bound, replay-protected authorization ceremony. Remain
  // fail-closed until that challenge is implemented.
  console.warn('project-authorization fresh challenge unavailable', { projectStateId, userId: user.id });
  return respond(409, {
    error: 'fresh_authorization_challenge_required',
    message: 'Strong authentication is present, but a fresh command-bound authorization challenge is still required.',
    authorityBasisAccepted: Boolean(authorityBasis),
  });
});
