# Guardrails

## Wallets and keys
- Agent gets a **brand-new wallet** created on launch day. Never the main PAY_TO (0x9687...dF32) or any wallet Nathaniel uses.
- Float: **$20-50 USDC** on Base, funded manually by Nathaniel. No auto top-ups from other wallets.
- Agent host has **no copies** of Nathaniel's keys, seed phrases, .env files, Vercel/CDP/GitHub tokens with write to production. Any GitHub token is fine-grained, scoped to the agent's own repo only.
- Back up the agent wallet key offline (Nathaniel), so funds can be swept if the agent is killed.

## Spend caps (override DEFAULT_TREASURY_POLICY in config)
| Setting | Default in code | Ours |
|---|---|---|
| maxSingleTransferCents | 5000 ($50) | 0 (transfers off) |
| maxHourlyTransferCents | 10000 | 0 |
| maxDailyTransferCents | 25000 | 0 |
| minimumReserveCents | 1000 | 500 |
| maxX402PaymentCents | 100 ($1) | 25 |
| x402AllowedDomains | conway.tech | conway.tech (only if using Conway credits) |
| maxInferenceDailyCents | 50000 ($500) | 200-300 ($2-3/day) |
| requireConfirmationAboveCents | 1000 | 100 |
| maxChildren | 3 | 0 |
Also set a hard monthly limit on any inference provider key at the provider.

## Allowlist
- Outbound network: GitHub (agent repo), npm registry, inference provider, api.conway.tech (if used), Base RPC, api.defifintechdirectory.com, approved public data sources (added by Nathaniel one at a time).
- Tools disabled at start: `transfer_credits`, `spawn_child`, `fund_child`, `register_domain`, `manage_dns`, `install_mcp_server`, `delete_sandbox`, `pull_upstream`, `reset_to_upstream` (and ideally `edit_own_file`). Enforce at the policy-engine level, not just in the prompt.

## Host isolation (av-linux)
- Run in Docker as non-root, dedicated user, read-only root FS where possible, one data volume for `~/.automaton`, no Docker socket, no host mounts, no Tailscale access to other nodes (use a Tailscale ACL or a separate network).
- Leave `sandboxId` empty only inside this container, because the runtime falls back to executing commands locally.

## Kill switch
1. `docker stop dfd-builder-1` (or systemd stop) - immediate.
2. Sweep the agent wallet to Nathaniel's address using the offline backup key.
3. Revoke the agent's GitHub token and inference key.
4. Disable agent tools on the gateway (remove routes / redeploy) if needed.
Write this as `kill.sh` on launch day and test it before funding.

## Logs
- Append-only: ship `~/.automaton` audit log, state.db snapshots and daily reports to a separate location the agent cannot write to (e.g. rsync pulled by av-linux host, or a read-only bucket).
- Keep built-in git versioning on.

## Replication policy
- OFF (`maxChildren: 0`, tools disabled) until the agent's revenue covers its own costs for **4 consecutive weeks** (suggested N = 4), confirmed from on-chain data, and Nathaniel approves.
- Then one child at a time, role-specific: builder, marketer (honest docs/listings only, no spam), backup (warm standby). Per-child float cap $20, same caps as parent, max 2 children total.
- Note: replication in code needs Conway Cloud sandboxes; budget for that separately.
- Revenue share to parent is not in the code; if wanted, implement as a scheduled sweep to a parent address with a fixed %, reviewed by Nathaniel.
