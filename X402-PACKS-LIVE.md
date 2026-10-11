# X402 Packs Live — Results (task 00b-x402-packs-live)

Date: 2026-10-12 · Branch: `implementation/x402-m0-m7-20261005` · Repo: `HUB-APPS/defifintechdirectory-x402-gateway`

## What was already done (previous run, resumed — not redone)

A prior run of this task stopped on usage limit after committing the core work. Verified present and correct before doing anything:

- `src/packs.ts` — 3 packs registered (`designer_pack` $29, `marketer_pack` $29, `game_dev_pack` $39), x402 v2 exact, same CDP facilitator + payTo `0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32`.
- ZIPs in `private/packs/` (not `public/`), shipped via `vercel.json` `includeFiles: "{src,generated,public,private}/**"`.
- Double-slash fix in `src/x402.js` (`joinUrl`).
- Tests covering pack route, price, direct-zip 404, production stub denial.
- Storefront HTML pages (`index.html`, `tools/index.html`, `status.html`, `llms.txt`, `catalog.json`) already updated to "payments live / listed:true / packs with prices".

## What this run did

1. **Verified tests locally** — `npm test` → **62/62 pass**, 0 fail.
2. **Ran the gateway locally** (`src/server.js`, `TEST_MODE=week1 STUB_MODE=0 LISTED=true`) and checked the 402 bodies for all 3 packs:
   - Each returns `HTTP 402` + `PAYMENT-REQUIRED` (base64 x402 v2).
   - `resource.url` = `https://api.defifintechdirectory.com/packs/<id>` (no double slash), `mimeType: application/zip`.
   - amounts `29000000` / `29000000` / `39000000` atomic USDC; `payTo 0x96873Fb5…dfF32`; asset `0x8335…2913` on `eip155:8453`.
   - Direct ZIP paths `/packs/<file>`, `/private/packs/<file>`, `/public/packs/<file>` → **404**.
   - `x402-stub-ok: 1` header in production mode → **still 402** (no stub bypass).
3. **Deployed** — `vercel --prod -y` from the repo folder. Build succeeded, aliased to `api.defifintechdirectory.com`.
4. **Verified LIVE gateway** (https://api.defifintechdirectory.com):
   - `/health` → `paymentsLive:true, listed:true, stubMode:false, network:eip155:8453` (`ledgerDurable:false` — see "Not done / for a human").
   - `/packs/designer_pack` → 402, amount `29000000`, payTo correct, zip mimeType, resource URL correct.
   - `/packs/marketer_pack` → 402, amount `29000000`, payTo correct.
   - `/packs/game_dev_pack` → 402, amount `39000000`, payTo correct.
   - Direct ZIP paths → 404 (no public ZIP exposure).
5. **Fixed stale storefront discovery files** (the previous run had updated HTML but left two machine files inconsistent — they advertised the packs under `/tools/<id>` and omitted the `/packs/*` OpenAPI paths):
   - `storefront/.well-known/x402.json` — pack resource URLs corrected `/tools/<id>` → `/packs/<id>`; now **byte-identical** to the live gateway's own `/.well-known/x402.json`.
   - `storefront/openapi.json` — replaced with the live gateway's own `/openapi.json` (adds `/packs/*` paths, `x-guidance`, correct server URL); now **byte-identical** to live.
   - Backups kept: `storefront/.well-known/x402.json.bak-2026-10-04`, `storefront/openapi.json.bak-2026-10-04`.
   - Confirmed `catalog.json` pack URLs already `/packs/*`; no remaining `/tools/<pack>` references in the storefront.
6. **Committed + pushed** — commit `007aeb9` on `implementation/x402-m0-m7-20261005`, pushed to origin. (Gateway code commits `3b375e6`, `f62f6ad` were already pushed.)

## Live URLs checked (this run)

| URL | Result |
|---|---|
| `https://api.defifintechdirectory.com/health` | 200, paymentsLive:true, listed:true |
| `https://api.defifintechdirectory.com/packs/designer_pack` | 402, $29 (29000000), payTo ok |
| `https://api.defifintechdirectory.com/packs/marketer_pack` | 402, $29 (29000000), payTo ok |
| `https://api.defifintechdirectory.com/packs/game_dev_pack` | 402, $39 (39000000), payTo ok |
| `…/packs/designer-pack.zip` · `…/private/…` · `…/public/…` | 404 (no direct ZIP) |

## NOT done — for a human

1. **Storefront publish to Hostinger (BLOCKED — no credentials).** `defifintechdirectory.com` is a static site on Hostinger shared hosting (`platform: hostinger`, `panel: hpanel`, `Server: hcdn`; root `/home/u232670404/domains/defifintechdirectory.com/public_html`). The live site still serves the 2026-10-02 build ("listed:false · Phase 0 discovery · payments not live"). The repo `storefront/` source is fully updated and ready to publish, but I could not push it:
   - The `HOSTINGER_API_TOKEN` (in `D:\MASTER.env`) authenticates to the Hostinger REST API but is scoped to **DNS zones + website metadata only** — it exposes **no file-upload / FTP / file-manager endpoint** (verified by probing `hosting/v1/...` routes; only `GET websites` and `DELETE website` exist).
   - No FTP/SFTP/SSH/hPanel credentials are present (`MAILBOX_*_PASS` are empty placeholders; `SSH_KEY_PATH` key does not exist; no SSH banner on port 22).
   - **Action for Nathaniel:** upload the repo `storefront/` folder to `public_html` via hPanel File Manager or FTP, or provide FTP credentials / a file-scoped API token. After upload, `verify_x402_packs_live.py` will pass its storefront check.
2. **`ledgerDurable:false`** on `/health` — flagged in the 10 Oct handover. Supabase env vars are set, but the durable ledger signal is still false. Review Supabase `x402_hits` / `x402_week1_caps` write path before increasing paid traffic. Not changed (out of this task's scope, conservative).
3. **Test purchase** — deferred by Nathaniel until after 24 Oct (wallet funding), per JOURNAL 2026-10-09 18:55.
4. **Old duplicate Vercel project** `prj_uuoHbt5U6WkvlrM3JCqr0uwwy1nK` (team lzOk, `defifintechdirectory-x402-gateway.vercel.app`, paymentsLive:false) — Nathaniel to delete in the Vercel dashboard.

## Files changed this run

- `storefront/.well-known/x402.json` (synced to live gateway)
- `storefront/openapi.json` (synced to live gateway)
- `X402-PACKS-LIVE.md` (this file)

## Verification honesty note

All gateway claims above were observed directly via `curl` against the live domain after the `vercel --prod` deploy. The storefront publish was **not** performed and is **not** claimed as done — the live storefront wording is unchanged.

JOURNAL: 00b-x402-packs-live: gateway deployed — 3 packs live (402 $29/$29/$39, payTo ok, no public ZIP, stub denied), tests 62/62, storefront discovery files synced to live gateway and pushed (007aeb9); storefront NOT published to Hostinger (no FTP/hPanel/file-scoped API creds available — human must upload storefront/ to public_html); ledgerDurable:false left for review; test purchase deferred to after 24 Oct
