/**
 * GET /api/delivery?operator_id=xxx&limit=100
 * Returns live deliveries from Supabase for the dashboard
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const operatorId = searchParams.get("operator_id");
  const limit = parseInt(searchParams.get("limit") || "100");

  let query = supabase
    .from("deliveries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (operatorId && operatorId !== "all") {
    query = query.eq("operator_id", operatorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[DELIVERY API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deliveries: data || [] });
}
