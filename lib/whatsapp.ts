/**
 * Relink — WhatsApp Business API client
 * Provider: Meta Cloud API (free, direct from Meta)
 *
 * Setup guide: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
 *
 * Env vars needed:
 *   WHATSAPP_TOKEN          — your permanent system user access token
 *   WHATSAPP_PHONE_ID       — your WhatsApp phone number ID (from Meta dashboard)
 *   WEBHOOK_VERIFY_TOKEN    — any string you choose, registered in Meta dashboard
 *   WABA_SANDBOX=true       — set to false when ready to send real messages
 */

const GRAPH_URL = "https://graph.facebook.com/v19.0";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  };
}

function phoneId() {
  return process.env.WHATSAPP_PHONE_ID || "";
}

// ── Types ──────────────────────────────────────────────────────────────────

export type FlowType = "failed" | "access" | "pre_delivery";

export interface DeliveryContext {
  customerName: string;
  customerPhone: string; // E.164 e.g. +447911123456
  merchantName: string;
  address: string;
  deliveryId: string;
  attemptTime?: string;
  estimatedWindow?: string;
}

// ── Send interactive button message ───────────────────────────────────────

export async function sendDeliveryMessage(
  flow: FlowType,
  ctx: DeliveryContext
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const payload = buildPayload(flow, ctx);

    if (process.env.WABA_SANDBOX === "true") {
      console.log("[WA SANDBOX] Would send to", ctx.customerPhone);
      console.log(JSON.stringify(payload, null, 2));
      return { success: true, messageId: `sandbox_${Date.now()}` };
    }

    const res = await fetch(`${GRAPH_URL}/${phoneId()}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[WA ERROR]", JSON.stringify(data));
      return {
        success: false,
        error: data.error?.message || "Send failed",
      };
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (err) {
    console.error("[WA EXCEPTION]", err);
    return { success: false, error: String(err) };
  }
}

// ── Send plain text (within 24hr session window) ──────────────────────────

export async function sendTextMessage(
  phone: string,
  text: string
): Promise<{ success: boolean }> {
  try {
    if (process.env.WABA_SANDBOX === "true") {
      console.log(`[WA SANDBOX] Text → ${phone}: ${text}`);
      return { success: true };
    }

    const res = await fetch(`${GRAPH_URL}/${phoneId()}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "text",
        text: { body: text },
      }),
    });

    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Build message payload per flow ────────────────────────────────────────

function buildPayload(flow: FlowType, ctx: DeliveryContext) {
  const to = ctx.customerPhone.replace("+", "");

  if (flow === "failed") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `Hi ${ctx.customerName} 👋\n\nWe tried to deliver your *${ctx.merchantName}* order at ${ctx.address} but couldn't reach you.\n\nHow would you like to proceed?`,
        },
        action: {
          buttons: [
            btn("retry_today", "Retry today"),
            btn("safe_place", "Leave in safe place"),
            btn("pickup_point", "Nearest pickup point"),
          ],
        },
      },
    };
  }

  if (flow === "access") {
    return {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: `Hi ${ctx.customerName} ⚠️\n\nYour driver is outside *${ctx.address}* right now but can't access the building.\n\nCan you help them in?`,
        },
        action: {
          buttons: [
            btn("door_code", "Share door code"),
            btn("concierge", "Concierge on duty"),
            btn("call_me",   "Call me now"),
          ],
        },
      },
    };
  }

  // pre_delivery
  return {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: {
        text: `Hi ${ctx.customerName} 📦\n\nYour *${ctx.merchantName}* order arrives in about 30 minutes (${ctx.estimatedWindow || "shortly"}).\n\nAre you home?`,
      },
      action: {
        buttons: [
          btn("im_home",   "Yes, I'll be home"),
          btn("delay",     "Delay by 1–2 hours"),
          btn("neighbour", "Leave with neighbour"),
        ],
      },
    },
  };
}

function btn(id: string, title: string) {
  return { type: "reply", reply: { id, title } };
}

// ── Parse incoming webhook from Meta ──────────────────────────────────────

export interface IncomingReply {
  phone: string;
  buttonId: string;
  buttonTitle: string;
  waMessageId: string;
  timestamp: string;
}

export function parseIncomingWebhook(
  body: Record<string, unknown>
): IncomingReply | null {
  try {
    // Meta structure: body.entry[0].changes[0].value.messages[0]
    const value = (body as any)
      ?.entry?.[0]
      ?.changes?.[0]
      ?.value;

    const msg = value?.messages?.[0];
    if (!msg) return null;

    // Button reply
    if (msg.type === "interactive") {
      const reply = msg.interactive?.button_reply;
      if (!reply) return null;
      return {
        phone:        `+${msg.from}`,
        buttonId:     reply.id,
        buttonTitle:  reply.title,
        waMessageId:  msg.id,
        timestamp:    new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      };
    }

    // Plain text fallback (customer typed instead of tapping)
    if (msg.type === "text") {
      return {
        phone:        `+${msg.from}`,
        buttonId:     "text_reply",
        buttonTitle:  msg.text?.body || "",
        waMessageId:  msg.id,
        timestamp:    new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      };
    }

    return null;
  } catch (err) {
    console.error("[WA PARSE ERROR]", err);
    return null;
  }
}

// ── Send image message (safe place photo proof) ───────────────────────────────

export async function sendImageMessage(
  phone: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean }> {
  try {
    if (process.env.WABA_SANDBOX === "true") {
      console.log(`[WA SANDBOX] Image → ${phone}: ${imageUrl} — ${caption}`);
      return { success: true };
    }

    const res = await fetch(`${GRAPH_URL}/${phoneId()}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "image",
        image: {
          link: imageUrl,
          caption,
        },
      }),
    });

    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ── Send follow-up message for unresolved deliveries ─────────────────────────

export async function sendFollowUpMessage(
  phone: string,
  merchantName: string,
  address: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    if (process.env.WABA_SANDBOX === "true") {
      console.log(`[WA SANDBOX] Follow-up → ${phone}`);
      return { success: true, messageId: `sandbox_followup_${Date.now()}` };
    }

    const res = await fetch(`${GRAPH_URL}/${phoneId()}/messages`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone.replace("+", ""),
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: `Hi 👋 Just checking in — we still have your *${merchantName}* parcel at ${address}.\n\nWe'll hold it for 24 hours. What would you like to do?`,
          },
          action: {
            buttons: [
              btn("retry_today",  "Redeliver tomorrow"),
              btn("pickup_point", "Collect from depot"),
              btn("safe_place",   "Leave in safe place"),
            ],
          },
        },
      }),
    });

    const data = await res.json();
    return { success: res.ok, messageId: data.messages?.[0]?.id };
  } catch {
    return { success: false };
  }
}
