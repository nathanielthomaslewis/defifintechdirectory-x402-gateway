# X3 tool selection — 2026-10-07

Source: the 2026-10-03 saved CDP Bazaar snapshot in `HUB-OPS/X402-GATEWAY/research/X402-CAPABILITY-DATA.csv` (24,364 resource rows), its 50-intent ranking, market validation, and opportunity backlog. Calls are observed 30-day resource calls, not purchases. Summed payer counters below are **resource-level payer incidences**, not distinct people or wallets across resources. No catalog refresh was made.

## Category aggregation and scoring

For each `category_use_case`, I summed numeric call and payer counters, used `calls / payer incidences` for repeat, calculated the median parseable USDC price, and took the category's resource count as competition. The requested score is `calls × payer incidences × repeat / (competition + 1)`. With repeat defined as calls/payers, this reduces to `calls² / (competition + 1)`; it is highly sensitive to one busy route and does **not** reward payer breadth. The category labels are coarse host or keyword buckets; 19,695 rows are uncategorized, so I checked exact resource descriptions before selecting products. Competition in the 50-intent sheet is a narrower lexical estimate, and the final seven use that estimate where available.

| Category | Rows | Calls | Payer incidences | Repeat | Median USDC | Competition | Score (approx.) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| host:token_verdict | 1 | 303,991 | 4,625 | 65.73 | .0200 | 1 | 46,205,264,041 |
| host:agent_workflow | 3 | 53,966 | 3 | 17,988.67 | .0020 | 3 | 728,082,289 |
| host:llm_or_search_gateway | 91 | 99,732 | 841 | 118.59 | .0085 | 91 | 108,113,824 |
| host:token_trade_activity | 10 | 34,441 | 30 | 1,148.03 | .0200 | 10 | 107,834,771 |
| host:search_enrich_webreadd | 17 | 41,954 | 100 | 419.54 | .0100 | 17 | 97,785,451 |
| host:search_enrich_reseller | 15 | 38,438 | 488 | 78.77 | .0252 | 15 | 92,342,490 |
| host:token_transfer | 6 | 16,871 | 127 | 132.84 | .0500 | 6 | 40,661,520 |
| host:utility_primitive | 14 | 21,219 | 479 | 44.30 | .0050 | 14 | 30,016,397 |
| host:web_search | 3 | 7,961 | 157 | 50.71 | .0070 | 3 | 15,844,380 |
| host:solana_token_data | 15 | 12,593 | 34 | 370.38 | .0100 | 15 | 9,911,478 |
| host:onchain_read | 70 | 16,258 | 15,155 | 1.07 | .0200 | 70 | 3,722,853 |
| host:social_data | 17 | 3,482 | 126 | 27.63 | .0100 | 17 | 673,574 |
| host:solana_enrichment | 47 | 5,470 | 84 | 65.12 | .0100 | 47 | 623,352 |
| host:seo_trends | 4 | 1,558 | 33 | 47.21 | .0300 | 4 | 485,473 |
| host:travel | 40 | 4,180 | 91 | 45.93 | .0100 | 40 | 426,156 |
| host:onchain_analytics | 71 | 4,679 | 484 | 9.67 | .0500 | 71 | 304,070 |
| kw:web_search | 648 | 10,706 | 1,367 | 7.83 | .0100 | 648 | 176,608 |
| host:multi_tool_utility | 602 | 7,297 | 1,264 | 5.77 | .0030 | 602 | 88,302 |
| host:fx_quotes | 3 | 564 | 416 | 1.36 | .0050 | 3 | 79,524 |
| kw:crawl_extract | 333 | 3,874 | 722 | 5.37 | .0100 | 333 | 44,934 |
| kw:people_company | 117 | 1,967 | 235 | 8.37 | .0200 | 117 | 32,789 |
| kw:social | 267 | 2,507 | 570 | 4.40 | .0100 | 267 | 23,452 |
| kw:image | 59 | 1,144 | 82 | 13.95 | .0500 | 59 | 21,812 |
| kw:crypto_market_data | 283 | 2,361 | 697 | 3.39 | .0080 | 283 | 19,627 |
| kw:llm_inference | 687 | 3,447 | 1,044 | 3.30 | .0060 | 687 | 17,270 |
| kw:onchain_read | 211 | 1,750 | 492 | 3.56 | .0050 | 211 | 14,445 |
| kw:seo | 100 | 1,142 | 186 | 6.14 | .0100 | 100 | 12,913 |
| kw:identity_risk | 326 | 1,849 | 523 | 3.54 | .0200 | 326 | 10,455 |
| kw:fx | 146 | 1,066 | 436 | 2.44 | .0040 | 146 | 7,730 |
| kw:travel | 62 | 608 | 129 | 4.71 | .0100 | 62 | 5,868 |
| kw:weather | 353 | 1,242 | 597 | 2.08 | .0100 | 353 | 4,358 |
| host:crypto_market_data | 38 | 277 | 126 | 2.20 | .0100 | 38 | 1,967 |
| kw:audio | 10 | 69 | 21 | 3.29 | .0040 | 10 | 433 |
| uncategorized | 19,695 | 88,998 | 33,014 | 2.70 | .0100 | 19,695 | 402,140 |

The uncategorized row's competition is its row count, an explicit fallback because its `competition_count` is `UNKNOWN`. Its score is not a product ranking.

## Seven picks

All are bounded, in-memory transforms with no fetch, paid API, key, personal-data lookup, financial/medical/legal opinion, or overlap with the existing game/store-art/ship-gate tools. Prices are exact USDC amounts at or below the closest observed median; demand is weak for several and this is a low-cost test, not a sales forecast. Scores below use the exact analog's calls/payers/repeat and tight competition where the 50-intent sheet supplies it; otherwise I use the count of cited direct analogs as a conservative local competition proxy.

| New tool | Evidence row(s), 30-day calls / payers / repeat | Competition | Score | Observed price; X3 price |
| --- | --- | ---: | ---: | --- |
| `text_sha256` | `agent402.tools/api/hash`: 253 / 12 / 21.08; corroboration `agentbit.app/v1/hash/sha256`: 5 / 3 | 602 coarse host | 106 | $0.001; **$0.001** |
| `json_normalize` | `agent.kihustle.tech/services/json-schema-repair/jobs`: 9 / 6 / 1.5, adjacent repair job | 5 tight | 13.5 | $0.01; **$0.005** |
| `json_csv_convert` | `intel.rallylive.ca/data/json-to-csv`: 3 / 2 / 1.5; `api.x402node.dev/convert/csv-json`: 4 / 1 / 4 | 17 tight | 0.5 | $0.01 and $0.0022; **$0.002** |
| `url_normalize` | `intel.rallylive.ca/data/url-normalize`: 2 / 2 / 1 | 1 direct row | 2 | $0.01; **$0.005** |
| `cron_next_utc` | `agent402.tools/api/cron-next`: 2 / 2 / 1; `schedule-tools.use.x402atlas.com/cron-next`: 3 / 2 / 1.5 | 28 tight | 0.14 | $0.001 and $0.005; **$0.001** |
| `utm_url_build` | `www.tradepilotusa.com/.../url_campaign_builder/execute`: 1 / 1 / 1 | 1 tight | 0.5 | $0.01; **$0.005** |
| `base64_text_codec` | `agentbit.app/v1/util/transform`: 6 / 3 / 2, bundled adjacent transform; `agent402.tools/api/skill/decode-blob`: 53 / 3 / 17.67, broader adjacent decoder | 2 cited | 12 from direct bundle | $0.001 and $0.007; **$0.001** |

The hash and blob-decoder analogs have narrow repeat traffic, not broad buyer evidence. `json_normalize` and `base64_text_codec` have adjacent rather than same-product evidence. UTM and cron have almost no observed demand. They remain picks because they satisfy the strict local-cost filter and provide distinct, verifiable outputs; these caveats should be visible when interpreting X3 traffic. The base64 tool handles ordinary UTF-8 text only; it does not inspect JWTs or secret claims.

## Rejected high-demand categories

| Category / analog | Reason |
| --- | --- |
| Token verdict (303,991 calls, 4,625 payers) | Requires live market/on-chain data and produces a token verdict near financial advice; one route dominates the catalog. |
| LLM/search gateways and web search (up to 99,732 host-bucket calls) | Paid model/search upstream or a maintained search index; no local keyless equivalent. |
| Token trade/transfer and on-chain reads (16,258 on-chain-read host calls, 15,155 payer incidences) | Require network/RPC, live state, and higher financial/security stakes. |
| People/company enrichment (1,967 keyword-bucket calls) | Licensed/compliant data and personal-data risk. |
| URL-to-Markdown (11,930 calls, 9 payers on one route) | Fetch/scraping policy and SSRF controls cannot be established for arbitrary target URLs in this bounded build. |
| Image OCR (273 calls, 6 payers on closest route), PDF/image transforms | Binary payloads and OCR exceed the 4 KB input limit or need extra runtime/libraries. |
| Live domain, SEO, weather, FX, social and travel data | External data source, key/licensing, freshness, or site-terms dependencies. |

No HUB-OPS research file was edited.
