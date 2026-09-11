import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { expect, test } from 'vitest';

test('approved wordmark has intact image pixels, not just a readable PNG header', () => {
  // Exact original: Drive 18aTcfTYcnUkEylNRlD1-1Cs9m3SDOmWv.
  // The previous corrupted file reported naturalWidth in Chrome but rendered blank.
  const png = readFileSync('assets/ridgewood-wordmark-primary-light.png');
  expect(createHash('sha256').update(png).digest('hex')).toBe('380767169819a01145a323c109190ea8984f8e785c8182dfd2860222a9102bbb');
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  expect(inflateSync(Buffer.concat(chunks)).length).toBeGreaterThan(0);
});
