# X3 — ten-tool gateway build results

Date: 2026-10-07. Build-only change in `defifintechdirectory-x402-gateway`. No deployment, DNS edit, registry publication, payment, paid service, API key, external network call, git push, or HUB-OPS research edit was made. The already-live gateway remains at its prior three-tool deployment until a human reviews and deploys this build.

## Selection and implementation

The demand analysis and its category aggregation were written first in `docs/X3-TOOL-SELECTION.md`. The seven additions are `text_sha256` (1,000 atomic USDC), `json_normalize` (5,000), `json_csv_convert` (2,000), `url_normalize` (5,000), `cron_next_utc` (1,000), `utm_url_build` (5,000), and `base64_text_codec` (1,000). Each price is $0.001–$0.005. Existing three public prices remain 20,000 atomic USDC in week-one mode and their default-profile prices were not changed. The two placeholders stay private and unavailable in week-one mode.

The new handlers are bounded local transforms in `src/x3-tools.ts`, registered through `src/registry.ts` and executed by the existing shared pipeline. Each has strict input and output JSON schemas, 2,000 ms execution limit, 4,096-byte input limit, 30,000-byte output limit, zero upstream cost allowance, and Bazaar metadata from the registry. They perform no fetch. Discovery generation in `/llms.txt`, `/openapi.json`, and `/.well-known/x402` remains registry-driven; OpenAPI info version and `server.json` were advanced to 1.1.0. The server description is 87 characters. `package.json` and the developer page now describe the ten-tool profile.

The selection has limits: observed calls are not purchases; summed payer counters across resources are not distinct buyers. The specified score algebra reduces to calls squared divided by competition when repeat is calls/payers, so the document sanity-checks individual rows. Several selected transforms have one to three observed payers or only adjacent analogs. This build tests a low-cost hypothesis; it does not establish demand. Cron calculation is UTC only and requires a wildcard in one day field; CSV conversion accepts flat string records only; URL tools never visit destinations. Arbitrary input text should not contain secrets or personal information.

## Verification actually observed

| Command | Result |
| --- | --- |
| `npm test` | **59 passed, 0 failed, 0 skipped**. Includes seven-tool output/schema tests, HTTP and MCP 402 → stub-paid → result, settlement failure → withheld result, public/off-profile discovery, and a cross-tool global cap test. |
| `npm run typecheck` | Passed, `tsc --noEmit`. |
| `npm run lint` | Passed; 37 source syntax checks. This script is not a style linter. |
| `TEST_MODE=week1 npm run capability:validate` | Passed; 12 manifests, 10 public. |
| `TEST_MODE=week1 npm run discovery:build` | Passed; five generated files. Catalog, well-known x402, external discovery, private plugin package, and llms text each contain 10 tool entries. |
| `git -c safe.directory=* diff --check` | Exit 0, no whitespace errors; Git printed line-ending warnings. |

The first intermediate test run was **54 passed, 1 failed** because a pre-existing factory test expected six manifests after creating a scaffold; with seven additions the correct count is 13. The assertion was updated, and the final run passed 59/59. An earlier intermediate typecheck found two inferred `unknown` UTM tuple values; the tuple was typed and the final typecheck passed. The intentional failing hit-sink test still prints `x402 hit log failed: test sink unavailable` while preserving its 402 response. PowerShell printed an unrelated PSReadLine/Atuin startup warning on some commands; command exit codes above were zero.

No standalone loopback server was started. The required test suite's existing harness and X3 tests bound ephemeral `127.0.0.1` ports and closed their listeners. Port 4021 was not touched. No live facilitator, Supabase, or real-payment integration test was run under the no-external-call constraint.

## Human review before any outward action

Review the seven product definitions, observed-demand caveats, generated schemas and prices, and the diff. The live three-tool service will not change without a separately authorized deployment. The X2 runbook describes the currently deployed three-tool profile and must be revised by the operator before using it for a ten-tool rollout. Confirm the live x402/Bazaar and CDP contracts in an authorized environment before publishing any registry update. Existing week-one 250 global / 60 per-payer caps, pay-to, network, and live-payment configuration were not changed.

Backups named `<file>.bak-2026-10-04` were kept beside every pre-existing file overwritten, including the five generated artifacts. No secrets were staged, committed, or copied. The worktree contains uncommitted source, test, metadata, and analysis changes.

JOURNAL: X3: selected and built 7 local x402 tools for 10 week-one tools; 59 tests passed, 12 manifests/10 public, 5 discovery artifacts; see docs/X3-TOOL-SELECTION.md and _codex/X3-results.md; human review and separate deployment remain because outward actions were prohibited
