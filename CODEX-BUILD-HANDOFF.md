# Codex Build Handoff — Agent Capability Factory v2

Work autonomously through MASTER-PRD-AGENT-CAPABILITY-FACTORY-V2.md. Preserve existing working x402 behavior and Vercel compatibility.

Rules:
1. Audit the repository before editing. Treat README claims as unverified until tests/code confirm them.
2. Work on a feature branch; make small logical commits.
3. Do not invent credentials, wallet keys, revenue, transaction IDs or market data.
4. Do not flip LISTED=true, STUB_MODE=0, alter DNS, or make live-money payments without explicit operator approval.
5. Prefer TypeScript for new architecture; migrate incrementally if a full conversion increases risk.
6. Establish registry + unified execution pipeline before adding many capabilities.
7. All paid surfaces must share payment/policy/telemetry logic.
8. Add idempotency, replay protection, input/output validation, SSRF protection, timeouts, cost ceilings and structured errors.
9. Generate MCP/discovery metadata from registry; do not duplicate manifests.
10. Build the first P0 capabilities only after factory tests pass.
11. Run lint/typecheck/unit/integration tests after each milestone.
12. Deploy only to Vercel preview until smoke tests pass; report any required secrets/config rather than fabricating them.
13. Keep a BUILD-STATUS.md with completed milestone, tests, blockers, next action.
14. If blocked by a credential/external approval, continue all independent work and record the exact blocker instead of stopping the whole build.
15. Finish with architecture docs, runbook, threat model, capability-authoring guide and production checklist.

Milestones:
M0 audit/baseline tests.
M1 typed capability registry + schemas.
M2 unified HTTP/MCP execution pipeline.
M3 hardened x402 adapter + idempotency/replay tests.
M4 telemetry/persistence adapter.
M5 standards-compliant MCP + discovery generation.
M6 factory CLI/generator.
M7 first 10 P0 capabilities with unit/contract tests.
M8 catalog/operator analytics MVP.
M9 ChatGPT/Codex plugin packaging + external discovery adapter.
M10 Vercel preview smoke, security review, production-readiness report.

Do not stop at each milestone for routine confirmation. Stop only for destructive actions, secrets, live financial transactions, DNS changes, or genuinely ambiguous product decisions.
