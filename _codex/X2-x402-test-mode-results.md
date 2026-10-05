# X2 — x402 one-week traffic test mode results

Date: 2026-10-05. Repo branch `implementation/x402-m0-m7-20261005`, starting HEAD `551f716`. Build only, left as uncommitted working-tree changes for review. No deploy (preview or production), DNS change, directory submission, real payment, facilitator call, Supabase write, migration apply, credential creation, or network fetch was made.

## Changes

- `src/config.js`, `src/registry.ts`, `src/pipeline.ts`, `src/x402.js`: `TEST_MODE=week1` is off by default. In week-one mode only `game_launch_kit`, `store_art_prompt_pack`, and `ship_gate_audit` are public/commercial, each with a registry price of 20,000 atomic USDC ($0.02) on Base mainnet. The placeholders are 404 across invocation surfaces. Production startup refuses missing/invalid named configuration. CDP signing uses a native-crypto ES256 JWT; this is unverified against live CDP and fails closed on errors. Settlement failure withholds the result.
- `src/week1-store.ts`, `src/telemetry.ts`, `src/app.js`, `supabase/migrations/20261005000000_x402_hits.sql`: PostgREST hit adapter, server-side HMAC IP hashing, asynchronous response-independent logging, transactional UTC quota RPCs, and service-role-only RLS table setup. Quota reservations enforce at most 250 accepted paid calls/day overall and 60/day per payer across instances. A reservation survives an uncertain settlement; it may underuse the cap. Migration is not applied.
- `src/operator.ts`, `src/app.js`: bearer-protected `/operator/hits` reads Supabase and provides HTML or `?format=json` totals by day/outcome/tool/surface, top user agents, distinct payers, and gross atomic USDC. Repeated deliveries with the same transaction hash count once in paid totals. The existing `/operator/analytics` remains separate.
- `src/discovery.ts`, `src/x402.js`, `scripts/factory.mjs`: registry-derived `/.well-known/x402`, `/llms.txt`, public MCP payment metadata, Bazaar metadata in 402 challenges, and five local generated artifacts. `src/human-pages.js` updates the developer text to reflect the active test profile. Generated artifacts are ignored by Git, and runtime endpoints regenerate from the registry.
- `docs/WEEK1-TEST-RUNBOOK.md` gives the operator sequence, limits, kill switch, report query, and human-owned outward steps. `BUILD-STATUS.md` now begins with the X2 status. New contract tests are in `test/week1.test.js`.

## Validation actually observed

| Command | Result |
| --- | --- |
| `npm test` | 53 passed, 0 failed, 0 skipped. Includes prior 41 plus 12 X2 tests. |
| `npm run typecheck` | Passed, `tsc --noEmit`. |
| `npm run lint` | Passed, 32 source syntax checks; this script is not a style linter. |
| `TEST_MODE=week1 npm run capability:validate` | Passed, 5 manifests, 3 public. Default profile separately passed with 5 manifests, 0 public. |
| `TEST_MODE=week1 npm run discovery:build` | Passed, 5 generated local files. Catalog, well-known x402, external discovery, and llms text each contain exactly 3 public tool entries. |
| `git -c safe.directory=* diff --check` | No whitespace errors; Git emitted line-ending and inaccessible global-ignore warnings. |

An intermediate X2 typecheck found a nullable x402 requirement in the new discovery function; corrected. An intermediate 50-test run had 44 pass/6 fail because a request middleware parameter was mistyped; corrected before the 53/53 final run. The expected failing-sink test prints `x402 hit log failed: test sink unavailable` to stderr while preserving HTTP 402. No live CDP or Supabase integration was run. The migration SQL was inspected but not applied or tested against a database, per the hard stop. `D:\MASTER.env` had zero lines mentioning 4021; an existing Node listener on `127.0.0.1:4021` started before X2 and was left untouched. Test harnesses used temporary loopback ports and closed their servers.

## Vercel environment variable names

Required for production week one: `TEST_MODE`, `STUB_MODE`, `PAY_TO`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HIT_LOG_SALT`, `OPERATOR_TOKEN`, `GATEWAY_BASE_URL`.

Defaults or optional overrides: `NETWORK`, `USDC_ASSET`, `FACILITATOR_PROVIDER`, `FACILITATOR_URL`, `DISABLED_CAPABILITIES`. `VERCEL_ENV` is platform-supplied. `OPERATOR_READ_TOKEN` remains optional for the older analytics endpoint. No values were written to an env file or this report. Production requires an HTTPS base URL, Base mainnet and configured Base USDC, a valid receiving address, an ES256 P-256 CDP secret, a salt of at least 32 characters, and an operator token of at least 24 characters.

## Assumptions and limits

- The repo's x402 contract is v2 (`x402Version`, `resource`, `accepts`). The well-known endpoint mirrors those accepted terms and adds registry schemas and price. The 402 challenge uses `extensions.bazaar.info` for name, description, input and output schemas. Current external x402/Bazaar spec and CDP JWT details could not be checked because the task forbids network calls. Human verification against current primary documentation is required before production release.
- An unpaid request has no authenticated payer address. The global cap is checked before a 402; payer cap is checked after a signed authorization arrives and before facilitator verification. Concurrent requests may exhaust a remaining slot after a 402, producing a later 429 without settlement. The legacy MCP call endpoint uses HTTP 429; official MCP JSON-RPC reports `gateway/status:429` inside its protocol response.
- In-process idempotency/replay remains intact. On-chain EIP-3009 nonces are the cross-instance replay backstop during this test. Duplicate result delivery across instances is the accepted worst case. Quota reservations are transactional in Supabase, but an instance crash or uncertain settlement can retain a reservation and undercount available capacity.
- Hit writes are non-blocking. A failed write goes to stderr without changing the response; a serverless termination can drop a row. The operator view pages up to 100,000 rows and reports truncation. Gross from the hit log is observational, not a reconciled billing ledger. Referers and user agents are client supplied. The service-role key never reaches a public response.

## Remaining human steps

Review and commit the working tree; verify the untested CDP/Bazaar and Supabase contracts; apply the reviewed SQL migration; set the named production variables; perform the Vercel production deploy and live smoke; configure Hostinger DNS for `api.defifintechdirectory.com`; submit the three tools to x402scan and MCP registries; monitor `/operator/hits`; reconcile end-of-week paid transactions against facilitator/chain records. The exact sequence and read-only report query are in `docs/WEEK1-TEST-RUNBOOK.md`.

JOURNAL: X2: Week1 profile, three $0.02 tools, Supabase hit/quota SQL, operator view and discovery built in repo; 53/53 tests, 32 syntax checks, 5 manifests/3 public, 5 artifacts; see _codex/X2-x402-test-mode-results.md and docs/WEEK1-TEST-RUNBOOK.md; human must review CDP/spec, apply migration, deploy, set DNS and submit directories.
