# AV-Hub x402 Gateway — TESTME
stage: scaffold
engine: node/express
run: pnpm start # serves http://127.0.0.1:4021/health; no project port found in D:\MASTER.env
smoke: powershell -NoProfile -Command '$r=Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:4021/health"; if($r.StatusCode -eq 200 -and $r.Content -match "paymentsLive"){"HTTP 200; root marker present"}else{throw "smoke failed"}' # prints HTTP 200; root marker present on success
last_verified: 2026-10-04 by codex (PASS — HTTP 200 on http://127.0.0.1:4021/health)

## What it is
Local Express capability gateway with discovery and simulated x402 challenge flow.

## Test these 3 things
1. Fetch `/health` -> mode and `paymentsLive:false` appear.
2. Fetch `/capabilities` -> registry response appears.
3. Call a known stub capability -> 402 challenge, then marked simulated result with stub signature.

## Known gaps
- Default catalog is empty; live payments and production settlement are disabled.

## Controls
HTTP API; no visual controls.
