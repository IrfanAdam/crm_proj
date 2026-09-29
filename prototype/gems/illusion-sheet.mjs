/* ADAM/GEMS — prototype/gems/illusion-sheet.mjs · paired sheet + metric table */
// [plan:2026-09-28_221212-illusion-cube-recreation.md#{#phase-6}] · Task 34 alignment proof.
// — Run: node prototype/gems/illusion-sheet.mjs <passdir> <filmstrip> <out.png>
// — Out: 4x4 paired sheet (ref above, native below, index label) + metrics.json + table on stdout.
// — Map: crc/chunk · pngDec/pngEnc · gutter scan (re-derives tile math) · crop/fit · mdiff (masked) · digits · main.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
const crcT = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return Buffer.from([(c ^ -1) >>> 24, ((c ^ -1) >>> 16) & 255, ((c ^ -1) >>> 8) & 255, (c ^ -1) & 255]); };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const h = Buffer.concat([Buffer.from(t), d]); return Buffer.concat([l, h, crc(h)]); };
const pngDec = (p) => {
  const b = readFileSync(p); let o = 8; const id = []; let w, h, ct;
  while (o < b.length) { const l = b.readUInt32BE(o), t = b.toString('ascii', o + 4, o + 8); if (t === 'IHDR') { w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12); ct = b[o + 17]; } if (t === 'IDAT') id.push(b.subarray(o + 8, o + 8 + l)); o += 12 + l; }
  const ch = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(id)), px = Buffer.alloc(w * h * 3), st = w * ch, prev = Buffer.alloc(st);
  let q = 0;
  for (let y = 0; y < h; y++) { const f = raw[q++], cur = Buffer.alloc(st);
    for (let x = 0; x < st; x++) { const a = x >= ch ? cur[x - ch] : 0, u = prev[x], ul = x >= ch ? prev[x - ch] : 0; let v = raw[q + x];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1; else if (f === 4) { const e = a + u - ul, pa = Math.abs(e - a), pb = Math.abs(e - u), pc = Math.abs(e - ul); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : ul; }
      cur[x] = v & 255; }
    q += st; cur.copy(prev);
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) px[(y * w + x) * 3 + k] = cur[x * ch + k]; }
  return { w, h, px };
};
const pngEnc = (w, h, px) => { const r = [0]; for (let y = 0; y < h; y++) { if (y) r.push(0); for (let x = 0; x < w * 3; x++) r.push(px[y * w * 3 + x]); } const id = deflateSync(Buffer.from(r)), ih = Buffer.alloc(13); ih.writeUInt32BE(w); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', id), chunk('IEND', Buffer.alloc(0))]); };
const shift = (F, horiz, d) => { let s = 0, n = 0; if (horiz) { for (let y = 0; y < F.h; y += 13) for (let x = 0; x + d < F.w; x += 2) { const i = (y * F.w + x) * 3; s += Math.abs(F.px[i] - F.px[i + d * 3]) + Math.abs(F.px[i + 1] - F.px[i + 1 + d * 3]) + Math.abs(F.px[i + 2] - F.px[i + 2 + d * 3]); n += 3; } } else { for (let y = 0; y + d < F.h; y += 2) for (let x = 0; x < F.w; x += 13) { const i = (y * F.w + x) * 3, j = ((y + d) * F.w + x) * 3; s += Math.abs(F.px[i] - F.px[j]) + Math.abs(F.px[i + 1] - F.px[j + 1]) + Math.abs(F.px[i + 2] - F.px[j + 2]); n += 3; } } return s / n; };
const best = (F, horiz, lo, hi) => { let bd = 0, bv = 1e9; for (let d = lo; d <= hi; d++) { const v = shift(F, horiz, d); if (v < bv) { bv = v; bd = d; } } return [bd, +bv.toFixed(3)]; };
const inMask = (x, y, tw, th) => (x < 124 && y < 38) || (x >= tw - 70 && y >= th - 28);
const origin = (F, pX, pY) => { let bx = 0, by = 0, bv = 1e18; for (let cx0 = -4; cx0 <= 4; cx0++) for (let cy0 = -4; cy0 <= 4; cy0++) { let s = 0, n = 0;
  for (let k = 1; k < 16; k++) { const ax = cx0 + (k & 3) * pX, ay = cy0 + (k >> 2) * pY;
    for (let y = 0; y < pY; y += 9) for (let x = 0; x < pX; x += 9) { if (inMask(x, y, pX, pY)) continue; const X = ax + x, Y = ay + y; if (X < 0 || Y < 0 || X >= F.w || Y >= F.h) continue;
      const a = (Y * F.w + X) * 3, b = (y * F.w + x) * 3; s += Math.abs(F.px[a] - F.px[b]) + Math.abs(F.px[a + 1] - F.px[b + 1]) + Math.abs(F.px[a + 2] - F.px[b + 2]); n += 3; } }
  if (s / n < bv) { bv = s / n; bx = cx0; by = cy0; } } return [bx, by, +bv.toFixed(3)]; };
const crop = (F, x0, y0, w, h) => { const o = Buffer.alloc(w * h * 3); for (let y = 0; y < h; y++) F.px.copy(o, y * w * 3, ((y0 + y) * F.w + x0) * 3, ((y0 + y) * F.w + x0 + w) * 3); return o; };
const fit = (N, tw, th) => { const o = Buffer.alloc(tw * th * 3); for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const sx = (x + 0.5) * N.w / tw - 0.5, sy = (y + 0.5) * N.h / th - 0.5, x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
  for (let k = 0; k < 3; k++) { const g = (xx, yy) => N.px[(Math.min(N.h - 1, Math.max(0, yy)) * N.w + Math.min(N.w - 1, Math.max(0, xx))) * 3 + k]; o[(y * tw + x) * 3 + k] = Math.round(g(x0, y0) * (1 - fx) * (1 - fy) + g(x0 + 1, y0) * fx * (1 - fy) + g(x0, y0 + 1) * (1 - fx) * fy + g(x0 + 1, y0 + 1) * fx * fy); } } return o; };
const mdiff = (A, B, tw, th) => { const s = [0, 0, 0]; let n = 0; for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { if (inMask(x, y, tw, th)) continue; for (let k = 0; k < 3; k++) s[k] += Math.abs(A[(y * tw + x) * 3 + k] - B[(y * tw + x) * 3 + k]); n++; } return s.map((v) => +(v / n).toFixed(2)); };
const F5 = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
const [pass, film, outP] = process.argv.slice(2);
const F = pngDec(film);
const [pitchX, pitchDiff] = best(F, true, 390, 410), [pitchY, pitchDiffY] = best(F, false, 280, 310);
const [ox, oy, originDiff] = origin(F, pitchX, pitchY);
const tw = pitchX, th = pitchY;
const tileOK = ox === 0 && oy === 0 && pitchX === 400 && pitchY === 300;
const G = 10, LB = 18, SW = 4 * tw + 5 * G, SH = 4 * (2 * th + LB) + 5 * G, sp = Buffer.alloc(SW * SH * 3, 26);
const set = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < SW && y < SH) { const i = (y * SW + x) * 3; sp[i] = r; sp[i + 1] = g; sp[i + 2] = b; } };
const blit = (buf, bw, dx, dy) => { for (let y = 0; y < buf.length / (bw * 3); y++) for (let x = 0; x < bw; x++) { const i = (y * bw + x) * 3; set(dx + x, dy + y, buf[i], buf[i + 1], buf[i + 2]); } };
const num = (v, dx, dy) => { String(v).padStart(2, '0').split('').forEach((ch, n) => { const gl = F5[+ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r * 3 + c] === '1') for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) set(dx + n * 8 + c * 2 + a, dy + r * 2 + b, 255, 255, 255); }); };
const rows = [];
for (let k = 0; k < 16; k++) {
  const r = k >> 2, c = k & 3, X = ox + c * pitchX, Y = oy + r * pitchY;
  const ref = crop(F, X, Y, tw, th), off = crop(F, c === 3 ? X - 6 : X + 6, r === 3 ? Y - 6 : Y + 6, tw, th);
  const nat = fit(pngDec(`${pass}/f${String(k).padStart(2, '0')}.png`), tw, th);
  const m = mdiff(ref, nat, tw, th), mOff = mdiff(off, nat, tw, th);
  const mean = +((m[0] + m[1] + m[2]) / 3).toFixed(2), meanOff = +((mOff[0] + mOff[1] + mOff[2]) / 3).toFixed(2);
  rows.push({ t: k, mean, rgb: m, misaligned: meanOff, aligns: meanOff > mean });
  const dx = G + c * (tw + G), dy = G + r * (2 * th + LB + G);
  blit(ref, tw, dx, dy); num(k, dx + 4, dy + th + 4); blit(nat, tw, dx, dy + th + LB);
}
writeFileSync(outP, pngEnc(SW, SH, sp));
const metrics = { tileMath: { ox, oy, pitchX, pitchY, tw, th, pitchDiff, pitchDiffY, originDiff, rederived: tileOK }, rows };
writeFileSync(outP.replace(/\.png$/, '') + '-metrics.json', JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
