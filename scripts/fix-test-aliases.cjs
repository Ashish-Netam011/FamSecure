/**
 * Post-compile step for the unit-test build (tsconfig.test.json):
 * tsc does not rewrite the "@/..." path alias at emit time, so this rewrites
 * the requires to relative paths in .tmp-testbuild. Run after `tsc -p tsconfig.test.json`.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '.tmp-testbuild');

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) {
      walk(p);
      continue;
    }
    if (!f.name.endsWith('.js')) continue;
    let src = fs.readFileSync(p, 'utf8');
    if (!src.includes('@/')) continue;
    const depth = path.relative(OUT, path.dirname(p)).split(path.sep).filter(Boolean).length;
    const prefix = depth === 0 ? './' : '../'.repeat(depth);
    const next = src.split('require("@/').join('require("' + prefix);
    if (next !== src) fs.writeFileSync(p, next);
  }
}

walk(OUT);
console.log('[fix-test-aliases] alias requires rewritten');
