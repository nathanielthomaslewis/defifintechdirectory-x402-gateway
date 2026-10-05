# Human top-3 launch brief

Date: 2026-10-03 (Europe/London). Author: human-demand research pass. These are recommendations only. They are not approval to charge live, open checkout, deploy, or edit the gateway implementation. Codex owns implementation. No ads.

This track is browser humans paying with prepaid credits. It is not the agent/x402 track. Firecrawl credits, Brave Search API calls, and CDP Bazaar payer counts are not evidence that a person will buy these tools.

Keyword volume, conversion, and ROI are UNKNOWN. Prices below marked HYPOTHESIS are experiment designs, not forecasts and not currency conversions of competitor USD prices.

## Why these three

The rule used: fastest dependable build, a concrete job, a fetched price proxy, and a cost that is either bounded or honestly UNKNOWN. They are not "the three highest scores." Partial scores are not demand.

| Tool | Partial score | What is missing |
| --- | --- | --- |
| PDF merge | 5.30/10 on covered weight 0.85 | Unit economics (no per-job cost bound) |
| Image format conversion | 5.00/10 on covered weight 0.85 | Unit economics |
| Image OCR | 4.45/10 on covered weight 0.85 | Unit economics (cost bound exists, but no per-image consumer price) |

Invoice extraction scores 4.30/10 with full weight coverage and still loses: the build is multi-week, the $0.16 and $0.10 figures are API list rates, and Veryfi Starter is a $500/month minimum. Receipt categorization scores 3.70/10 and loses because Document AI's expense parser lists at $0.10 per count while Veryfi lists receipts at $0.08, so a resale margin is not shown. People enrichment scores 1.30/10 on only 0.55 weight because the license dollar cost is UNKNOWN.

## 1. PDF merge

**Who.** B2C and prosumer, not a sales-led SMB seat. iLovePDF sells an individual Premium plan at $9 billed monthly or $5/month ($60 billed annually), and Sejda sells a $5 Web Week Pass for 7 days (both fetched 2026-10-03). INFERENCE: the buyer is a person merging a few files for an application or email. A small business that lives in Acrobat was not priced (Adobe's dollar amount did not render). SMB is the weaker fit because the fetched business offers are either the same individual plan with more seats or custom "let's talk" pricing, not a simple credit job.

**Experiment.** Sell one merged PDF. Organic channel: a single public landing page for the task. No ads. No community posting unless Nathaniel later approves a specific post. Credit pack HYPOTHESIS: 20 successful merges for £5, credits do not expire for 12 months, failed merges (encrypted or corrupt input) do not consume a credit. Success metric: distinct external humans who pay and download a merged file, and how many of those humans pay for or spend a credit on a second job on a later day within 45 days of launch. Page views do not count. A self-test does not count. Falsifier: after 45 days public with no ads, fewer than 5 distinct external paying humans, or zero of those payers does a second paid job on a later day. Stop rule: stop this tool, do not add a subscription, do not start ads. The "5" is a stop rule, not a market-size claim.

**Scope.** Smallest useful output: one PDF containing the selected pages in the chosen order. Non-goals: OCR, compression profiles, editing text, e-sign, watermarks, account storage, and a 200-format converter.

**Landing copy.** Headline: Merge PDFs into one file. You get one PDF back, in the order you chose, for a price shown before you pay. Credits are prepaid. There is no wallet and no subscription in this version.

**Credits vs subscription.** v1 is bounded prepaid credits. A subscription would be later scope only if the same humans repeatedly buy another pack inside the 45-day window. That result is not assumed. iLovePDF's subscription is a competitor fact, not a launch design.

## 2. Image OCR

**Who.** B2C and prosumer: a person with a photo or scan who wants the text, not structured invoice fields. INFERENCE. SMB bookkeeping is the weaker fit. Invoice and receipt APIs are priced per document (Veryfi $0.16 per invoice, $0.08 per receipt, Document AI $0.10 per count) and Veryfi's Starter minimum is $500/month. That is a different product. iLovePDF bundles OCR inside the same $9/month or $60/year Premium plan. That is a bundle proxy, not a per-image consumer price.

**Experiment.** Sell plain text extracted from one image. Organic channel: one landing page, no ads. Pack HYPOTHESIS: 30 images for £5, unused credits kept for 12 months, a failed or empty read does not consume a credit. Cost context, not a margin claim: Google Cloud Vision Text Detection lists at $1.50 per 1,000 units after 1,000 free units per month (fetched 2026-10-03), which is $0.0015 per image in that tier. Stripe fees and GBP/USD conversion were not fetched, so contribution margin is UNKNOWN. Success metric: external paying humans who download text, and a second paid image on a later day within 45 days. Falsifier: fewer than 5 distinct external payers in 45 days, or none returns for a second paid image, or repeated users say the text is unusable (qualitative stop, not a made-up accuracy rate). Stop rule: stop, no subscription, no ads, no expansion into invoices.

**Scope.** Smallest useful output: UTF-8 text of one image, plus a one-line warning that it can be wrong. Non-goals: line-item invoices, receipt categories, searchable PDF, handwriting guarantees, translation, and identity documents.

**Landing copy.** Headline: Get the text out of a photo. Upload one image and download the text. The price is a prepaid credit pack, not a subscription and not a wallet.

**Credits vs subscription.** Prepaid credits for v1. A subscription would need evidence that the same people OCR images often enough to prefer a month of access. That frequency is INFERENCE only and is not established.

## 3. Image format conversion

**Who.** B2C. A person who needs HEIC, WEBP, PNG, or a similar still image as JPG or PNG for a form. INFERENCE from iLoveIMG's convert features. iLoveIMG Premium is $9 billed monthly or $5/month ($60 annually), fetched 2026-10-03. SMB is weaker: a studio that batch-converts all day is closer to CloudConvert's API ($0.008 per file at a stated 10,000-file volume) than to a 40-file credit pack, and that volume price is not evidence of human pack demand.

**Experiment.** Sell one converted still image. Organic channel: one landing page aimed at a single pair (HEIC to JPG). No ads. Pack HYPOTHESIS: 40 conversions for £5, 12-month credit life, failed conversions not charged. Success metric: external paying humans and a second paid conversion on a later day within 45 days. Falsifier: fewer than 5 distinct external payers, or no second jobs, or buyers can name a free tool they prefer (Squoosh was fetched: it runs locally in the browser). Stop rule: stop this tool first if only one of the three fails. It is the most replaceable by a free local app. Do not add formats to chase the failure.

**Scope.** Smallest useful output: one still image in the requested common format. Non-goals: RAW camera pipelines, animation, video, background removal, upscaling, and a 200-format office converter.

**Landing copy.** Headline: Convert a HEIC photo to JPG. You download one JPG. You pay with prepaid credits. No subscription and no wallet.

**Credits vs subscription.** Prepaid credits for v1. A subscription would be justified only after repeat paid jobs from the same humans. CloudConvert's own page says subscriptions can be up to 50% cheaper than non-expiring packages and that unused subscription credits expire. That is a reason not to copy a subscription at launch, not a reason to launch one.

## What lost, in short

- PDF compression: same iLovePDF bundle and same buyer as merge, so it is not a separate demand test.
- Invoice and receipt extraction: real API prices, slow to do reliably, human checkout price UNKNOWN, receipt unit spread not favorable on list prices.
- URL screenshot: ScreenshotOne Basic is $17/month and $0.009 per extra render, but arbitrary URL rendering is security-heavy.
- URL to Markdown and structured extraction: Firecrawl prices are real and effective 2026-09-04, and Jina Reader is free at 20 requests/minute without a key. The buyers described are builders, including agents. Not this track.
- SEO audit: Screaming Frog €245/year is real and the build is multi-week.
- SEO brief, keyword snapshot, company enrichment, people enrichment: data licenses UNKNOWN. People enrichment stays licensed-compliant only and is not recommended. Apollo's fetched page showed no dollar amounts and forbids resale on standard terms.
- Web search: Brave Search API is $5 per 1,000 requests and the page sells it to agents. Humans already have free search.
- Privacy policy: Termly showed Pro+ at $20 with an ambiguous billing period, and a generated policy is a liability.
- Dependency audit and sandboxed tests: security and data-feed work, not a small original tool.
- UTM builder, cron builder, JSON/CSV conversion, page metadata: free substitutes, no paid price fetched.
- Launch kits, scripts, outlines, prompt packs, ship gate: no official price and no predictable output. Token prices were not fetched.

## Shared non-goals

No live charge, no deploy, no DNS, no paid ads, no testimonials, no usage totals, no income claims, and no edits to the x402 gateway repo or the nine existing agent-research files.
