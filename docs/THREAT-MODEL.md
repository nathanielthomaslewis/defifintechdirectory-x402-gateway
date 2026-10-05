# Threat model and local review

Assets: payment authorizations, payer identities, operator credentials, paid outputs, invocation state, upstream budget and availability. Trust boundaries: HTTP/MCP caller; registry-authored handler; facilitator; ledger; analytics sink; future URL upstream. Registry code and injected adapters are trusted local operator code, not caller-supplied plugins.

| Threat | Implemented boundary / evidence | Residual limit |
| --- | --- | --- |
| Result released after failed payment | Explicit boolean verification and settlement success; output withheld until ledger finish; HTTP and MCP tests | Live provider correctness and settlement reconciliation unverified |
| Replay/concurrency | Atomic nonce claim independent of idempotency key; fingerprint binding; cached result; conflict/restart tests | Memory is process-local; SQLite is single-host; distributed store required |
| Production stub bypass | Environment-aware stub denial in pipeline and direct helpers; live execution hard-disabled | Any later enablement is a separate reviewed change |
| Async race / late handler | Awaited handler; abort timeout; no settle on rejection/schema failure | JavaScript cancellation is cooperative; external side effects can outlive a timeout |
| Cost abuse / payload flood | Body and manifest size limits, strict schemas, per-process rate limiter, daily cost reservation | Distributed rate limiting and measured upstream budgets remain required |
| SSRF / DNS rebinding | Exact HTTPS host allowlist; resolved-address inspection and pinned connection; reject redirects/private IPs; helper tests | No URL-fetching product shipped; IPv6 denied; no live network probe |
| Secret leakage | Generic errors; fixed telemetry dimensions; HMAC payer IDs; no fake chain tx for stubs | Durable response bodies need access control and retention; caller inputs may themselves contain sensitive data |
| MCP origin attack | Origin check, SDK transport, loopback local bind | Remote deployment authentication policy still needs operator review |
| Discovery of unfinished tools | Three local tools and two placeholders remain noncommercial; public and external catalogs stay empty; private MCP listing/invocation requires loopback development/test stub mode | Remote private use needs a future authenticated host contract |
| Dependency compromise | Pinned lockfile integrity; installs ignore lifecycle scripts; reduced unused payment dependencies | No successful online vulnerability audit; no independent security review yet |
| Third-party execution | Registry refuses external provider IDs; CLI local-only | Generated modules are executable trusted code, never upload them from untrusted users |

Tests exercise negative paths with deterministic simulation adapters. No real signatures, transactions or balances were verified. A passing test suite is evidence about these local boundaries, not certification for handling live money.
