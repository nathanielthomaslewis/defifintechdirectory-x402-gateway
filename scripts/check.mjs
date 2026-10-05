import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let checked = 0;
for (const directory of ['src', 'api', 'scripts', 'test', 'public']) {
  for (const filename of readdirSync(directory)) {
    if (!/\.(js|mjs|ts)$/.test(filename)) continue;
    const result = spawnSync(process.execPath, ['--check', `${directory}/${filename}`], { stdio: 'inherit', timeout: 10000 });
    if (result.status !== 0) process.exit(result.status || 1);
    checked++;
  }
}
console.log(`Syntax checked ${checked} source files. This is a syntax gate, not a style linter.`);
