// SPDX-License-Identifier: AGPL-3.0-only
// Leviate. Copyright (C) 2026 Vladyslav Pereverzyev

// Writes a plain zip of a folder, with Node alone: the Chrome extension and the Dentra
// plugin are uploaded as zips and the build should not need other tools.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? files(full, base) : [[path.relative(base, full).split(path.sep).join('/'), full]];
  });
}

export function zipFolder(dir, out) {
  const parts = [];
  const central = [];
  let offset = 0;
  // 1 January 2026, 00:00: the same bytes for the same files.
  const time = 0;
  const date = ((2026 - 1980) << 9) | (1 << 5) | 1;
  for (const [name, full] of files(dir)) {
    const data = fs.readFileSync(full);
    const packed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const nameBuf = Buffer.from(name, 'utf8');
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6);
    head.writeUInt16LE(8, 8);
    head.writeUInt16LE(time, 10);
    head.writeUInt16LE(date, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(packed.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(nameBuf.length, 26);
    parts.push(head, nameBuf, packed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x0800, 8);
    entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(packed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBuf.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBuf);
    offset += head.length + nameBuf.length + packed.length;
  }
  const size = central.reduce((s, b) => s + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(size, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(out, Buffer.concat([...parts, ...central, end]));
}
