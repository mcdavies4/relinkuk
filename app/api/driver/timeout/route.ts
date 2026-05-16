/**
 * POST /api/driver/timeout
 *
 * Called automatically 2 minutes after a failed delivery.
 * Checks if customer resolved — if not, tells driver to continue route.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDeliveryById } from "@/lib/supabase";
import { sendTextMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const { delivery_id, driver_phone } = await req.json();

  if (!delivery_id || !driver_phone) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const delivery = await getDeliveryById(delivery_id);
  if (!delivery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // If already resolved — driver already got notified via whatsapp webhook
  if (delivery.status === "resolved") {
    console.log(`[DRIVER TIMEOUT] Delivery ${delivery_id} already resolved — no timeout needed`);
    return NextResponse.json({ ok: true, action: "already_resolved" });
  }

  // Not resolved — tell driver to continue
  await sendTextMessage(
    driver_phone,
    `📍 Relink: No response from customer at ${delivery.address}.\n\nContinue your route. We'll keep trying to reach them for redelivery.`
  );

  console.log(`[DRIVER TIMEOUT] No response — driver ${driver_phone} told to continue`);

  return NextResponse.json({ ok: true, action: "continue_sent" });
}
