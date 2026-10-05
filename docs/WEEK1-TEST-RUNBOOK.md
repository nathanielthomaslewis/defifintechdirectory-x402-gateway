# X2 week-one x402 traffic test — operator runbook

Build-only handoff. Nothing in this repository deploys itself, applies the migration, submits a directory entry, or makes a payment. Review the deployment and CDP integration before turning on live traffic.

## Required Vercel production environment variable names

`TEST_MODE`, `STUB_MODE`, `PAY_TO`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HIT_LOG_SALT`, `OPERATOR_TOKEN`, `GATEWAY_BASE_URL`.

Set `TEST_MODE` to `week1` and `STUB_MODE` to `0`. Set `GATEWAY_BASE_URL` to the public HTTPS origin. `PAY_TO` must be a Base mainnet receiving address. The service uses Base mainnet (`NETWORK` defaults to `eip155:8453`) and official Base USDC (`USDC_ASSET` defaults to the configured Circle address); an override to another network or asset is rejected in production week-one mode. `FACILITATOR_PROVIDER` defaults to `cdp`, and `FACILITATOR_URL` defaults to the CDP x402 endpoint. Leave both defaults unless the CDP endpoint is deliberately reviewed; the production gate rejects other hosts. `VERCEL_ENV` is supplied by Vercel. `DISABLED_CAPABILITIES` is an optional comma-separated kill switch. `OPERATOR_READ_TOKEN` controls the older in-process analytics endpoint and is separate from `OPERATOR_TOKEN`.

Do not put these values in a repo `.env` file or send them through chat. `HIT_LOG_SALT` must be at least 32 characters and stay stable for the week so IP hashes remain comparable; raw IP is never inserted. `OPERATOR_TOKEN` must be at least 24 characters.

## Go-live sequence for the human operator

1. Review this diff, the generated discovery files, the SQL in `supabase/migrations/20261005000000_x402_hits.sql`, and the X2 results. Validate CDP's ES256 JWT and x402 verify/settle request contract against current CDP documentation in an authorized environment; it was not exercised here. Confirm the configured `PAY_TO` and Base USDC contract independently.
2. Apply the SQL migration in the intended Supabase project after review. Confirm PostgREST exposes `x402_hits` and the three `x402_week1_*` RPCs to the service role. RLS is enabled, with no anon/authenticated policy or table grant. Do not expose the service-role key to a browser.
3. Configure the required Vercel production environment variable names above. Confirm `/health` reports `testMode:true`, `listed:true`, `paymentsLive:true` after deployment. Confirm `/capabilities`, `/tools?format=json`, `/.well-known/x402`, `/llms.txt`, and MCP tools/list show exactly `game_launch_kit`, `store_art_prompt_pack`, and `ship_gate_audit`, all priced at 20,000 atomic USDC. The two placeholders must be absent and return 404.
4. Perform the **human-owned Vercel production deploy**. Make the **human-owned Hostinger DNS** change for `api.defifintechdirectory.com` only after the origin and TLS are correct. Recheck the public origin in `GATEWAY_BASE_URL`; payment signatures bind to the resource URL.
5. After an authorized live smoke and confirmation that paid calls appear in the hit log, make the **human-owned directory submissions** to x402scan and relevant MCP registries. Record submission dates and URLs for the weekly report. This build does not submit them.
6. Monitor `/operator/hits` daily. Request it with `Authorization: Bearer <OPERATOR_TOKEN>`. The default response is HTML; `?format=json` returns the same totals. It shows requests by UTC day, outcome, tool, and surface, top user agents, distinct paid payer addresses, unique paid transaction count, and gross USDC. A 503 means the store is unavailable or unconfigured; a 401 means authorization failed. The HTML endpoint is not public.

## Limits and kill switch

The price is $0.02 for each public tool. A transactional Supabase quota reserves at most 250 accepted paid calls per UTC day across all tools and 60 per payer address. The unpaid HTTP path checks the global quota before issuing a 402. A payer address cannot be trusted until a signed payment arrives, so a payer-limit refusal can occur after a signature is sent. A concurrent request can also lose the last quota slot after receiving a 402. The legacy MCP call endpoint returns HTTP 429; the official MCP JSON-RPC endpoint carries `gateway/status:429` in its result envelope. No settlement is attempted for a quota refusal.

Set `TEST_MODE` off to remove public listing and stop live payments. For an individual tool, add its ID to `DISABLED_CAPABILITIES`; it then disappears from discovery and returns 404. Redeploy the environment change under the operator's change procedure. If settlement status is uncertain, the quota slot remains reserved. This can underuse the cap but cannot exceed it. The process ledger retains local idempotency and replay checks. On-chain EIP-3009 nonces are the cross-instance replay backstop for this week; duplicate result delivery across instances is the accepted worst case, and the operator totals deduplicate paid transactions by hash. The quota functions require the reviewed migration before live traffic.

The hit log uses a best-effort asynchronous PostgREST insert after each HTTP response. Log failure goes to stderr and never changes the response. A crash or serverless termination can drop a row; reconcile paid counts against facilitator or chain records before treating gross as revenue. The operator view pages through at most 100,000 rows and marks truncation. User agents and referers are supplied by clients and are not validated identities.

## End-of-week report query

Run this read-only query in Supabase after the week, replacing the two UTC timestamps with the actual interval. It counts unique transaction hashes for paid calls and reports request traffic independently.

```sql
with week_hits as (
  select * from public.x402_hits
  where ts >= :start_utc and ts < :end_utc
), paid as (
  select distinct on (tx_hash) tx_hash, ts, tool_id, payer_address, amount_atomic
  from week_hits where outcome = 'paid' and tx_hash is not null
  order by tx_hash, ts
)
select
  (select count(*) from week_hits) as requests,
  (select count(*) from week_hits where outcome = '402_issued') as challenges,
  (select count(*) from week_hits where outcome = 'cap_429') as capped_requests,
  (select count(*) from paid) as paid_transactions,
  (select count(distinct lower(payer_address)) from paid) as distinct_payers,
  (select coalesce(sum(amount_atomic), 0) from paid) as gross_atomic_usdc,
  (select coalesce(sum(amount_atomic), 0) / 1000000 from paid) as gross_usdc;
```

For tool and surface breakdowns, group `week_hits` by `date(ts at time zone 'UTC')`, `tool_id`, `surface`, and `outcome`. Include directory submission dates and any known logging gaps in the human report. This query is a template; the SQL editor must supply UTC timestamp parameters or substitute reviewed timestamp literals.

## Discovery shape assumption

The repo uses x402 v2 `x402Version`, `resource`, and `accepts` for its 402 challenge. `/.well-known/x402` lists registry-generated resources with the same `accepts`, description, and input/output JSON schemas. The 402 adds `extensions.bazaar.info` with name, description, and schemas for the three public tools. No x402 package or live Bazaar validator was available offline; verify this shape against the current spec before submitting registries. The endpoint and generated local artifacts share registry functions, so metadata has one source.
