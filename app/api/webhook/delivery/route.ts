/**
 * POST /api/webhook/delivery
 *
 * Courier fires this when a delivery attempt fails.
 *
 * Body:
 * {
 *   operator_id: string
 *   event: "failed" | "access_issue" | "out_for_delivery"
 *   delivery_id?: string
 *   merchant_name: string
 *   customer_name: string
 *   customer_phone: string    — E.164 e.g. +447911123456
 *   driver_phone?: string     — E.164 — if provided, driver gets hold notification
 *   address: string
 *   delivery_window?: string
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDelivery, updateDelivery, getDeliveryById } from "@/lib/supabase";
import { sendDeliveryMessage, sendTextMessage, DeliveryContext, FlowType } from "@/lib/whatsapp";

const schema = z.object({
  operator_id:    z.string().min(1),
  event:          z.enum(["failed", "access_issue", "out_for_delivery"]),
  delivery_id:    z.string().optional(),
  merchant_name:  z.string().min(1),
  customer_name:  z.string().min(1),
  customer_phone: z.string().regex(/^\+[1-9]\d{6,14}$/, "Must be E.164 e.g. +447911123456"),
  driver_phone:   z.string().regex(/^\+[1-9]\d{6,14}$/).optional(),
  address:        z.string().min(1),
  delivery_window: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (!auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  // ── Validate ───────────────────────────────────────────────────────────────
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid payload", details: String(err) }, { status: 400 });
  }

  console.log("[DELIVERY WEBHOOK]", body.event, body.customer_phone, body.address);

  const flowMap: Record<string, FlowType> = {
    failed:           "failed",
    access_issue:     "access",
    out_for_delivery: "pre_delivery",
  };
  const flow = flowMap[body.event];

  const ctx: DeliveryContext = {
    customerName:    body.customer_name.split(" ")[0],
    customerPhone:   body.customer_phone,
    merchantName:    body.merchant_name,
    address:         body.address,
    deliveryId:      body.delivery_id || "",
    estimatedWindow: body.delivery_window,
  };

  // ── Upsert delivery ────────────────────────────────────────────────────────
  let deliveryId = body.delivery_id;

  if (deliveryId) {
    const existing = await getDeliveryById(deliveryId);
    if (!existing) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }
    await updateDelivery(deliveryId, { status: "attempted", flow_type: flow });
  } else {
    const delivery = await createDelivery({
      operator_id:    body.operator_id,
      merchant_name:  body.merchant_name,
      customer_name:  body.customer_name,
      customer_phone: body.customer_phone,
      driver_phone:   body.driver_phone,
      address:        body.address,
      delivery_window: body.delivery_window,
      status:         "attempted",
      flow_type:      flow,
    });
    deliveryId = delivery.id;
    ctx.deliveryId = deliveryId;
  }

  // ── Send customer WhatsApp ─────────────────────────────────────────────────
  const result = await sendDeliveryMessage(flow, ctx);

  if (result.success) {
    await updateDelivery(deliveryId!, {
      status:            "recovery_sent",
      wa_message_id:     result.messageId,
      recovery_sent_at:  new Date().toISOString(),
    });
  } else {
    console.error("[DELIVERY WEBHOOK] WhatsApp send failed:", result.error);
  }

  // ── Send driver hold notification ──────────────────────────────────────────
  if (body.driver_phone && body.event === "failed" && result.success) {
    const driverMsg =
      `⏳ Relink: Customer notified about missed delivery at ${body.address}.\n\n` +
      `Please wait *2 minutes* — if they respond you'll get an instant update.\n\n` +
      `Delivery ID: ${deliveryId}`;

    await sendTextMessage(body.driver_phone, driverMsg);
    console.log(`[DELIVERY WEBHOOK] Driver hold sent to ${body.driver_phone}`);

    // Schedule "continue route" message after 2 mins if not resolved
    // We use a separate API route triggered by a timeout check
    // For now we log — the /api/driver-timeout route handles this
    setTimeout(async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/driver/timeout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            delivery_id: deliveryId,
            driver_phone: body.driver_phone,
          }),
        });
      } catch (e) {
        console.error("[TIMEOUT TRIGGER] Failed:", e);
      }
    }, 2 * 60 * 1000); // 2 minutes
  }

  console.log(`[DELIVERY WEBHOOK] Done. Delivery: ${deliveryId} WA: ${result.messageId}`);

  return NextResponse.json({
    ok:             true,
    delivery_id:    deliveryId,
    wa_sent:        result.success,
    wa_message_id:  result.messageId,
    driver_notified: !!(body.driver_phone && result.success),
  });
}
