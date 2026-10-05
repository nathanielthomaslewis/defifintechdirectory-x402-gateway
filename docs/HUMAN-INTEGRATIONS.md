# Human service integration boundary

H0/H1 uses a loopback-only, in-memory local demo. `src/human-integrations.ts` defines the H2 provider contracts; no provider adapter is connected. `/api/human/config` reports this explicitly. Checkout, webhook and upload endpoints return 503 and cannot grant credits or accept files.

Before implementing H2, configure an authentication provider, distributed transactional database, private object storage and Stripe test credentials through the deployment secret store. Do not commit secrets. Resolve identity from a verified opaque session; never accept a browser user ID as authority.

The durable store must atomically reserve balance, enforce owner/quote/job binding and deduplicate purchase events and payment intents. Capture and release must be idempotent. Reconcile refunds and chargebacks separately. A browser success redirect never grants credits. Verify Stripe signatures against the untouched raw body before parsing; fail closed for live-mode events, unknown packages, currency/amount mismatch or identity mismatch. Add integration tests against the actual adapters, including simultaneous independent database connections.

Private storage must check ownership before issuing a short-lived signed read URL. Implement bounded upload types, content validation, deletion and an approved retention policy before enabling file workspaces. Test two independent users, expired URLs and deletion. The current demo accepts text only and serves downloads through the owning session.

No configured service means no checkout. Commercial package prices, credit expiry, retention, refunds and launch-tool selection require product review; research hypotheses are not published policies. Legal pages remain drafts. H2 does not authorize live charges or deployment.
