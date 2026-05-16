/**
 * POST /api/upload
 *
 * Accepts a CSV manifest from an operator.
 * Parses rows and triggers pre-delivery WhatsApp messages.
 *
 * CSV format (with header row):
 *   customer_name, customer_phone, merchant_name, address, delivery_window
 *
 * Auth: session cookie (operator must be logged in)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createDelivery } from "@/lib/supabase";
import { sendDeliveryMessage } from "@/lib/whatsapp";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_").replace(/['"]/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^["']|["']$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
    rows.push(row);
  }

  return rows;
}

function formatPhone(raw: string): string {
  let v = raw.replace(/\D/g, "");
  if (v.startsWith("44")) return `+${v}`;
  if (v.startsWith("0"))  return `+44${v.slice(1)}`;
  if (v.length === 10)    return `+44${v}`;
  return `+${v}`;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("csv") as File;

  if (!file) {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);

  if (!rows.length) {
    return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
  }

  const results = { total: rows.length, sent: 0, failed: 0, errors: [] as string[] };

  for (const row of rows) {
    const phone = formatPhone(row.customer_phone || row.phone || "");
    const name  = row.customer_name || row.name || "Customer";
    const merchant = row.merchant_name || row.merchant || "Your retailer";
    const address  = row.address || row.delivery_address || "";
    const window_  = row.delivery_window || row.window || "";

    if (!phone || phone.length < 10) {
      results.failed++;
      results.errors.push(`Row ${results.sent + results.failed}: invalid phone "${row.customer_phone}"`);
      continue;
    }

    if (!address) {
      results.failed++;
      results.errors.push(`Row ${results.sent + results.failed}: missing address`);
      continue;
    }

    try {
      // Create delivery record
      const delivery = await createDelivery({
        operator_id:     session.operator_id,
        merchant_name:   merchant,
        customer_name:   name,
        customer_phone:  phone,
        address,
        delivery_window: window_,
        status:          "out_for_delivery",
        flow_type:       "pre_delivery",
      });

      // Send pre-delivery WhatsApp
      const waResult = await sendDeliveryMessage("pre_delivery", {
        customerName:    name.split(" ")[0],
        customerPhone:   phone,
        merchantName:    merchant,
        address,
        deliveryId:      delivery.id,
        estimatedWindow: window_,
      });

      if (waResult.success) {
        await import("@/lib/supabase").then(({ updateDelivery }) =>
          updateDelivery(delivery.id, {
            status:           "recovery_sent",
            wa_message_id:    waResult.messageId,
            recovery_sent_at: new Date().toISOString(),
          })
        );
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${phone}: WhatsApp send failed`);
      }

    } catch (err) {
      results.failed++;
      results.errors.push(`${phone}: ${String(err)}`);
    }

    // Rate limit — 1 message per 300ms
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[CSV UPLOAD] ${session.operator_id}: ${results.sent}/${results.total} sent`);

  return NextResponse.json({ ok: true, ...results });
}
