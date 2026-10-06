// Vercel's Express builder compiles src/*.ts to .js but leaves `./x.ts` import specifiers as written,
// so the deployed function can't find them. On Vercel only, rewrite relative .ts specifiers to .js
// in the build copy before it compiles. Local dev and tests keep the .ts imports.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

if (process.env.VERCEL !== '1') {
  console.log('vercel-rewrite-imports: not on Vercel, nothing to do');
  process.exit(0);
}
let files = 0;
for (const dir of ['src', '.']) {
  for (const name of readdirSync(dir)) {
    if (!/\.(js|mjs|ts)$/.test(name) || name.endsWith('.d.ts')) continue;
    const path = join(dir, name);
    const text = readFileSync(path, 'utf8');
    const next = text.replace(/(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\.ts\2/g, '$1$2$3.js$2');
    if (next !== text) { writeFileSync(path, next); files++; }
  }
}
console.log(`vercel-rewrite-imports: rewrote .ts specifiers in ${files} files`);
