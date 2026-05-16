import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false });
    return NextResponse.json({ ok: true, operator: session });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
