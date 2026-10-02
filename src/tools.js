/**
 * Five MVP tool stubs — placeholder outputs, fixed list prices.
 * Prices are seeds from X402-MARKET-VS-HUBS scan; not revenue claims.
 * listed:false until Nathaniel publishes.
 */

/** @typedef {{ id: string, priceUsd: string, description: string, handler: (input: object) => object }} Tool */

/** @type {Record<string, Tool>} */
export const TOOLS = {
  game_launch_kit: {
    id: "game_launch_kit",
    priceUsd: "$1.00",
    description:
      "Genre → PRD + COMPS + PROMPTS + LAUNCH-NOTES + ship checklist (original IP only).",
    handler(input) {
      const genre = input.genre || "arcade";
      const platform = input.platform || "itch";
      const tone = input.tone || "playful";
      return {
        tool: "game_launch_kit",
        stub: true,
        input: { genre, platform, tone },
        bundle: {
          "PRD.md": `# ${genre} — ${platform}\nTone: ${tone}\n\n(Stub PRD — wire to HUB-GAMES factory.)\n`,
          "COMPS.md": "(Stub comps table)\n",
          "PROMPTS.md": "(Stub Imagine batch)\n",
          "LAUNCH-NOTES.md": "(Stub ASO / itch notes)\n",
          "CHECKLIST.md": "- [ ] Original IP check\n- [ ] Store art\n- [ ] Soft Landing / organic only\n",
        },
        note: "Replace stub markdown with live factory renders before listed:true.",
      };
    },
  },

  store_art_prompt_pack: {
    id: "store_art_prompt_pack",
    priceUsd: "$0.15",
    description: "Imagine-ready store-art prompts + negatives for a title.",
    handler(input) {
      const title = input.title || "Untitled";
      const genre = input.genre || "casual";
      const palette = input.palette || "warm neon";
      const aspects = input.aspects || ["1:1", "16:9"];
      return {
        tool: "store_art_prompt_pack",
        stub: true,
        prompts: aspects.map((a) => ({
          aspect: a,
          prompt: `${title}, ${genre} game key art, ${palette}, clean silhouette, store-ready, aspect ${a}`,
          negatives: "blurry, watermark, trademarked franchise, NSFW",
        })),
      };
    },
  },

  ship_gate_audit: {
    id: "ship_gate_audit",
    priceUsd: "$0.10",
    description: "Scored SEO/ASO/GDPR/polish checklist for a project type.",
    handler(input) {
      const projectType = input.project_type || "web_game";
      const checks = [
        { id: "seo_title", pass: true, weight: 1 },
        { id: "aso_keywords", pass: false, weight: 1 },
        { id: "gdpr_banner", pass: true, weight: 1 },
        { id: "privacy_policy", pass: false, weight: 2 },
        { id: "original_ip", pass: true, weight: 2 },
        { id: "facelessyt_parked", pass: true, weight: 1 },
      ];
      const score =
        checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0) /
        checks.reduce((s, c) => s + c.weight, 0);
      return {
        tool: "ship_gate_audit",
        stub: true,
        project_type: projectType,
        url: input.url || null,
        score: Number(score.toFixed(2)),
        checks,
        verdict: score >= 0.7 ? "ship_with_fixes" : "hold",
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
