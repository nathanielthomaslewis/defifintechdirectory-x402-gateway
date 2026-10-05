# AV-Hub x402 capability gateway — inferred PRD (2026-10-04)

**Problem and user.** Internal capability authors need one local gateway to discover and execute validated tool calls with a clear payment boundary. The service is an Express HTTP API with a TypeScript/JavaScript registry and pipeline.

**Implemented core flow.** Query `/health` and discovery endpoints, select a registered capability, invoke it through HTTP or MCP, and receive a challenge or simulated result in stub mode. Tests cover validation and the shared execution pipeline.

**Missing or unverified.** Default catalogs are empty and the preserved tools are placeholders. Live settlement is disabled; durable multi-host ledger, facilitator validation, operations, and release review are outstanding. This is unlisted infrastructure, not a public offer.
