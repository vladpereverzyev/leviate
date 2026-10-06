// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Raises the version in js/version.js.
//   node scripts/bump.mjs          patch  1.0.0 -> 1.0.1
//   node scripts/bump.mjs minor    minor  1.0.1 -> 1.1.0
//   node scripts/bump.mjs major    major  1.1.0 -> 2.0.0

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'version.js');
const text = fs.readFileSync(file, 'utf8');
const match = text.match(/VERSION = '(\d+)\.(\d+)\.(\d+)'/);
if (!match) throw new Error('VERSION not found in js/version.js');

let [major, minor, patch] = match.slice(1).map(Number);
const part = process.argv[2] || 'patch';
if (part === 'major') { major++; minor = 0; patch = 0; }
else if (part === 'minor') { minor++; patch = 0; }
else if (part === 'patch') { patch++; }
else throw new Error('Use patch, minor or major');

const next = `${major}.${minor}.${patch}`;
fs.writeFileSync(file, text.replace(match[0], `VERSION = '${next}'`));
console.log(next);
