import { Ajv, type AnySchema, type ValidateFunction } from 'ajv';
import { TOOLS } from './tools.js';
import { registerX3Tools } from './x3-tools.ts';
import { registerPacks } from './packs.ts';

export type Schema = Record<string, unknown>;
export interface Capability {
  id: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  status: 'placeholder' | 'enabled' | 'disabled';
  commercial: boolean;
  providerId: string;
  inputSchema: Schema;
  outputSchema: Schema;
  price: { mode: 'fixed'; atomic: string; currency: 'USDC' };
  discovery: { public: boolean; mcp: boolean; bazaar: boolean; plugin: boolean };
  limits: { timeoutMs: number; maxPayloadBytes: number; maxOutputBytes: number; costAtomic: string; dailyCostAtomic: string; minMarginBps: number };
  handler: (input: Record<string, unknown>, context: { signal: AbortSignal }) => unknown | Promise<unknown>;
}

export function usdToAtomic(price: string): string {
  const match = /^\$?(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(price);
  if (!match) throw new Error('invalid_price');
  return (BigInt(match[1]) * 1000000n + BigInt((match[2] || '').padEnd(6, '0'))).toString();
}

export class Registry {
  private entries = new Map<string, Capability>();
  private validators = new Map<string, { input: ValidateFunction; output: ValidateFunction }>();
  private ajv = new Ajv({ strict: true, allErrors: false });

  register(capability: Capability) {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(capability.id) || this.entries.has(capability.id)) throw new Error('invalid_or_duplicate_id');
    if (!/^\d+\.\d+\.\d+$/.test(capability.version) || !capability.description || !capability.category || !Array.isArray(capability.tags)) throw new Error('invalid_manifest');
    if (!['placeholder', 'enabled', 'disabled'].includes(capability.status) || typeof capability.handler !== 'function') throw new Error('invalid_manifest');
    if (capability.providerId !== 'av-hub') throw new Error('third_party_providers_disabled');
    if (typeof capability.commercial !== 'boolean' || ['public', 'mcp', 'bazaar', 'plugin'].some(key => typeof capability.discovery[key as keyof Capability['discovery']] !== 'boolean')) throw new Error('invalid_visibility');
    if (capability.price.mode !== 'fixed' || capability.price.currency !== 'USDC') throw new Error('unsupported_pricing');
    for (const amount of [capability.price.atomic, capability.limits.costAtomic, capability.limits.dailyCostAtomic]) {
      if (!/^(0|[1-9]\d*)$/.test(amount) || BigInt(amount) > 1000000000000n) throw new Error('invalid_atomic_amount');
    }
    for (const limit of [capability.limits.timeoutMs, capability.limits.maxPayloadBytes, capability.limits.maxOutputBytes]) {
      if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('invalid_limit');
    }
    if (capability.limits.timeoutMs > 30000 || capability.limits.maxPayloadBytes > 1000000 || capability.limits.maxOutputBytes > 1000000) throw new Error('limit_too_large');
    if (!Number.isInteger(capability.limits.minMarginBps) || capability.limits.minMarginBps < 0 || capability.limits.minMarginBps > 10000) throw new Error('invalid_margin');
    if (capability.status === 'placeholder' && (capability.commercial || Object.values(capability.discovery).some(Boolean))) throw new Error('placeholder_must_be_private_noncommercial');
    if (capability.inputSchema.type !== 'object' || capability.outputSchema.type !== 'object') throw new Error('object_schemas_required');
    const input = this.ajv.compile(capability.inputSchema as AnySchema);
    const output = this.ajv.compile(capability.outputSchema as AnySchema);
    const entry = { ...structuredClone({ ...capability, handler: undefined }), handler: capability.handler } as Capability;
    const freeze = (value: any): any => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
    this.entries.set(entry.id, freeze(entry));
    this.validators.set(entry.id, { input, output });
    return this;
  }

  get(id: string) { return this.entries.get(id); }
  all() { return [...this.entries.values()]; }
  visible(surface: keyof Capability['discovery']) { return this.all().filter(entry => entry.status === 'enabled' && entry.discovery[surface]); }
  validate(id: string, kind: 'input' | 'output', value: unknown) { return this.validators.get(id)?.[kind](value) === true; }
}

const text = { type: 'string', maxLength: 2000 };
const brief = { type: 'string', minLength: 1, maxLength: 120, pattern: '\\S' };
const evidenceKeys = ['title_reviewed', 'description_reviewed', 'privacy_reviewed', 'asset_rights_reviewed', 'accessibility_reviewed', 'smoke_test_passed'];
const evidence = { type: 'object', properties: Object.fromEntries(evidenceKeys.map(key => [key, { type: 'boolean' }])), required: evidenceKeys, additionalProperties: false };
const inputs: Record<string, Schema> = {
  game_launch_kit: { title: brief, genre: brief, platform: brief, tone: brief, core_loop: brief },
  store_art_prompt_pack: { title: brief, genre: brief, palette: brief, aspects: { type: 'array', minItems: 1, maxItems: 4, uniqueItems: true, items: { enum: ['1:1', '4:5', '16:9', '9:16'] } } },
  ship_gate_audit: { project_type: { enum: ['web_app', 'web_game', 'mobile_app'] }, evidence },
  companion_book_outline: { topic: text, audience: text, chapter_count: { type: 'integer', minimum: 3, maximum: 20 } },
  stickman_short_script: { theme: text, metaphor_id: text },
};

const outputText = { type: 'string', maxLength: 10000 };
const object = (properties: Schema): Schema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const outputs: Record<string, Schema> = {
  game_launch_kit: {
    input: object({ title: outputText, genre: outputText, platform: outputText, tone: outputText, core_loop: outputText }),
    bundle: object({ 'PRD.md': outputText, 'COMPS.md': outputText, 'PROMPTS.md': outputText, 'LAUNCH-NOTES.md': outputText, 'CHECKLIST.md': outputText }),
    note: outputText,
  },
  store_art_prompt_pack: {
    prompts: { type: 'array', maxItems: 10, items: object({ aspect: outputText, prompt: outputText, negatives: outputText }) },
  },
  ship_gate_audit: {
    project_type: outputText, url: { anyOf: [outputText, { type: 'null' }] },
    score: { type: 'number', minimum: 0, maximum: 1 }, verdict: { enum: ['ship_with_fixes', 'hold'] },
    checks: { type: 'array', maxItems: 100, items: object({ id: outputText, pass: { type: 'boolean' }, weight: { type: 'integer', minimum: 1 } }) },
  },
  companion_book_outline: {
    topic: outputText, audience: outputText, disclosure: outputText,
    chapters: { type: 'array', minItems: 3, maxItems: 20, items: object({ n: { type: 'integer', minimum: 1, maximum: 20 }, title: outputText, goal: outputText, cta_slot: { anyOf: [outputText, { type: 'null' }] } }) },
  },
  stickman_short_script: {
    theme: outputText, duration_sec: { type: 'integer', minimum: 1 }, policy: outputText,
    script: { type: 'array', maxItems: 100, items: object({ t: { type: 'number', minimum: 0 }, vo: outputText, shot: outputText }) },
  },
};

export function createRegistry(cfg: { testMode?: string } = {}) {
  const registry = new Registry();
  const implemented = new Set(['game_launch_kit', 'store_art_prompt_pack', 'ship_gate_audit']);
  const week1 = cfg.testMode === 'week1';
  for (const tool of Object.values(TOOLS)) registry.register({
    id: tool.id, version: implemented.has(tool.id) ? '1.0.0' : '0.1.0', description: tool.description, category: 'experimental', tags: [implemented.has(tool.id) ? 'local-capability' : 'placeholder'],
    status: implemented.has(tool.id) ? 'enabled' : 'placeholder', commercial: week1 && implemented.has(tool.id), providerId: 'av-hub',
    inputSchema: { type: 'object', properties: inputs[tool.id], required: implemented.has(tool.id) ? Object.keys(inputs[tool.id]) : [], additionalProperties: false },
    outputSchema: object({ tool: { const: tool.id }, ...(implemented.has(tool.id) ? {} : { stub: { const: true } }), ...outputs[tool.id] }),
    price: { mode: 'fixed', atomic: week1 && implemented.has(tool.id) ? usdToAtomic('0.02') : usdToAtomic(tool.priceUsd), currency: 'USDC' },
    discovery: { public: week1 && implemented.has(tool.id), mcp: implemented.has(tool.id), bazaar: week1 && implemented.has(tool.id), plugin: false },
    limits: { timeoutMs: 2000, maxPayloadBytes: 4096, maxOutputBytes: 30000, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 },
    handler: tool.handler,
  });
  registerX3Tools(registry, week1);
  registerPacks(registry, week1);
  return registry;
}
