# Agent Capability Factory v2 — Master PRD
**Product:** AV-Hub / DeFiFintechDirectory x402 Gateway
**Status:** Build-ready
**Target:** Vercel + Base USDC + x402 + MCP + ChatGPT/Codex Plugins + HTTP
**Principle:** Build a paid agent capability once; expose it through every useful distribution surface.

## 1. Vision
Evolve the current Phase-1 x402 gateway into a machine-native capability marketplace/factory. Human users discover and invoke tools through ChatGPT/Codex and the web; autonomous agents discover, evaluate, pay for and invoke the same tools through MCP/HTTP/x402. DeFiFintechDirectory becomes both a first-party seller and, later, a registry/marketplace for third-party agent capabilities.

## 2. Product thesis
The plugin is distribution, MCP is interoperability, x402 is machine-native monetisation, and the gateway is the shared commerce/control plane. No capability should require four independent implementations. A handler plus manifest should generate its HTTP route, x402 payment requirement, MCP definition, discovery metadata, documentation, tests and plugin-facing schema.

## 3. Existing Phase-1 baseline
Preserve the current Express/Vercel gateway, Base mainnet USDC exact-payment flow, facilitator abstraction, stub mode, /health, /tools, /mcp and /tools/:id surfaces. Preserve the existing five MVP tools until telemetry supports replacing or repricing them. Do not move the Hostinger apex. Do not expose secrets or hard-code private credentials.

## 4. Goals
1. Add a typed capability registry as the source of truth.
2. Generate HTTP, MCP, x402 and plugin metadata from each capability manifest.
3. Support x402 V2-compatible discovery and Bazaar-compatible metadata where applicable.
4. Capture calls, paid calls, payment amount, unique payer pseudonymous identity, latency, failures, refunds/failures and gross revenue.
5. Add configurable static pricing now and hooks for dynamic pricing later.
6. Make adding a new sellable capability require roughly one handler + one manifest + tests.
7. Launch 10 low-cost agent utilities, then expand toward 20 based on measured demand.
8. Add a marketplace-ready provider model without enabling unreviewed third-party execution in v2.
9. Keep the system cheap enough for sub-cent/cent-level calls where infrastructure permits.
10. Produce ChatGPT/Codex plugin packaging from the same registry.

## 5. Non-goals for v2
- Custodial user wallets.
- Speculative token issuance.
- Autonomous investment/trading execution.
- Unreviewed arbitrary third-party code execution.
- Revenue claims without measured transactions.
- Complex auction pricing in the initial release.

## 6. Personas
**Agent buyer:** needs a capability now, wants machine-readable discovery, deterministic schema, known price and structured result.
**Human ChatGPT/Codex user:** wants the same capability conversationally without understanding x402.
**Developer seller (future):** wants to register an endpoint/MCP tool, set price and receive payments.
**Operator:** needs health, usage, revenue, errors, abuse controls and capability lifecycle management.

## 7. Core architecture
Client surfaces -> Capability Gateway -> Registry -> Policy/Price -> x402 Verify -> Handler -> Settle -> Telemetry -> Structured Response.

Surfaces:
- POST /tools/:id
- MCP tools/list + tools/call
- discovery/catalog endpoints
- ChatGPT/Codex plugin/MCP surface
- ordinary authenticated HTTP where desired

Registry modules:
- id/version/status
- name/description/category/tags
- inputSchema/outputSchema
- price/currency/network/asset
- handler
- timeout/cost ceiling
- discovery metadata
- auth requirements
- safety/rate policy
- caching policy
- telemetry labels
- provider/payTo policy

## 8. Proposed manifest
```ts
registerCapability({
  id: "seo_audit",
  version: "1.0.0",
  description: "Audit a public URL and return structured SEO findings.",
  category: "web",
  price: { mode: "fixed", usd: "0.02" },
  inputSchema,
  outputSchema,
  handler: seoAudit,
  discovery: { public: true, bazaar: true, plugin: true, mcp: true },
  limits: { timeoutMs: 20000, maxPayloadBytes: 1000000 }
});
```

## 9. Initial capability portfolio
Priority is provisional until market research is merged.

P0 utility candidates:
- url_to_markdown
- page_metadata
- extract_structured_data
- json_csv_cleaner
- generate_schema
- screenshot_url
- pdf_extract
- seo_audit
- accessibility_audit
- prd_to_tasks

P1 developer/launch candidates:
- dependency_audit
- repo_audit
- generate_release_notes
- prd_to_issues
- api_test
- app_store_pack
- game_launch_kit
- competitor_snapshot
- domain_snapshot
- keyword_snapshot

Retain existing Phase-1 tools and mark experimental until usage proves demand.

## 10. Pricing
Start with fixed prices and configuration, not hard-coded route logic. Store price in atomic units and display USD-equivalent metadata. Suggested hypotheses only:
- metadata/transforms: $0.002–$0.01
- audits/extraction: $0.01–$0.05
- repo/testing/research: $0.05–$0.25
- launch packages: $0.25–$1+
Research must validate willingness-to-pay and infrastructure margin.

Required controls:
- minimum gross-margin threshold
- max upstream/API cost per invocation
- per-capability daily spend ceiling
- circuit breaker when cost > configured ceiling
- optional free/demo quota isolated from x402 paid route
- future dynamic-pricing interface based on cost/load/demand, disabled by default

## 11. x402 requirements
- Preserve HTTP 402 challenge/retry semantics.
- Base USDC exact payment initially.
- Facilitator adapter interface; CDP preferred, PayAI supported.
- Never execute paid handler before payment verification unless explicitly configured as post-settlement-safe.
- Settle and return payment response metadata.
- Idempotency key to prevent duplicate execution/payment side effects.
- Replay protection and expiry validation.
- Structured machine-readable errors.
- Testnet/stub mode must be visibly distinct from production.
- Capability may specify recipient/payTo to prepare for multi-seller routing.
- Log transaction identifiers without logging secrets/signatures unnecessarily.

## 12. Discovery
Provide:
- GET /capabilities
- GET /capabilities/:id
- machine-readable schemas
- price/network/payment requirements
- health/status/version
- tags/category
- stable invocation URL
- MCP tool definitions
- x402 discovery metadata/Bazaar compatibility where supported
- robots/indexing policy for human-facing catalog

Build a discovery adapter so external registries can be added without changing handlers.

## 13. MCP
Replace the minimal compatibility endpoint with standards-compliant MCP transport appropriate to deployment. Generate tool definitions from registry schemas. tools/list must reflect enabled capabilities. tools/call must use the same execution pipeline as HTTP so payment, policy, telemetry and errors cannot diverge. Add capability metadata describing paid invocation and price.

## 14. ChatGPT/Codex plugin packaging
Generate plugin-facing MCP metadata from registry. Human-facing descriptions should state the action and cost before paid execution where the host UX supports it. Provide optional UI components only for workflows benefiting from visual interaction (audit reports, launch kits, marketplace browsing). Do not fork business logic into UI code.

## 15. Telemetry and experimentation
Minimum event model:
- request_received
- payment_required
- payment_verified
- execution_started/completed/failed
- settlement_completed/failed
- response_delivered

Dimensions:
capability_id/version, surface, environment, status, latency, price, upstream cost estimate, payer hash, tx identifier, facilitator, model/provider if relevant.

KPIs:
- paid calls
- unique payers
- repeat payer rate
- gross revenue
- estimated contribution margin
- payment conversion (402 -> paid retry)
- p50/p95 latency
- success rate
- revenue/capability
- calls/capability
- zero-use capabilities
- acquisition surface

Never store wallet/payment data beyond operational need. Hash/pseudonymise analytics identifiers where possible.

## 16. Persistence
Use an adapter with a simple production store (Postgres/Supabase or equivalent) for capability metadata overrides, invocation ledger and aggregated analytics. Registry code remains deployable without DB for local tests. Never make settlement correctness depend solely on analytics writes.

Suggested tables:
capabilities, capability_versions, invocations, payments, providers, price_history, daily_metrics, experiments.

## 17. Security
- Zod/JSON-schema validation at boundaries.
- SSRF protection for URL-fetching tools: block private/link-local/metadata IP ranges and unsafe redirects.
- file size/type limits.
- timeouts and abort signals.
- rate limits independent of payment.
- upstream allowlists where practical.
- secret redaction.
- no arbitrary shell execution in public paid tools.
- sandbox repo/code analysis.
- dependency scanning.
- audit log for operator mutations.
- CORS/headers appropriate to public API.
- explicit production/stub/test separation.
- payment verification tests and replay tests.

## 18. Marketplace-ready provider model
v2 creates schema and admin primitives but keeps third-party onboarding disabled or manually approved.
Provider fields: provider_id, display_name, payout recipient, capabilities, status, fee_bps, verification state.
Future settlement split: seller proceeds + marketplace fee. Do not implement custody when direct/dynamic recipients can achieve the flow.

## 19. Human web catalog
Add a lightweight catalog/dashboard:
- search/filter capabilities
- capability detail with schema, price and example
- copy invocation snippets
- status
- operator analytics
- later seller onboarding
The public directory should be useful without requiring a wallet.

## 20. Factory CLI
Create commands such as:
`npm run capability:new`
`npm run capability:validate`
`npm run capability:test`
`npm run discovery:build`
A generator asks for id, category, schemas, price, handler type and surfaces, then scaffolds handler/test/manifest/docs.

## 21. Testing
Unit: manifests, schemas, pricing, payment requirement generation, adapters.
Integration: unpaid 402, valid paid call, invalid signature, expired/replayed payment, handler error, settle error, idempotent retry.
Contract: HTTP/MCP outputs match schema.
Security: SSRF, oversized payload, malformed schema, rate limit.
Smoke: Vercel preview then production.
Synthetic monitor: /health and at least one safe unpaid 402 challenge.
No live-money CI tests.

## 22. CI/CD
PR -> lint/typecheck/tests/security checks -> Vercel preview -> smoke -> merge -> production.
Production requires STUB_MODE false only when facilitator credentials/config are valid.
Use feature flags for capability publication.
Rollback must not corrupt payment/invocation state.

## 23. Delivery phases
**Phase A — foundation:** TypeScript migration where practical, registry, unified execution pipeline, schemas, tests, idempotency.
**Phase B — commerce/discovery:** x402 adapter hardening, discovery metadata, MCP generation, telemetry, persistence.
**Phase C — first 10:** implement P0 tools with cost ceilings and smoke tests.
**Phase D — distribution:** ChatGPT/Codex packaging, human catalog, Bazaar/external discovery adapters.
**Phase E — optimise:** ingest market evidence, repricing/experiments, promote/kill tools.
**Phase F — marketplace:** approved external providers, dynamic recipients/fees, seller dashboard.

## 24. Acceptance criteria for v2 launch
- One manifest powers HTTP + MCP + discovery for every enabled tool.
- At least 10 production-ready capabilities.
- Every paid route returns correct unpaid 402 challenge.
- Valid payment path tested end-to-end before public listing.
- Idempotency/replay protections pass.
- Telemetry shows paid calls, unique payer hash, revenue, latency, errors and surface.
- SSRF and payload protections pass.
- Vercel production health is green.
- ChatGPT/Codex can discover/invoke enabled MCP tools.
- External discovery metadata validates.
- No secrets in repo/logs.
- Operator can disable a capability without redeploying or via safe configuration.
- Pricing can change without editing handler logic.

## 25. Market-feedback loop
A scheduled research/analytics job should combine external x402/Bazaar observations (where legitimately available) with our own telemetry. Score opportunities using observed calls/unique payers, competition, price, repeatability, implementation time, marginal cost and adjacency to existing infrastructure. Research informs prioritisation; it must not fabricate GMV or infer sales where only listings exist.

## 26. Definition of done
The gateway is no longer a collection of five routes. It is a reusable agent-commerce platform where a new capability can be scaffolded, tested, priced, published and exposed across HTTP/MCP/plugin/x402 with minimal bespoke integration.
