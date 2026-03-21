import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Use service role to create org + profile after Supabase auth signup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const { userId, email, fullName, companyName } = await req.json();

  if (!userId || !email || !companyName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Create organisation
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    + "-" + Date.now().toString(36);

  const { data: org, error: orgError } = await supabaseAdmin
    .from("organisations")
    .insert({
      name: companyName,
      slug,
      country_code: "EU",
    })
    .select("id")
    .single();

  if (orgError) {
    return NextResponse.json({ error: orgError.message }, { status: 500 });
  }

  // Create profile linked to user + org
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      organisation_id: org.id,
      email,
      full_name: fullName ?? "",
      role: "owner",
    });

  if (profileError) {
    // Clean up the org if profile creation fails
    await supabaseAdmin.from("organisations").delete().eq("id", org.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ organisationId: org.id });
}
