# Human demand research

Date of research: 2026-10-03. Zone: Europe/London. Method limited to public WebSearch and WebFetch. No paid SEO APIs, no Keyword Planner login, no purchases, no messages, no DNS, no deploy, and no edits to implementation or to the existing agent-research files.

## Separation from the agent / x402 track

This note is a separate human track for a browser site. People pay by card checkout and prepaid credits. There is no crypto wallet.

One registry can serve browser users and agents later. That architecture fact is not demand evidence. Agent-track figures are cited here only so they are not reused:

- A CDP Bazaar snapshot dated 2026-10-03 had 24,364 unique resource URLs and 797,661 summed calls. Payer counters must not be added across rows. Those calls are not human purchases.
- Content tools that were UNKNOWN on the agent track (game kit, prompt pack, book outline, short script, ship gate) are still UNKNOWN for humans. This pass did not find an official price for them.

Brave Search API and Firecrawl are easy to misread as human demand. Brave's own page sells the API to agents and chatbots at $5 per 1,000 requests. Firecrawl sells credits to people building crawls, and its pricing page addresses AI agents. Those prices are recorded in the CSV as vendor prices. They are not counted as human checkout demand.

## What was scored

Fifty fixed intents. The list is a candidate inventory, not evidence that anyone wants them.

Weights, applied only where a dimension has evidence. A missing dimension is not given a midpoint.

| Dimension | Weight | Rule |
| --- | --- | --- |
| Human paid-demand evidence | 30% | Proxies only: a fetched price or a complaint-backed job. Otherwise missing. |
| Competitive saturation | 20% | Higher score means fewer named current competitors in this pass. Crowded lowers the opportunity score. Not a census. |
| Time to a reliable small build | 15% | ESTIMATE. hours-to-days scores higher than multi-week. |
| Unit-economics bound | 15% | Scored only when a per-job cost and a price proxy both exist. |
| Organic distribution fit | 10% | ESTIMATE. No paid ads unless Nathaniel later says so. |
| Small original tool vs licensed data | 10% | ESTIMATE. Licensed people-data and unpriced keyword data score low. |

Dimension scores are 0 to 10. Partial points = sum(weight × score) over scored dimensions only. The maximum if every dimension scored 10 is 10. A missing dimension adds zero and is named in `score_coverage`. Do not renormalize. A tool with demand missing cannot be compared to a tool with demand scored just by looking at the raw fraction.

Persona labels are INFERENCE on every row. No usage study was fetched. Keyword volume is UNKNOWN on every row. Google Trends was not fetched as a dated series, so no monthly search number is stated.

Confidence is LOW or MEDIUM. MEDIUM means the fetched vendor page named the feature and showed a currency amount. It does not mean volume, conversion, or ROI is known. Nothing is HIGH.

## Coverage

Official competitor price means a currency amount rendered on a vendor's own page fetched on 2026-10-03 for a product that does the job or bundles it. Search-snippet prices were not used. Affiliate roundups were not used.

- 17 of 50 have such a price: file conversion, PDF merge, PDF compression, PDF text extraction, image resize/crop, image format conversion, image OCR, invoice extraction, receipt categorization, URL to Markdown, structured page extraction, URL screenshot, SEO audit, privacy-policy drafting, dependency audit, API contract testing, web search.
- 33 of 50 are UNKNOWN on official price for the exact job. Some of those mention an adjacent price in the same cell and still start from UNKNOWN (Etsy listing pack, keyword snapshot, schema markup, page metadata, MCP scaffold, API response validation).

Of the 17, several are the wrong shape for a human credit pack:

- Web search, URL to Markdown, and structured page extraction are developer or agent APIs.
- Invoice, receipt, dependency audit, SEO audit, and API contract testing are platform or API prices. Expensify's human plan price did not render. Apollo's dollar amounts did not render.
- The clearest individual card prices are iLovePDF and iLoveIMG at $9 billed monthly or $60/year, Sejda's $5 week pass, and Termly's Pro+ figure of $20 with an ambiguous billing period.

Human paid-demand dimension is missing on 34 of 50 rows. Unit economics is scored on 2 of 50 (invoice and receipt) and missing on 48. Stripe fees were not fetched, so they are UNKNOWN everywhere. Hosting cost for a local library is UNKNOWN everywhere.

People enrichment is not ranked up. The Apollo page fetched on 2026-10-03 showed no dollar amount and said standard plans are internal use only. License cost is UNKNOWN. Scraping personal data is not a recommendation.

## B2C versus small business

Fetched individual offers: iLovePDF Premium and iLoveIMG Premium at $9/month or $60/year, Sejda Web Week Pass at $5 for 7 days, Termly free plan of one basic policy plus a Pro+ amount. INFERENCE: these are built for a person who hits a limit on a single task.

Fetched small-business or team offers: Veryfi Starter at $500/month minimum and per-document rates; Snyk Team at $25/month for up to 10 developers; Screaming Frog at €245 per licence per year; Postman Solo and Team per user; eRank shop plans at $5.99, $9.99, and $29.99 per month (adjacent to Etsy research, not to a listing pack); Firecrawl and Brave API plans. Apollo and TubeBuddy name team or creator plans but their dollar amounts did not render. Adobe Acrobat is the obvious SMB PDF suite and its dollar amount did not render, so it is not cited as a price.

For a first release of three prepaid tools, B2C and prosumer is the stronger fit. The job can finish in one sitting, the price can be shown before payment, and the fetched substitutes already take a card from an individual. Small-business tools in this pass are mostly seats, crawlers, or API minimums. Those match a subscription or a sales conversation, which is later scope. The receipt and invoice jobs are real SMB jobs and still lose v1 because reliability and license-like API cost are not a fast dependable build.

A small business that occasionally merges a PDF is the same person as the B2C user. That overlap is INFERENCE. It is not a reason to launch seat pricing.

## Credits versus subscription

v1 should be bounded prepaid credits. Reasons from fetched pages, not from a forecast:

- The approved PRD already prefers credits over subscriptions for the initial release.
- CloudConvert sells non-expiring packages and subscriptions, and says subscriptions can be up to 50% cheaper while unused subscription credits do not roll over. Copying the cheaper subscription before repeat human use is observed would charge people for expiry they may not want.
- iLovePDF, iLoveIMG, Screaming Frog, Postman, Snyk, eRank, and Termly sell subscriptions. That shows subscriptions exist. It does not show that Nathaniel's first buyers want one.

A subscription would be later scope only if external humans repeatedly buy another credit pack. The launch brief defines that as an observed second paid job. It is not designed here.

## Three tools

Recommended, not approved to charge or deploy:

1. PDF merge. Fast, exact, individual price proxy, free unlimited substitute (PDF24) so the experiment can fail.
2. Image OCR. Bounded Vision API list price, bundled consumer proxy, narrow text output.
3. Image format conversion. Fast, exact iLoveIMG proxy, and the first tool to stop if free local apps win.

Detail, hypotheses, falsifiers, and landing copy are in HUMAN_TOP3_LAUNCH_BRIEF.md. Invoice extraction has a full weighted score and still loses. People enrichment loses. URL screenshot loses on security. SEO audit loses on build time.

## Scoring notes that matter

PDF merge earns 5.30 points out of 10 with 0.85 weight covered (unit economics missing, worth up to 1.50 points unscored). That is not "53% demand." Demand for merge was scored 7/10 on the proxy only.

Invoice extraction earns 4.30 with nothing missing, including a unit score of 4/10 because Document AI lists $0.10 per invoice count and Veryfi lists $0.16 per invoice, before fees. Receipt categorization earns 3.70, with unit score 2/10 because the expense parser lists at $0.10 and Veryfi lists receipts at $0.08.

People enrichment earns 1.30 with demand and unit economics missing (covered weight 0.55).

## Limitations

- Keyword volume UNKNOWN for all 50. No dated Google Trends series was fetched. No monthly search number is invented.
- Conversion, repeat rate, and ROI UNKNOWN. Stop-rule numbers in the brief are experiment thresholds, not predictions.
- No independent complaint thread was fetched. Reddit timed out or returned 403. A Stack Overflow URL returned 404. Complaint cells are vendor terms or explicitly empty. Do not treat vendor marketing quotes as user complaints. PDF24 and Smallpdf host positive quotes; those are not testimonials for Nathaniel and are not reused as social proof.
- JavaScript pricing pages often hid the number: Smallpdf dollar amount, Adobe Acrobat, Apollo seat prices, TubeBuddy, Expensify, Jina paid token price, CloudConvert slider amounts, ScreenshotOne Growth and Scale, Mindee's currency symbol on the "44/month" figure. Those stay UNKNOWN or are quoted only as the broken text.
- OCR.space describes quotas and "custom servers starting at US$999/month" but the PRO monthly dollar price did not appear in the fetch. The same page states more than one free quota. Both are left as written.
- Screaming Frog's visible price was €245 per year on 2026-10-03. The page schema says dateModified 2024-01-18. The figure is what rendered; it is not a guarantee the price changed or did not change since 2024.
- Stripe and other facilitator fees UNKNOWN.
- No FX conversion between USD, EUR, GBP, and the Mindee figure. Hypothesis packs are in GBP because Nathaniel is in Europe/London. They are not a conversion of the USD proxies.
- Competitor lists are what this pass fetched, not a market census. "None found" is not an open market.
- Build times are ESTIMATE. Organic channels are ESTIMATE.
- Cloud Vision and Document AI prices are list rates for those APIs if called. They are not a forecast of Nathaniel's bill.
- No LLM token price was fetched, so generative kits have UNKNOWN unit cost.

## File hashes

SHA-256 of the other two files, computed on the box before this note was frozen:

- HUMAN_CAPABILITY_RANKING_50.csv: 4a04ec833f2176e9069f74a3e8b4a18c45199e7b0fd8c597df4ff6631d052043
- HUMAN_TOP3_LAUNCH_BRIEF.md: fc21e5b5fc2d6d53fc0e8b6f25d209cbda40e387ce6b87561a61be45e64d23c5

The full-file SHA-256 of this markdown is not written inside itself, because embedding it would change the bytes. Copy verification uses the full-file digest computed after this file was saved. HASHES.txt was not edited.

## Source list

All fetches 2026-10-03 unless noted. "Rendered" means a currency amount or a concrete quota was in the fetched text. "No amount" means the page was fetched and the price did not render.

| URL | What it supplied |
| --- | --- |
| https://www.ilovepdf.com/pricing | Premium $5/month annually ($60) or $9 monthly. Free tier limited. |
| https://www.iloveimg.com/pricing | Same $5 / $60 / $9 shape for image tools. |
| https://www.iloveimg.com/help/documentation | Resize and convert behavior. Copyright line says 2026. |
| https://www.sejda.com/upgrade | Web Week Pass $5 for 7 days, not a subscription. Monthly amount did not render. |
| https://smallpdf.com/pricing | Feature matrix and download limits. Dollar amount did not render. |
| https://smallpdf.com/da/pricing | Danish feature matrix. Dollar amount did not render. |
| https://smallpdf.com/blog/smallpdf-free-vs-pro-plan-comparison | Published 2026-08-03. Free vs Pro behavior. No dollar amount. Trustpilot quote dated 2025-12-20 is vendor-hosted and positive. |
| https://tools.pdf24.org/en/merge-pdf | Free merger. Vendor-hosted positive quotes, undated. |
| https://cloudconvert.com/pricing | Free 10 credits/day. Package versus subscription rules. Slider amounts did not render. €0 shown for Free. |
| https://cloudconvert.com/apis/file-conversion | Starting at $0.008 per file when converting 10,000 files. |
| https://ocr.space/OCRAPI | Free quotas and US$999/month custom servers. PRO dollar price not in the extract. |
| https://github.com/tesseract-ocr/tesseract | Free OCR engine. |
| https://cloud.google.com/vision/pricing | Text Detection $1.50 per 1,000 units after 1,000 free, then $0.60. |
| https://cloud.google.com/document-ai/pricing | Invoice parser and expense parser $0.10 per count, up to 10 pages. Enterprise OCR $1.50 per 1,000 in the middle tier. |
| https://www.veryfi.com/pricing/ | $0.16 per invoice, $0.08 per receipt, Starter $500/month minimum, free 100 docs/month. |
| https://www.mindee.com/pricing | "44/month" billed annually, "≈ 0.044 each", FAQ "starting from $0.05". Currency glyph on 44 did not survive. |
| https://www.expensify.com/pricing | Fetched. No plan price in the extract. |
| https://www.firecrawl.dev/pricing | USD credits. Effective 2026-09-04. Hobby $19 monthly or $16 annually per month for 5,000 credits. |
| https://jina.ai/reader/ | Reader free at 20 RPM without a key. Paid token dollars did not render. Pricing-model note dated 2025-05-06. |
| https://screenshotone.com/pricing/ | Basic $17/month, 2,000 screenshots, $0.009 extra, 100 free. |
| https://www.screamingfrog.co.uk/seo-spider/pricing/ | €245 per year. Free 500 URL crawl. Schema dateModified 2024-01-18. |
| https://wave.webaim.org/ | Free evaluator. Subscription API mentioned, no price. |
| https://termly.io/pricing/ | Free one policy. Pro+ displayed as $20. Billing period ambiguous. |
| https://www.postman.com/pricing/ | Free, Solo $12 monthly or $9 annually, Team $23 or $19 per user. |
| https://snyk.io/plans/ | Team $25/month for up to 10 developers, as rendered. Free tier. Enterprise custom. |
| https://erank.com/plans | $5.99, $9.99, $29.99 per month and annual totals $65.99, $94.99, $269.99. Adjacent to Etsy research. |
| https://www.tubebuddy.com/pricing | Plan names. No dollar amount rendered. |
| https://www.apollo.io/pricing | Plan names and a resale restriction. No dollar amount rendered. |
| https://brave.com/search/api/ | Search $5 per 1,000 requests. Answers $4 per 1,000 plus $5 per million tokens. Agent framing. |
| https://squoosh.app/ | Free local image compression. |
| https://openrefine.org/ | Free open-source data cleaning. |
| https://crontab.guru/ | Free cron editor. |

Failed fetches, not used as quotes: https://www.reddit.com/r/pdf/comments/1uywfzk/how_do_you_combine_multiple_pdfs_quickly_without/ (timeout), https://old.reddit.com/r/pdf/comments/1uywfzk/how_do_you_combine_multiple_pdfs_quickly_without/ (403), https://stackoverflow.com/questions/6088980/how-can-i-merge-many-pdf-files-into-one (404).

Not used: Ahrefs, Semrush, Similarweb paid, Google Ads Keyword Planner, affiliate price roundups, and any dollar figure that appeared only in a search synthesis.
