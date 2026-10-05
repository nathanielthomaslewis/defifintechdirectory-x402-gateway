# M0–M6 architecture

The Express/Vercel entrypoints remain. New infrastructure uses TypeScript with Node native type stripping (Node >=22.18); JavaScript adapters remain ESM. There is no transpilation output. `tsc --noEmit` validates new TypeScript; JavaScript has syntax and behavioral tests, not complete static type coverage.

`src/registry.ts` owns immutable manifests, JSON Schemas compiled by Ajv, atomic fixed prices, provider identity, lifecycle, discovery flags and limits. Historical handlers remain in `src/tools.js`. Three IDs now have deterministic local handlers and private MCP definitions; two remain placeholders. All five are noncommercial and excluded from public/external discovery. Known IDs can be exercised in local stub mode. This is three of M7's ten target capabilities.

`src/app.js` translates HTTP and MCP requests into `src/pipeline.ts`. The pipeline performs availability checks, production/live guards, per-process rate limiting, schema/size validation, challenge generation, payment binding, cached response lookup, verification, atomic invocation/replay claim, cost reservation, awaited/abortable handler, output validation, settlement and ledger completion. A response containing a result exists only after explicit settlement success and a successful ledger completion. Separate legacy middleware now fails closed to prevent alternate payment paths.

The SDK-backed MCP endpoint uses stateless Streamable HTTP with JSON responses. One SDK server/transport instance is created per request and closed with the response. SDK lifecycle, protocol negotiation and JSON-RPC validation are reused. Origin is checked; local server binds to loopback. GET/DELETE `/mcp` return 405. The old `/mcp/tools/call` route remains as a compatibility adapter. Tests use an actual official SDK client.

MCP references consulted: [transport specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) and [tool specification](https://modelcontextprotocol.io/specification/2025-03-26/server/tools). SDK 1.26.0 is pinned to its official registry tarball; the lockfile records integrity. Installed SDK behavior, not a bespoke JSON-RPC approximation, handles protocol versions.

## Payment model

Live execution is hard-disabled in this build even when configuration requests it. Production refuses stub execution. Tests explicitly inject a simulation adapter; no real facilitator or chain is called. The outbound facilitator adapter is prepared for a reviewed authenticated CDP client or allowlisted PayAI HTTP, but live compatibility is not certified. Removed dependencies were the unused alternate payment servers, chain packages and deployment SDK; the application no longer imports them. CDP credentials are neither read for outbound authentication nor logged in this continuation.

Exact EVM validation binds version, resource, network, asset, recipient, amount, signature shape, payer, nonce and validity window. Only the tested EIP-3009/65-byte signature shape is accepted. Smart-contract wallet/signature extensions are not implemented. Facilitator verification is still required for authenticity. Empty responses, string flags and non-2xx responses fail closed. Stub settlement has no transaction ID.

Invocation keys bind the caller's idempotency key to payer/nonce/network/asset, and fingerprints bind input, manifest version, requirements and the exact supplied payment payload. A cached response requires the same fingerprint. Payer+nonce+network+asset is unique independently of idempotency key, route or signature encoding. Claim is atomic. Concurrent calls receive a pending conflict. Failed and uncertain operations retain tombstones and cannot be automatically re-executed or re-settled. Cached results can be read after the payment has settled without re-verification. Registry/price changes intentionally conflict; retain immutable versions during rollout.

## Persistence and telemetry

`MemoryLedger` is bounded and suitable only for local tests. Capacity exhaustion denies new work rather than evicting replay records. `SqliteLedger` is a durable single-host reference using WAL and immediate transactions for claims and cost reservations. Both implement the same ledger interface; restart and independent-connection behavior is tested. SQLite files on ephemeral Vercel storage are **not** a shared production store. A transactional shared-store implementation and migration/recovery validation remain a release blocker.

`Telemetry` emits fixed operational dimensions, HMAC payer pseudonyms and estimated costs; it excludes payment signatures and request bodies. An optional `SqliteEventSink` persists events independently of the payment ledger. Sink failure never authorizes payment or releases output. In-process summaries are explicitly bounded-window views. Simulation/stub events never count as paid calls or gross revenue. Pseudonym salt must be stable and operator-managed for cross-restart analysis; default random salt provides only process-local correlation. `response_delivered` means handed back to the transport, not confirmed receipt by the client. Payment challenge and verification counts are separate; no causal conversion claim is inferred.

Daily cost reservation uses a manifest upper bound, not actual upstream billing. Handlers must honor that bound and the AbortSignal. Network helpers do not grant access to paid services. Arbitrary/third-party providers are rejected. Third-party registration, fee splitting, dynamic pricing, publication and operator web UI are deferred.

## Factory

`scripts/factory.mjs` generates disabled handler/manifest/test/docs scaffolds with validated schemas and exact atomic prices, validates all manifests and writes local catalog metadata. It refuses duplicate IDs, overwrites, traversal and symlink output roots. Generated modules are trusted local author code; the CLI is not a public upload service. Generated files are ignored until explicitly reviewed and promoted. This operation does not register a public product.
