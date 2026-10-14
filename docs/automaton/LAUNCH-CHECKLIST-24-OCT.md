# Launch checklist (24 Oct 2026 or later)

## Prerequisites (must be done before funding)
- [ ] Codex `00c-x402-gateway-fixes` merged and deployed; /openapi.json, /.well-known/x402 and 402-before-validation verified live.
- [ ] x402scan submission done (Nathaniel signs with wallet).
- [ ] MCP Registry: DNS TXT added and server published (Nathaniel approves DNS change).
- [ ] First paid 0.02 USDC call made so Bazaar lists the gateway.
- [ ] Decide hosting (default: Docker on av-linux).
- [ ] Polymarket public data terms checked if a Polymarket analytics tool is planned.

## Launch day steps
1. Fork Conway-Research/automaton to our GitHub; pin to a reviewed commit (d8f8168 or newer after review). Disable `pull_upstream`.
2. Build a Docker image on av-linux (Node 20+, pnpm). No funds yet.
3. Write config: guardrail values from GUARDRAILS.md, `maxChildren: 0`, model choice, provider key with hard spend limit.
4. Run the setup wizard inside the container: it **generates the agent wallet** - record the address; Nathaniel backs up the key offline.
5. Paste GENESIS-PROMPT.md; set creator address to Nathaniel's address.
6. Create the agent repo/project for new tools; set its PAY_TO to the agent wallet.
7. Write and test `kill.sh` (stop, revoke, sweep) with a zero-balance wallet.
8. **Nathaniel funds** the agent wallet with $20-50 USDC on Base (manual transfer, his approval).
9. Start the agent. Watch the first 2 hours live; check spend after 24 h.
10. Daily: read REPORT, review PRs, merge/deploy only what Nathaniel approves.
11. Week 4 review: revenue vs spend; decide whether to continue, raise float, or enable replication.

## Nathaniel must do himself
- Fund the agent wallet; sign directory submissions; approve DNS TXT; approve each production deploy; hold the wallet backup; decide on replication.
