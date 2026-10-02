# AV-Hub x402 Gateway (Phase 1)

Production Express gateway for **defifintechdirectory.com** — Base USDC `exact` payments for five AV-Hub MVP tools.

| | |
|--|--|
| Status | `listed:false` until Nathaniel publishes |
| Network default | Base mainnet `eip155:8453` |
| Asset | USDC `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| payTo | `0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32` |
| Host | **Vercel** (`api.` / optional `mcp.` CNAMEs) |
| Apex | Hostinger static Phase 0 (`public_html`) — do not move |
| FacelessYT | parked · organic-only · no invented GMV |

Companion PRD: `../X402-GATEWAY-PRD-2026-10-02.md`

---

## Payment flow

1. Caller hits `POST /tools/<id>` with **no** payment → **HTTP 402** + `PAYMENT-REQUIRED`.
2. Caller retries with `PAYMENT-SIGNATURE` (EIP-3009 USDC auth, base64 PaymentPayload).
3. Gateway **verifies** via facilitator → runs tool → **settles** → USDC to `payTo`.
4. Response includes `PAYMENT-RESPONSE`.

**Facilitators (mainnet):**

| Provider | URL | Auth |
|----------|-----|------|
| **CDP (preferred)** | `https://api.cdp.coinbase.com/platform/v2/x402` | `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` |
| **PayAI (MVP alt)** | `https://facilitator.payai.network` | Often none for basic; merchant key optional |
| ~~x402.org~~ | `https://x402.org/facilitator` | **Testnet only — never mainnet** |

Docs: [CDP seller quickstart](https://docs.cdp.coinbase.com/x402/seller/quickstart) · [PayAI](https://docs.payai.network/x402/reference)

---

## Tools (placeholder prices)

| Tool | Price | Route |
|------|------:|-------|
| `game_launch_kit` | $1.00 | `POST /tools/game_launch_kit` |
| `store_art_prompt_pack` | $0.15 | `POST /tools/store_art_prompt_pack` |
| `ship_gate_audit` | $0.10 | `POST /tools/ship_gate_audit` |
| `companion_book_outline` | $0.50 | `POST /tools/companion_book_outline` |
| `stickman_short_script` | $0.10 | `POST /tools/stickman_short_script` |

Also: `GET /health`, `GET /tools`, `POST /mcp/tools/call`, `GET /mcp`.

---

## Local run

```bash
cd gateway
cp .env.example .env
npm install
npm start
# STUB_MODE=1 → curl -i http://localhost:4021/tools/ship_gate_audit  → 402
# curl -s -H "PAYMENT-SIGNATURE: stub-ok" -H "content-type: application/json" \
#   -d '{"project_type":"web_game"}' http://localhost:4021/tools/ship_gate_audit
```

---

## Deploy to Vercel

Project name suggestion: `defifintechdirectory-x402-gateway`.

### Env vars (set in Vercel — non-secret first)

| Key | Value |
|-----|-------|
| `PAY_TO` | `0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32` |
| `NETWORK` | `eip155:8453` |
| `USDC_ASSET` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `LISTED` | `false` |
| `STUB_MODE` | `1` initially (safe without CDP keys) |
| `FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` |

**Secrets (Nathaniel adds later — do not invent):**

| Key | Where |
|-----|-------|
| `CDP_API_KEY_ID` | [CDP Portal](https://portal.cdp.coinbase.com) |
| `CDP_API_KEY_SECRET` | same |

Then flip `STUB_MODE=0`. Optional: `USE_X402_MIDDLEWARE=1` for official `@x402/express`.

### CLI / MCP deploy

```bash
# From this directory after linking project
npx vercel --prod
# Or file-upload deploy via Vercel API / user-Vercel-xai MCP
```

`api/index.js` + `vercel.json` rewrites all paths to the Express serverless entry.

### Custom domains

| Host | Type | Target |
|------|------|--------|
| `api.defifintechdirectory.com` | CNAME | `cname.vercel-dns.com` (or project-specific DNS from Vercel) |
| `mcp.defifintechdirectory.com` | CNAME | same (optional — Phase 1 can serve MCP paths on `api.` alone) |

**Do not change** apex `A` → `2.57.91.91` (Hostinger static).

After DNS: add domains in Vercel project → Domains, then update Phase 0 static discovery URLs (already point at `https://api.defifintechdirectory.com`).

---

## Enable live settle (next step for Nathaniel)

1. Create CDP API key (ID + secret) at portal.cdp.coinbase.com.
2. Set `CDP_API_KEY_ID` + `CDP_API_KEY_SECRET` on the Vercel project (Production + Preview).
3. Set `STUB_MODE=0` (redeploy).
4. Smoke: unpaid `GET /tools/ship_gate_audit` → still **402**.
5. Dogfood one real USDC payment from a funded Base wallet → confirm credit at `payTo`.
6. Keep `LISTED=false` until content quality sign-off.

**PayAI shortcut (no CDP):** set `FACILITATOR_URL=https://facilitator.payai.network`, `FACILITATOR_PROVIDER=payai`, `STUB_MODE=0`. Confirm `/supported` includes `eip155:8453` + `exact`.

---

## Layout

```
gateway/
  README.md
  package.json
  .env.example
  vercel.json
  api/index.js      # Vercel serverless entry
  src/
    app.js          # Express routes
    server.js       # local listen
    config.js       # defaults + guards
    x402.js         # challenge / verify / settle
    middleware.js   # optional @x402/express + CDP
    tools.js        # 5 tool stubs + prices
```

No fake revenue. Organic discovery only.
