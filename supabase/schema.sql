-- Run in Supabase SQL Editor. Tables match `QuoteLead` and `ReviewRequest` in `types/index.ts`.
-- The app uses the service role key server-side only; it bypasses RLS.

create table if not exists public.quotes (
  id uuid primary key,
  received_at timestamptz not null default now(),
  external_id text,
  lead_name text,
  company text,
  email text,
  phone text,
  status text,
  quote_value text,
  notes text,
  extra jsonb
);

create index if not exists quotes_received_at_idx on public.quotes (received_at desc);

create table if not exists public.reviews (
  id uuid primary key,
  received_at timestamptz not null default now(),
  review_id text,
  author text,
  rating double precision,
  platform text,
  body text,
  link text,
  sentiment text,
  extra jsonb
);

create index if not exists reviews_received_at_idx on public.reviews (received_at desc);

-- Client portals: each row is one business with its own Retell inbound agent and login password.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business_type text,
  retell_agent_id text not null,
  password text not null,
  logo_url text,
  active boolean not null default true,
  enabled_features text[] default null
);

create index if not exists clients_active_idx on public.clients (active);

-- Optional: IANA timezone for send windows / reporting (admin onboarding).
alter table public.clients add column if not exists timezone text;

-- Per-client Twilio / Resend / webhook (admin onboarding extends columns as needed).
create table if not exists public.clients_messaging_config (
  client_id uuid primary key references public.clients (id) on delete cascade,
  twilio_number text,
  notification_email text,
  resend_from_email text,
  resend_from_name text,
  jobber_webhook_secret text,
  google_review_url text,
  outbound_retell_agent_id text,
  agent_phone_number text
);

create table if not exists public.outbound_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.clients (id) on delete cascade,
  name text,
  type text not null,
  channel text,
  sequence jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  send_window_start text,
  send_window_end text,
  timezone text,
  follow_up_interval_hours double precision,
  max_attempts int
);

create index if not exists outbound_campaigns_client_idx on public.outbound_campaigns (client_id);
create index if not exists outbound_campaigns_type_idx on public.outbound_campaigns (client_id, type);

-- IANA timezone for campaign send windows (falls back to clients.timezone in cron).
alter table public.outbound_campaigns add column if not exists timezone text;
