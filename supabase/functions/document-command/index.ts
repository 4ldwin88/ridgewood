import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json',
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const commands = new Set(['createDraft', 'updateDraft', 'createRevisionFromPublished']);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return respond(405, { error: 'method_not_allowed' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond(401, { error: 'authentication_required' });

  const url = Deno.env.get('SUPABASE_URL');
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !publishable) return respond(500, { error: 'server_configuration_error' });

  // Preserve the caller's JWT. This client remains subject to the authenticated
  // user's database role, grants, RLS policies and SECURITY INVOKER semantics.
  const client = createClient(url, publishable, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return respond(401, { error: 'authentication_required' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return respond(400, { error: 'invalid_json' });
  }

  const command = typeof body.command === 'string' ? body.command : '';
  if (!commands.has(command)) return respond(400, { error: 'unsupported_command' });

  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};

  try {
    const { data, error } = await client.rpc('execute_document_command', {
      command_name: command,
      command_payload: payload,
    });

    if (error) {
      console.warn('document-command rejected', {
        command,
        userId: user.id,
        code: error.code,
        message: error.message,
      });

      const message = error.message ?? '';
      if (message.includes('permission') || message.includes('workspace') || message.includes('not authorized')) {
        return respond(403, { error: 'command_not_authorized' });
      }
      if (message.includes('not found') || message.includes('invalid') || message.includes('draft')) {
        return respond(409, { error: 'command_rejected' });
      }
      return respond(400, { error: 'command_rejected' });
    }

    return respond(200, { ok: true, command, result: data });
  } catch (error) {
    console.error('document-command failure', {
      command,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return respond(500, { error: 'command_failed' });
  }
});
