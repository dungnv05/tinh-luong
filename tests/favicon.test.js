const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const HTML_PAGES = ['index.html'];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const EXPECTED_CSP =
  "default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src https://challenges.cloudflare.com; connect-src 'self' https://*.supabase.co https://www.yundev.space https://challenges.cloudflare.com https://cdn.jsdelivr.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests";

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

test('HTML pages contain expected favicon links, theme-color metas, and no inline head scripts', () => {
  for (const page of HTML_PAGES) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const headMatch = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
    assert.ok(headMatch, `${page} must have a <head> block`);
    const head = headMatch[1];

    assert.equal(
      countMatches(head, /<link\s+rel="icon"\s+href="\/favicon\.ico"(?:\s+sizes="32x32")?\s*>/g),
      1,
      `${page} <head> must contain /favicon.ico link exactly once`
    );
    assert.equal(
      countMatches(head, /<link\s+rel="icon"\s+href="\/favicon\.svg"\s+type="image\/svg\+xml"\s*>/g),
      1,
      `${page} <head> must contain /favicon.svg link exactly once`
    );
    assert.equal(
      countMatches(head, /<link\s+rel="apple-touch-icon"\s+href="\/apple-touch-icon\.png"\s*>/g),
      1,
      `${page} <head> must contain /apple-touch-icon.png link exactly once`
    );
    assert.equal(
      countMatches(
        head,
        /<meta\s+name="theme-color"\s+content="#FAF7F2"\s+media="\(prefers-color-scheme:\s*light\)"\s*>/g
      ),
      1,
      `${page} <head> must contain light theme-color meta`
    );
    assert.equal(
      countMatches(
        head,
        /<meta\s+name="theme-color"\s+content="#15121D"\s+media="\(prefers-color-scheme:\s*dark\)"\s*>/g
      ),
      1,
      `${page} <head> must contain dark theme-color meta`
    );

    const allIconLinks = html.match(/<link\b[^>]*\brel="(?:[^"]*\s)?(?:apple-touch-icon(?:-precomposed)?|mask-icon|(?:shortcut\s+)?icon)(?:\s[^"]*)?"[^>]*>/gi) || [];
    assert.equal(allIconLinks.length, 3, `${page} must have no other icon links besides the 3 expected ones`);
    assert.equal(
      countMatches(html, /rel="shortcut\s+icon"/gi),
      0,
      `${page} must not contain shortcut icon link`
    );

    const headScripts = head.match(/<script\b[^>]*>/gi) || [];
    const inlineHeadScripts = headScripts.filter((tag) => !/\bsrc\s*=/i.test(tag));
    assert.equal(inlineHeadScripts.length, 0, `${page} <head> must not contain <script> without src`);
  }
});

test('favicon.svg is valid static SVG without active or external content', () => {
  const svg = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');

  assert.match(svg, /<svg\b/);
  assert.match(svg, /viewBox="0 0 64 64"/);

  const forbiddenPatterns = [
    /<script/i,
    /\son[a-z]+\s*=/i,
    /<foreignObject/i,
    /<!DOCTYPE/i,
    /<!ENTITY/i,
    /data:/i,
    /<style/i,
    /@import/i,
    / style=/i,
    /href=/i,
    /<image/i,
    /url\((?!#)/i
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(svg, pattern, `favicon.svg must not match ${pattern}`);
  }

  const svgWithoutXmlns = svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '');
  assert.doesNotMatch(svgWithoutXmlns, /http:/i, 'favicon.svg must not contain http: URLs other than SVG xmlns');
  assert.doesNotMatch(svgWithoutXmlns, /https:/i, 'favicon.svg must not contain https: URLs');
});

test('favicon.ico contains 16, 32, 48 PNG frames and no trailing bytes', () => {
  const buf = fs.readFileSync(path.join(root, 'favicon.ico'));

  assert.ok(buf.length >= 6, 'favicon.ico too small');
  assert.deepEqual(buf.subarray(0, 4), Buffer.from([0x00, 0x00, 0x01, 0x00]), 'Invalid ICO header');

  const count = buf.readUInt16LE(4);
  assert.equal(count, 3, 'favicon.ico must contain exactly 3 images');
  assert.ok(buf.length >= 6 + count * 16, 'favicon.ico truncated directory');

  const sizes = [];
  let maxEnd = 0;

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    const width = buf.readUInt8(entryOffset);
    const height = buf.readUInt8(entryOffset + 1);
    const dataSize = buf.readUInt32LE(entryOffset + 8);
    const dataOffset = buf.readUInt32LE(entryOffset + 12);

    assert.equal(width, height, `ICO entry ${i} width and height must match`);
    sizes.push(width);

    assert.ok(dataOffset + dataSize <= buf.length, `ICO entry ${i} exceeds file length`);
    assert.ok(dataSize >= 24, `ICO entry ${i} PNG payload too small for IHDR`);
    assert.deepEqual(
      buf.subarray(dataOffset, dataOffset + 8),
      PNG_SIGNATURE,
      `ICO entry ${i} must start with PNG signature`
    );
    const ihdrWidth = buf.readUInt32BE(dataOffset + 16);
    const ihdrHeight = buf.readUInt32BE(dataOffset + 20);
    assert.equal(ihdrWidth, width, `ICO entry ${i} PNG IHDR width must match directory entry`);
    assert.equal(ihdrHeight, height, `ICO entry ${i} PNG IHDR height must match directory entry`);

    if (dataOffset + dataSize > maxEnd) {
      maxEnd = dataOffset + dataSize;
    }
  }

  assert.deepEqual(
    [...sizes].sort((a, b) => a - b),
    [16, 32, 48],
    'favicon.ico must have 16, 32, 48 frames'
  );
  assert.equal(buf.length, maxEnd, 'favicon.ico must not have trailing bytes');
});

test('apple-touch-icon.png is 180x180 PNG without metadata chunks or trailing payload', () => {
  const buf = fs.readFileSync(path.join(root, 'apple-touch-icon.png'));

  assert.ok(buf.length >= 33, 'apple-touch-icon.png too small');
  assert.deepEqual(buf.subarray(0, 8), PNG_SIGNATURE, 'Invalid PNG signature');

  const forbiddenChunks = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);
  let pos = 8;
  let ihdrSeen = false;
  let lastChunkType = null;

  while (pos < buf.length) {
    assert.ok(pos + 12 <= buf.length, 'Truncated PNG chunk');
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const dataStart = pos + 8;
    const chunkEnd = dataStart + length + 4;
    assert.ok(chunkEnd <= buf.length, `PNG chunk ${type} exceeds file length`);

    if (type === 'IHDR') {
      assert.equal(length, 13, 'IHDR length must be 13');
      const width = buf.readUInt32BE(dataStart);
      const height = buf.readUInt32BE(dataStart + 4);
      assert.equal(width, 180, 'PNG width must be 180');
      assert.equal(height, 180, 'PNG height must be 180');
      ihdrSeen = true;
    }

    assert.ok(!forbiddenChunks.has(type), `PNG must not contain metadata chunk ${type}`);
    lastChunkType = type;
    pos = chunkEnd;

    if (type === 'IEND') {
      assert.equal(length, 0, 'IEND chunk length must be 0');
      break;
    }
  }

  assert.ok(ihdrSeen, 'PNG must contain IHDR chunk');
  assert.equal(lastChunkType, 'IEND', 'Last PNG chunk must be IEND');
  assert.equal(pos, buf.length, 'apple-touch-icon.png must not have trailing bytes after IEND');
});

test('vercel.json CSP is unchanged and allows same-origin and data images', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const globalHeaders = vercel.headers.find((rule) => rule.source === '/(.*)');
  assert.ok(globalHeaders, 'vercel.json must have global /(.*) header rule');

  const cspHeader = globalHeaders.headers.find((h) => h.key === 'Content-Security-Policy');
  assert.ok(cspHeader, 'vercel.json must have Content-Security-Policy header');

  assert.equal(cspHeader.value, EXPECTED_CSP);
  assert.ok(cspHeader.value.includes("img-src 'self' data:"), "CSP must include img-src 'self' data:");
});
