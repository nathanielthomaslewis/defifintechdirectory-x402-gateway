import type { Capability, Registry, Schema } from './registry.ts';
import { usdToAtomic } from './registry.ts';

// Game-launch bundles: one paid call returns a complete, deterministic launch kit for one platform.
// Content is distilled from the AV Hub ship-game, game-design, game-feel-ux, level-design,
// game-audio and xr-design skills plus the qa-checks pre-launch lists. Platform facts carry a
// "checked" date and a verify note; nothing here claims legal, store or rating approval.

export const FACTS_CHECKED = '2026-10-14';

type Evidence = Record<string, boolean>;
interface Gate { id: string; label: string; weight: number }
export interface BundleDefinition {
  id: string; name: string; priceUsd: string; platform: string; description: string;
  platformInput: Schema; gates: Gate[];
  storeChecklist: string[]; fees: string[]; plan: { d7: string[]; d14: string[]; d30: string[] };
  qualityChecklists: Record<string, string[]>; skills: string[];
}

const QUALITY_CORE: Record<string, string[]> = {
  'Core loop (game-design / ship-game)': [
    'Hook is a verb the player does, not a theme',
    'A 60-second prototype was played 5 times and the tester wanted a 6th run',
    'Win state, lose state and restart without reload all work',
    'Someone who is not the developer finished the first session without instructions',
  ],
  'Game feel (game-feel-ux)': [
    'Input-to-motion under 100 ms; buffers/coyote time tuned where relevant',
    'Every action has visual and audio feedback; impacts have hit-stop',
    'Controls remappable; colour-blind and subtitle options present',
  ],
  'Level design (level-design)': [
    'Each area has a landmark and a lit "go here" cue',
    'Every mechanic follows introduce -> develop -> test -> twist',
    'Greybox playtested at final metrics before art',
  ],
  'Audio (game-audio)': [
    'Every player action has immediate audio feedback; frequent sounds have variations',
    'Separate Music/SFX/VO volume sliders',
    'Loudness measured against target (around -16 LUFS integrated for games/streaming; verify for your platform)',
  ],
  'Pre-launch QA (qa-checks)': [
    'Title and trademark search done; no third-party names, logos or ripped assets',
    'Privacy policy URL live; age rating questionnaire answered honestly',
    'Store copy leads with the verb; screenshots show real gameplay only',
    'Crash-free 30-minute soak test on the lowest target device',
  ],
};

const XR_QUALITY: Record<string, string[]> = {
  'XR comfort (xr-design)': [
    'Frame rate held at 72/90 Hz on the lowest target headset',
    'No camera motion without user input; teleport + snap turn available by default',
    'Seated mode and comfort options persisted between sessions',
    'UI world-anchored at arm\'s length and readable; every interaction has visual, audio and haptic feedback',
    'Headset playtest with comfort scores logged (never editor-only)',
  ],
};

const s = (maxLength = 120): Schema => ({ type: 'string', minLength: 1, maxLength, pattern: '\\S' });

export const BUNDLES: BundleDefinition[] = [
  {
    id: 'roblox_launch_bundle', name: 'Roblox Launch Bundle', priceUsd: '1.00', platform: 'Roblox',
    description: 'One-call Roblox launch kit for a supplied game brief: readiness score, publish checklist (maturity questionnaire, thumbnails, passes), monetisation plan, 7/14/30-day plan, quality gates and store copy draft. No market data is invented.',
    platformInput: { genre_pattern: { enum: ['tycoon_steal', 'obby', 'survival_nights', 'shooter', 'roleplay', 'simulator', 'other'] } },
    gates: [
      { id: 'studio_playtest_passed', label: 'Studio Play Solo + one device test passed', weight: 3 },
      { id: 'first_minute_goal', label: 'Clear goal within the first 60 seconds', weight: 3 },
      { id: 'datastore_saves', label: 'Server-side DataStore saves with retry', weight: 2 },
      { id: 'server_authority', label: 'Currency/inventory validated on the server', weight: 2 },
      { id: 'icon_and_thumbnails', label: 'Icon + 3 thumbnails made', weight: 1 },
      { id: 'maturity_questionnaire', label: 'Maturity & Compliance questionnaire answered', weight: 2 },
      { id: 'passes_configured', label: 'Game passes / developer products configured', weight: 1 },
    ],
    storeChecklist: [
      'Publish place, set public; fill description with the verb-first hook',
      'Complete the Maturity & Compliance questionnaire (experiences without it get limited reach)',
      'Icon 512x512, thumbnails 1920x1080 (up to 10, show real gameplay)',
      'Mobile-first UI: thumb-reachable buttons, readable at phone size',
      'Game passes (permanent) + developer products (consumables); no pay-to-win in competitive modes',
      'Enable analytics; watch D1 retention, session length, payer conversion',
      'Group for the experience; join-bonus perk is common organic growth',
    ],
    fees: [
      'Publishing is free',
      'DevEx: USD 0.0038 per earned Robux standard; USD 0.0054 for eligible age-checked 18+ US spend (from 2026-06-08). Verify current rates and the DevEx minimum and ID requirements before planning cash-out',
      'Roblox Ads/Sponsored are paid; budget only after D1 retention holds',
    ],
    plan: {
      d7: ['Studio playtest and fix blockers', 'Ship one complete session loop with juice (VFX + SFX on collect/steal/upgrade)', 'Configure 2 passes + 3 developer products', 'Icon + 3 thumbnails; questionnaire; publish public beta'],
      d14: ['Add a limited weekly event or rare tier', 'Group join bonus; 10 organic short-form gameplay clips', 'Fix the top drop-off point from analytics (target D1 >= 20%)'],
      d30: ['First content update (new zone/tier)', 'Price test one pass', 'Decide: scale, reskin, or freeze based on retention'],
    },
    qualityChecklists: QUALITY_CORE,
    skills: ['ship-game', 'game-design', 'game-feel-ux', 'level-design', 'game-audio', 'game-programming'],
  },
  {
    id: 'godot_steam_launch_bundle', name: 'Godot -> Steam/itch Launch Bundle', priceUsd: '2.00', platform: 'Steam + itch.io (Godot)',
    description: 'One-call Godot PC launch kit for a supplied game brief: readiness score, Steam and itch.io checklists (store page, capsules, trailer, demo, Next Fest), export notes, 7/14/30-day plan, quality gates and store copy draft. No market data is invented.',
    platformInput: { godot_version: { type: 'string', pattern: '^4\\.[0-9]+$' }, has_demo: { type: 'boolean' } },
    gates: [
      { id: 'vertical_slice_complete', label: 'Start-to-end slice playable with settings and save', weight: 3 },
      { id: 'windows_export_tested', label: 'Windows export runs on a clean machine', weight: 2 },
      { id: 'controller_support', label: 'Controller support + remapping', weight: 1 },
      { id: 'trailer_ready', label: '60-second gameplay trailer cut', weight: 2 },
      { id: 'capsules_ready', label: 'Steam capsule set + 5 screenshots', weight: 2 },
      { id: 'ip_clean', label: 'No third-party reference material or names in the build', weight: 3 },
      { id: 'store_page_live', label: 'Steam store page live (Coming Soon)', weight: 2 },
    ],
    storeChecklist: [
      'Steamworks partner account, tax and bank interview complete',
      'Store page: capsules (header, small, main, vertical, library), 5+ screenshots, trailer, short description leading with the verb',
      'Store page Coming Soon for at least 2 weeks before release; collect wishlists organically',
      'Build review and store page review submitted (allow several business days each)',
      'Free demo on itch.io first; consider a Steam demo for Next Fest',
      'Godot: export templates matching the editor version; test the exported .exe outside the editor; strip debug',
      'itch.io: HTML5 or Windows build, cover 630x500, screenshots, pay-what-you-want or fixed price',
    ],
    fees: [
      'Steam Direct: USD 100 per app (recoupable after USD 1,000 gross); 30% revenue share (25% after USD 10M, 20% after USD 50M)',
      'itch.io: open revenue share, default 10%',
      'Verify current figures on the Steamworks and itch.io docs before committing',
    ],
    plan: {
      d7: ['Remove any reference material/third-party names from the project', 'Cut the vertical slice into an itch.io demo', 'Pay Steam Direct, create the store page, start Coming Soon', 'Cut a 60-second trailer from real gameplay'],
      d14: ['Settings, remap and audio loudness pass', 'Devlog posts on relevant subreddits and short-form video', 'Recruit 10 playtesters; log every stuck point to ISSUES'],
      d30: ['Polish the second level/act; register for the next Steam Next Fest', 'Price research against comparable titles', 'Set a release date only after a stranger finishes the slice unaided'],
    },
    qualityChecklists: QUALITY_CORE,
    skills: ['ship-game', 'game-design', 'game-feel-ux', 'level-design', 'game-audio', 'game-programming'],
  },
  {
    id: 'xr_store_submission_bundle', name: 'XR Store Submission Bundle', priceUsd: '3.00', platform: 'SideQuest / Meta Horizon Store / Meta Ray-Ban Display web app',
    description: 'One-call XR submission kit for a supplied app brief: readiness score, SideQuest, Meta Horizon Store (VRC, age groups) and Meta Ray-Ban Display web-app checklists, comfort gates, 7/14/30-day plan and store copy draft. No market data is invented.',
    platformInput: {
      targets: { type: 'array', minItems: 1, maxItems: 3, uniqueItems: true, items: { enum: ['sidequest', 'horizon_store', 'rayban_display_web'] } },
      audience: { enum: ['adults', 'teens_and_adults', 'mixed_ages', 'kids_only'] },
    },
    gates: [
      { id: 'headset_playtest_logged', label: 'Headset playtest with comfort scores', weight: 3 },
      { id: 'frame_rate_held', label: '72/90 Hz held on lowest target device', weight: 3 },
      { id: 'comfort_options', label: 'Teleport/snap turn/seated options', weight: 2 },
      { id: 'privacy_policy_live', label: 'Privacy policy URL live', weight: 2 },
      { id: 'store_assets_ready', label: 'Store art, screenshots, trailer', weight: 1 },
      { id: 'age_group_decided', label: 'Age group self-certified honestly', weight: 2 },
    ],
    storeChecklist: [
      'SideQuest: free developer listing, upload APK, screenshots, description; good for soft launch and feedback (install no longer needs developer mode as of October 2026)',
      'Meta Horizon Store: pass the Virtual Reality Checks (performance, input, security, functional); submit store assets; review can take weeks',
      'Meta age groups: apps solely for under-10s are not allowed; under-13 apps cannot use the Platform SDK; Mixed Ages apps must use the Get Age Category API; no ads in any age group',
      'Meta Ray-Ban Display: Web Apps path (or Device Access Toolkit for native iOS/Android); Developer Preview shares via password URL / release channels with up to 100 testers; glanceable, short text, high contrast',
      'Brilliant Labs Frame/Halo: no on-device store; ship the host app (Web Bluetooth, Flutter, Python) through normal channels',
      'Camera/mic: explicit consent, on-device processing where possible, never store faces',
    ],
    fees: [
      'Meta Horizon Store: 30% platform fee unless otherwise agreed; monthly payout above USD 100',
      'SideQuest: free listing (paid-app commission not verified; check before pricing)',
      'Meta Ray-Ban Display web apps: no store fee during Developer Preview; public distribution surfaces not yet open',
    ],
    plan: {
      d7: ['Greybox the core interaction on device; log comfort scores', 'Lock frame rate on the lowest target', 'Draft privacy policy and pick the age group', 'For glasses: wrap the PWA in the Meta web-app starter and share a tester link'],
      d14: ['Free SideQuest build for feedback; fix the top 3 comfort issues', 'Store art + 30-second trailer from headset capture', 'Recruit testers from relevant communities'],
      d30: ['Run the VRC checklist and submit to the Horizon Store', 'Add a paid tier or full version once retention is clear', 'Glasses: prepare for public surface launch when Meta opens it'],
    },
    qualityChecklists: { ...XR_QUALITY, ...QUALITY_CORE },
    skills: ['xr-design', 'ship-game', 'game-design', 'game-feel-ux', 'level-design', 'game-audio'],
  },
];

const evidenceSchema = (gates: Gate[]): Schema => ({
  type: 'object', properties: Object.fromEntries(gates.map(gate => [gate.id, { type: 'boolean' }])), additionalProperties: false,
});

export function bundleInputSchema(bundle: BundleDefinition): Schema {
  return {
    type: 'object',
    properties: { title: s(), genre: s(), hook: s(200), ...bundle.platformInput, evidence: evidenceSchema(bundle.gates) },
    required: ['title', 'genre', 'hook'], additionalProperties: false,
  };
}

const outText = { type: 'string', maxLength: 20000 };
export const bundleOutputSchema = (id: string): Schema => ({
  type: 'object', additionalProperties: false,
  required: ['tool', 'bundle', 'platform', 'facts_checked', 'readiness', 'files', 'skills', 'disclaimer'],
  properties: {
    tool: { const: id }, bundle: outText, platform: outText, facts_checked: outText,
    readiness: { type: 'object', additionalProperties: false, required: ['score', 'verdict', 'missing'], properties: {
      score: { type: 'number', minimum: 0, maximum: 1 }, verdict: { enum: ['ready_to_submit', 'ship_with_fixes', 'hold'] },
      missing: { type: 'array', maxItems: 20, items: outText } } },
    files: { type: 'object', additionalProperties: false, required: ['LAUNCH-PLAN.md', 'STORE-CHECKLIST.md', 'QUALITY-GATES.md', 'STORE-COPY.md', 'FEES.md'],
      properties: { 'LAUNCH-PLAN.md': outText, 'STORE-CHECKLIST.md': outText, 'QUALITY-GATES.md': outText, 'STORE-COPY.md': outText, 'FEES.md': outText } },
    skills: { type: 'array', minItems: 1, maxItems: 10, items: outText },
    disclaimer: outText,
  },
});

const clean = (value: unknown) => String(value).replace(/[\r\n]+/g, ' ').trim();
const list = (items: string[], box = false) => items.map(item => `- ${box ? '[ ] ' : ''}${item}`).join('\n');

export function buildBundle(bundle: BundleDefinition, input: Record<string, any>) {
  const title = clean(input.title), genre = clean(input.genre), hook = clean(input.hook);
  const evidence: Evidence = input.evidence || {};
  const total = bundle.gates.reduce((sum, gate) => sum + gate.weight, 0);
  const passed = bundle.gates.filter(gate => evidence[gate.id] === true);
  const score = Math.round((passed.reduce((sum, gate) => sum + gate.weight, 0) / total) * 100) / 100;
  const missing = bundle.gates.filter(gate => evidence[gate.id] !== true).map(gate => gate.label);
  const verdict = score >= 0.9 ? 'ready_to_submit' : score >= 0.6 ? 'ship_with_fixes' : 'hold';
  const extras: string[] = [];
  if (bundle.id === 'xr_store_submission_bundle') {
    if (input.audience === 'kids_only') extras.push('WARNING: Meta does not allow apps solely for under-10s, and under-13 apps lose Platform SDK access. Re-scope to mixed ages (with Get Age Category API) or target a different platform.');
    if (Array.isArray(input.targets)) extras.push(`Targets selected: ${input.targets.join(', ')}.`);
  }
  if (bundle.id === 'roblox_launch_bundle' && input.genre_pattern) extras.push(`Genre pattern: ${input.genre_pattern}. Study the current top experiences in this pattern before locking the loop; do not copy names or art.`);
  if (bundle.id === 'godot_steam_launch_bundle') {
    if (input.godot_version) extras.push(`Godot ${input.godot_version}: install matching export templates.`);
    if (input.has_demo === false) extras.push('No demo yet: an itch.io demo is the fastest organic validation step.');
  }
  const header = `# ${title} | ${bundle.name}\nGenre: ${genre}\nHook: ${hook}\nFacts checked: ${FACTS_CHECKED} (verify before relying on them)\n`;
  const quality = Object.entries(bundle.qualityChecklists).map(([section, items]) => `## ${section}\n${list(items, true)}`).join('\n\n');
  return {
    tool: bundle.id, bundle: bundle.name, platform: bundle.platform, facts_checked: FACTS_CHECKED,
    readiness: { score, verdict, missing },
    files: {
      'LAUNCH-PLAN.md': `${header}\n## Readiness\nScore ${score} (${verdict}).\n${missing.length ? `Missing:\n${list(missing)}` : 'All gates evidenced.'}\n${extras.length ? `\n## Notes\n${list(extras)}\n` : ''}\n## Next 7 days\n${list(bundle.plan.d7, true)}\n\n## Days 8-14\n${list(bundle.plan.d14, true)}\n\n## Days 15-30\n${list(bundle.plan.d30, true)}\n\nPromotion: organic first; treat paid ads as a separate, approved budget.`,
      'STORE-CHECKLIST.md': `${header}\n## ${bundle.platform} submission\n${list(bundle.storeChecklist, true)}`,
      'QUALITY-GATES.md': `${header}\n${quality}`,
      'STORE-COPY.md': `${header}\n## Short description (draft)\n${title}: ${hook}\n\n## Long description skeleton\n1. Lead with the verb: what the player does in the first minute.\n2. Three bullet features that are true today (no roadmap promises).\n3. One line on the ${genre} twist.\n4. Platforms, controls, accessibility options.\n\n## Screenshot plan\n1. First-minute action\n2. Core loop payoff\n3. Progression/upgrade\n4. A distinctive moment\n5. UI/readability shot`,
      'FEES.md': `${header}\n${list(bundle.fees)}`,
    },
    skills: bundle.skills,
    disclaimer: 'Planning aid generated from supplied inputs. Not legal, tax, rating or store approval advice. Platform facts may change; verify on official docs.',
  };
}

export function registerBundles(registry: Registry, week1: boolean) {
  for (const bundle of BUNDLES) {
    registry.register({
      id: bundle.id, version: '1.0.0', description: bundle.description, category: 'launch-bundle',
      tags: ['launch-bundle', 'game-dev', bundle.platform.toLowerCase().split(/[^a-z]+/)[0]], status: 'enabled', commercial: week1, providerId: 'av-hub',
      inputSchema: bundleInputSchema(bundle), outputSchema: bundleOutputSchema(bundle.id),
      price: { mode: 'fixed', atomic: usdToAtomic(bundle.priceUsd), currency: 'USDC' },
      discovery: { public: week1, mcp: true, bazaar: week1, plugin: false },
      limits: { timeoutMs: 2000, maxPayloadBytes: 4096, maxOutputBytes: 60000, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 },
      handler: (input: Record<string, any>) => buildBundle(bundle, input),
    } as Capability);
  }
}
