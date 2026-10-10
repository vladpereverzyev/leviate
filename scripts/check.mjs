// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Checks the syntax of every JavaScript file of the repository (the third-party code in
// vendor/ and node_modules/ aside), so a typo stops the build before a release. Each file is
// parsed as a module, which also accepts the plain scripts and the CommonJS files of the
// desktop app. Nothing is run. Run by .github/workflows/build.yml on every push:
//
//   node --experimental-vm-modules scripts/check.mjs

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '*.js', '*.mjs'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && !/(^|\/)(vendor|node_modules)\//.test(f));

let failed = 0;
for (const file of files) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^#!.*/, '');
  try {
    new vm.SourceTextModule(code, { identifier: file });
  } catch (err) {
    failed++;
    console.error(`${file}: ${err.message}`);
  }
}
console.log(`${files.length - failed} of ${files.length} JavaScript files are valid`);
if (failed) process.exit(1);
