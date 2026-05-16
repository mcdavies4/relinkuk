/**
 * GET /api/cron/followup
 *
 * Finds deliveries in "recovery_sent" state for 45+ minutes
 * and sends a follow-up WhatsApp message.
 *
 * Scheduled via vercel.json cron — runs every 15 minutes.
 * Can also be triggered manually:
 *   GET /api/cron/followup?secret=YOUR_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendFollowUpMessage } from "@/lib/whatsapp";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();

  const { data: deliveries, error } = await supabase
    .from("deliveries")
    .select("*")
    .eq("status", "recovery_sent")
    .lt("recovery_sent_at", cutoff)
    .is("follow_up_sent_at", null)
    .limit(50);

  if (error) {
    console.error("[FOLLOWUP CRON]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[FOLLOWUP CRON] ${deliveries?.length || 0} unresolved deliveries`);

  let sent = 0;
  for (const delivery of deliveries || []) {
    const result = await sendFollowUpMessage(
      delivery.customer_phone,
      delivery.merchant_name,
      delivery.address
    );
    if (result.success) {
      await supabase.from("deliveries").update({
        follow_up_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", delivery.id);
      sent++;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ ok: true, processed: deliveries?.length || 0, sent });
}
