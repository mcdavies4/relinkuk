import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { name, email, company, fleet } = await req.json();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const entry = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      company: company?.trim() || null,
      fleet: fleet?.trim() || null,
    };

    // Save to Supabase
    const { error } = await supabase.from("signups").insert(entry);

    if (error) {
      // If Supabase isn't connected yet, still log and return success
      console.error("[SIGNUP] Supabase error:", error.message);
    }

    console.log("[RELINK SIGNUP]", JSON.stringify({ ...entry, createdAt: new Date().toISOString() }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[SIGNUP ERROR]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
