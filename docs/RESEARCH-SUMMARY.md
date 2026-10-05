# Research ingestion — 2026-10-03

## Provenance

Researcher: Grokbot. Supplied observation window: 2026-10-03, approximately 08:16–08:40 BST. Source directory: `D:\AV-HUB\HUB-DASHBOARD\HUB-OPS\X402-GATEWAY\research`. Files were read, not modified or relocated.

| Source | SHA-256 |
| --- | --- |
| X402-MARKET-SNAPSHOT-2026-10.md | 59D01390800B5162D3D2F36DA1C8F3D570CD921863C58064439F0B50FDCAD56E |
| X402-OPPORTUNITY-BACKLOG.md | 3F92E03ABFFB1D5E8BCC8AEEE28F2C7DE3B7074649AD7C41F2186902AA608D87 |
| X402-CAPABILITY-DATA.csv | 387302D3D2E6175F76AAF1324C46CAF5B0B68E8F7888F5FAB1CA7A44CED3FB13 |

Primary source claimed by the researcher: paginated CDP discovery API, `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources?type=http&limit=1000`. Agentic.market was a secondary cross-check. Public listings and protocol homepage counters were separate contextual sources, not evidence of sales for this gateway.

## Local checks actually performed

PowerShell `Import-Csv` independently counted 24,364 rows and 24,364 distinct canonical resource URLs, summed numeric `observed_30d_calls` to 797,661, counted 12,554 one-call resources and 21,755 resources with five or fewer calls. These agree with the markdown. This checks arithmetic in the supplied derived CSV, not authenticity of raw API responses, organic demand, or settlement volume. Raw paginated JSON was not supplied or re-fetched in this continuation.

## Researcher observations, pending raw-data validation

- Calls were highly concentrated: reported top resource 38.1%, top ten 66.4%, top hundred 84.7%. High calls from a small payer set do not prove broad demand.
- Cheap search, RPC reads and model access showed stronger observed usage than content packages. Examples reported: Blockrun chat 84,956 calls / 222 payers; Exa first-party search 6,681 / 87; a Onesource ERC-20 balance endpoint 841 / 833. These are analog resources, not customers of this project.
- The five retained gateway IDs have weak or unproven demand. Prompt packs and manuscript outlines must not inherit image-generation or order-book statistics. Existing prices are historical hypotheses, not willingness-to-pay measurements.
- Reported listed USDC median was $0.01 and 90th percentile $0.05. Price bands describe listings and usage, not elasticity or margins. Upstream costs remain unknown.
- Preflight and listing-health have small observed analogs; directory search may reuse owned data but its paid demand is unknown. Wallet receive-check demand cannot be inferred from wallet balance usage.

## Estimates and unresolved questions

Backlog build times (four hours, one day, three days), qualitative marginal costs and strategic reuse are researcher estimates. They are not execution measurements or product demand. No forecast, revenue, GMV, or weighted opportunity score was computed here. Unique payers must not be summed across resources. Calls multiplied by list prices are not revenue. Protocol-level homepage counters and Bazaar calls are not comparable series.

## Implementation decision

Complete infrastructure work only. Preserve the five IDs as private, noncommercial placeholders. Keep all public discovery surfaces empty. Do not implement M7's ten candidates or select a replacement product yet. A later product decision needs raw-response provenance, internal-vs-organic payer checks, repeated observation windows, actual upstream cost quotes, and an approved experiment with unique-payer criteria. No paid smoke test is authorized by this continuation.
