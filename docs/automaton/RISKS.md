# Risks

| Risk | Detail | Mitigation |
|---|---|---|
| Legal / ToS | Polymarket trading is close-only from the UK; data resale may breach source terms; directory rules; UK consumer and financial promotion rules if tools look like advice | No trading/betting; read-only licensed data; no financial advice wording; respect directory rules |
| Runaway spend | Default caps allow $250/day transfers and $500/day inference; self-modification; credit top-ups | Override caps (GUARDRAILS), provider spend limits, small float, tools disabled at policy level |
| Key security | Agent wallet key sits on the host; local-exec fallback runs commands on the host; prompt injection via web content | Container isolation, no other secrets on host, offline backup, sweep on kill |
| Self-modification / upstream | Agent can edit code and pull upstream changes | Pin commit, disable pull_upstream/edit_own_file at start, review audit log |
| Reputational | Spam, fake listings, impersonation, low-quality tools under our brand | Genesis rules, PR review before deploy, daily reports |
| Model costs | Frontier models per turn; heartbeat runs every few minutes; costs could exceed revenue from 0.001-0.02 USDC calls | Cheap model default, inference cap, longer heartbeat, week-4 review |
| Third-party dependence | Conway API/cloud/relay (api.conway.tech, social.conway.tech, inference.conway.tech) has capacity issues per README; sandbox spend non-refundable | Prefer own provider key; avoid Conway sandboxes until replication |
| Replication | Children multiply spend and risk; code has no parent revenue share | Off for 4+ weeks, max 2, per-child caps |
| Hype | TikTok claims (18k agents, quote) unverified | Judge only by our own on-chain revenue |
