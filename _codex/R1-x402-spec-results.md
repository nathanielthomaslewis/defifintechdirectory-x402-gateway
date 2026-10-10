# R1 — x402 gateway week-2 spec results

Date: 2026-10-07. Spec-only task. No source files, env vars, secrets, migrations, or deployments were touched.

## What was done

Read all source, discovery, test, migration, and `_codex` files. Wrote `specs/WEEK2-SPEC.md` (642 lines).

## Files written

| Path | Action |
| --- | --- |
| `specs/WEEK2-SPEC.md` | Created (new file, new directory `specs/`) |
| `_codex/R1-x402-spec-results.md` | Created (this file) |

No existing file was modified or overwritten. No `.bak` backup needed.

## Spec contents summary

**§1 Requirements (8 items):**
R1 production pipeline live, R2 Supabase migration applied, R3 git committed, R4 discovery listings, R5 analytics observable, R6 pricing experiment ($0.001 tools ≥ 10 paid calls by day 14), R7 uptime ≥ 99%, R8 five new tools shipped.

**§2.1 Five new tools designed:**
- `semver_compare` — version string ordering, $0.001, 6 test cases
- `hex_rgb_convert` — color-code conversion (hex/rgb/hsl), $0.001, 6 test cases
- `markdown_word_count` — strip markdown, count words/chars/paragraphs, $0.001, 5 test cases
- `json_schema_validate` — Ajv validation with depth/complexity guard, $0.005, 5 test cases
- `uuid_generate` — v4 UUID batch (1–20), $0.001, 3 test cases

All five: no fetch, no paid API, Node built-ins only, follow existing x3-tools.ts pattern.

**§2.2** Pricing table for all 15 tools post-week-2.

**§2.3** Analytics view spec: revenue-by-tool-day, conversion funnel, repeat-payer rate — all via in-process aggregation over existing `readHits()` rows; no new migration. New endpoint `/operator/analytics2`.

**§3 Task checklist:** 13 HUMAN steps (HUMAN-01 through HUMAN-13) and 8 coding-agent tasks (A1–A8). HUMAN steps cover: git commit/push, Supabase migration apply, Vercel env vars, Vercel production deploy, DNS, live smoke, MCP Registry, x402scan, pricing review, final deploy and listing update. Coding-agent tasks cover: 5 tool implementations + gate, analytics2 endpoint, server.json update.

## Conservative choices

- New tool prices set at $0.001–$0.005 (minimum signal tier); no price changes to existing tools without Nathaniel's yes.
- `json_schema_validate` rejects external `$ref` with `schema_too_complex` rather than fetching schemas.
- `semver_compare` strips pre-release suffixes rather than implementing full SemVer 2.0 sort.
- Analytics2 uses in-process aggregation over `readHits()` (capped at 100k rows) to avoid a new Supabase RPC/migration.
- `/operator/analytics2` name keeps the existing in-process `/operator/analytics` untouched.
- `uuid_generate` version 4 only; enum-validated in input schema.

## Items left for a human

All HUMAN steps listed in §3. Most critical path: HUMAN-01 (git commit) → HUMAN-02 (Supabase migration) → HUMAN-03 (env vars) → HUMAN-04 (Vercel deploy) → HUMAN-05 (DNS) → HUMAN-06 (live smoke). Without these the gateway has no live traffic and no analytics data.

## Nothing changed in production

No secrets, no env vars, no migrations, no deploys, no registry submissions, no network calls outside the local filesystem.

JOURNAL: R1-x402-spec: wrote specs/WEEK2-SPEC.md (642 lines, 8 requirements, 5 new tool designs with schemas and test cases, analytics view spec with 3 SQL patterns, 21-task ordered checklist marking 13 HUMAN steps and 8 coding-agent tasks); no source/env/deploy changes; human must commit working tree, apply Supabase migrations, set Vercel env vars, deploy to production, point DNS, submit MCP Registry and x402scan listings before any real paid calls can occur.
