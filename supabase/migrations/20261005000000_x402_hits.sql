-- Build artifact only. Apply after operator review. Service role is the sole Data API caller.
create table if not exists public.x402_hits (
  id bigint generated always as identity primary key,
  ts timestamptz not null,
  path text not null,
  method text not null,
  surface text not null,
  tool_id text,
  user_agent text not null,
  referer text not null,
  ip_hash char(64) not null,
  had_payment_header boolean not null,
  outcome text not null check (outcome in ('402_issued','paid','verify_failed','settle_failed','cap_429','404','error')),
  amount_atomic numeric(20,0) not null default 0,
  payer_address text,
  tx_hash text,
  latency_ms integer not null check (latency_ms >= 0)
);
create index if not exists x402_hits_ts_idx on public.x402_hits (ts desc);
create index if not exists x402_hits_outcome_ts_idx on public.x402_hits (outcome, ts desc);
create index if not exists x402_hits_tool_ts_idx on public.x402_hits (tool_id, ts desc);
create index if not exists x402_hits_payer_ts_idx on public.x402_hits (payer_address, ts desc);
alter table public.x402_hits enable row level security;
revoke all on public.x402_hits from anon, authenticated;
grant select, insert on public.x402_hits to service_role;
grant usage, select on sequence public.x402_hits_id_seq to service_role;

-- Reservations are deliberately conservative: a crashed invocation may occupy a slot.
create table if not exists public.x402_week1_caps (
  day date not null,
  payer_address text not null,
  reserved integer not null default 0 check (reserved >= 0),
  primary key (day, payer_address)
);
alter table public.x402_week1_caps enable row level security;
revoke all on public.x402_week1_caps from anon, authenticated;
grant select, insert, update on public.x402_week1_caps to service_role;

create or replace function public.x402_week1_check(p_payer text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare g integer; p integer;
begin
  select reserved into g from public.x402_week1_caps where day = (now() at time zone 'utc')::date and payer_address = '*';
  if p_payer is not null then
    select reserved into p from public.x402_week1_caps where day = (now() at time zone 'utc')::date and payer_address = lower(p_payer);
  end if;
  return jsonb_build_object('allowed', coalesce(g,0) < 250 and (p_payer is null or coalesce(p,0) < 60));
end $$;

create or replace function public.x402_week1_claim(p_payer text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare d date := (now() at time zone 'utc')::date; g integer; p integer;
begin
  if p_payer !~* '^0x[0-9a-f]{40}$' then return '{"allowed":false}'::jsonb; end if;
  insert into public.x402_week1_caps(day,payer_address) values(d,'*') on conflict do nothing;
  select reserved into g from public.x402_week1_caps where day=d and payer_address='*' for update;
  if g >= 250 then return '{"allowed":false}'::jsonb; end if;
  insert into public.x402_week1_caps(day,payer_address) values(d,lower(p_payer)) on conflict do nothing;
  select reserved into p from public.x402_week1_caps where day=d and payer_address=lower(p_payer) for update;
  if p >= 60 then return '{"allowed":false}'::jsonb; end if;
  update public.x402_week1_caps set reserved=reserved+1 where day=d and payer_address in ('*',lower(p_payer));
  return jsonb_build_object('allowed', true, 'day', d::text);
end $$;

create or replace function public.x402_week1_release(p_payer text, p_day date)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_payer !~* '^0x[0-9a-f]{40}$' then return; end if;
  update public.x402_week1_caps set reserved=greatest(0,reserved-1) where day=p_day and payer_address in ('*',lower(p_payer));
end $$;
revoke all on function public.x402_week1_check(text), public.x402_week1_claim(text), public.x402_week1_release(text,date) from public, anon, authenticated;
grant execute on function public.x402_week1_check(text), public.x402_week1_claim(text), public.x402_week1_release(text,date) to service_role;
