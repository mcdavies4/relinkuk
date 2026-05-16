/**
 * POST /api/integrations/circuit
 *
 * Receives webhooks from Circuit for Teams when a delivery is attempted/failed.
 * Operators register this URL in:
 *   Circuit Dashboard → Settings → API → Add Webhook
 *   Event: delivery.attempted or stop.failed
 *   URL: https://relinkuk.vercel.app/api/integrations/circuit?op=OPERATOR_ID
 *
 * Circuit sends events for:
 *   stop.completed   — delivered successfully (ignore)
 *   stop.failed      — delivery failed (handle)
 *   stop.attempted   — attempted but no answer (handle)
 *   route.started    — driver started route (use for pre-delivery)
 */

import { NextRequest, NextResponse } from "next/server";
import { createDelivery, updateDelivery } from "@/lib/supabase";
import { sendDeliveryMessage, sendTextMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  const operatorId = req.nextUrl.searchParams.get("op") || "circuit_default";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  console.log("[CIRCUIT] Incoming:", JSON.stringify(body).slice(0, 400));

  const eventType = (body.event || body.type || body.eventType) as string;

  // ── Determine flow type from Circuit event ────────────────────────────────
  let flowType: "failed" | "access" | "pre_delivery" | null = null;

  if (eventType?.includes("fail") || eventType?.includes("attempt")) {
    flowType = "failed";
  } else if (eventType?.includes("route.started") || eventType?.includes("route_started")) {
    flowType = "pre_delivery";
  } else {
    console.log("[CIRCUIT] Ignoring event:", eventType);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ── Parse Circuit stop/recipient payload ──────────────────────────────────
  // Circuit payload structure varies — handle both formats
  const bodyAny = body as any;
  const stop      = (bodyAny.stop || bodyAny.data?.stop || bodyAny.data) as any;
  const route     = (bodyAny.route || bodyAny.data?.route) as any;
  const recipient = stop?.recipient || stop?.contact || {};

  // Extract customer details
  const customerPhone = recipient.phone || recipient.phoneNumber || stop?.phone;
  const customerName  = recipient.name || stop?.name || "Customer";

  if (!customerPhone) {
    console.error("[CIRCUIT] No customer phone in payload");
    return NextResponse.json({ error: "No customer phone" }, { status: 422 });
  }

  // Extract address
  const addr = stop?.address || stop?.location;
  let address = "Unknown address";
  if (typeof addr === "string") {
    address = addr;
  } else if (addr) {
    address = [addr.addressLineOne || addr.line1, addr.city, addr.postcode || addr.zip]
      .filter(Boolean).join(", ");
  }

  // Extract merchant/order info
  const merchantName = stop?.orderInfo?.name
    || stop?.notes?.split(":")?.[0]
    || route?.name
    || "Your order";

  // Extract delivery window if pre-delivery
  const deliveryWindow = stop?.scheduledAt
    ? new Date(stop.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : undefined;

  // Format phone to E.164
  function toE164(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("44")) return `+${digits}`;
    if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
    if (digits.length === 10 && digits.startsWith("7")) return `+44${digits}`;
    return `+${digits}`;
  }

  const formattedPhone = toE164(customerPhone);

  console.log(`[CIRCUIT] ${eventType} → ${formattedPhone} at ${address}`);

  // ── Create delivery and fire WhatsApp ─────────────────────────────────────
  try {
    const delivery = await createDelivery({
      operator_id:     operatorId,
      merchant_name:   merchantName,
      customer_name:   customerName,
      customer_phone:  formattedPhone,
      address,
      delivery_window: deliveryWindow,
      status:          "attempted",
      flow_type:       flowType,
    });

    const result = await sendDeliveryMessage(flowType, {
      customerName:    customerName.split(" ")[0],
      customerPhone:   formattedPhone,
      merchantName,
      address,
      deliveryId:      delivery.id,
      estimatedWindow: deliveryWindow,
    });

    if (result.success) {
      await updateDelivery(delivery.id, {
        status:           "recovery_sent",
        wa_message_id:    result.messageId,
        recovery_sent_at: new Date().toISOString(),
      });
    }

    console.log(`[CIRCUIT] Recovery sent for delivery ${delivery.id}`);
    return NextResponse.json({ ok: true, delivery_id: delivery.id, wa_sent: result.success });

  } catch (err) {
    console.error("[CIRCUIT] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
