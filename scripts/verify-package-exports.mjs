import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageName = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
).name;

if (!fs.existsSync(path.join(packageRoot, 'dist'))) {
  console.error('No dist/ directory. Run `npm run build` first.');
  process.exit(1);
}

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-route-policy-consumer-'));
const linkPath = path.join(workspace, 'node_modules', ...packageName.split('/'));

const CJS_ENTRY = `
const root = require(${JSON.stringify(packageName)});
const nest = require(${JSON.stringify(`${packageName}/nest`)});
if (typeof root.evaluatePolicy !== 'function') throw new Error('root missing evaluatePolicy');
if (typeof root.PolicyEvaluator !== 'function') throw new Error('root missing PolicyEvaluator');
if (typeof nest.RoutePolicyModule.forRoot !== 'function') throw new Error('/nest missing forRoot');
console.log('  require() root and /nest: OK');
`;

const CJS_ISOLATION = `
require(${JSON.stringify(packageName)});
const loaded = Object.keys(require.cache).filter((id) => id.includes('@nestjs'));
if (loaded.length > 0) {
  throw new Error('root pulled ' + loaded.length + ' @nestjs modules');
}
console.log('  root does not load @nestjs: OK');
`;

const ESM_ENTRY = `
import { evaluatePolicy, PolicyEvaluator } from ${JSON.stringify(packageName)};
import { RoutePolicyModule } from ${JSON.stringify(`${packageName}/nest`)};
if (typeof evaluatePolicy !== 'function') throw new Error('root missing evaluatePolicy');
if (typeof PolicyEvaluator !== 'function') throw new Error('root missing PolicyEvaluator');
if (typeof RoutePolicyModule.forRoot !== 'function') throw new Error('/nest missing forRoot');
console.log('  import root and /nest: OK');
`;

function removeLink(target) {
  if (!fs.existsSync(target)) {
    return;
  }
  try {
    fs.unlinkSync(target);
  } catch {
    fs.rmdirSync(target);
  }
}

function run(label, dir, entry) {
  console.log(label);
  execFileSync(process.execPath, [entry], { cwd: dir, stdio: 'inherit' });
}

try {
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.symlinkSync(packageRoot, linkPath, 'junction');

  const cjsDir = path.join(workspace, 'cjs');
  const esmDir = path.join(workspace, 'esm');
  fs.mkdirSync(cjsDir);
  fs.mkdirSync(esmDir);

  fs.writeFileSync(path.join(cjsDir, 'package.json'), '{"name":"consumer-cjs"}');
  fs.writeFileSync(path.join(cjsDir, 'index.js'), CJS_ENTRY);
  fs.writeFileSync(path.join(cjsDir, 'isolation.js'), CJS_ISOLATION);
  fs.writeFileSync(
    path.join(esmDir, 'package.json'),
    '{"name":"consumer-esm","type":"module"}',
  );
  fs.writeFileSync(path.join(esmDir, 'index.mjs'), ESM_ENTRY);

  run('CommonJS:', cjsDir, 'index.js');
  run('Peer isolation:', cjsDir, 'isolation.js');
  run('ESM:', esmDir, 'index.mjs');

  console.log('\nPackage exports verified for CommonJS and ESM.');
} finally {
  removeLink(linkPath);
  fs.rmSync(workspace, { recursive: true, force: true });
}
