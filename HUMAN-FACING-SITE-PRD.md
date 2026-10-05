# Human-facing website PRD supplement
Approved by Nathaniel: 2026-10-03. Adds human product experience to existing agent capability platform. Existing payment safety requirements remain mandatory.
## Product and launch
One capability registry and execution backend serves browser users, HTTP clients and MCP/x402 agents. Human payments use card checkout/prepaid credits; users need no wallet.
Launch target: polished responsive site plus three genuinely working tools chosen after human-demand research. Before tools are ready, show honest preview/coming-soon states and sample-labelled outputs.
Provisional headline: Useful tools for people. Callable capabilities for agents.
Primary user: a person with a concrete task who wants a predictable output and price. Secondary user: developer comparing integration options.
Outcomes: successful task completion, repeat usage, positive contribution margin, understandable pricing. Directory size is not a success measure.
## Information architecture
Routes: / homepage; /tools searchable catalog; /tools/:slug details and workspace; /pricing; /account/jobs; /account/credits; /account/settings; /developers; /help; /legal/privacy; /legal/terms.
Homepage: plain value proposition, example task/result, three featured ready tools, pricing explanation, developer entry, and support.
Catalog: keyword search and filters by task/category/input/output/availability/price, consistent tool cards and accessible empty states.
Tool page: task outcome, supported input, output example, limitations, privacy/retention, price estimate, status and primary action.
Browser workspace: text/URL/file fields determined by manifest, validation before execution, exact server quote, confirmation, progress, actionable failure and result preview/download.
Accounts: job history and safe output access, credit balance and ledger, receipts, retry from saved inputs only with consent, export/delete account controls.
Developer area: versioned HTTP/MCP/x402 instructions and public schemas generated from registry. Keep technical details out of normal user checkout.
## Launch phases
H0: responsive local website shell, catalog and tool pages driven by registry. Local sample/demo mode visibly labelled. Existing private placeholders cannot become public/commercial.
H1: safe browser workspace connected to shared pipeline with local simulation; account/history/credit screens may be demo-labelled until real auth and persistence exist.
H2: real authentication, tenant isolation, durable shared store, private file storage, Stripe test-mode checkout/webhooks and credit ledger. Requires configured services; no invented integrations.
H3: implement three researched tools with contract tests, measured unit costs, caps, output examples, privacy and availability review.
H4: end-to-end preview and review. Live checkout, deployment, domain changes and commercial listing require separate explicit release authorization.
## Human research
Separate human willingness-to-pay evidence from x402 transaction observations. Evaluate all 50 intents, with emphasis on fastest dependable builds.
Per candidate: target job/persona, current search-intent evidence, competing products and official prices, free substitutes, dated complaint evidence, differentiation, willingness-to-pay proxy, build/cost bounds and confidence.
Select three experiments; recommend task-focused pages and acquisition channels. Unknown remains unknown; no fabricated keyword volumes, conversion rates, sales or ROI.
Research can change tool selection but should not hold up H0.
## UI requirements
Clean premium light interface with restrained DeFi styling, clear typography, mobile-first layout and one strong action per page. Avoid a trading-terminal interface for utility tasks.
Navigation: Tools, Pricing, Developers; account action when configured. Footer includes support, privacy and terms.
Status words: Ready, Preview, Coming soon, Unavailable. Ready requires actual validated implementation and permitted public visibility.
Show demo/sample badges near every simulated balance, job, result and checkout. Never present mock purchases or fake popularity as evidence.
No invented testimonials, logos, usage totals, income claims or countdowns. Human website copy explains task outcomes rather than protocol mechanics.
Accessible labels, keyboard controls, visible focus, adequate contrast, live progress announcements, reduced motion and responsive small screens.
Loading, empty, validation, insufficient-credit, expired-quote, rate-limit, offline, failed-job and unavailable-service states are explicit.
## Architecture and data
Prefer extending current Express/Vercel project with a lightweight maintainable frontend; justify any framework change. Do not replace working backend or create a disconnected demo.
Registry is source of catalog eligibility, display metadata, schema, price and version. Public lists include only permitted ready entries; preview tools use a distinct explicit preview source and cannot execute commercially.
Use stable IDs: user, capability/version, quote, job, ledger entry, payment intent/session, webhook event and artifact.
Browser requests resolve identity server-side. Every job/artifact/ledger query checks ownership. Never rely on a supplied user ID.
Quotes include scope/input hash, version, maximum cost, price/credits, expiry and replay protection. Cost ceiling checked before vendor calls.
Keep human credits separate from chain settlement bookkeeping; both converge on one validated execution pipeline with explicit payment method.
No secrets, payment tokens or private uploaded content in telemetry. Sanitized user-visible errors; trace IDs support debugging.
Vercel production storage must be distributed and transactional. Current local SQLite is not production shared persistence.
## Credits and payments
For initial release prefer prepaid credits over subscriptions. Show currency price, credit conversion, expiry/refund policy and cost before execution. Subscription quotas are later scope.
Credit purchase follows provider-confirmed webhook, not browser redirect. Verify webhook signatures and deduplicate event IDs atomically.
Credit ledger is append-only with purchase/reservation/capture/release/refund entries, idempotency and invariant tests.
Reserve quoted amount before execution; capture only per documented successful-delivery policy; release unused/failed-job reservation. Retried requests cannot double-charge.
Reject insufficient balance atomically under concurrency. Never auto-top-up or invoke an uncapped vendor fallback.
Use Stripe test mode only while preparing integrations. No live key provisioning, spending or real payment.
Refund/chargeback events reconcile with ledger and account risk controls; disclose human-readable policy before purchase.
## Uploads and privacy
Permit bounded formats and sizes per tool; validate extension/content and reject unsafe files. No arbitrary filesystem access.
Store artifacts privately with time-limited signed download access, ownership checks and disclosed retention/deletion.
Treat URL fetches as untrusted; reuse existing DNS/SSRF/redirect guards. Bound parse time, response size, model calls and job duration.
Publish actual retention only after implemented and verified. Mark legal copy draft pending review; do not claim compliance certification.
## Acceptance checks
Catalog does not leak private placeholders; prices and availability match server manifests.
A person can discover a ready tool, inspect sample/limits/price, provide valid input, confirm quote, run and retrieve result on mobile and desktop.
Invalid/oversized input causes no execution or charge. Expired/mismatched quote rejected.
Duplicate webhook/retry/concurrent run cannot credit or charge twice. Failed job releases reservation per policy.
User A cannot read User B jobs/uploads/credits. Logout invalidates protected access.
Successful result respects declared schema; download contains same delivered artifact. No output released when required payment state fails.
Demo data is labelled at every transaction-like surface and cannot invoke live payments.
Keyboard-only flow works; verify narrow and wide layouts in browser when available. Report browser/auth/payment integration blockers honestly.
Existing 33 backend tests continue to pass; add meaningful human-surface security/integration checks as implementation warrants.
## Measurement
Track catalog-to-tool, tool-to-valid-input, quote-to-run, completion, failure reasons, repeat use and support requests with consent where required.
Separate demo/test/internal traffic from external successful paid jobs. Report gross receipts, refunds, processor fees, vendor cost and contribution margin distinctly.
Do not infer purchased demand from page views or agent call totals.
## Build handoff
Read this supplement and current BUILD-STATUS.md. Preserve backend safety fixes.
Proceed H0 and H1 local preview autonomously; prepare H2 interfaces/test integrations where dependencies allow, mark blocked parts explicitly.
Do not promote placeholders or fabricate commercial capability readiness. Research selection gates H3.
No permission bypass, Git metadata workaround, live payments, public deployment, spend, directory publication or DNS changes.
Keep HUMAN-SITE-BUILD-STATUS.md with changes, checks, actual preview URL if started, blockers and next steps. Produce reviewable implementation rather than only a plan.

