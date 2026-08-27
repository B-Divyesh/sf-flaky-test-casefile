import { deflateSync, inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { maskPng } from '../src/png-mask.js';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const table = Array.from({ length: 256 }, (_, value) => { let current = value; for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1; return current >>> 0; });
function crc32(buffer: Buffer) { let crc = 0xffffffff; for (const byte of buffer) crc = (table[(crc ^ byte) & 255]! ^ (crc >>> 8)) >>> 0; return (crc ^ 0xffffffff) >>> 0; }
function chunk(name: string, data: Buffer) { const type = Buffer.from(name); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([type, data]))); return Buffer.concat([length, type, data, crc]); }
function fixture() {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.from([0, 255, 255, 255, 255, 200, 200, 200, 255]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
function decodedRows(png: Buffer) {
  let cursor = 8; const values: Buffer[] = [];
  while (cursor < png.length) { const size = png.readUInt32BE(cursor); const name = png.toString('ascii', cursor + 4, cursor + 8); if (name === 'IDAT') values.push(png.subarray(cursor + 8, cursor + 8 + size)); cursor += size + 12; }
  return inflateSync(Buffer.concat(values));
}

describe('PNG masks', () => {
  it('bakes a navy rectangle into pixels without changing unmasked pixels', () => {
    const output = decodedRows(maskPng(fixture(), [{ x: 0, y: 0, width: 1, height: 1 }]));
    expect([...output.subarray(1, 5)]).toEqual([7, 27, 43, 255]);
    expect([...output.subarray(5, 9)]).toEqual([200, 200, 200, 255]);
  });
});
