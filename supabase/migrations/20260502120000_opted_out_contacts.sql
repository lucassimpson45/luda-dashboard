-- Opt-out suppression list (populated from Twilio STOP, checked on webhook trigger).
create table if not exists public.opted_out_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete cascade,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_opted_out_client_phone on public.opted_out_contacts (client_id, phone);
create index if not exists idx_opted_out_client_email on public.opted_out_contacts (client_id, email);
