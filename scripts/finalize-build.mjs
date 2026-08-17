import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cjsDir = join(root, 'dist', 'cjs');

mkdirSync(cjsDir, { recursive: true });
writeFileSync(join(cjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));
writeFileSync(
  join(root, 'dist', 'esm', 'package.json'),
  JSON.stringify({ type: 'module' }, null, 2),
);
