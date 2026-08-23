import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OrganizationRole = 'admin' | 'user';

interface CreateOrganizationUserRequest {
  email?: string;
  name?: string;
  password?: string;
  organizationId?: string;
  role?: OrganizationRole;
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

    const body = await req.json() as CreateOrganizationUserRequest;
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password?.trim();
    const organizationId = body.organizationId?.trim();
    const role = body.role === 'admin' ? 'admin' : 'user';

    if (!email || !name || !password || password.length < 6 || !organizationId) {
      return json({ error: 'Missing or invalid user details.' }, 400);
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

    const isRootAdmin = callerProfile?.global_role === 'root_admin';

    const { data: callerMembership } = await adminClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', caller.id)
      .maybeSingle();

    const canManageOrganization = isRootAdmin || callerMembership?.role === 'admin';

    if (!canManageOrganization) {
      return json({ error: 'You cannot create users for this organization.' }, 403);
    }

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      return json({ error: 'A user with this email already exists.' }, 409);
    }

    const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (createError || !createdUser.user) {
      return json({ error: createError?.message ?? 'Unable to create auth user.' }, 400);
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: userId,
      email,
      name,
      global_role: 'user',
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: profileError.message }, 400);
    }

    const { error: membershipError } = await adminClient.from('organization_members').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
    });

    if (membershipError) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: membershipError.message }, 400);
    }

    return json({ userId }, 200);
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
