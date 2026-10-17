import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [relative(dist, path).split(sep).join('/')];
  }));
  return files.flat();
}

const files = await listFiles(dist);
const required = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'version.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

for (const file of required) {
  if (!files.includes(file)) throw new Error(`Missing PWA build output: ${file}`);
}

const assets = files.filter(file => file.startsWith('assets/'));
if (!assets.some(file => file.endsWith('.js'))) {
  throw new Error('No production JavaScript bundle found in dist/assets.');
}

const build = JSON.parse(await readFile(join(dist, 'version.json'), 'utf8'));
if (!build.version || !build.builtAt) throw new Error('Invalid version.json');

const swPath = join(dist, 'sw.js');
const serviceWorker = await readFile(swPath, 'utf8');
if (!serviceWorker.includes('__CACHE_VERSION__')) {
  throw new Error('Service worker cache version placeholder is missing.');
}

// A new build gets a new worker script and a new cache, even if package version is unchanged.
const cacheVersion = `${build.version}-${build.builtAt}`.replace(/[^A-Za-z0-9._-]/g, '-');
await writeFile(swPath, serviceWorker.replaceAll('__CACHE_VERSION__', cacheVersion));

// Icons stay deployed for browser/install requests but are fetched only when needed.
// The offline app shell itself does not depend on image icons.
const precache = ['index.html', 'manifest.webmanifest', ...assets.sort()];
await writeFile(join(dist, 'precache-manifest.json'), JSON.stringify(precache, null, 2) + '\n');
console.log(`PWA precache prepared: ${precache.length} files; cache ${cacheVersion}`);
