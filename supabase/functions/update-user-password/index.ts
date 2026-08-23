import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateUserPasswordRequest {
  userId?: string;
  password?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Supabase function environment is not configured.' }, 500);
    }

    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      return json({ error: 'Missing authorization.' }, 401);
    }

    const body = await req.json() as UpdateUserPasswordRequest;
    const userId = body.userId?.trim();
    const password = body.password?.trim();

    if (!userId || !password || password.length < 6) {
      return json({ error: 'Missing or invalid password details.' }, 400);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: callerData, error: callerError } = await userClient.auth.getUser();
    const caller = callerData.user;

    if (callerError || !caller) {
      return json({ error: 'Invalid authorization.' }, 401);
    }

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('global_role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfile?.global_role !== 'root_admin') {
      return json({ error: 'Only root admins can update another user password.' }, 403);
    }

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!targetProfile) {
      return json({ error: 'User was not found.' }, 404);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      return json({ error: updateError.message }, 400);
    }

    return json({ ok: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
