# Week-1 directory submissions — DRAFT, nothing submitted yet

Origin: `https://api.defifintechdirectory.com` · MCP: `https://api.defifintechdirectory.com/mcp` (streamable HTTP)
Discovery: `/.well-known/x402`, `/openapi.json`, `/llms.txt` · 3 tools at 0.02 USDC on Base (eip155:8453)

## Shared copy

**Name:** AV Hub x402 Tools
**One-liner (≤100 chars):** Pay-per-call creative tools for agents: game plans, store-art briefs, release checklists. 0.02 USDC.
**Description:**
> Three small, honest tools for AI agents, paid per call with x402 on Base (0.02 USDC each, no account or API key).
> `game_launch_kit` turns a brief (title, genre, platform, tone, core loop) into an original game planning bundle —
> it does not invent competitor facts. `store_art_prompt_pack` writes bounded store-art briefs for the aspect ratios
> you supply. `ship_gate_audit` scores a release-evidence checklist you provide; it never fetches URLs and makes no
> legal-compliance claim. Discovery via /.well-known/x402, /openapi.json and /llms.txt; also available over MCP.
> Limits: 250 paid calls/day overall, 60 per payer.
**Tags:** x402, mcp, game-dev, app-store, store-assets, release-checklist, base, usdc, pay-per-call
**Category:** Developer tools / Creative

## 1. Official MCP Registry (registry.modelcontextprotocol.io)

`server.json`:
```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
  "name": "com.defifintechdirectory/x402-tools",
  "title": "AV Hub x402 Tools",
  "description": "Pay-per-call creative tools for agents: game plans, store-art briefs, release checklists. 0.02 USDC via x402 on Base.",
  "version": "1.0.0",
  "websiteUrl": "https://api.defifintechdirectory.com/llms.txt",
  "remotes": [{ "type": "streamable-http", "url": "https://api.defifintechdirectory.com/mcp" }]
}
```
Steps (namespace proven by DNS, no GitHub needed):
1. Generate an Ed25519 key pair locally (private key stays in `D:\MASTER.env` as `MCP_REGISTRY_ED25519_PRIVATE`).
2. Add TXT on `defifintechdirectory.com` (apex): `v=MCPv1; k=ed25519; p=<PUBLIC_KEY_BASE64>` — via the Hostinger API.
3. `mcp-publisher login dns --domain defifintechdirectory.com --private-key <hex>` then `mcp-publisher validate` and `mcp-publisher publish`.
Glama, PulseMCP and others mirror the official registry, so this one listing propagates.

## 2. x402scan (x402scan.com)
Registration is a Sign-In-With-X request signed by a wallet; x402scan then crawls `/openapi.json` and probes each
tool for a real 402. **You do this step** (it needs your wallet's signature): open x402scan.com → Register/Add resource
→ connect the wallet `0x9687…fF32` → enter origin `https://api.defifintechdirectory.com` → sign. Use the shared copy above.

## 3. CDP x402 Bazaar
No submission. Bazaar indexes a resource after its first payment settles through the CDP facilitator with Bazaar
metadata (already in our 402 responses). Optional: you make one real 0.02 USDC test purchase from a funded wallet to
seed the listing — that is a real payment, so it is your action.

## 4. mcp.so (web form) — optional
Submit form fields: Name, Server URL `https://api.defifintechdirectory.com/mcp`, Description (shared copy), Tags.
