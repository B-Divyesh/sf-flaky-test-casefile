import { deflateSync, inflateSync } from 'node:zlib';
import type { MaskRegion } from './types.js';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let current = value;
  for (let bit = 0; bit < 8; bit += 1) current = (current & 1) ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
  return current >>> 0;
});

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = (CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

export function maskPng(source: Buffer, masks: MaskRegion[]): Buffer {
  if (!source.subarray(0, 8).equals(SIGNATURE)) throw new Error('Screenshot is not a PNG');
  let cursor = 8;
  let ihdr: Buffer | undefined;
  const compressed: Buffer[] = [];
  while (cursor < source.length) {
    const length = source.readUInt32BE(cursor);
    const type = source.toString('ascii', cursor + 4, cursor + 8);
    const data = source.subarray(cursor + 8, cursor + 8 + length);
    if (type === 'IHDR') ihdr = Buffer.from(data);
    if (type === 'IDAT') compressed.push(Buffer.from(data));
    cursor += length + 12;
    if (type === 'IEND') break;
  }
  if (!ihdr) throw new Error('PNG has no IHDR chunk');
  const width = ihdr.readUInt32BE(0); const height = ihdr.readUInt32BE(4);
  const depth = ihdr[8]; const colorType = ihdr[9]; const interlace = ihdr[12];
  if (depth !== 8 || ![2, 6].includes(colorType!) || interlace !== 0) throw new Error('Only non-interlaced 8-bit RGB/RGBA PNG screenshots can be masked');
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const encoded = inflateSync(Buffer.concat(compressed));
  const pixels = Buffer.alloc(height * stride);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = encoded[y * (stride + 1)]!;
    const row = encoded.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const output = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? output[x - channels]! : 0;
      const up = previous[x]!;
      const upperLeft = x >= channels ? previous[x - channels]! : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upperLeft;
        const pa = Math.abs(p - left); const pb = Math.abs(p - up); const pc = Math.abs(p - upperLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft;
      } else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      output[x] = (row[x]! + predictor) & 255;
    }
    previous = output;
  }
  for (const mask of masks) {
    const minX = Math.max(0, Math.floor(mask.x)); const maxX = Math.min(width, Math.ceil(mask.x + mask.width));
    const minY = Math.max(0, Math.floor(mask.y)); const maxY = Math.min(height, Math.ceil(mask.y + mask.height));
    for (let y = minY; y < maxY; y += 1) for (let x = minX; x < maxX; x += 1) {
      const offset = y * stride + x * channels;
      pixels[offset] = 7; pixels[offset + 1] = 27; pixels[offset + 2] = 43;
      if (channels === 4) pixels[offset + 3] = 255;
    }
  }
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
