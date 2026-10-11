# X4 gateway fixes — local results

Status: DEPLOY PENDING. Existing working-tree changes verified; nine task files staged. Commit failed twice: fatal: Unable to create .git/index.lock: Permission denied. No push or deployment (final task guardrails prohibit both).

Changes: src/pipeline.ts:42-50 returns unpaid 402 before input validation; paid invalid input returns 400 before facilitator calls. src/discovery.ts:4-99 joins URLs, maps pack routes, emits flat well-known v1 strings, retains rich resources, adds OpenAPI x-guidance and x-payment-info, and trims server/contact URLs. src/app.js:99 exposes the rich route. server.json:5 removes the hard count. src/human-pages.js:11,38 derives the count. Tests in test/{factory,http,week1,x3}.test.js cover these behaviours. src/x402.js joinUrl was already in commit 3b375e6.

Checks: npm test: 62 pass, 0 fail, 0 skip, 48.5 s. npm run typecheck: exit 0. npm run lint: exit 0, syntax checked 38 source files. git diff --check and git diff --cached --check: exit 0. server.json description length 85; referenced MCP schema fetched with HTTP 200 and Ajv returned schemaValid=true (URI format warnings ignored).

Default node src/server.js local run: /health HTTP 200: testMode=false, listed=false, paymentsLive=false, stubMode=true, network=eip155:8453, ledgerDurable=false. Unpaid POST /tools/game_launch_kit: 402. GET /.well-known/x402.json: 200. Server stopped after checks.

Full public local run used createApp week1 stub overrides in process at http://127.0.0.1:4022/; no environment variables changed:
- /health: HTTP 200; testMode=true, listed=true, paymentsLive=false, stubMode=true, network=eip155:8453, ledgerDurable=false.
- /.well-known/x402: version=1, 13 URL strings. /.well-known/x402.json: 13 rich objects. /openapi.json: 13 paths, guidance present, each operation has x-payment-info and 402, server URL has no trailing slash. /tools: 13 entries. Registry public count: 13.
- Double-slash matches in well-known, llms.txt, OpenAPI and tools: 0, 0, 0, 0.
- Unpaid no-body POST /tools/game_launch_kit: 402, PAYMENT-REQUIRED present. Unpaid {} POST /tools/text_sha256: 402. Unpaid GET /tools/ship_gate_audit: 402. POST /tools/does_not_exist: 404.
- Decoded game challenge: url=http://127.0.0.1:4022/tools/game_launch_kit; amount=20000; payTo=0x96873Fb532C630aE88c5e8A5dF5ef430c92dfF32; network=eip155:8453.
- Unpaid GET /packs/designer_pack: 402, PAYMENT-REQUIRED present, amount=29000000.

Local paymentsLive=false is the stub configuration, not a production health result. No production curls or Vercel environment diff were run because no deployment occurred. The supplied 10 October production snapshot had ledgerDurable=false, a pre-existing issue outside this task.

Outstanding: nine fix files staged; a process with .git metadata write access must commit them. Push, deployment and production acceptance checks require separate authorised action. README.md, existing temporary files, docs/automaton/ and storefront/ were left untouched and unstaged. No prices, environment variables or payment state were changed. No paid call, signed payment or directory submission.

JOURNAL: x402-gateway-fixes: local 402-first, x402scan discovery, URL join and server.json copy verified; 62 tests pass and 13 public routes checked; nine files staged but commit blocked by .git/index.lock permission; push, deploy and production checks remain for a human.
