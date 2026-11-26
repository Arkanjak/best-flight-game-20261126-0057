// SKYLANE — Valley Patrol: hands the game in. Copies game/ and screenshots/ from beside this
// file to the output directory and writes dossier.json with the vendored make.fun library.
// Paths resolve from this file's directory, never from the caller's working directory.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const here = import.meta.dirname;
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`SKYLANE handed in: game/ and screenshots/ copied to ${out}, dossier.json written.`);
