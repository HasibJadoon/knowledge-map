/**
 * Download Lane Arabic-English Lexicon SQLite from GitHub.
 *
 * Tries (in order):
 *   1. Latest release asset matching lexicon.sqlite.zip
 *   2. Raw file from default branch
 *   3. Prompts user for manual download URL
 *
 * Output: data/sources/lane/lexicon.sqlite
 */

import { mkdirSync, createWriteStream, existsSync } from 'node:fs';
import { writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const OUT_DIR   = resolve('data/sources/lane');
const ZIP_PATH  = join(OUT_DIR, 'lexicon.sqlite.zip');
const SQLITE_PATH = join(OUT_DIR, 'lexicon.sqlite');

const GITHUB_API = 'https://api.github.com';
const REPO       = 'laneslexicon/lexicon_config';
const ZIP_NAME   = 'lexicon.sqlite.zip';

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'km-lane-importer/1.0',
      'Accept': 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`  Downloading: ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'km-lane-importer/1.0' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} ${url}`);

  const buffer = await res.arrayBuffer();
  writeFileSync(dest, Buffer.from(buffer));
  const kb = Math.round(buffer.byteLength / 1024);
  console.log(`  Saved ${kb} KB → ${dest}`);
}

function unzipSqlite(zipPath: string, outDir: string): void {
  // Try system unzip first
  const r = spawnSync('unzip', ['-o', zipPath, ZIP_NAME.replace('.zip', ''), '-d', outDir], {
    encoding: 'utf8',
  });
  if (r.status === 0) { console.log('  Unzipped via system unzip.'); return; }

  // Fall back to Node adm-zip if available
  try {
    // Dynamic require so the script still runs even if adm-zip is not installed
    // (it will fail here only if unzip also failed)
    const require = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AdmZip  = require('adm-zip') as any;
    const zip     = new AdmZip(zipPath);
    zip.extractAllTo(outDir, true);
    console.log('  Unzipped via adm-zip.');
    return;
  } catch {
    // adm-zip not installed
  }

  // Last resort: node built-in (Node 18+) — only handles .gz, not .zip
  throw new Error(
    `Cannot unzip ${zipPath}.\n` +
    'Install unzip (brew install unzip) or: npm install -g adm-zip'
  );
}

async function findReleaseAsset(): Promise<string | null> {
  try {
    const releases = await fetchJson(`${GITHUB_API}/repos/${REPO}/releases`) as Array<{
      assets: Array<{ name: string; browser_download_url: string }>;
    }>;
    for (const rel of releases) {
      const asset = rel.assets.find(a => a.name === ZIP_NAME);
      if (asset) return asset.browser_download_url;
    }
  } catch (e) {
    console.warn(`  GitHub releases API failed: ${(e as Error).message}`);
  }
  return null;
}

async function findRawBranchFile(): Promise<string | null> {
  for (const branch of ['master', 'main']) {
    const url = `https://raw.githubusercontent.com/${REPO}/${branch}/${ZIP_NAME}`;
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'km-lane-importer/1.0' } });
      if (res.ok) return url;
    } catch { /* try next */ }
  }
  return null;
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  if (existsSync(SQLITE_PATH)) {
    const stat = spawnSync('ls', ['-lh', SQLITE_PATH], { encoding: 'utf8' });
    console.log(`Lane SQLite already exists:\n  ${stat.stdout.trim()}`);
    console.log('Remove it first if you want to re-download.');
    return;
  }

  console.log('Looking for Lane lexicon.sqlite.zip on GitHub…');

  // 1. Try release assets
  let downloadUrl = await findReleaseAsset();
  if (downloadUrl) {
    console.log('  Found in GitHub releases.');
  } else {
    // 2. Try raw branch file
    downloadUrl = await findRawBranchFile();
    if (downloadUrl) {
      console.log('  Found as raw repo file.');
    }
  }

  if (!downloadUrl) {
    console.error(
      '\nCould not find lexicon.sqlite.zip automatically.\n' +
      'Please download it manually:\n' +
      `  1. Go to https://github.com/${REPO}/releases\n` +
      `     or https://github.com/${REPO}/blob/master/${ZIP_NAME}\n` +
      `  2. Save it to: ${ZIP_PATH}\n` +
      '  3. Re-run this script to unzip.'
    );
    process.exit(1);
  }

  await downloadFile(downloadUrl, ZIP_PATH);

  console.log('Unzipping…');
  unzipSqlite(ZIP_PATH, OUT_DIR);

  if (!existsSync(SQLITE_PATH)) {
    // The zip might contain a differently-named file — list contents
    const ls = spawnSync('ls', ['-lh', OUT_DIR], { encoding: 'utf8' });
    console.error(
      `lexicon.sqlite not found after unzip.\nContents of ${OUT_DIR}:\n${ls.stdout}`
    );
    process.exit(1);
  }

  console.log('\nDone:');
  const stat = spawnSync('ls', ['-lh', SQLITE_PATH], { encoding: 'utf8' });
  console.log(' ', stat.stdout.trim());
  console.log('\nNext step: npm run lane:inspect');
}

main().catch(err => { console.error(err); process.exit(1); });
