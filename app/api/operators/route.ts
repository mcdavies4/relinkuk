/**
 * GET  /api/operators        — list all operators
 * POST /api/operators        — create a new operator
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("operators")
    .select("id, name, email, fleet_size, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ operators: data });
}

export async function POST(req: NextRequest) {
  const { name, email, fleet_size } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operators")
    .insert({ name, email, fleet_size })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    operator: data,
    driver_form_url: `${process.env.NEXT_PUBLIC_APP_URL}/driver?op=${data.id}`,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/delivery`,
    webhook_secret: process.env.WEBHOOK_SECRET,
  });
}
