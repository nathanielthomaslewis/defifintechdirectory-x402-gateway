import { Registry, type Capability, type Schema } from './registry.ts';

export interface HumanDisplay {
  title: string;
  description: string;
  inputType: string;
  outputType: string;
  exampleInput: Record<string, unknown>;
  exampleOutput: Record<string, unknown>;
  limitations: string[];
  privacy: string;
  reviewed?: boolean;
}
export interface HumanCapability extends Capability { human: HumanDisplay }

const privacy = 'Local demo only. Input is processed in server memory; no provider or AI service receives it. Demo jobs and results expire after 30 minutes, logout, deletion, or server restart. Do not enter confidential data.';
const properties = { text: { type: 'string', minLength: 1, maxLength: 4000, pattern: '\\S', title: 'Your text' } };
const textInput = { type: 'object', required: ['text'], properties, additionalProperties: false };
const textOutput = {
  type: 'object', required: ['sample', 'title', 'characters', 'words', 'preview'], additionalProperties: false,
  properties: { sample: { const: true }, title: { const: 'Text workspace sample' }, characters: { type: 'integer', minimum: 0 }, words: { type: 'integer', minimum: 0 }, preview: { type: 'string', maxLength: 240 } },
};

export function createPreviewRegistry() {
  const registry = new Registry();
  const common = {
    version: '0.1.0', category: 'Workspace preview', tags: ['local-demo'], commercial: false, providerId: 'av-hub',
    price: { mode: 'fixed' as const, atomic: '0', currency: 'USDC' as const },
    discovery: { public: false, mcp: false, bazaar: false, plugin: false },
    limits: { timeoutMs: 2000, maxPayloadBytes: 16384, maxOutputBytes: 16384, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 },
  };
  const manifests: HumanCapability[] = [
    {
      ...common, id: 'preview_text_workspace', status: 'placeholder', description: 'Try the input, quote and result flow with a local text sample.',
      inputSchema: textInput, outputSchema: textOutput,
      human: {
        title: 'Text workspace', description: 'A small piece of text. A clear path from input to result. Try the experience with a local sample.',
        inputType: 'Text', outputType: 'JSON', privacy,
        exampleInput: { text: 'A clearer way to get the small things done.' },
        exampleOutput: { sample: true, title: 'Text workspace sample', characters: 43, words: 9, preview: 'A clearer way to get the small things done.' },
        limitations: ['Interface demonstration, not a commercial tool.', 'Counts text and returns a short excerpt; no AI analysis or rewriting.', 'Up to 4,000 characters. One demo credit per successful result. No real money.'],
      },
      handler: async input => {
        const text = String(input.text);
        return { sample: true, title: 'Text workspace sample', characters: [...text].length, words: text.trim().split(/\s+/u).filter(Boolean).length, preview: text.slice(0, 240) };
      },
    },
    {
      ...common, id: 'preview_document_workspace', status: 'disabled', description: 'Preview the planned document workspace. Uploads are not enabled.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: {}, additionalProperties: false },
      human: { title: 'Document workspace', description: 'A place for document tasks, once a useful, dependable tool is validated.', inputType: 'File', outputType: 'Structured output', privacy: 'Uploads are unavailable. No files are accepted or stored.', exampleInput: {}, exampleOutput: { sample: true, note: 'A future document result would appear here.' }, limitations: ['Coming soon concept; not a selected launch product.', 'File uploads, parsing and private storage are not configured.'] },
      handler: async () => { throw new Error('not_available'); },
    },
    {
      ...common, id: 'preview_url_workspace', status: 'disabled', description: 'Preview the planned web page workspace. URL fetching is not enabled.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, outputSchema: { type: 'object', properties: {}, additionalProperties: false },
      human: { title: 'Web page workspace', description: 'A considered starting point for tasks that begin with a link.', inputType: 'URL', outputType: 'Structured output', privacy: 'No URLs are fetched in this preview.', exampleInput: {}, exampleOutput: { sample: true, note: 'A future web page result would appear here.' }, limitations: ['Coming soon concept; not a selected launch product.', 'No website audit, extraction or external fetch is performed.'] },
      handler: async () => { throw new Error('not_available'); },
    },
  ];
  for (const manifest of manifests) registry.register(manifest);
  return registry;
}

export function humanCatalog(registry: Registry, previews: Registry, disabled: string[] = []) {
  const toCard = (entry: HumanCapability, source: 'registry' | 'preview') => ({
    id: entry.id, slug: entry.id, title: entry.human.title, description: entry.human.description, category: entry.category,
    inputType: entry.human.inputType, outputType: entry.human.outputType,
    status: source === 'preview' ? (entry.status === 'placeholder' ? 'Preview' : 'Coming soon') : 'Unavailable',
    version: entry.version, source,
    price: source === 'preview' ? { credits: entry.status === 'placeholder' ? 1 : 0, amountMinor: 0, currency: 'USD', label: entry.status === 'placeholder' ? '1 demo credit · no money' : 'Not priced yet' } : { atomic: entry.price.atomic, currency: entry.price.currency, label: 'Browser execution unavailable' },
    inputSchema: entry.inputSchema, outputSchema: entry.outputSchema, limits: entry.limits,
    exampleInput: entry.human.exampleInput, exampleOutput: entry.human.exampleOutput, limitations: entry.human.limitations, privacy: entry.human.privacy,
  });
  return {
    mode: 'local-preview', commercialReady: false,
    ready: registry.visible('public').filter(entry => !disabled.includes(entry.id) && (entry as Partial<HumanCapability>).human?.reviewed === true).map(entry => toCard(entry as HumanCapability, 'registry')),
    previews: previews.all().filter(entry => !disabled.includes(entry.id)).map(entry => toCard(entry as HumanCapability, 'preview')),
  };
}
