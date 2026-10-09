#!/usr/bin/env node
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const SOURCE_URL = 'https://faino-naturalno-production.up.railway.app/sitemap.xml';
const PUBLIC_ORIGIN = 'https://f-n.fun/';
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const RETRY_PAUSE_MS = 3_000;
const MAX_BYTES = 50 * 1024 * 1024;

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(rootDir, 'frontend', 'public', 'sitemap.xml');

async function main() {
  const xml = await downloadSitemap();
  validateSitemap(xml);

  const existing = await readExisting();
  if (existing === xml) {
    console.log(`Sitemap unchanged, leaving ${outputPath} as-is.`);
    return;
  }

  await writeAtomically(outputPath, xml);
  console.log(`Wrote ${Buffer.byteLength(xml, 'utf8')} bytes to ${outputPath}`);
}

async function downloadSitemap() {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`Attempt ${attempt}/${MAX_ATTEMPTS}: GET ${SOURCE_URL}`);

    try {
      const xml = await fetchOnce();
      console.log(`Attempt ${attempt}: success (${Buffer.byteLength(xml, 'utf8')} bytes).`);
      return xml;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed: ${error.message}`);

      if (attempt < MAX_ATTEMPTS) {
        console.log(`Waiting ${RETRY_PAUSE_MS}ms before retry…`);
        await delay(RETRY_PAUSE_MS);
      }
    }
  }

  throw lastError ?? new Error('Failed to download sitemap.');
}

async function fetchOnce() {
  const response = await fetch(SOURCE_URL, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8' },
  });

  if (response.status !== 200) {
    throw new Error(`Expected HTTP 200, got ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!/application\/xml|text\/xml/i.test(contentType)) {
    throw new Error(`Unexpected Content-Type: ${contentType || '(missing)'}.`);
  }

  const xml = await response.text();
  const bytes = Buffer.byteLength(xml, 'utf8');

  if (bytes === 0) {
    throw new Error('Sitemap body is empty.');
  }

  if (bytes > MAX_BYTES) {
    throw new Error(`Sitemap is ${bytes} bytes; limit is ${MAX_BYTES}.`);
  }

  return xml;
}

function validateSitemap(xml) {
  const trimmed = xml.trimStart();
  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<urlset')) {
    throw new Error('Document must start with an XML declaration or <urlset.');
  }

  if (!/<urlset[\s>]/i.test(xml)) {
    throw new Error('Document does not contain <urlset>.');
  }

  const locMatches = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)];
  if (locMatches.length === 0 && !/<url[\s>]/i.test(xml)) {
    throw new Error('Document does not contain <url>.');
  }

  if (!/<url[\s>]/i.test(xml)) {
    throw new Error('Document does not contain <url>.');
  }

  for (const match of locMatches) {
    const loc = match[1].trim();
    if (!loc.startsWith(PUBLIC_ORIGIN)) {
      throw new Error(`<loc> must start with ${PUBLIC_ORIGIN}: ${loc}`);
    }

    if (/railway\.app/i.test(loc)) {
      throw new Error(`<loc> must not use a Railway URL: ${loc}`);
    }
  }
}

async function readExisting() {
  try {
    return await readFile(outputPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeAtomically(targetPath, contents) {
  await mkdir(dirname(targetPath), { recursive: true });
  const tempPath = join(
    dirname(targetPath),
    `.sitemap.${process.pid}.${Date.now()}.tmp`,
  );

  await writeFile(tempPath, contents, 'utf8');

  try {
    await rename(tempPath, targetPath);
  } catch (error) {
    try {
      if (error && (error.code === 'EPERM' || error.code === 'EEXIST')) {
        await copyFile(tempPath, targetPath);
      } else {
        throw error;
      }
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
