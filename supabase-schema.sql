-- ─────────────────────────────────────────────────────────────────────────────
-- Relink — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Operators (courier companies)
create table if not exists operators (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  email       text not null unique,
  api_key     text not null default encode(gen_random_bytes(32), 'hex'),
  fleet_size  int,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Deliveries
create table if not exists deliveries (
  id                  uuid default gen_random_uuid() primary key,
  operator_id         uuid references operators(id),
  merchant_name       text not null,
  customer_name       text not null,
  customer_phone      text not null,
  address             text not null,
  delivery_window     text,
  status              text not null default 'pending'
                        check (status in ('pending','out_for_delivery','attempted','recovery_sent','resolved','unresolved','failed')),
  flow_type           text check (flow_type in ('failed','access','pre_delivery')),
  wa_message_id       text,
  resolution          text check (resolution in ('retry_today','safe_place','pickup_point','door_code','concierge','call_me','im_home','delay','neighbour','no_response')),
  resolution_note     text,
  recovery_sent_at    timestamptz,
  resolved_at         timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Signups (from landing page)
create table if not exists signups (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  email       text not null,
  company     text,
  fleet       text,
  created_at  timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists deliveries_operator_id_idx on deliveries(operator_id);
create index if not exists deliveries_customer_phone_idx on deliveries(customer_phone);
create index if not exists deliveries_status_idx on deliveries(status);
create index if not exists deliveries_created_at_idx on deliveries(created_at desc);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger deliveries_updated_at
  before update on deliveries
  for each row execute function update_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- We use the service role key server-side, so RLS is open for now.
-- Lock this down when you add operator auth.

alter table deliveries enable row level security;
alter table operators enable row level security;
alter table signups enable row level security;

-- Service role bypasses RLS automatically (used in API routes).
-- If you add a user-facing dashboard with Supabase Auth, add policies here.

-- ── Migration: conversation state ─────────────────────────────────────────────
-- Run this if you already have the deliveries table set up

alter table deliveries add column if not exists pending_input text;
-- Values: null (normal) | 'awaiting_door_code' | 'awaiting_concierge' | 'awaiting_safe_place'
