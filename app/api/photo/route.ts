/**
 * POST /api/photo
 *
 * Driver uploads a safe place photo.
 * Stores in Supabase Storage, sends to customer via WhatsApp image message.
 *
 * Body: multipart/form-data
 *   delivery_id: string
 *   photo: File (jpg/png, max 5MB)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendImageMessage } from "@/lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const deliveryId = formData.get("delivery_id") as string;
    const photo = formData.get("photo") as File;

    if (!deliveryId || !photo) {
      return NextResponse.json({ error: "delivery_id and photo required" }, { status: 400 });
    }

    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Photo must be under 5MB" }, { status: 400 });
    }

    

    // Get delivery
    const { data: delivery, error: fetchError } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", deliveryId)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    // Upload to Supabase Storage
    const ext = photo.type === "image/png" ? "png" : "jpg";
    const path = `safe-place/${deliveryId}.${ext}`;
    const bytes = await photo.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("delivery-photos")
      .upload(path, bytes, {
        contentType: photo.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[PHOTO UPLOAD]", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("delivery-photos")
      .getPublicUrl(path);

    // Send to customer on WhatsApp
    const caption = `✅ Your ${delivery.merchant_name} parcel has been left in a safe place at ${delivery.address}.\n\nIf you have any issues reply here.`;

    await sendImageMessage(delivery.customer_phone, publicUrl, caption);

    // Update delivery record
    await supabase.from("deliveries").update({
      safe_place_photo_url: publicUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", deliveryId);

    console.log(`[PHOTO] Safe place photo sent for delivery ${deliveryId}`);

    return NextResponse.json({ ok: true, photo_url: publicUrl });

  } catch (err) {
    console.error("[PHOTO ERROR]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
