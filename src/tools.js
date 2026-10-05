/**
 * Three local deterministic capabilities and two legacy placeholders.
 * Prices are seeds from X402-MARKET-VS-HUBS scan; not revenue claims.
 * listed:false until Nathaniel publishes.
 */

/** @typedef {{ id: string, priceUsd: string, description: string, handler: (input: object) => object }} Tool */

/** @type {Record<string, Tool>} */
export const TOOLS = {
  game_launch_kit: {
    id: "game_launch_kit",
    priceUsd: "$1.00",
    description: "Build an original game planning bundle from a supplied brief. No competitor facts are invented.",
    handler(input) {
      const { title, genre, platform, tone, core_loop } = input;
      const heading = `# ${title}\n\nGenre: ${genre}\nPlatform: ${platform}\nTone: ${tone}\n`;
      return {
        tool: "game_launch_kit",
        input: { title, genre, platform, tone, core_loop },
        bundle: {
          "PRD.md": `${heading}\n## Player promise\nA ${tone} ${genre} game built around: ${core_loop}.\n\n## First playable\nImplement one complete cycle of the loop, one start state, one success state, and one failure state.\n\n## Acceptance\nA new player can finish one loop without developer help; restart works after failure; keyboard and pointer controls are documented.\n`,
          "COMPS.md": `# Competitor research worksheet for ${title}\n\nNo competitors were fetched or verified. Record three real comparable games, their platform, core loop, price, source URL and observation date before making positioning claims.\n`,
          "PROMPTS.md": `# Art direction brief\n\nOriginal ${genre} game named ${title}; ${tone} mood; communicate the action ${core_loop}. Avoid existing characters, logos and trademarked franchises. Review generated art before use.\n`,
          "LAUNCH-NOTES.md": `# Launch notes for ${platform}\n\nDescribe the player action (${core_loop}), show an actual gameplay capture, document controls and accessibility, and verify the platform's current submission requirements manually. No sales or ranking claims are generated.\n`,
          "CHECKLIST.md": "- [ ] Original IP and asset licenses checked\n- [ ] First playable acceptance met\n- [ ] Controls and accessibility checked\n- [ ] Actual gameplay capture reviewed\n- [ ] Platform requirements verified\n",
        },
        note: "Planning bundle from caller input only; competitor, legal and platform facts require human verification.",
      };
    },
  },

  store_art_prompt_pack: {
    id: "store_art_prompt_pack",
    priceUsd: "$0.15",
    description: "Generate bounded original store-art briefs for supplied aspect ratios.",
    handler(input) {
      const { title, genre, palette, aspects } = input;
      return {
        tool: "store_art_prompt_pack",
        prompts: aspects.map((a) => ({
          aspect: a,
          prompt: `Create original key art for ${title}, a ${genre} game. Use a ${palette} palette, a readable focal silhouette, clear visual hierarchy and safe text space. Compose for ${a}. Depict only original characters and assets.`,
          negatives: "Unreadable text, watermarks, existing franchise characters, logos, copied artwork, graphic violence",
        })),
      };
    },
  },

  ship_gate_audit: {
    id: "ship_gate_audit",
    priceUsd: "$0.10",
    description: "Score a supplied release evidence checklist without fetching a URL or claiming legal compliance.",
    handler(input) {
      const projectType = input.project_type;
      const weights = { title_reviewed: 1, description_reviewed: 1, privacy_reviewed: 2, asset_rights_reviewed: 2, accessibility_reviewed: 2, smoke_test_passed: 2 };
      const checks = Object.entries(weights).map(([id, weight]) => ({ id, pass: input.evidence[id] === true, weight }));
      const score =
        checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0) /
        checks.reduce((s, c) => s + c.weight, 0);
      return {
        tool: "ship_gate_audit",
        project_type: projectType,
        url: null,
        score: Number(score.toFixed(2)),
        checks,
        verdict: score >= 0.8 && checks.every(c => c.pass || !['privacy_reviewed', 'asset_rights_reviewed', 'smoke_test_passed'].includes(c.id)) ? "ship_with_fixes" : "hold",
      };
    },
  },

  companion_book_outline: {
    id: "companion_book_outline",
    priceUsd: "$0.50",
    description: "Companion book outline + affiliate-safe CTA slots.",
    handler(input) {
      const topic = input.topic || "practical skill";
      const audience = input.audience || "adult learners";
      const n = Math.min(Math.max(Number(input.chapter_count) || 8, 3), 20);
      const chapters = Array.from({ length: n }, (_, i) => ({
        n: i + 1,
        title: `Chapter ${i + 1}: ${topic} — beat ${i + 1}`,
        goal: `Reader can apply beat ${i + 1}`,
        cta_slot: i === n - 1 ? "affiliate_safe_soft_cta" : null,
      }));
      return {
        tool: "companion_book_outline",
        stub: true,
        topic,
        audience,
        chapters,
        disclosure: "No income claims; educational structure only.",
      };
    },
  },

  stickman_short_script: {
    id: "stickman_short_script",
    priceUsd: "$0.10",
    description:
      "45–60s stick Shorts script + shot list (Soft Landing metaphors; FacelessYT parked).",
    handler(input) {
      const theme = input.theme || input.metaphor_id || "soft_landing_breath";
      return {
        tool: "stickman_short_script",
        stub: true,
        theme,
        duration_sec: 55,
        script: [
          { t: 0, vo: `When ${theme} hits, name it once.`, shot: "stick figure sits" },
          { t: 12, vo: "Shrink the next step to one breath.", shot: "zoom on feet" },
          { t: 28, vo: "Land soft. No grind montage.", shot: "gentle sit / exhale" },
          { t: 45, vo: "Try again tomorrow — same size step.", shot: "cut to calm end card" },
        ],
        policy: "organic discovery only · FacelessYT Pro automation parked",
      };
    },
  },
};

export const TOOL_IDS = Object.keys(TOOLS);
