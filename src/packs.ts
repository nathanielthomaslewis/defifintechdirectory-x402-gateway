import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Capability, Registry, Schema } from './registry.ts';

export interface PackDefinition {
  id: string;
  name: string;
  description: string;
  priceUsd: string;
  zipFile: string;
  skills: string[];
  tags: string[];
}

export const PACKS: PackDefinition[] = [
  {
    id: 'designer_pack',
    name: 'Designer Skill Pack',
    description: 'Download the Designer skill pack ZIP: book cover design, brand identity, premium spreadsheet and animation/VFX skills with example prompts, quick-start guide and licence.',
    priceUsd: '29.00',
    zipFile: 'designer-pack.zip',
    skills: ['book-cover-design', 'brand-identity', 'premium-spreadsheet', 'animation-vfx'],
    tags: ['skill-pack', 'designer', 'download'],
  },
  {
    id: 'marketer_pack',
    name: 'Marketer Skill Pack',
    description: 'Download the Marketer skill pack ZIP: copy strategy, marketing experiments, story structure and video editing skills with example prompts, quick-start guide and licence.',
    priceUsd: '29.00',
    zipFile: 'marketer-pack.zip',
    skills: ['copy-strategy', 'marketing-experiments', 'story-structure', 'video-editing'],
    tags: ['skill-pack', 'marketer', 'download'],
  },
  {
    id: 'game_dev_pack',
    name: 'Game Dev Skill Pack',
    description: 'Download the Game Dev skill pack ZIP: game design, game feel/UX, level design, game programming, XR design and game audio skills with example prompts, quick-start guide and licence.',
    priceUsd: '39.00',
    zipFile: 'game-dev-pack.zip',
    skills: ['game-design', 'game-feel-ux', 'level-design', 'game-programming', 'xr-design', 'game-audio'],
    tags: ['skill-pack', 'game-dev', 'download'],
  },
];

const str = (maxLength: number): Schema => ({ type: 'string', minLength: 1, maxLength });
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)): Schema => ({ type: 'object', properties, required, additionalProperties: false });

export function packZipPath(packId: string): string | null {
  const pack = PACKS.find(entry => entry.id === packId);
  if (!pack) return null;
  return join(process.cwd(), 'private', 'packs', pack.zipFile);
}

export function packZipFilename(packId: string): string | null {
  return PACKS.find(entry => entry.id === packId)?.zipFile || null;
}

export function packZipStats(packId: string): { sha256: string; bytes: number } | null {
  const path = packZipPath(packId);
  if (!path) return null;
  try {
    const data = readFileSync(path);
    return { sha256: createHash('sha256').update(data).digest('hex'), bytes: data.byteLength };
  } catch { return null; }
}

export function registerPacks(registry: Registry, week1: boolean) {
  for (const pack of PACKS) {
    const stats = packZipStats(pack.id);
    registry.register({
      id: pack.id,
      version: '1.0.0',
      description: pack.description,
      category: 'skill-pack',
      tags: pack.tags,
      status: 'enabled',
      commercial: week1,
      providerId: 'av-hub',
      inputSchema: obj({}),
      outputSchema: obj({
        tool: { const: pack.id },
        pack: { const: pack.id },
        name: str(120),
        filename: str(120),
        sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' },
        bytes: { type: 'integer', minimum: 1 },
        skills: { type: 'array', minItems: 1, maxItems: 20, items: str(120) },
        downloadUrl: str(500),
      }),
      price: { mode: 'fixed', atomic: usdToAtomicSafe(pack.priceUsd), currency: 'USDC' },
      discovery: { public: week1, mcp: true, bazaar: week1, plugin: false },
      limits: { timeoutMs: 2000, maxPayloadBytes: 4096, maxOutputBytes: 30000, costAtomic: '0', dailyCostAtomic: '0', minMarginBps: 0 },
      handler: () => ({
        tool: pack.id,
        pack: pack.id,
        name: pack.name,
        filename: pack.zipFile,
        sha256: stats?.sha256 || '',
        bytes: stats?.bytes || 0,
        skills: pack.skills,
        downloadUrl: `/packs/${pack.id}`,
      }),
    } as Capability);
  }
}

function usdToAtomicSafe(price: string): string {
  const match = /^\$?(0|[1-9]\d*)(?:\.(\d{1,6}))?$/.exec(price);
  if (!match) throw new Error('invalid_price');
  return (BigInt(match[1]) * 1000000n + BigInt((match[2] || '').padEnd(6, '0'))).toString();
}
