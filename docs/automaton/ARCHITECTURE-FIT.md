# Architecture fit: Automaton on the defifintechdirectory x402 gateway

## Current gateway (as of 11 Oct 2026)
- Live: https://api.defifintechdirectory.com (Vercel project `defifintechdirectory-x402-gateway`), CDP facilitator, Base USDC.
- PAY_TO (main): 0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32. 10 tools live: 3 at 0.02 USDC, 7 at 0.001-0.005 USDC.
- Pending: Codex task `00c-x402-gateway-fixes` (double slash, 402 before body validation, x402scan discovery format, drop fixed tool count); listings on x402scan (wallet-signed form), MCP Registry (DNS TXT + publish), Bazaar (auto after first paid call).

## Role of the agent
Agent #1 is an **operator/builder**, not a trader:
1. Proposes, builds and tests new cheap per-call tools (0.001-0.02 USDC) and improves existing ones (docs, schemas, latency, errors).
2. Works in a **separate branch / separate repo or Vercel project** (recommended: `x402-agent-tools`), never pushing to `main` of the live gateway. Nathaniel reviews and merges/deploys (at least for the first weeks).
3. Monitors listings and usage, writes a daily report.

## Money flow
- New agent-built tools pay to a **dedicated agent wallet** (fresh address created on launch day), not the main PAY_TO. This makes the agent's revenue measurable and isolates risk.
- Existing 10 tools keep paying the main PAY_TO.
- Agent wallet USDC -> Conway credits (x402 top-up) or -> our own inference/hosting bills. Survival = agent wallet revenue >= its spend.
- Option: route a % of agent-tool revenue to the main PAY_TO later (manual sweep by Nathaniel; the agent never holds keys to the main wallet).

## Example tool ideas (honest, low risk)
- Polymarket **read-only** analytics (market odds snapshots, volume changes) IF Polymarket public data terms allow resale/derivatives. Check terms first; no trading, no order placement.
- DeFi directory lookups, protocol metadata, chain gas snapshots, token metadata normalisation, URL/contract sanity checks.

## Hosting options
| Option | Pros | Cons |
|---|---|---|
| **av-linux** (Tailscale 100.66.157.38) | No extra hosting cost; we control the box; easy to watch logs; kill = stop service | When no Conway sandbox ID is set the runtime **executes shell commands directly on the host** (`src/conway/client.ts` local fallback): must run in a container/dedicated unprivileged user. Replication (`spawn_child`) only works via Conway Cloud sandboxes. Home IP exposure if it exposes ports. |
| **Conway Cloud sandbox** | Native path, replication works, pay with USDC | Pricing not published in the repo; we could not find it on conway.tech during research - verify on https://app.conway.tech before funding. README notes capacity/performance strain. Sandbox deletion is disabled by the API (prepaid, non-refundable per code comment). Third-party custody of compute. |
| **Small VPS** (e.g. Hostinger VPS, already connected) | Isolated from home network, fixed monthly cost | Cost must be checked on the provider's current price page; same local-exec caveat; replication still needs Conway. |

Recommendation: start on **av-linux inside a Docker container** with a dedicated user, no host mounts except a data volume, outbound egress allowlist, no inbound ports. Use Conway only for inference credits if needed, or point it at our own provider key (config supports `openaiApiKey`, `anthropicApiKey`, `ollamaBaseUrl`) with a hard provider-side spend limit.

## Costs (cited only)
- Conway credit top-up tiers: $5, $25, $100, $500, $1000, $2500 (repo `src/conway/topup.ts`).
- Survival thresholds: high > $5, normal > $0.50, low_compute $0.10-0.50 (repo `src/types.ts`).
- Conway sandbox sizes: 512MB/1vCPU/5GB up to 8GB/4vCPU/80GB (repo `src/replication/spawn.ts`); prices not documented in repo.
- Inference and VPS prices: not cited here; check live price pages on the day.
