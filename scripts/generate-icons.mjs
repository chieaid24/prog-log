// Generates the app icons (manifest 192/512 + maskable, apple-touch 180)
// from the same 16x14 Ferdy sprite as components/ui/frog.tsx, scaled with
// nearest-neighbor so the pixels stay crisp, centered on the paper surface.
//
//   node scripts/generate-icons.mjs
//
// Colors are the sRGB equivalents of the DESIGN.md oklch tokens (the PNG
// format has no oklch). Re-run whenever the sprite or palette changes.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Keep in sync with components/ui/frog.tsx.
const SPRITE = [
  "...GG......GG...",
  "..GWWG....GWWG..",
  "..GWKG....GWKG..",
  "..GGGGGGGGGGGG..",
  ".GGGGGGGGGGGGGG.",
  ".GGGGGGGGGGGGGG.",
  ".GGYYYYYYYYYYGG.",
  ".GGYYYYYYYYYYGG.",
  "GGGGYYYYYYYYGGGG",
  "GG.GGGGGGGGGG.GG",
  "BBBBBBBBBBBBBBBB",
  "BUBBBBUBBBBBUBBB",
  "BBBBUBBBBBUBBBBB",
  ".UUUUUUUUUUUUUU.",
];
const COLS = 16;
const ROWS = SPRITE.length;

const PALETTE = {
  G: [0x2c, 0x82, 0x40], // frog-green oklch(0.54 0.13 148)
  Y: [0xd5, 0xf1, 0xd7], // frog-green-soft oklch(0.93 0.045 148)
  W: [0xfc, 0xfc, 0xf9], // on-green oklch(0.99 0.004 95)
  K: [0x2a, 0x26, 0x20], // ink oklch(0.27 0.012 80)
  B: [0x7d, 0x5b, 0x40], // log-brown oklch(0.5 0.06 60)
  U: [0x5f, 0x40, 0x2a], // bark shading oklch(0.4 0.055 55)
};
const PAPER = [0xf7, 0xf6, 0xf0]; // paper oklch(0.972 0.008 95)

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode an RGB pixel buffer (rows of [r,g,b]) as a PNG file. */
function encodePng(pixels, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 3);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixels[y][x];
      const o = rowStart + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Render the sprite centered on a size x size paper canvas. `content` is the
 * fraction of the edge the sprite's width may occupy (maskable icons need a
 * bigger margin: the platform crops up to 20% per edge).
 */
function renderIcon(size, content) {
  const scale = Math.max(1, Math.floor((size * content) / COLS));
  const w = COLS * scale;
  const h = ROWS * scale;
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);
  const pixels = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => PAPER),
  );
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = SPRITE[Math.floor(y / scale)][Math.floor(x / scale)];
      if (ch !== ".") pixels[oy + y][ox + x] = PALETTE[ch];
    }
  }
  return encodePng(pixels, size, size);
}

const OUT = [
  ["public/icons/icon-192.png", 192, 0.8],
  ["public/icons/icon-512.png", 512, 0.8],
  // Maskable safe zone: keep the sprite inside the central 60% circle.
  ["public/icons/icon-maskable-512.png", 512, 0.55],
  ["app/apple-icon.png", 180, 0.72],
];

for (const [rel, size, content] of OUT) {
  const path = join(ROOT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, renderIcon(size, content));
  console.log(`wrote ${rel} (${size}x${size})`);
}
