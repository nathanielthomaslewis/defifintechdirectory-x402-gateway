# Week 2 spec — x402 gateway

**Status:** Draft, spec only. No code changes were made in this file.
**Date:** 2026-10-07
**Author:** R1 (Kiro agent, unattended)
**Gateway:** `https://api.defifintechdirectory.com`
**Current build:** `TEST_MODE=week1`, 10 tools live locally, X3 diff uncommitted, no Supabase migration applied, no Vercel production deploy yet.

---

## Context summary (what week 1 left)

| Item | State |
| --- | --- |
| 10 paid tools (3 × $0.02, 7 × $0.001–$0.005) | Implemented, tested (59/59), discoverable in generated artifacts |
| Supabase `x402_hits` table + quota RPCs | SQL written in `supabase/migrations/`, **not applied** |
| Vercel production build | Built in `.vercel/output/`, **not deployed** |
| DNS `api.defifintechdirectory.com` | **Not pointed** at Vercel |
| Git commits | **None** — all changes are in the working tree |
| MCP Registry listing | `server.json` at v1.1.0 locally; registry shows v1.0.0 or nothing — **not re-submitted** |
| x402scan listing | **Not submitted** (requires wallet signature — HUMAN step) |
| CDP Bazaar | **Not seeded** (requires real 0.02 USDC payment — HUMAN step) |
| `/operator/hits` analytics | HTML+JSON endpoint coded, no live data yet |

Week 2 goal: get at least one real paid call, establish a feedback loop from live traffic data, and add five more tools that are cheap to serve with no third-party paid APIs.

---

## 1. Requirements

### R1 — Production pipeline must be live

The x402 gateway cannot receive real payments until `api.defifintechdirectory.com` resolves to the Vercel deployment running `TEST_MODE=week1` with all required env vars set. This is the precondition for every other week-2 requirement.

Acceptance criteria:
- `GET https://api.defifintechdirectory.com/health` returns `{"ok":true,"paymentsLive":true,...}`.
- `GET https://api.defifintechdirectory.com/.well-known/x402` returns a JSON object with 10 tool resources.
- A stub-mode `POST /tools/text_sha256` with `PAYMENT-SIGNATURE: stub-ok` returns HTTP 200 on a local dev build (already passing); a live-mode unsigned request to the same tool on production returns HTTP 402.

### R2 — Supabase migration applied and verified

Without the migration the hit-log write silently fails on every request, losing all traffic data.

Acceptance criteria:
- `supabase/migrations/20261005000000_x402_hits.sql` and `20261006000000_x402_hits_outcomes.sql` applied to the production Supabase project in the correct order.
- `GET https://api.defifintechdirectory.com/operator/hits` (with valid `Authorization: Bearer <OPERATOR_TOKEN>`) returns a JSON summary with `scope: "supabase_hits"` and non-error data.
- At least one test-row is inserted via a manual curl to confirm the write path before real traffic.

### R3 — Git history committed and pushed

All working-tree changes must be committed before week-2 code lands. Rationale: the current working tree has X1 + X2 + X3 mixed together; any week-2 coding agent needs a clean base.

Acceptance criteria:
- `git log --oneline -5` shows at least one commit dated after 2026-10-06 on a non-main branch.
- `git status` in the repo root reports a clean tree (or only untracked generated/ artifacts).

### R4 — Discovery listings active

For agents to find and pay the gateway, it must appear in at least one external index.

Acceptance criteria (each independently testable):
- **MCP Registry:** `mcp-publisher publish` succeeds with `server.json` at v1.1.0 (requires DNS TXT key from WEEK1-SUBMISSIONS.md). HUMAN step — needs Nathaniel's key management.
- **x402scan:** Gateway appears on x402scan.com with all 10 tools discoverable. HUMAN step — wallet signature required.
- **mcp.so (optional):** Manual form submission. HUMAN step.

### R5 — Cap and pricing are observable

Without data the operator cannot make rational pricing decisions. Week 2 requires a functioning analytics loop.

Acceptance criteria:
- `/operator/hits?format=json` returns non-empty `byTool`, `byOutcome`, and `byDay` tallies after a day of real traffic.
- A daily review cadence (manual, by Nathaniel) is scheduled: check `/operator/hits` once per day, screenshot and record gross USDC.
- The analytics view spec in §2.3 below is implemented (see §3, task A6).

### R6 — Pricing experiment: $0.001 tools get at least 10 real calls in week 2

Hypothesis: the 7 utility tools (`text_sha256`, `base64_text_codec`, `cron_next_utc`, `json_csv_convert`, `json_normalize`, `url_normalize`, `utm_url_build`) priced at $0.001–$0.005 will attract automated agent traffic once listed.

Acceptance criteria (observation, not a blocker):
- At least 10 rows in `x402_hits` with `outcome = 'paid'` across the 7 x3 tools, at day 14.
- If fewer than 10 paid calls by day 14: document in operator log and re-examine pricing hypothesis.
- **No price change without Nathaniel's explicit approval.**

### R7 — Uptime ≥ 99% measured over week 2

Serverless Vercel gives high baseline uptime; the risk is cold-start timeouts, Supabase quota-RPC latency, and misconfiguration.

Acceptance criteria:
- Deploy Vercel function timeout set to ≥ 10 s (current handler timeout is 2 s but the pipeline timeout is 10 s for facilitator calls).
- Zero HTTP 503 from `production_stub_denied` after `STUB_MODE=0` is confirmed in Vercel env vars.
- Automated health check (e.g., a cron via Vercel Cron or UptimeRobot) hits `/health` every 5 minutes and alerts on ≥ 2 consecutive failures.

### R8 — Five new tools shipped and discoverable

See §2.1 for full tool designs. Each tool must pass:
- `npm run capability:validate` with `TEST_MODE=week1` showing the new tool public.
- Schema round-trip test (input → output) added to `test/week2.test.js`.
- Appears in `generated/llms.txt` after `npm run discovery:build`.

---

## 2. Design

### 2.1 Five new tools

All five are bounded, in-memory, deterministic transforms. No fetch, no paid API, no personal-data lookup. Each follows the existing pattern in `src/x3-tools.ts`.

Conservative selection criterion applied: each tool must have a plausible agent automation use case, produce a uniquely verifiable output, and be implementable in < 100 lines using Node built-ins only.

---

#### Tool 1: `semver_compare`

**Rationale:** Version-string comparisons appear throughout CI/CD automation and agent-driven release pipelines. The existing `cron_next_utc` showed cron scheduling is in demand from the `agent402.tools` analog; package-version gating is a neighbouring workflow. Free alternatives exist (semver npm package), but the x402 pattern taxes automated agents, not humans installing packages.

**Price:** `1000` atomic USDC ($0.001). Same tier as `text_sha256` and `base64_text_codec`.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "a": { "type": "string", "minLength": 1, "maxLength": 64 },
    "b": { "type": "string", "minLength": 1, "maxLength": 64 }
  },
  "required": ["a", "b"],
  "additionalProperties": false
}
```

**Output schema:**
```json
{
  "type": "object",
  "properties": {
    "tool":    { "const": "semver_compare" },
    "valid":   { "type": "boolean" },
    "a_valid": { "type": "boolean" },
    "b_valid": { "type": "boolean" },
    "order":   { "enum": ["a_greater", "b_greater", "equal", ""] },
    "error":   { "enum": ["", "invalid_semver"] }
  },
  "required": ["tool", "valid", "a_valid", "b_valid", "order", "error"],
  "additionalProperties": false
}
```

**Behaviour:**
- Parse both inputs as `MAJOR.MINOR.PATCH` (optionally with leading `v`, e.g. `v1.2.3`).
- Pre-release suffixes (`-alpha.1`, `-rc.2`) are stripped and ignored for ordering (conservative; document the limitation).
- If either is invalid: `valid: false`, `order: ""`, `error: "invalid_semver"`.
- Otherwise: compare numerically (major then minor then patch); return `order: "a_greater" | "b_greater" | "equal"`.

**Test cases:**
| Input a | Input b | Expected order |
| --- | --- | --- |
| `1.2.3` | `1.2.4` | `b_greater` |
| `2.0.0` | `1.99.99` | `a_greater` |
| `1.0.0` | `1.0.0` | `equal` |
| `v1.2.3` | `1.2.3` | `equal` |
| `not-a-version` | `1.0.0` | error, `a_valid: false` |
| `1.0` | `1.0.0` | error (only three-part versions accepted) |

**Limits:** `timeoutMs: 2000`, `maxPayloadBytes: 4096`, `maxOutputBytes: 30000`, `costAtomic: "0"`.

---

#### Tool 2: `hex_rgb_convert`

**Rationale:** Color-code conversion is a perennial micro-task for design automation agents, theme generators, and CSS pipelines. No network needed; output is deterministic. Adjacent analog on Bazaar research data: `agentbit.app/v1/util/transform` (6 calls / 3 payers) handles general transforms; color conversion is a high-frequency sub-case.

**Price:** `1000` atomic USDC ($0.001).

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "color": { "type": "string", "minLength": 1, "maxLength": 32 },
    "to":    { "enum": ["hex", "rgb", "hsl"] }
  },
  "required": ["color", "to"],
  "additionalProperties": false
}
```

**Output schema:**
```json
{
  "type": "object",
  "properties": {
    "tool":    { "const": "hex_rgb_convert" },
    "valid":   { "type": "boolean" },
    "input":   { "type": "string", "maxLength": 32 },
    "format":  { "enum": ["hex", "rgb", "hsl", ""] },
    "hex":     { "type": "string", "maxLength": 16 },
    "r":       { "type": "integer", "minimum": 0, "maximum": 255 },
    "g":       { "type": "integer", "minimum": 0, "maximum": 255 },
    "b":       { "type": "integer", "minimum": 0, "maximum": 255 },
    "h":       { "type": "number",  "minimum": 0, "maximum": 360 },
    "s":       { "type": "number",  "minimum": 0, "maximum": 100 },
    "l":       { "type": "number",  "minimum": 0, "maximum": 100 },
    "css":     { "type": "string",  "maxLength": 64 },
    "error":   { "enum": ["", "invalid_color"] }
  },
  "required": ["tool","valid","input","format","hex","r","g","b","h","s","l","css","error"],
  "additionalProperties": false
}
```

**Behaviour:**
- Accept input formats: 3-digit hex (`#abc`), 6-digit hex (`#aabbcc`), `rgb(r,g,b)`, `hsl(h,s%,l%)`. Strip whitespace, lowercase.
- Parse to `(r,g,b)` floats, then compute requested output.
- `hex` field always populated as `#rrggbb`. `r,g,b` always populated.
- `h,s,l` populated for `to:"hsl"` requests; 0 otherwise.
- `css` is the canonical CSS string for the requested `to` format.
- Unrecognised input: `valid: false`, `error: "invalid_color"`.

**Test cases:**
| Input color | to | Expected css |
| --- | --- | --- |
| `#ff0000` | `rgb` | `rgb(255, 0, 0)` |
| `#abc` | `hex` | `#aabbcc` |
| `rgb(0, 128, 255)` | `hex` | `#0080ff` |
| `#ff0000` | `hsl` | `hsl(0, 100%, 50%)` |
| `#000000` | `hsl` | `hsl(0, 0%, 0%)` |
| `notacolor` | `rgb` | error |

**Limits:** same as semver_compare.

---

#### Tool 3: `markdown_word_count`

**Rationale:** Content agents, editorial pipelines, and pay-per-word audits all need accurate word counts with markdown stripped. Plain `split(" ")` overcounts on punctuation and undercounts on code blocks. The `intel.rallylive.ca` category had adjacent data-extract analogs; markdown-aware count is a unique, verifiable output no browser plugin or LLM directly returns.

**Price:** `1000` atomic USDC ($0.001).

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "markdown": { "type": "string", "minLength": 0, "maxLength": 3000 }
  },
  "required": ["markdown"],
  "additionalProperties": false
}
```

**Output schema:**
```json
{
  "type": "object",
  "properties": {
    "tool":        { "const": "markdown_word_count" },
    "words":       { "type": "integer", "minimum": 0 },
    "chars":       { "type": "integer", "minimum": 0 },
    "chars_no_space": { "type": "integer", "minimum": 0 },
    "paragraphs":  { "type": "integer", "minimum": 0 },
    "code_blocks": { "type": "integer", "minimum": 0 },
    "stripped":    { "type": "string", "maxLength": 30000 }
  },
  "required": ["tool","words","chars","chars_no_space","paragraphs","code_blocks","stripped"],
  "additionalProperties": false
}
```

**Behaviour:**
- Strip markdown syntax in this order: fenced code blocks (count them, replace with single space), inline code, HTML tags, images `![...]()`, links `[text](url)` → keep `text`, headers `#+ `, bold/italic `**`, `_`, list markers `^[-*+] `, blockquotes `^> `, horizontal rules `^---`.
- Word = sequence of one or more non-whitespace characters in the stripped text; split on `/\s+/`.
- `chars` = `stripped.length`; `chars_no_space` excludes whitespace.
- `paragraphs` = number of non-empty blocks separated by ≥ 2 newlines in the stripped text.
- `stripped` is the plain text after stripping (truncated at 30,000 chars by output schema).

**Test cases:**
| Input | Expected words | code_blocks |
| --- | --- | --- |
| `# Hello\n\nWorld` | 2 | 0 |
| `` ```js\nfoo()\n``` `` | 0 | 1 |
| `[link](http://x.com) text` | 2 | 0 |
| `**bold** and _italic_` | 3 | 0 |
| `""` (empty) | 0 | 0 |

**Limits:** same as semver_compare.

---

#### Tool 4: `json_schema_validate`

**Rationale:** Agents building data pipelines frequently need to validate a JSON document against a caller-supplied JSON Schema. `json_normalize` (already at $0.005 with weak demand signal) sorts keys; this is a different, higher-value operation that produces `valid: true/false` with error paths. The `agent.kihustle.tech/services/json-schema-repair` analog had 9 calls; schema *validation* (not repair) is a cleaner, lower-risk primitive.

**Price:** `5000` atomic USDC ($0.005). Same tier as `json_normalize`.

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "document": { "type": "string", "minLength": 1, "maxLength": 2000 },
    "schema":   { "type": "string", "minLength": 2, "maxLength": 1500 }
  },
  "required": ["document", "schema"],
  "additionalProperties": false
}
```

**Output schema:**
```json
{
  "type": "object",
  "properties": {
    "tool":           { "const": "json_schema_validate" },
    "valid":          { "type": "boolean" },
    "schema_valid":   { "type": "boolean" },
    "document_valid": { "type": "boolean" },
    "errors":         { "type": "array", "maxItems": 20,
                        "items": { "type": "string", "maxLength": 256 } },
    "error":          { "enum": ["", "invalid_json_document", "invalid_json_schema",
                                 "schema_too_complex"] }
  },
  "required": ["tool","valid","schema_valid","document_valid","errors","error"],
  "additionalProperties": false
}
```

**Behaviour:**
- Parse both `document` and `schema` as JSON. If either fails to parse: set appropriate `error`.
- Compile the schema with Ajv (already a dependency via `src/registry.ts`) with `strict: false`, `allErrors: true`.
- If schema compilation fails (invalid schema): `schema_valid: false`, up to 5 error messages.
- Validate `document` against the compiled schema. Return up to 20 AJV error messages as strings.
- Safety: reject schemas with `$ref` to external URIs (must be `#/...` or absent). Reject schemas with depth > 8 or property count > 50 — return `error: "schema_too_complex"`.
- The tool **does not** repair, coerce, or transform the document.

**Test cases:**
| Document | Schema | Expected valid |
| --- | --- | --- |
| `{"a":1}` | `{"type":"object","properties":{"a":{"type":"integer"}},"required":["a"]}` | `true` |
| `{"a":"x"}` | same | `false`, error mentions `a` |
| `not json` | `{"type":"object"}` | `false`, `invalid_json_document` |
| `{}` | `not json` | `false`, `invalid_json_schema` |
| `{}` | schema with external `$ref` | `false`, `schema_too_complex` |

**Limits:** `timeoutMs: 2000`, `maxPayloadBytes: 4096`, `maxOutputBytes: 30000`, `costAtomic: "0"`.

**Implementation note:** Ajv is already in `package.json` (`"ajv"` in dependencies). No new package needed.

---

#### Tool 5: `uuid_generate`

**Rationale:** UUID generation is a primitive automation task. The `agent402.tools/api/hash` analog had 253 calls — id-generation is adjacent. Agents calling a paid endpoint for UUIDs are likely building reproducible test fixtures or avoiding local entropy concerns in sandboxed environments. No network needed; Node's `randomUUID()` is available natively.

**Price:** `1000` atomic USDC ($0.001).

**Input schema:**
```json
{
  "type": "object",
  "properties": {
    "count":   { "type": "integer", "minimum": 1, "maximum": 20 },
    "version": { "enum": [4] }
  },
  "required": ["count", "version"],
  "additionalProperties": false
}
```

**Output schema:**
```json
{
  "type": "object",
  "properties": {
    "tool":  { "const": "uuid_generate" },
    "uuids": { "type": "array", "minItems": 1, "maxItems": 20,
               "items": { "type": "string",
                          "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" } },
    "count": { "type": "integer", "minimum": 1, "maximum": 20 }
  },
  "required": ["tool","uuids","count"],
  "additionalProperties": false
}
```

**Behaviour:**
- Call `randomUUID()` `count` times; return array.
- Only version 4 accepted (the schema `enum: [4]` ensures this; no other versions needed now).
- Output UUIDs are lowercase.

**Test cases:**
| count | version | Expected |
| --- | --- | --- |
| 1 | 4 | array of 1 valid v4 UUID |
| 5 | 4 | array of 5, all unique, all matching pattern |
| 20 | 4 | array of 20 |

**Limits:** same as semver_compare.

---

### 2.2 Pricing summary after week 2

| Tool | Price (USDC) | Tier |
| --- | --- | --- |
| `game_launch_kit` | 0.02 | High-value |
| `store_art_prompt_pack` | 0.02 | High-value |
| `ship_gate_audit` | 0.02 | High-value |
| `json_normalize` | 0.005 | Mid |
| `json_csv_convert` | 0.002 | Mid |
| `url_normalize` | 0.005 | Mid |
| `utm_url_build` | 0.005 | Mid |
| `text_sha256` | 0.001 | Micro |
| `cron_next_utc` | 0.001 | Micro |
| `base64_text_codec` | 0.001 | Micro |
| `semver_compare` (new) | 0.001 | Micro |
| `hex_rgb_convert` (new) | 0.001 | Micro |
| `markdown_word_count` (new) | 0.001 | Micro |
| `json_schema_validate` (new) | 0.005 | Mid |
| `uuid_generate` (new) | 0.001 | Micro |

**Conservative choice on pricing:** All new tool prices match the existing x3-tools tier rather than experimenting with higher prices. Rationale: demand is unproven; under-pricing attracts signal; prices can be raised in week 3 with evidence. No price changes to existing tools without Nathaniel's explicit yes.

---

### 2.3 Analytics view — enhanced `/operator/hits`

The existing `/operator/hits` endpoint (in `src/operator.ts`) returns counts by day, outcome, tool, surface and top user agents. Week 2 requires three additional views:

#### 2.3.1 Revenue by tool per day

A cross-tabulation of `tool_id × day → { paid_calls, gross_usdc }` derived from rows where `outcome = 'paid'`.

SQL query pattern (for reference; added to a new `src/analytics.ts` module):
```sql
SELECT
  tool_id,
  ts::date AS day,
  COUNT(*) AS paid_calls,
  SUM(amount_atomic) / 1000000.0 AS gross_usdc
FROM x402_hits
WHERE outcome = 'paid'
GROUP BY tool_id, ts::date
ORDER BY day DESC, gross_usdc DESC;
```

#### 2.3.2 Conversion funnel per tool

For each tool: `{ challenges_issued, payments_attempted, payments_verified, calls_paid, conversion_rate }` where `conversion_rate = calls_paid / challenges_issued`.

SQL query pattern:
```sql
SELECT
  tool_id,
  COUNT(*) FILTER (WHERE outcome = '402_issued')   AS challenges_issued,
  COUNT(*) FILTER (WHERE outcome IN ('paid','verify_failed','settle_failed')) AS payments_attempted,
  COUNT(*) FILTER (WHERE outcome IN ('paid','settle_failed')) AS payments_verified,
  COUNT(*) FILTER (WHERE outcome = 'paid')          AS calls_paid,
  ROUND(
    COUNT(*) FILTER (WHERE outcome = 'paid') * 100.0
    / NULLIF(COUNT(*) FILTER (WHERE outcome = '402_issued'), 0),
    1
  ) AS conversion_pct
FROM x402_hits
GROUP BY tool_id
ORDER BY calls_paid DESC;
```

#### 2.3.3 Repeat-payer rate (by day window)

For each payer address: total paid calls and number of distinct days on which they paid. Exposed as aggregate only — no individual payer addresses returned in the API response.

SQL query pattern:
```sql
SELECT
  COUNT(DISTINCT payer_address)                                  AS distinct_payers,
  COUNT(DISTINCT payer_address) FILTER
    (WHERE call_count > 1)                                       AS repeat_payers,
  AVG(call_count)                                               AS avg_calls_per_payer
FROM (
  SELECT payer_address, COUNT(*) AS call_count
  FROM x402_hits
  WHERE outcome = 'paid' AND payer_address IS NOT NULL
  GROUP BY payer_address
) sub;
```

#### 2.3.4 API surface for analytics

Add `GET /operator/analytics2` (name avoids clobbering the existing process-level `/operator/analytics`):

- Auth: same `Bearer <OPERATOR_TOKEN>` bearer check as `/operator/hits`.
- Query params: `?days=7` (default 7, max 90), `?format=json` (default html).
- JSON response:
```json
{
  "scope": "supabase_analytics",
  "window_days": 7,
  "revenue_by_tool_day": [...],
  "conversion_by_tool": [...],
  "repeat_payer_summary": { "distinct_payers": 0, "repeat_payers": 0, "avg_calls_per_payer": 0 }
}
```
- HTML response: three tables (revenue, funnel, payer).

**No new Supabase tables or migrations needed** — all queries run against the existing `x402_hits` table.

---

## 3. Task checklist

An ordered checklist for a coding agent. **HUMAN** markers require Nathaniel's explicit authorisation before proceeding; the coding agent stops before those steps.

### Phase 0 — Gate: production pipeline live (HUMAN steps)

- [ ] **[HUMAN-01]** Review uncommitted working-tree diff (`git diff --stat HEAD`). Approve or request changes. Commit in logical chunks on a new branch (X1 → X2 → X3 → any needed fixups). Push.
  - Acceptance: `git status` shows clean tree; branch pushed to remote.

- [ ] **[HUMAN-02]** Apply both Supabase migrations in order:
  1. `supabase/migrations/20261005000000_x402_hits.sql`
  2. `supabase/migrations/20261006000000_x402_hits_outcomes.sql`
  - Acceptance: `psql -c "\d x402_hits"` shows the `ok` and `400` values in the `outcome` check constraint.

- [ ] **[HUMAN-03]** Set all required Vercel env vars for production (`TEST_MODE=week1`, `STUB_MODE=0`, `PAY_TO`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HIT_LOG_SALT`, `OPERATOR_TOKEN`, `GATEWAY_BASE_URL`). Do **not** echo values here.
  - Acceptance: `vercel env ls --environment=production` lists all required keys without values.

- [ ] **[HUMAN-04]** Deploy to Vercel production: `vercel --prod`.
  - Acceptance: `curl https://<vercel-url>/health` returns `{"ok":true,...}`.

- [ ] **[HUMAN-05]** Update Hostinger DNS: point `api.defifintechdirectory.com` A/CNAME to Vercel.
  - Acceptance: `curl https://api.defifintechdirectory.com/health` returns `{"ok":true,"paymentsLive":true}`.

- [ ] **[HUMAN-06]** Smoke test live payments: send one real `$0.001` USDC payment to `text_sha256` from a funded wallet.
  - Acceptance: `/operator/hits?format=json` shows one `outcome: "paid"` row.

### Phase 1 — Discovery listings (HUMAN steps)

- [ ] **[HUMAN-07]** Submit updated MCP Registry listing (`server.json` v1.1.0):
  1. Generate Ed25519 key pair; store private key in `MASTER.env` as `MCP_REGISTRY_ED25519_PRIVATE`.
  2. Add DNS TXT on `defifintechdirectory.com`: `v=MCPv1; k=ed25519; p=<PUBLIC_KEY_BASE64>`.
  3. Run `mcp-publisher publish`.
  - Acceptance: `mcp-publisher validate` exits 0; registry.modelcontextprotocol.io shows v1.1.0.

- [ ] **[HUMAN-08]** Submit to x402scan.com (wallet signature required — see `docs/WEEK1-SUBMISSIONS.md` §2).
  - Acceptance: `https://x402scan.com` shows gateway with 10+ tools.

- [ ] **[HUMAN-09]** (Optional) Submit to mcp.so via web form — see `docs/WEEK1-SUBMISSIONS.md` §4.

### Phase 2 — Five new tools (coding agent tasks)

All tasks in this phase are code-only; no deploy, no env-var changes, no secrets.

**Precondition:** Phase 0 commits are merged (HUMAN-01 done) so week-2 code lands on top.

- [ ] **[A1]** Implement `semver_compare` in `src/x3-tools.ts` following the spec in §2.1.
  - Implementation: add to `X3_TOOLS` array. Use Node `parseInt` only; no new imports.
  - Acceptance test: `npm test` passes; new test cases for semver_compare in `test/week2.test.js` cover all 6 cases from §2.1.

- [ ] **[A2]** Implement `hex_rgb_convert` in `src/x3-tools.ts` following the spec in §2.1.
  - Implementation: add to `X3_TOOLS` array. Pure math; no new imports.
  - Acceptance test: `npm test` passes; test cases cover all 6 color inputs in §2.1.

- [ ] **[A3]** Implement `markdown_word_count` in `src/x3-tools.ts` following the spec in §2.1.
  - Implementation: add to `X3_TOOLS` array. Use `String.prototype.replace` and regex; no new imports.
  - Acceptance test: `npm test` passes; test cases cover all 5 markdown inputs in §2.1.

- [ ] **[A4]** Implement `json_schema_validate` in `src/x3-tools.ts` following the spec in §2.1.
  - Implementation: use `new Ajv({ strict: false, allErrors: true })` (already a dependency). Add depth/property-count guard before `compile()`.
  - Acceptance test: `npm test` passes; test cases cover all 5 cases in §2.1 including external-`$ref` rejection.

- [ ] **[A5]** Implement `uuid_generate` in `src/x3-tools.ts` following the spec in §2.1.
  - Implementation: use `randomUUID()` from `node:crypto` (already imported). Add to `X3_TOOLS` array.
  - Acceptance test: `npm test` passes; test cases cover count=1, count=5, count=20.

- [ ] **[A6]** After A1–A5: run full gate:
  - `npm test` — all tests pass (target ≥ 74: current 59 + ≥ 15 new).
  - `npm run typecheck` — 0 errors.
  - `npm run lint` — 0 errors.
  - `TEST_MODE=week1 npm run capability:validate` — 17 manifests, 15 public.
  - `TEST_MODE=week1 npm run discovery:build` — 5 artifacts, each containing 15 tools.
  - Record results in `_codex/R1-week2-tools-results.md`.

### Phase 3 — Analytics view (coding agent task)

- [ ] **[A7]** Implement `GET /operator/analytics2` in `src/operator.ts` (or a new `src/analytics.ts` imported by `src/app.js`):
  - Query params: `days` (1–90, default 7), `format` (`json` | `html`).
  - Auth: same bearer check as `/operator/hits`.
  - Calls `SupabaseWeek1Store.readHits()` (existing method returning all rows) and computes the three analytics views from §2.3 in-process from the row array. No new Supabase RPC needed.
  - Conservative choice: re-use `readHits()` rather than direct SQL; this avoids new migration and stays within the 100k-row guard. Document the row-count limitation.
  - HTML response: three `<table>` sections: "Revenue by tool/day", "Conversion funnel by tool", "Repeat-payer summary".
  - Acceptance test: unit test in `test/week2.test.js` constructs a mock row array and asserts correct totals for each view.
  - `npm test` passes.

- [ ] **[A8]** Update `server.json` description to mention 15 tools (currently says 10-tool profile).
  - Acceptance: `server.json` `"description"` field updated; `npm run capability:validate` still passes.

### Phase 4 — Pricing review (HUMAN step after data)

- [ ] **[HUMAN-10]** After 7 days of live traffic: review `/operator/analytics2` output. Decide whether to adjust any x3-tool prices.
  - Nathaniel must explicitly approve any price change.
  - The coding agent must not change any `priceAtomic` values without a written instruction from Nathaniel.

### Phase 5 — Deploy week-2 tools (HUMAN step)

- [ ] **[HUMAN-11]** Review week-2 code (A1–A8). Commit and push on the same branch or a new `week2/tools` branch.
  - Acceptance: branch pushed, PR or review opened.

- [ ] **[HUMAN-12]** Deploy to Vercel production: `vercel --prod`.
  - Acceptance: `curl https://api.defifintechdirectory.com/health` still returns `{"ok":true,...}`.
  - Acceptance: `curl https://api.defifintechdirectory.com/.well-known/x402` returns 15 tools.

- [ ] **[HUMAN-13]** Update MCP Registry listing to v1.2.0 (reflecting 15 tools).
  - Acceptance: registry.modelcontextprotocol.io shows v1.2.0.

---

## 4. Unknowns and conservative choices recorded

| Item | Conservative choice | What would change it |
| --- | --- | --- |
| Demand for new tools | Priced at $0.001 (minimum viable signal) | Observed paid calls > 10/day per tool → raise price |
| Supabase row-count guard | `readHits()` capped at 100,000 rows; analytics2 uses in-process aggregation | Add a direct SQL analytics RPC if row count exceeds 50k |
| `json_schema_validate` external `$ref` | Rejected with `schema_too_complex` | Allowlist explicit safe base URIs in a future iteration |
| `semver_compare` pre-release sorting | Pre-release stripped and ignored | Implement SemVer 2.0 pre-release sort if agents request it |
| MCP Registry key management | `mcp-publisher` DNS-namespace path; private key stays in MASTER.env | n/a |
| `/operator/analytics2` naming | Avoids overwriting existing `/operator/analytics` (in-process) | Can be merged or renamed after production analytics2 is validated |
| `uuid_generate` version | Only v4; enum enforced | Add v7 (time-ordered) if agents request it |

---

## 5. Out of scope for week 2

- No changes to prices of existing 10 tools without Nathaniel's approval.
- No new Supabase tables or migrations (analytics2 uses existing `x402_hits`).
- No Stripe, browser payment, or human-facing checkout changes.
- No human-track tools (PDF merge, image OCR, image conversion) — separate track, separate spec.
- No `STUB_MODE` change, no env-var edits, no Vercel config edits — all HUMAN steps.
- No git push, no deploy, no listing submission from a coding agent run.
- No companion_book_outline or stickman_short_script promotion — still placeholders.

---

*End of spec. Last updated: 2026-10-07 by R1 (Kiro, unattended).*
