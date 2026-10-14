# Game-launch bundles + sales log (14 Oct 2026)

## Why
The x402 market data for Oct 2026 (Tanod, CDP Bazaar snapshot of 13 Oct) shows that listings priced at $1 or more get repeat payers more often (6.5%) than the $0.01–0.10 band (2.7%). Agent402-style "whole job in one call" bundles are the pattern that sells. So the $29/$39 ZIP packs are repriced to $3, and three launch bundles are added.

## Endpoints (POST JSON, x402 v2 exact, Base USDC)
| id | price | returns |
|-|-|-|
| `roblox_launch_bundle` | $1 | readiness score, publish checklist (maturity questionnaire, thumbnails, passes), DevEx notes, 7/14/30-day plan, quality gates, store copy draft |
| `godot_steam_launch_bundle` | $2 | Steam + itch.io checklists (store page, capsules, Coming Soon ≥2 weeks, Next Fest), Godot export notes, plan, gates, copy |
| `xr_store_submission_bundle` | $3 | SideQuest, Meta Horizon Store (VRC, age groups incl. the under-10 rule), Meta Ray-Ban Display web-app and Brilliant Frame notes, XR comfort gates, plan, copy |

- **Body:** `{"title","genre","hook"}` plus optional platform fields and an optional `evidence` object of booleans, which scores readiness against the bundle's gates.
- **Content source:** distilled from the ship-game, game-design, game-feel-ux, level-design, game-audio and xr-design skills plus the qa-checks pre-launch lists.
- **Accuracy:** platform facts are stamped `facts_checked: 2026-10-14` and carry a verify note. Nothing claims store, rating, legal or tax approval.

**Repriced packs:** designer_pack, marketer_pack and game_dev_pack go from $29/$29/$39 to $3 each. The static storefront copies (`storefront/*.html`, `catalog.json`, `llms*.txt`) were updated. `storefront/openapi.json` and `x402.json` are generated snapshots and should be regenerated from the live gateway after deploy.

## Discovery
- The `extensions.bazaar.info.input` carries `{type:'http', method:'POST'|'GET', bodyType}`.
- `/.well-known/x402` adds `resource_methods` and `instructions`, which crawlers asked for.
- `llms.txt` gains a "Game launch bundles" section.

## Sales log (bookkeeping, HMRC)
- Every settled payment writes a row to `x402_sales`:
  - atomic and USD amounts (USDC = USD 1:1)
  - USD→GBP rate captured at settlement from frankfurter.app (ECB reference rate), with GBP amount, source and rate date
  - payer, tx hash (live mode only), mode and invocation id
- A failed FX lookup stores `fx_source=unavailable_backfill_required` and never blocks the sale. A failed log write is reported to telemetry (`sales_log_failed`) and never fails the paid response. Reconcile those from the chain.
- **Backends:** Supabase (when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set; apply `supabase/migrations/20261014000000_x402_sales.sql` first), SQLite (`SALES_DB_PATH`), or memory.
- `GET /operator/sales` (Bearer OPERATOR_TOKEN) returns JSON, or CSV with `?format=csv`.
- `/health` adds `salesLogDurable`.

## MCP GET 405
`GET /mcp` returning 405 is intentional and spec-compliant. The server is stateless Streamable HTTP with no SSE stream (`Allow: POST`), and an existing test asserts it. No change.

## Operator steps (not done here)
1. Apply the migration in Supabase.
2. Merge and deploy.
3. Turn off testMode.
4. Make one real paid call from a second wallet to enter the Bazaar.
5. Submit to the directories.
6. Rotate keys.
