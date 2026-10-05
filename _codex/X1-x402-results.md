# X1 — x402 gateway results

Date: 2026-10-05. Local-only continuation on `prd/agent-capability-factory-v2` from baseline `86bc150`. No live payment, facilitator call, marketplace action, deploy, push, DNS change, price change, or new package dependency.

## What was actually wired

The operator's belief that exactly three agent services were already wired was not supported by code. Before X1, `src/tools.js.bak-2026-10-04:11,36,57,86,111` defined **five** agent IDs: `game_launch_kit`, `store_art_prompt_pack`, `ship_gate_audit`, `companion_book_outline`, `stickman_short_script`. The preserved baseline registry backup at `src/registry.ts.bak-2026-10-04:104,108` registered every one as `status:'placeholder'`, `commercial:false`, with all discovery flags false. `src/human-preview.ts:34,49,55` has **three separate browser workspace entries**: a working local text sample and disabled document/URL concepts. They were not three agent API services. `src/app.js:63,84,85` routes agent HTTP, compatibility MCP and SDK MCP through the shared pipeline. Research's PDF merge, image OCR and image conversion are human-track hypotheses, not wired agent handlers.

Unattended conservative choice: implement the **first three registered agent IDs**, because no unique existing three-service set could be identified. The result is `game_launch_kit`, `store_art_prompt_pack`, and `ship_gate_audit` (`src/tools.js:11,33,50`, `src/registry.ts:105-113`). The other two remain placeholders. This choice does not claim market demand or approve a commercial offering.

## Changes

- Replaced the first three stub handlers with deterministic local work: an original game planning bundle that labels competitor facts unverified, bounded original store-art prompts, and a weighted ship-gate score based only on supplied release evidence. No network, file, model or vendor API is used. No SSRF fetch path exists in these handlers.
- Added required strict inputs and full output validation. Existing atomic prices stayed at 1,000,000 / 150,000 / 100,000 USDC units respectively. Each has a 2,000 ms timeout, 4,096 byte input ceiling, 30,000 byte output ceiling, zero estimated vendor cost and zero upstream daily spend. The shared pipeline still enforces rate, payment, replay, output and settlement rules. Zero vendor cost is not a claim of zero CPU or facilitator cost.
- Kept `listed:false`, `commercial:false`, and public/Bazaar/plugin flags false. Private HTTP invocation and MCP listing/calls now require loopback development/test stub mode; deployed hosts receive no private tool listing or result. Private local MCP metadata is generated from the registry; `generated/external-discovery.json` has zero resources. The plugin artifact is local and private. No publication occurred.
- Added read-only `/operator/analytics` gated by `OPERATOR_READ_TOKEN` (minimum 24 characters). It reports bounded in-process counts, and stub events count as zero paid calls/revenue. Existing H0/H1 human catalog/demo remains separate.
- Added M10 local readiness and smoke plan at `docs/M10-PRODUCTION-READINESS.md`; updated architecture, runbook, checklist, README, authoring guide and `BUILD-STATUS.md`. No preview deploy was attempted.
- Tests cover all three HTTP and MCP 402 → stub-verified → result contracts and settlement failure → result withheld. Added direct output/evidence checks and operator access/zero-revenue contract. No new dependency was installed.

## Validation actually run

- Baseline before X1: `npm test` was invoked but its initial process did not return a complete count in that invocation; no baseline test pass is claimed. Typecheck, syntax lint (29 files), capability validation (5 manifests, 0 public), discovery generation passed.
- M7 intermediate: `npm test` 37 passed, 2 failed, 0 skipped. Both failures were stale assumptions that game-kit input was optional and all five IDs were placeholders. Fixed and reran: **39 passed, 0 failed, 0 skipped**. Typecheck, lint (30 syntax checks), capability validation (5/0), discovery generation all passed.
- M8: **40 passed, 0 failed, 0 skipped**; the other four commands passed, lint checked 30 source files, capability validation reported 5/0.
- M9: **40 passed, 0 failed, 0 skipped**; the other four commands passed, and discovery generated three local JSON files.
- M10 final: **41 passed, 0 failed, 0 skipped**; `npm run typecheck` passed; `npm run lint` passed (30 source syntax checks, not a style linter); `npm run capability:validate` passed (5 manifests, 0 public); `npm run discovery:build` passed (`generated/discovery.json`, `generated/plugin-package.json`, `generated/external-discovery.json`). `git -c safe.directory=* diff --check` exited 0 with line-ending/ignore-file warnings and no whitespace errors. Node 22, online audit, preview deployment and remote host contracts were not run.

## Git and boundaries

`git -c safe.directory=* switch -c implementation/x402-m0-m7-20261005` failed exactly: `fatal: cannot lock ref 'refs/heads/implementation/x402-m0-m7-20261005': unable to create directory for .git/refs/heads/implementation/x402-m0-m7-20261005`. Git metadata is read-only in this sandbox. **No commits were made.** Existing uncommitted M0–M6 + H0/H1 changes were preserved; no reset/stash/discard or staging occurred. One `<file>.bak-2026-10-04` backup was kept before each pre-existing file overwrite. `D:\MASTER.env` had zero lines matching `4021` in the local check; no manual persistent server was launched. Tests used their existing loopback test harness and closed its servers.

## Human blockers and next action

A human or authorized environment must supply writable Git metadata to review and commit the pre-existing M0–M6 + H0/H1 work in logical chunks, then X1. Production needs approved facilitator credentials and settlement reconciliation, a shared transactional database for replay/budgets/telemetry, browser authentication and private artifact storage, and Stripe test checkout/webhook configuration. Node 22 reproduction, online dependency audit, remote MCP host validation, independent security review and an explicitly authorized preview smoke are still pending. M7's ten-capability launch target remains unmet at three local implementations; product demand and actual unit margin are unproven.

Next action: review the three outputs and chosen scope, then commit reviewed chunks in a Git-writable session. Complete shared storage and authorized facilitator/test integrations before considering preview or release. Follow `docs/M10-PRODUCTION-READINESS.md` for the smoke plan.

JOURNAL: X1: Five original agent placeholders found; first three implemented privately, M8/M9 local and M10 plan written, final 41/41 tests pass, 5 manifests/0 public, no commits due read-only .git; see _codex/X1-x402-results.md and BUILD-STATUS.md; human needs Git writes, credentials, shared DB and Stripe.
