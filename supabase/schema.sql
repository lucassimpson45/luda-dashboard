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
