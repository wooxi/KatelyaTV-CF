#!/usr/bin/env node
/**
 * Post-build fix for Cloudflare Pages deployment.
 *
 * next-on-pages emits bare `async_hooks` (and potentially other Node builtin)
 * specifiers in the generated _worker.js bundles, but the Workers runtime only
 * resolves `node:`-prefixed forms. This rewrites bare Node builtin specifiers
 * to their `node:`-prefixed equivalents in the built output.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '.vercel', 'output', 'static', '_worker.js');

const BUILTINS = [
  'async_hooks', 'buffer', 'crypto', 'events', 'path', 'stream',
  'string_decoder', 'util', 'os', 'http', 'https', 'net', 'url',
  'zlib', 'fs', 'assert', 'process', 'querystring', 'readline', 'timers',
];

const patterns = BUILTINS.flatMap((b) => [
  [new RegExp('from"' + b + '"', 'g'), 'from"node:' + b + '"'],
  [new RegExp('require\\("' + b + '"\\)', 'g'), 'require("node:' + b + '")'],
  [new RegExp('import\\("' + b + '"\\)', 'g'), 'import("node:' + b + '")'],
]);

let touched = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
      const src = fs.readFileSync(full, 'utf8');
      let out = src;
      for (const [re, rep] of patterns) out = out.replace(re, rep);
      if (out !== src) {
        fs.writeFileSync(full, out);
        touched += 1;
        console.log('patched:', path.relative(ROOT, full));
      }
    }
  }
}

if (!fs.existsSync(ROOT)) {
  console.error('fix-worker-imports: worker output not found at', ROOT);
  process.exit(0);
}
walk(ROOT);
console.log('fix-worker-imports: patched ' + touched + ' file(s)');
