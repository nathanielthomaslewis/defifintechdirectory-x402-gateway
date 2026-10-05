# AV-Hub capability gateway — M0–M6 continuation

Local capability infrastructure for the existing Express/Vercel gateway. **Unlisted; live payments disabled; three original tools have local deterministic handlers and two remain noncommercial placeholders.** This is not a production release.

## Development

Requires Node >=22.18 and <25 for native TypeScript support. Tested runtime and outstanding checks are recorded in [BUILD-STATUS.md](BUILD-STATUS.md).

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm run typecheck
npm test
npm run capability:validate
npm run discovery:build
```

The lint command checks source syntax; it is not a style linter. Before starting a local server, check the chosen port against the hub's MASTER.env. Tests use temporary loopback listeners.

## Surfaces

- `GET /health`: runtime mode, ledger durability and `paymentsLive:false`.
- `GET /tools`, `GET /capabilities`, `GET /capabilities/:id`: registry-derived public discovery. Default catalogs are empty.
- `POST /tools/:id` (GET retained): shared validated execution.
- `POST /mcp`: SDK-backed stateless Streamable HTTP; SDK client integration tested.
- `POST /mcp/tools/call`: legacy compatibility adapter using the same pipeline.
- `GET /mcp`: 405; no separate SSE stream.

Local stub calls with valid inputs to known IDs return a 402 challenge, then accept `PAYMENT-SIGNATURE: stub-ok` for a simulated result. Production refuses stub execution. Failed settlement never exposes the result. No environment switch enables live execution in this build.

Preserved IDs: `game_launch_kit`, `store_art_prompt_pack`, `ship_gate_audit` (local implemented), `companion_book_outline`, `stickman_short_script` (placeholders). Historical prices are unchanged hypotheses. They are not published offers or measured demand. The three implemented tools are available through local HTTP and MCP stub flows, but remain absent from public and external discovery.

## Factory

```sh
npm run capability:new -- --id example_utility --category utility --price 0.002
```

Generates a disabled manifest, deliberately unimplemented handler, scaffold test and documentation under ignored `generated/`. This does not register or publish a capability. Three preserved IDs have local handlers; M7's ten-capability launch target remains unmet.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Runbook and recovery](docs/RUNBOOK.md)
- [Capability authoring](docs/CAPABILITY-AUTHORING.md)
- [Threat model](docs/THREAT-MODEL.md)
- [Research summary and provenance](docs/RESEARCH-SUMMARY.md)
- [Production blockers](docs/PRODUCTION-CHECKLIST.md)
- [Draft PR description](PR-DRAFT.md)

SQLite is a durable single-host reference, not a shared Vercel payment ledger. Production requires separately reviewed store integration, facilitator validation, operational controls and explicit release authorization. No production deployment, DNS change, marketplace listing or paid test is part of this continuation.
