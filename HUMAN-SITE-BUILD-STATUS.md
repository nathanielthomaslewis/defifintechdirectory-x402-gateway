# Human site build status

Validated 3 October 2026, Europe/London. H0/H1 complete as an explicitly labelled local preview; H2 contracts prepared, external adapters unconfigured. This is not a commercial launch.

## Completed

- Express page router and local CSS/JavaScript: responsive ivory/emerald homepage, searchable catalog with input/output/category/availability/price filters, tool details and workspace, pricing, jobs/credits/settings, developers/help and draft legal pages.
- Catalog uses registry display metadata plus a separate private preview registry. Five original placeholders remain private/noncommercial; machine discovery still has zero public tools. Browser /tools requests HTML; application/json and default machine requests retain JSON. /tools?format=json provides an explicit machine catalog link.
- Working text sample uses the shared validated execution pipeline. Server owns opaque HttpOnly sessions, CSRF, input-bound two-minute quotes, explicit confirmation, idempotency, reservations/capture/release, jobs and private artifact downloads. Browser never invents balances/results. Uploads, URL fetches and checkout remain disabled.
- Each session owns its execution cache, so logout/deletion/30-minute expiry discard both job records and cached private results. Session expiry has a timer, not only lazy cleanup. Active bounded requests may retain memory until completion. Server restart discards all demo data.
- Quote form freezes input during pending quote requests, preventing stale-input confirmation. Failed jobs release reservations. All transactional surfaces label demo/sample data.
- H2 interfaces and integration requirements documented in docs/HUMAN-INTEGRATIONS.md. No connected provider, fake purchase or published pricing/retention policy.

## Evidence

Node 24.15.0. Final npm test: 38 passed, zero failed/skipped (existing 33 plus five human integration/security tests). Covers origin/CSRF, ownership, expiry/input/confirmation binding, idempotent/concurrent run, insufficient credits, failure release, private downloads, logout and production refusal, plus all required page routes and machine catalog negotiation.

npm run build/typecheck, npm run lint (including public browser script), npm run capability:validate and npm run discovery:build pass. Validation: five baseline manifests, zero public. git diff --check passes; line-ending warnings only. CI and Node 22 runtime were not executed here. No clean dependency vulnerability audit claimed.

Browser: in-app browser tested desktop 1440x1000 and narrow 390x844 layouts, catalog search/empty state, sample input/quote/confirmation/result, keyboard Space/Enter execution, private JSON download, jobs and credit ledger. Sample returns 43 characters and nine words; successful run leaves nine demo credits, zero reserved. No browser error logs observed. This is browser viewport review, not physical-device testing. Frontend skill source evaluation passed after corrections; a different-provider evaluator was unavailable.

Local screenshots: .local/screenshots/desktop.jpg and mobile.jpg (ignored local evidence). Preview tab left open on homepage.

## Preview

Actual URL: http://127.0.0.1:4021/ — loopback only. Port 4021 checked against D:\MASTER.env reserved-port entries and active listeners before launch. Current server runs in the desktop execution session with STUB_MODE=1, NODE_ENV=development, PORT=4021 and GATEWAY_BASE_URL=http://127.0.0.1:4021. It lasts while the execution process is alive; restart with those environment values and npm start. No live payments enabled; /health reports listed:false and paymentsLive:false.

## Exact blockers / next steps

No auth/database/storage/Stripe variable names or .env/.env.local were found in this process. Real authentication, transactional tenant/credit database, private artifact storage and verified Stripe test checkout/webhooks remain unconfigured. H2 requires actual provider adapters and multi-user/database integration tests. Refund/chargeback reconciliation and production retention remain unimplemented.

Research was reviewed: PDF merge, image OCR and image conversion are hypotheses for H3, with strong free substitutes and unknown margins. No launch selection or irreversible price/expiry policy made. Current executable sample counts text; document/URL entries are coming-soon concepts.

Preserved existing uncommitted M0–M6 changes and prd/agent-capability-factory-v2 branch. No active competing writer found in desktop thread/process inspection; prior continuation was stopped by usage limits. No lock removal, permission changes, Git workaround, commit/push, production deployment, publication, DNS, paid upstream usage, ad spend or live charge performed.
