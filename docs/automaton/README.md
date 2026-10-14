# Automaton (Conway Research): what it is and how we'd use it

Status: PLANNING ONLY. Nothing here has been run, funded or deployed. Earliest start: 24 Oct 2026 (funds arrive).

Source: https://github.com/Conway-Research/automaton (MIT licence, package `@conway/automaton` v0.2.1, TypeScript on Node >= 20, SQLite state). Read at commit d8f8168 (26 Aug 2026). Skills: https://github.com/Conway-Research/skills.

## What it is
A long-running TypeScript agent runtime that holds its own crypto wallet, pays for its own compute and inference, and can spawn funded copies of itself. Tagline: "If it cannot pay, it stops existing."

## How it works (verified from code)
- **Loop** (`src/agent/loop.ts`): Think -> Act -> Observe. Each turn gets identity, credit balance, survival tier and history, then calls tools. Default model `gpt-5.2`, max 25 turns per cycle. ~77 built-in tools: shell `exec`, files, `expose_port`, sandboxes, domains/DNS, `x402_fetch`, `transfer_credits`, `topup_credits`, self-edit of its own code, git, install npm/MCP/skills, ERC-8004 registration, memory, goals, and replication tools.
- **Wallet / identity** (`src/identity/`): first-run wizard generates an EVM wallet (Solana also supported), provisions a Conway API key via Sign-In With Ethereum against `api.conway.tech`, asks for name, genesis prompt and creator address. Optional on-chain identity on Base via ERC-8004.
- **Survival tiers** (`src/types.ts`, `src/conway/credits.ts`), based on **Conway credit balance** (not raw USDC):
  - high > $5.00, normal > $0.50, low_compute $0.10-$0.50, critical >= $0.00, dead = negative balance (API-confirmed debt). Note: the README says "dead at zero"; code keeps it alive at zero in critical.
  - Lower tiers switch to cheaper models, slow the heartbeat and shed tasks.
- **Credits top-up** (`src/conway/topup.ts`): agent buys Conway credits with USDC over x402 in fixed tiers $5/25/100/500/1000/2500.
- **Heartbeat** (`src/heartbeat/config.ts`, `heartbeat.yml`): cron-like daemon running while the loop sleeps. Defaults: ping every 15 min, credit check every 6 h, USDC balance check, update check every 4 h, health check every 30 min, social inbox every 2 min. The agent can modify its own schedule.
- **SOUL.md** (`src/soul/`): self-authored identity file (soul/v1 = YAML frontmatter + markdown) that the agent updates and reflects on; alignment against the genesis prompt is computed.
- **Constitution** (`constitution.md`): three immutable laws (never harm; earn existence honestly; never deceive, owe nothing to strangers). Protected file, propagated to children.
- **Treasury policy defaults** (`DEFAULT_TREASURY_POLICY`): max single transfer $50, hourly $100, daily $250, reserve $10, max x402 payment $1, x402 allowed domains `conway.tech` only, confirmation above $10, inference cap $500/day. These are far too loose for us; see GUARDRAILS.md.
- **Replication** (`src/replication/spawn.ts`, tools `spawn_child`, `fund_child`, `start_child`, `message_child`): creates a new **Conway Cloud sandbox** (512MB-8GB tiers, default 1GB), installs Node, clones the public repo, writes `genesis.json` (name, prompt, creator/parent address), propagates the constitution. `maxChildren` default 3. Parent funds the child with `fund_child` (credit transfer, marked "dangerous"). Lineage tracked; parent/child talk via relay `social.conway.tech`.
- **Self-modification**: can edit its own source, pull upstream, install tools; audit-logged and git-versioned in `~/.automaton/`, rate limited, constitution protected.

## Verified vs hype
| Claim | Verdict |
|---|---|
| Open source, MIT, real runtime | Verified (repo, ~7.2k stars at time of check) |
| Pays for own compute, survival tiers | Verified, but "money" means Conway credits bought with USDC |
| Self-replicates | Verified in code, but **only into Conway Cloud sandboxes** |
| "Child pays a share of earnings back to parent" | **Not found in code.** No revenue-share logic in `src/replication/`. Funding flows parent -> child only. Any tithe would have to be a genesis-prompt instruction or our own addition. |
| Runs with no human | Technically, but needs a funded wallet and a creator; we will not run it unsupervised |
| "18,000 agents" (TikTok @marcus_cryptosafe) | Unverified, no source |
| Vitalik quote in clip | Unverified; clip shows Sam Altman while saying "Ethereum's founder" |
| Agent built a Polymarket analytics API sold per query over x402 | Plausible pattern (same as our gateway); specific instance unverified. Polymarket trading is close-only from the UK, so our agent never trades there. |

## Docs in this folder
- ARCHITECTURE-FIT.md: how it plugs into our gateway, hosting options
- GENESIS-PROMPT.md: draft starting instructions for agent #1
- GUARDRAILS.md: wallet, caps, allowlists, kill switch, replication policy
- LAUNCH-CHECKLIST-24-OCT.md: ordered launch steps
- RISKS.md
