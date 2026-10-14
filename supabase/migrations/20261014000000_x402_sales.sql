-- Build artifact only. Apply after operator review. Persistent sales log for bookkeeping (GBP at receipt).
create table if not exists public.x402_sales (
  id bigint generated always as identity primary key,
  ts timestamptz not null,
  tool_id text not null,
  amount_atomic numeric(20,0) not null,
  amount_usd numeric(20,6) not null,
  currency text not null default 'USDC',
  network text not null,
  mode text not null,
  payer_address text,
  tx_hash text,
  invocation_id text not null unique,
  usd_gbp_rate numeric(12,6),
  amount_gbp numeric(20,6),
  fx_source text not null,
  fx_date date
);
create index if not exists x402_sales_ts_idx on public.x402_sales (ts desc);
alter table public.x402_sales enable row level security;
revoke all on public.x402_sales from anon, authenticated;
grant select, insert on public.x402_sales to service_role;
grant usage, select on sequence public.x402_sales_id_seq to service_role;
