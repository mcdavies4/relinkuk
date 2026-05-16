/**
 * POST /api/integrations/onfleet
 *
 * Receives webhooks from Onfleet when a task fails.
 * Operators register this URL in:
 *   Onfleet Dashboard → Settings → API & Webhooks → Add Webhook
 *   Trigger: taskFailed (trigger ID: 7)
 *   URL: https://relinkuk.vercel.app/api/integrations/onfleet?op=OPERATOR_ID
 *
 * GET /api/integrations/onfleet
 * Onfleet validation handshake — responds with the check param value.
 */

import { NextRequest, NextResponse } from "next/server";
import { createDelivery, updateDelivery } from "@/lib/supabase";
import { sendDeliveryMessage } from "@/lib/whatsapp";

// ── GET: Onfleet URL validation handshake ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const check = req.nextUrl.searchParams.get("check");
  if (check) {
    console.log("[ONFLEET] Validation handshake:", check);
    // Onfleet requires the check value returned as plain text
    return new NextResponse(check, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return NextResponse.json({ ok: true, integration: "onfleet" });
}

// ── POST: Incoming task event from Onfleet ───────────────────────────────────
export async function POST(req: NextRequest) {
  const operatorId = req.nextUrl.searchParams.get("op") || "onfleet_default";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  console.log("[ONFLEET] Incoming:", JSON.stringify(body).slice(0, 400));

  const triggerName = (body.triggerName as string) || "";

  // Only handle task failed events
  // Onfleet trigger 7 = taskFailed
  if (!triggerName.toLowerCase().includes("fail") && body.triggerId !== 7) {
    console.log("[ONFLEET] Ignoring trigger:", triggerName);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // ── Parse Onfleet task payload ────────────────────────────────────────────
  const task = (body.data as any)?.task || (body as any).data;

  if (!task) {
    console.error("[ONFLEET] No task data in payload");
    return NextResponse.json({ error: "No task data" }, { status: 400 });
  }

  // Extract recipient (customer) details
  const recipient = task.recipients?.[0];
  const customerPhone = recipient?.phone || recipient?.phoneNumber;
  const customerName  = recipient?.name || "Customer";

  if (!customerPhone) {
    console.error("[ONFLEET] No customer phone in task");
    return NextResponse.json({ error: "No customer phone" }, { status: 422 });
  }

  // Extract address
  const addr = task.destination?.address;
  const address = addr
    ? [addr.number, addr.street, addr.apartment, addr.city, addr.state, addr.postalCode]
        .filter(Boolean).join(", ")
    : task.destination?.addressString || "Unknown address";

  // Extract merchant/notes
  const merchantName = task.merchant?.name || task.notes?.split(":")[0] || "Your order";

  // Extract worker (driver) phone if available
  const driverPhone = task.worker?.phone || null;

  // Format phone to E.164
  function toE164(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("44")) return `+${digits}`;
    if (digits.startsWith("0")) return `+44${digits.slice(1)}`;
    if (digits.length === 10 && digits.startsWith("7")) return `+44${digits}`;
    return `+${digits}`;
  }

  const formattedPhone = toE164(customerPhone);
  const formattedDriverPhone = driverPhone ? toE164(driverPhone) : undefined;

  console.log(`[ONFLEET] Task failed → ${formattedPhone} at ${address}`);

  // ── Create delivery and fire WhatsApp ─────────────────────────────────────
  try {
    const delivery = await createDelivery({
      operator_id:    operatorId,
      merchant_name:  merchantName,
      customer_name:  customerName,
      customer_phone: formattedPhone,
      driver_phone:   formattedDriverPhone,
      address,
      status:         "attempted",
      flow_type:      "failed",
    });

    const result = await sendDeliveryMessage("failed", {
      customerName:   customerName.split(" ")[0],
      customerPhone:  formattedPhone,
      merchantName,
      address,
      deliveryId:     delivery.id,
    });

    if (result.success) {
      await updateDelivery(delivery.id, {
        status:           "recovery_sent",
        wa_message_id:    result.messageId,
        recovery_sent_at: new Date().toISOString(),
      });
    }

    // Notify driver they should wait
    if (formattedDriverPhone && result.success) {
      const { sendTextMessage } = await import("@/lib/whatsapp");
      await sendTextMessage(
        formattedDriverPhone,
        `⏳ Relink: Customer notified about missed delivery at ${address}.\n\nWait up to 2 minutes — you'll get an update if they respond.`
      );
    }

    console.log(`[ONFLEET] Recovery sent for delivery ${delivery.id}`);
    return NextResponse.json({ ok: true, delivery_id: delivery.id, wa_sent: result.success });

  } catch (err) {
    console.error("[ONFLEET] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
