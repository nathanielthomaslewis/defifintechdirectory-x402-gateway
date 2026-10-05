# Build status — X2 week-one traffic test build

Validated locally 2026-10-05 on `implementation/x402-m0-m7-20261005` from HEAD `551f716`. X2 is an uncommitted build-only change. No deploy, DNS edit, directory submission, real payment, facilitator request, Supabase write, or migration apply occurred.

`TEST_MODE=week1` exposes exactly the three implemented agent capabilities at 20,000 atomic Base USDC each. The two placeholders remain 404 and absent from public discovery. The default profile retains the private stub behavior and original prices. Production week-one startup requires `STUB_MODE=0`, CDP payment configuration, Base mainnet/USDC, an HTTPS public origin, Supabase service-role configuration, a hit-log salt, and an operator token; errors name missing variables only.

The shared pipeline checks the daily global cap before a 402 and uses transactional Supabase quota reservations for 250 accepted paid calls per UTC day and 60 per payer. A payer address is only trustworthy after a signature arrives, so a payer cap or concurrent last-slot race can return 429 after signing. Uncertain settlements retain reservations. Existing in-process idempotency/replay remains; EIP-3009 on-chain nonces are the cross-instance backstop. Duplicate result delivery across instances remains the accepted worst case.

The new Supabase hit adapter uses server-side PostgREST fetch and HMAC-hashed IPs. `/operator/hits` has bearer-token HTML and JSON summaries. `/.well-known/x402`, `/llms.txt`, public MCP metadata, and local generated artifacts derive from the registry. The migration is a file only and has not been applied. See `docs/WEEK1-TEST-RUNBOOK.md` and `_codex/X2-x402-test-mode-results.md` for operator steps and limitations.

X2 final gate: `npm test` **53 passed, 0 failed, 0 skipped**; `npm run typecheck` passed; `npm run lint` passed (**32 syntax checks**, not a style linter); `TEST_MODE=week1 npm run capability:validate` passed (**5 manifests, 3 public**); `TEST_MODE=week1 npm run discovery:build` passed (**5 local artifacts**, with exactly 3 tools in registry-derived public discovery). The default validation also passed with **5 manifests, 0 public**. No live facilitator or Supabase integration test was possible under the no-network/no-write rules. A pre-existing Node listener on `127.0.0.1:4021` predates X2; X2 did not start or stop it. Human review, migration apply, credentials, live contract verification, Vercel production deploy, Hostinger DNS, and directory submissions remain.

## Historical X1 status

Validated 2026-10-05. Branch remains `prd/agent-capability-factory-v2` at baseline `86bc150` with M0–M6 + H0/H1 and X1 changes uncommitted. The requested branch command failed because Git could not create `.git/refs/heads/implementation/x402-m0-m7-20261005`. No reset, stash, push, deploy or live payment occurred.

## Code truth and scope choice

The agent registry contains five IDs. `game_launch_kit`, `store_art_prompt_pack`, and `ship_gate_audit` are now deterministic local capabilities. `companion_book_outline` and `stickman_short_script` remain placeholders. The separate human preview has three workspace entries: one working local text sample and two disabled concepts. The operator's presumed three already-wired agent services were not present. Unattended scope choice: implement the first three registered agent IDs, preserve their exact prices and keep them noncommercial/unlisted. The human top-three PDF merge, image OCR and image conversion are research hypotheses on a different track and were not represented as already-wired agent APIs.

## Milestones

| Milestone | Local status |
| --- | --- |
| M0–M6 | Prior registry, shared pipeline, hardened x402 simulation, ledger/telemetry, MCP, discovery and factory remain intact. |
| M7 | Three of ten target capabilities implemented locally with strict schemas and shared HTTP/MCP contracts. No new dependencies, network fetches or vendor spend. Two placeholders remain. |
| M8 | Existing human catalog plus read-only `/operator/analytics`, gated by `OPERATOR_READ_TOKEN`; bounded in-process metrics only. |
| M9 | Generated private MCP plugin package and nonpublishable external discovery adapter; zero public resources. |
| M10 | Local security/readiness report and smoke plan in `docs/M10-PRODUCTION-READINESS.md`. Preview deploy prohibited and not attempted. Production blocked. |

The three prices remain 1,000,000 / 150,000 / 100,000 atomic USDC in registry order. All three have 2,000 ms timeout, 4,096 input bytes, 30,000 output bytes, zero upstream cost reservation and zero upstream daily budget. Stub mode remains on; `listed:false`, public/Bazaar/plugin flags false, live payments disabled. Private HTTP/MCP access requires a loopback development/test stub request; deployed hosts expose no private tool listing or result.

## Validation

M7 gate after test correction: `npm test` 39 passed, 0 failed; `npm run typecheck` passed; `npm run lint` passed (30 source syntax checks); `npm run capability:validate` passed (5 manifests, 0 public); `npm run discovery:build` passed.

M8 gate: `npm test` 40 passed, 0 failed; typecheck, lint (30 syntax checks), capability validation (5/0), discovery generation all passed.

M9 gate: `npm test` 40 passed, 0 failed; typecheck, lint (30 syntax checks), capability validation (5/0), discovery generation of three local JSON artifacts all passed.

M10 final gate: `npm test` 41 passed, 0 failed/skipped; `npm run typecheck` passed; `npm run lint` passed (30 syntax checks); `npm run capability:validate` passed (5 manifests, 0 public); `npm run discovery:build` passed (three local JSON artifacts). `git -c safe.directory=* diff --check` exited 0 with line-ending/ignore-file warnings and no whitespace errors. An intermediate M7 run had 37 passed and 2 failed due to stale tests that assumed optional game-kit input and all five placeholder status; both were corrected before the green rerun.

## Blockers and next action

Git ref creation is blocked by read-only metadata. Production additionally needs a shared transactional database, approved facilitator credentials and live integration/reconciliation, browser auth/private storage/Stripe test wiring, Node 22 and online dependency audit, remote MCP verification, and authorized preview smoke. See `docs/M10-PRODUCTION-READINESS.md`. Next: review the three local outputs and product selection, obtain writable Git metadata to commit reviewed chunks, then address production infrastructure before any release.
