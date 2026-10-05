# M10 local production-readiness review — 2026-10-05

**Decision: blocked.** This report is a local review, not release authorization. No preview or production deploy, live facilitator call, listing, marketplace publication, DNS change, or purchase was performed.

## Built and locally verified

- Five preserved agent IDs exist. The first three (`game_launch_kit`, `store_art_prompt_pack`, `ship_gate_audit`) have deterministic local handlers, strict input/output schemas and unchanged atomic prices. The other two remain placeholders. Public and external discovery contain zero resources.
- All paid HTTP and MCP calls use the same pipeline. Valid input reaches a 402 challenge; stub verification leads to a result; a failed settlement withholds the result and payment response header. Tests also cover invalid payment, replay, idempotency, size, timeout, output and rate limits.
- These three handlers use caller input only. There is no URL fetch, file upload, external API call or new package dependency. `ship_gate_audit` scores caller-supplied evidence and makes no legal compliance claim. The planning bundle explicitly marks competitor research as unverified.
- Per-capability limits are 2 seconds, 4,096 input bytes, 30,000 output bytes, zero upstream cost reservation and zero daily upstream spend. IP rate limit remains 60 requests per minute in process. The zero cost estimate describes vendor spend, not CPU or facilitator cost.
- The human catalog and demo from H0/H1 remain separate. Operator analytics require a configured read token and report a bounded process window; simulated payments count as zero paid calls and zero gross revenue.
- Registry generation writes local `generated/discovery.json`, `generated/plugin-package.json` and `generated/external-discovery.json`. The latter is empty and marked nonpublishable. The private plugin artifact has not been validated by a remote ChatGPT/Codex host.

## Local smoke-test plan, for an authorized future preview

1. Before starting any server, inspect `D:\MASTER.env` for port 4021 without printing other values, and confirm the port is free. Bind only `127.0.0.1:4021` for local rehearsal. Keep `STUB_MODE=1`, `LISTED=false`, and `NODE_ENV=development`. Do not use live credentials.
2. Run the five local gates: `npm test`, `npm run typecheck`, `npm run lint`, `npm run capability:validate`, and `npm run discovery:build`. Confirm five manifests, zero public, and the expected private MCP definitions.
3. Check `/health` for `listed:false` and `paymentsLive:false`. Check `/capabilities`, `/tools?format=json`, and external discovery artifact for zero public entries. Check `/api/human/catalog` for the separate demo catalog.
4. POST valid JSON to each of the three private `/tools/:id` routes. Confirm HTTP 402 and the manifest's unchanged atomic amount; retry only with `PAYMENT-SIGNATURE: stub-ok` and confirm a structured result with `mode:stub`. Check MCP tools/list and tools/call for matching schemas, 402 metadata and result. Inject settlement failure locally and confirm no result and no success header on either surface.
5. With a temporary local operator token, check `/operator/analytics` rejects unauthenticated access and reports zero paid revenue after stub calls. Stop the server and confirm port 4021 is free.
6. A Vercel preview smoke would additionally require explicit future authorization. On that preview, verify the host/origin configuration, production stub refusal, empty public discovery, deployment logs, and no secret or result leakage. Do not attempt a real payment in this plan.

## Release blockers requiring operator work

- Writable Git metadata for an implementation branch and reviewed commits; current sandbox cannot create the requested ref.
- Shared transactional database for invocation claims, replay, budgets and durable telemetry across serverless instances; local memory/SQLite is insufficient for Vercel concurrency.
- Approved facilitator credentials and an authenticated CDP or chosen PayAI integration, plus reconciliation of ambiguous settlements. Live mode is hard disabled in code.
- Human authentication, transactional credits, private artifact storage and verified Stripe test checkout/webhooks for the browser track. No provider adapters are configured.
- Node 22 reproduction, online dependency audit, independent security review, remote MCP host contract testing, preview smoke and release approval.
- M7's ten-capability target is not met: three local capabilities are implemented, two legacy IDs remain placeholders, and no commercial offering has been approved by market or cost evidence.

## Local risk notes

The operator endpoint is closed without a token, but its in-process counters reset on restart and cannot be used as durable billing evidence. Private HTTP invocation and MCP names/calls are restricted to loopback development/test stub requests; a deployed preview or production host receives no private tool listing or result. Host-level authentication remains necessary before any remote private use. Deterministic text templates have no verified competitor or regulatory data. The human brief's PDF merge, image OCR and image conversion are separate browser hypotheses; this work did not claim or wire them under the agent API.
