import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-user-authorization, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    const userAuthHeader = req.headers.get("x-user-authorization") || authHeader;

    if (!userAuthHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: userAuthHeader } } }
    );

    const token = userAuthHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;

    // Use service role client for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Only admins can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { email, full_name, phone, gender, date_of_birth, role } = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine redirect URL from request origin
    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    const redirectTo = `${origin}/dashboard/profile?setup=true`;

    // Invite user by email — this creates the user AND sends the invite email
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, signup_source: "admin_created" },
        redirectTo,
      }
    );

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = inviteData.user.id;

    // Update profile with additional fields
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name,
        phone: phone || null,
        gender: gender || null,
        date_of_birth: date_of_birth || null,
      })
      .eq("id", newUserId);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Assign role — allow admin, owner, or user
    const assignRole = role && ["admin", "owner", "user"].includes(role) ? role : "user";
    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: newUserId, role: assignRole },
        { onConflict: "user_id, role" }
      );

    if (roleError) {
      console.error("Role assignment error:", roleError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        message: "User created and invitation sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
