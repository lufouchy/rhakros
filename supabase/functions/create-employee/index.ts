import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error('Missing backend environment configuration')
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // validate JWT manually (verify_jwt=false in config)
    // Prefer getClaims() when available; fallback to getUser() for compatibility.
    let requestingUserId: string | null = null

    const authAny = supabaseClient.auth as unknown as {
      getClaims?: () => Promise<{ data?: { claims?: { sub?: string } }, error?: { message?: string } | null }>
      getUser?: () => Promise<{ data: { user: { id: string } | null }, error: { message?: string } | null }>
    }

    if (typeof authAny.getClaims === 'function') {
      const { data: claimsData, error: claimsError } = await authAny.getClaims()
      requestingUserId = claimsData?.claims?.sub ?? null
      if (claimsError) {
        console.warn('getClaims error:', claimsError)
      }
    }

    if (!requestingUserId && typeof authAny.getUser === 'function') {
      const { data: userData, error: userError } = await authAny.getUser()
      requestingUserId = userData?.user?.id ?? null
      if (userError) {
        console.warn('getUser error:', userError)
      }
    }

    if (!requestingUserId) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .eq('role', 'admin')
      .maybeSingle()

    if (roleError || !roleData) {
      throw new Error('Only admins can create employees')
    }

    const body = await req.json()
    const { email, password, full_name, profileData } = body

    if (!email || !password || !full_name) {
      throw new Error('Email, password and full_name are required')
    }

    // Create user using admin API (doesn't affect current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      throw authError
    }

    const newUserId = authData.user.id

    // Create profile (explicit insert because we don't assume any auth trigger exists)
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUserId,
        email,
        full_name,
        ...profileData,
      })

    if (profileInsertError) {
      console.error('Profile insert error:', profileInsertError)
    }

    // Create user role as employee
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'employee',
      })

    if (roleInsertError) {
      console.error('Role insert error:', roleInsertError)
    }

    // Create hours balance
    const { error: balanceError } = await supabaseAdmin
      .from('hours_balance')
      .insert({
        user_id: newUserId,
        balance_minutes: 0,
      })

    if (balanceError) {
      console.error('Balance insert error:', balanceError)
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
