/**
 * GET  /api/webhook/whatsapp — Meta verification handshake
 * POST /api/webhook/whatsapp — incoming customer messages and button replies
 *
 * Conversation states:
 *   normal          → customer taps a button → resolve immediately
 *   awaiting_door_code   → customer tapped "door_code" → waiting for them to TYPE the code
 *   awaiting_concierge   → customer tapped "concierge" → waiting for concierge instructions
 *   awaiting_safe_place  → customer tapped "safe_place" → waiting for location description
 */

import { NextRequest, NextResponse } from "next/server";
import { parseIncomingWebhook, sendTextMessage } from "@/lib/whatsapp";
import { supabase, getDeliveryByPhone, updateDelivery } from "@/lib/supabase";
import { BUTTON_TO_RESOLUTION, getConfirmationMessage } from "@/lib/resolutions";

// ── GET: Meta webhook verification ───────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("[WA WEBHOOK] Verified by Meta");
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Incoming message from customer ─────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  console.log("[WA WEBHOOK] Incoming:", JSON.stringify(body).slice(0, 300));

  const reply = parseIncomingWebhook(body);
  if (!reply) return NextResponse.json({ ok: true });

  console.log(`[WA WEBHOOK] From ${reply.phone}: buttonId="${reply.buttonId}" text="${reply.buttonTitle}"`);

  // ── Find active delivery for this phone ───────────────────────────────────
  // Also check for deliveries awaiting input (pending_input is set)
  const { data: deliveryWithPending } = await supabase
    .from("deliveries")
    .select("*")
    .eq("customer_phone", reply.phone)
    .not("pending_input", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // ── CASE 1: Customer is in a pending input state ──────────────────────────
  if (deliveryWithPending?.pending_input) {
    const delivery = deliveryWithPending;
    const inputType = delivery.pending_input;
    const customerInput = reply.buttonTitle.trim(); // free text they typed

    console.log(`[WA WEBHOOK] Pending input "${inputType}" received: "${customerInput}"`);

    if (inputType === "awaiting_door_code") {
      // Forward door code to driver
      if (delivery.driver_phone) {
        await sendTextMessage(
          delivery.driver_phone,
          `🔑 *Access code received*\n\nAddress: ${delivery.address}\nCode/Instructions: *${customerInput}*\n\nProceed to delivery now.`
        );
        console.log(`[WA WEBHOOK] Door code "${customerInput}" forwarded to driver ${delivery.driver_phone}`);
      }

      // Confirm to customer
      await sendTextMessage(
        reply.phone,
        `✅ Got it — your access code has been sent directly to your driver.\n\nThey're on their way to ${delivery.address} now.`
      );

      // Update delivery
      await updateDelivery(delivery.id, {
        status:        "resolved",
        resolution:    "door_code",
        resolution_note: customerInput,
        pending_input:  null,
        resolved_at:   new Date().toISOString(),
      });

    } else if (inputType === "awaiting_concierge") {
      // Forward concierge instructions to driver
      if (delivery.driver_phone) {
        await sendTextMessage(
          delivery.driver_phone,
          `👤 *Concierge instructions*\n\nAddress: ${delivery.address}\nInstructions: *${customerInput}*`
        );
      }

      await sendTextMessage(
        reply.phone,
        `✅ Passed on to your driver. They'll follow your instructions at ${delivery.address}.`
      );

      await updateDelivery(delivery.id, {
        status:        "resolved",
        resolution:    "concierge",
        resolution_note: customerInput,
        pending_input:  null,
        resolved_at:   new Date().toISOString(),
      });

    } else if (inputType === "awaiting_safe_place") {
      // Driver told where to leave it
      if (delivery.driver_phone) {
        await sendTextMessage(
          delivery.driver_phone,
          `🏠 *Safe place instructions*\n\nAddress: ${delivery.address}\nLeave it: *${customerInput}*\n\nCustomer has been notified.`
        );
      }

      await sendTextMessage(
        reply.phone,
        `✅ Got it. Your driver will leave your ${delivery.merchant_name} parcel: *${customerInput}*\n\nYou'll get a photo confirmation once delivered.`
      );

      await updateDelivery(delivery.id, {
        status:        "resolved",
        resolution:    "safe_place",
        resolution_note: customerInput,
        pending_input:  null,
        resolved_at:   new Date().toISOString(),
      });
    }

    return NextResponse.json({ ok: true });
  }

  // ── CASE 2: Normal button tap ─────────────────────────────────────────────
  const delivery = await getDeliveryByPhone(reply.phone);
  if (!delivery) {
    await sendTextMessage(
      reply.phone,
      "Hi! We couldn't find an active delivery for your number. Please contact your courier directly if you need help."
    );
    return NextResponse.json({ ok: true });
  }

  const resolution = BUTTON_TO_RESOLUTION[reply.buttonId];
  if (!resolution) return NextResponse.json({ ok: true });

  // ── Buttons that need a follow-up question ────────────────────────────────

  if (resolution === "door_code") {
    // Don't resolve yet — ask for the actual code
    await updateDelivery(delivery.id, {
      pending_input: "awaiting_door_code",
    });

    await sendTextMessage(
      reply.phone,
      `🔑 Please type your door code or access instructions and we'll send it straight to your driver.\n\nExamples:\n• "1234#"\n• "Press 42 on intercom"\n• "Gate code is 9876, then ring flat 3"`
    );

    console.log(`[WA WEBHOOK] Awaiting door code from ${reply.phone}`);
    return NextResponse.json({ ok: true });
  }

  if (resolution === "concierge") {
    // Ask for concierge details
    await updateDelivery(delivery.id, {
      pending_input: "awaiting_concierge",
    });

    await sendTextMessage(
      reply.phone,
      `👤 Any specific instructions for the concierge desk?\n\nExamples:\n• "Ask for John at reception"\n• "Concierge is on ground floor, ring bell"\n• "Leave with security, mention flat 12"`
    );

    console.log(`[WA WEBHOOK] Awaiting concierge instructions from ${reply.phone}`);
    return NextResponse.json({ ok: true });
  }

  if (resolution === "safe_place") {
    // Ask where exactly
    await updateDelivery(delivery.id, {
      pending_input: "awaiting_safe_place",
    });

    await sendTextMessage(
      reply.phone,
      `🏠 Where should your driver leave the parcel?\n\nExamples:\n• "Front porch"\n• "Behind the bin"\n• "With neighbour in flat 4"\n• "Under the stairs"`
    );

    console.log(`[WA WEBHOOK] Awaiting safe place from ${reply.phone}`);
    return NextResponse.json({ ok: true });
  }

  // ── All other buttons — resolve immediately ───────────────────────────────

  await updateDelivery(delivery.id, {
    status:      "resolved",
    resolution,
    resolved_at: new Date().toISOString(),
  });

  const confirmText = getConfirmationMessage(resolution, delivery.merchant_name);
  await sendTextMessage(reply.phone, confirmText);

  // Notify driver
  if (delivery.driver_phone) {
    const responseTimeSecs = Math.round(
      (new Date(reply.timestamp).getTime() -
        new Date(delivery.recovery_sent_at || delivery.created_at).getTime()) / 1000
    );

    const driverMessages: Record<string, string> = {
      retry_today:  `✅ Customer wants retry today (4–6pm).\n\nAddress: ${delivery.address}`,
      pickup_point: `✅ Customer will collect from pickup point. No redelivery needed.\n\nAddress: ${delivery.address}`,
      call_me:      `📞 Customer wants you to call them now.\n\nAddress: ${delivery.address}`,
      im_home:      `✅ Customer is home. Proceed to ${delivery.address}.`,
      delay:        `⏰ Customer asked for 1–2 hour delay. Return later.\n\nAddress: ${delivery.address}`,
      neighbour:    `✅ Leave with a neighbour at ${delivery.address}.`,
      no_response:  `⚠️ No response. Continue your route.\n\nAddress: ${delivery.address}`,
    };

    const driverMsg = driverMessages[resolution] ||
      `✅ Customer responded. Resolution: ${resolution}\n\nAddress: ${delivery.address}`;

    await sendTextMessage(
      delivery.driver_phone,
      `${driverMsg}\n\n⚡ Response time: ${responseTimeSecs}s`
    );
  }

  console.log(`[WA WEBHOOK] Delivery ${delivery.id} resolved: "${resolution}" for ${reply.phone}`);
  return NextResponse.json({ ok: true });
}
