import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy client — only initialised at runtime, not build time
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars.");
  _client = createClient(url, key);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) { return (getClient() as any)[prop]; },
});

// ── Types ──────────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | "pending" | "out_for_delivery" | "attempted"
  | "recovery_sent" | "resolved" | "unresolved" | "failed";

export type ResolutionType =
  | "retry_today" | "safe_place" | "pickup_point" | "door_code"
  | "concierge" | "call_me" | "im_home" | "delay" | "neighbour" | "no_response";

export interface Delivery {
  id: string;
  operator_id: string;
  merchant_name: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  delivery_window?: string;
  driver_phone?: string;
  status: DeliveryStatus;
  flow_type?: "failed" | "access" | "pre_delivery";
  wa_message_id?: string;
  resolution?: ResolutionType;
  resolution_note?: string;
  pending_input?: string | null; // e.g. "awaiting_door_code" | "awaiting_safe_place_text"
  recovery_sent_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export async function createDelivery(data: Omit<Delivery, "id" | "created_at" | "updated_at">) {
  const { data: row, error } = await supabase
    .from("deliveries").insert(data).select().single();
  if (error) throw error;
  return row as Delivery;
}

export async function updateDelivery(id: string, updates: Partial<Delivery>) {
  const { data, error } = await supabase
    .from("deliveries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) throw error;
  return data as Delivery;
}

export async function getDeliveryByPhone(phone: string): Promise<Delivery | null> {
  const { data } = await supabase
    .from("deliveries").select("*")
    .eq("customer_phone", phone)
    .in("status", ["recovery_sent", "out_for_delivery", "resolved"])
    .order("created_at", { ascending: false })
    .limit(1).single();
  return data as Delivery | null;
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  const { data } = await supabase
    .from("deliveries").select("*").eq("id", id).single();
  return data as Delivery | null;
}

export async function getOperatorDeliveries(operatorId: string, limit = 50): Promise<Delivery[]> {
  const { data } = await supabase
    .from("deliveries").select("*")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data || []) as Delivery[];
}
