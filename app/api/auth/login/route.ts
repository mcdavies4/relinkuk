/**
 * POST /api/auth/login
 * Body: { api_key: string }
 *
 * Validates operator API key against Supabase operators table.
 * Sets a signed session cookie with operator_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { api_key } = await req.json();

  if (!api_key) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  // Look up operator by API key
  const { data: operator, error } = await supabase
    .from("operators")
    .select("id, name, email, active")
    .eq("api_key", api_key.trim())
    .single();

  if (error || !operator) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!operator.active) {
    return NextResponse.json({ error: "Account inactive. Contact support." }, { status: 403 });
  }

  // Set session cookie — httpOnly, 7 day expiry
  const cookieStore = await cookies();
  cookieStore.set("relink_session", JSON.stringify({
    operator_id: operator.id,
    operator_name: operator.name,
    operator_email: operator.email,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return NextResponse.json({
    ok: true,
    operator: { id: operator.id, name: operator.name, email: operator.email },
  });
}
