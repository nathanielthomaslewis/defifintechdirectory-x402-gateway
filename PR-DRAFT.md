# Draft: Harden payment execution and add M0–M6 capability infrastructure

The baseline returned HTTP success after failed settlement, accepted absent verification fields and called async handlers without awaiting them. This change centralizes HTTP/MCP invocation behind strict validation and settlement gates, preserves response withholding on failure, and records replay/idempotency state before execution.

Adds typed manifests, schema validation, exact fixed prices, local durable ledger/event adapters, SDK Streamable HTTP MCP, private discovery and a noninteractive capability scaffold generator. The five original IDs remain noncommercial placeholders. Live execution is disabled. Grokbot research is summarized with file hashes and independent arithmetic checks of the supplied CSV; no new product or demand claim is introduced.

Validation results and outstanding limits are in BUILD-STATUS.md. Production store integration, live facilitator certification, online dependency audit and release authorization remain open. See docs/PRODUCTION-CHECKLIST.md.

## Proposed local checkpoints

1. Registry and payment pipeline with regression tests.
2. Persistence/telemetry and MCP/discovery integration.
3. Factory CLI, research provenance and operational documentation.

Branch requested: `implementation/chatgpt-m0-m6-20261003`, based on `86bc150`. Branch creation failed because `.git` is read-only under this session's permissions. No commit, push or PR was created; this is only a draft description. Do not stage another writer's changes. Recheck worktree ownership and diff before creating the branch/checkpoints in an authorized writable-Git session.
