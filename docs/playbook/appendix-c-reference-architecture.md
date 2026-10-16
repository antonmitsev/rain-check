# Appendix C — Executable Reference Architecture

**Companion to:** [Production PWA Generation Playbook](../PWA_Generation_Playbook.md)  
**Role:** A minimal, copyable **Vite + vanilla JavaScript** starter with manifest, icons, versioned precache, offline fallback, bounded local data, history, and safe update logic.

This is a **generic demo**, not RainCheck source code. The demo deliberately produces a visibly labelled SAMPLE result rather than pretending to access a real API. Replace the sample provider with a validated domain adapter before shipping. The code listings below form one coherent project; create the indicated files in an empty directory.

## C.1 Project and architectural contracts

~~~text
project/
  package.json
  index.html
  vite.config.js
  scripts/
    make-icons.mjs
    prepare-pwa.mjs
  public/
    manifest.webmanifest
    sw.js
    .htaccess
    icons/                         # created by make-icons.mjs
  src/
    main.js
    storage.js
    style.css
~~~

**Responsibility boundaries:** the build emits immutable assets and one build identity; the worker owns the installable app shell; storage owns persistent user data; the UI owns accessible rendering and events. Domain interpretation and API requests should live in separate modules in a real application.

**Commands:** install Node.js and npm; run **npm install**; use **npm run dev** for local development; use **npm run build** for the complete deployable **dist/**; then deploy every item inside **dist/** to the HTTPS Document Root. Do not run plain Vite build instead of the complete build command.

## C.2 Package and HTML

**package.json**

~~~json
{
  "name": "generic-pwa-starter",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "npm run icons && vite --host 0.0.0.0",
    "icons": "node scripts/make-icons.mjs",
    "build": "npm run icons && vite build && node scripts/prepare-pwa.mjs",
    "preview": "vite preview --host 0.0.0.0"
  },
  "devDependencies": {
    "vite": "^6.3.5",
    "pngjs": "^7.0.0"
  }
}
~~~

The **pngjs** dependency creates basic demonstration PNG icons, including an opaque 180px Apple touch icon and a 32px favicon; replace the artwork with real product art before release.

**index.html**

~~~html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#14263c">
  <meta name="description" content="A small offline-capable PWA demonstration.">
  <link rel="manifest" href="./manifest.webmanifest">
  <link rel="icon" sizes="32x32" href="./icons/favicon-32.png" type="image/png">
  <link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-title" content="Sample Status">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>Sample Status</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
~~~

## C.3 Consistent build identity

**vite.config.js**

~~~js
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
let commit = process.env.GITHUB_SHA || null;
if (!commit) {
  try {
    commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    // Archives and clean demo projects may have no Git metadata.
  }
}
const buildInfo = {
  version: pkg.version,
  builtAt: new Date().toISOString(),
  commit
};

export default defineConfig({
  base: './',
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [{
    name: 'emit-build-identity',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(buildInfo, null, 2) + '\n'
      });
    }
  }]
});
~~~

The *online* **version.json** represents the deployed release. The bundled **__BUILD_INFO__** represents the JavaScript actually running. They must not be conflated.

## C.4 Manifest and generated icon assets

**public/manifest.webmanifest**

~~~json
{
  "id": "./",
  "name": "Sample Status PWA",
  "short_name": "Sample Status",
  "description": "A small offline-ready status checker demonstration.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0b1627",
  "theme_color": "#14263c",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
~~~

**scripts/make-icons.mjs** — produces valid PNG files for a build from a fresh checkout; intentionally does not claim maskable artwork.

~~~js
import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('public/icons', { recursive: true });
for (const size of [32, 180, 192, 512]) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (size * y + x) * 4;
      const dx = (x - size / 2) / size;
      const dy = (y - size / 2) / size;
      const inside = dx * dx + dy * dy < 0.085;
      png.data[i] = inside ? 126 : 20;
      png.data[i + 1] = inside ? 202 : 38;
      png.data[i + 2] = inside ? 243 : 60;
      png.data[i + 3] = 255;
    }
  }
  const filename = size === 180 ? 'apple-touch-icon.png'
    : size === 32 ? 'favicon-32.png' : 'icon-' + size + '.png';
  await writeFile('public/icons/' + filename, PNG.sync.write(png));
}
~~~

## C.5 Build-specific precache packaging

**scripts/prepare-pwa.mjs**

~~~js
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const root = 'dist';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(entries.map(async entry => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [relative(root, full).split(sep).join('/')];
  }));
  return groups.flat();
}

const output = await walk(root);
for (const required of [
  'index.html', 'sw.js', 'version.json', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png'
]) {
  if (!output.includes(required)) throw new Error('Missing dist/' + required);
}
const assets = output.filter(name => name.startsWith('assets/')).sort();
if (!assets.some(name => name.endsWith('.js'))) {
  throw new Error('No production JS bundle found');
}
const build = JSON.parse(await readFile(join(root, 'version.json'), 'utf8'));
const identity = (build.version + '-' + build.builtAt).replace(/[^A-Za-z0-9._-]/g, '-');
const workerPath = join(root, 'sw.js');
const worker = await readFile(workerPath, 'utf8');
if (!worker.includes('__CACHE_VERSION__')) throw new Error('Worker placeholder missing');

// Never precache version.json: it must remain a network-only deployment probe.
const manifest = [
  'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  ...assets
];
await writeFile(join(root, 'precache-manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(workerPath, worker.replaceAll('__CACHE_VERSION__', identity));
~~~

Generate a fresh build timestamp on **each build**, not only a new package version. The build and the worker must be published together.

## C.6 Service worker: install atomically, navigate network-first

**public/sw.js**

~~~js
const PREFIX = 'sample-pwa-';
const CACHE = PREFIX + '__CACHE_VERSION__';
const BASE = self.registration.scope;
const HOME = new URL('./', BASE).href;
const VERSION_PATH = new URL('./version.json', BASE).pathname;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(new URL('./precache-manifest.json', BASE), {
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Precache manifest unavailable');
    const paths = await response.json();
    if (!Array.isArray(paths) || !paths.length) {
      throw new Error('Invalid precache manifest');
    }
    const urls = [HOME, ...paths.map(p => new URL(p, BASE).href)];
    const cache = await caches.open(CACHE);
    // Reject installation if any required file cannot be obtained.
    await cache.addAll(urls.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL('./', BASE).pathname)) return;

  if (url.pathname === VERSION_PATH) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) return response;
        throw new Error('Navigation response was not OK');
      } catch {
        // Leave this build's install-time shell intact; don't overwrite it
        // with unrelated HTML while another deployment is rolling out.
        const cache = await caches.open(CACHE);
        return (await cache.match(HOME)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return (await cache.match(request)) || fetch(request);
  })());
});
~~~

This design preserves a complete offline app shell from a single build. Do not delete unrelated caches. If a service worker is hosted in a subdirectory, use the same scope for every generated URL.

## C.7 Small, defensive persistent store

**src/storage.js**

~~~js
const KEY = 'sample-pwa:data:v1';
const EMPTY = () => ({ schema: 1, snapshot: null, history: [] });

function read() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && data.schema === 1 &&
        Array.isArray(data.history)) return data;
  } catch { /* private mode or corrupt JSON */ }
  return EMPTY();
}

function write(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

function safe(snapshot) {
  return snapshot &&
    (snapshot.state === 'ready' || snapshot.state === 'idle') &&
    Number.isFinite(snapshot.fetchedAt) &&
    snapshot.fetchedAt <= Date.now() + 60_000;
}

export function getSaved() {
  const item = read().snapshot;
  return safe(item) ? item : null;
}

export function getHistory() {
  return read().history
    .filter(x => x && safe(x.snapshot) && typeof x.key === 'string')
    .sort((a, b) => b.checkedAt - a.checkedAt)
    .slice(0, 3);
}

export function saveCheck(snapshot) {
  if (!safe(snapshot)) return false;
  const store = read();
  store.snapshot = snapshot;
  // This demo has one stable result key. Real apps use validated entity IDs.
  store.history = [{ key: 'sample', snapshot, checkedAt: Date.now() }];
  return write(store);
}

export function removeHistory(key) {
  const store = read();
  const before = store.history.length;
  store.history = store.history.filter(item => item.key !== key);
  return store.history.length !== before && write(store);
}
~~~

For a multi-location app, replace the single snapshot with a bounded map keyed by a stable entity ID, and store explicit-check snapshots *by value*. Removing history must not clear the main snapshot cache. The demo store is deliberately minimal, not a universal schema migration implementation.

## C.8 Minimal semantic UI, offline behavior, and safe update listener

**src/main.js**

~~~js
import './style.css';
import { getSaved, getHistory, saveCheck, removeHistory } from './storage.js';

const root = document.querySelector('#app');
root.innerHTML = [
  '<div class="shell">',
  '  <header><strong>Sample Status</strong><small id="version"></small></header>',
  '  <main>',
  '    <h1>One check. One answer.</h1>',
  '    <button id="check" class="primary">Check sample</button>',
  '    <section id="result" class="result" aria-live="polite">',
  '      <strong id="state">NOT CHECKED</strong>',
  '      <small id="meta">Sample provider · no network API</small>',
  '    </section>',
  '    <section id="recent" hidden><h2>Recent checks</h2>',
  '      <div id="items"></div></section>',
  '  </main>',
  '  <footer>Demonstration data · Not a real-time service</footer>',
  '  <div id="toast" role="status" aria-live="polite" hidden></div>',
  '</div>'
].join('');

const $ = selector => document.querySelector(selector);
$('#version').textContent = 'v' + __BUILD_INFO__.version;
let toastTimer;
let exitTimer;

function toast(message) {
  clearTimeout(toastTimer);
  clearTimeout(exitTimer);
  const node = $('#toast');
  node.className = 'toast--enter';
  node.textContent = message;
  node.hidden = false;
  toastTimer = setTimeout(() => {
    node.className = 'toast--exit';
    exitTimer = setTimeout(() => { node.hidden = true; }, 400);
  }, 3500);
}

function display(item, cached) {
  $('#state').textContent = item ? item.state.toUpperCase() : 'NO SAVED RESULT';
  $('#meta').textContent = item
    ? (cached ? 'CACHED · ' : '') +
      'SAMPLE · Fetched on ' + new Date(item.fetchedAt).toLocaleString('en-GB')
    : 'Connect once to save a sample result.';
}

function renderHistory() {
  const records = getHistory();
  $('#recent').hidden = records.length === 0;
  const list = $('#items');
  list.replaceChildren();
  for (const record of records) {
    const card = document.createElement('div');
    card.className = 'history-card';
    const open = document.createElement('button');
    open.className = 'history-open';
    open.type = 'button';
    open.textContent = record.snapshot.state.toUpperCase() + ' · ' +
      new Date(record.checkedAt).toLocaleString('en-GB');
    open.addEventListener('click', () => display(record.snapshot, true));
    const remove = document.createElement('button');
    remove.className = 'history-delete';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove recent sample');
    remove.addEventListener('click', () => {
      if (removeHistory(record.key)) {
        renderHistory();
        toast('Removed from history');
      }
    });
    card.append(open, remove);
    list.append(card);
  }
}

$('#check').addEventListener('click', () => {
  if (!navigator.onLine) {
    display(getSaved(), true);
    return;
  }
  // Replace this explicitly labelled SAMPLE with a real validated provider.
  const result = { state: 'ready', fetchedAt: Date.now() };
  saveCheck(result);
  display(result, false);
  renderHistory();
  toast('Sample updated');
});

display(getSaved(), true);
renderHistory();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  let deferred = false;
  function applyUpdate() {
    if (!hadController || reloading) return;
    if (!navigator.onLine) { deferred = true; return; }
    reloading = true;
    window.location.reload();
  }
  navigator.serviceWorker.addEventListener('controllerchange', applyUpdate);
  async function checkUpdate() {
    if (!navigator.onLine) return;
    if (deferred) return applyUpdate();
    try {
      const reg = await navigator.serviceWorker.getRegistration('./');
      if (reg) await reg.update();
    } catch (error) { console.warn('Update check failed', error); }
  }
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
      await reg.update();
    } catch (error) { console.warn('Worker registration failed', error); }
  });
  window.addEventListener('focus', () => { void checkUpdate(); });
  window.addEventListener('online', () => { void checkUpdate(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkUpdate();
  });
}
~~~

The starter reuses a single **local** sample provider for demonstration. It does not issue external requests or claim that the browser's connection hint proves actual network reachability. A real provider adapter must add actual request handling, cancellation, data validation, failure states, staleness thresholds, and safe reload handling for unsaved user input.

## C.9 Responsive styling and toast animation

**src/style.css**

~~~css
:root { font: 16px/1.5 system-ui, sans-serif; color: #f1f5ff; background: #0b1627; }
*, *::before, *::after { box-sizing: border-box; }
html, body, #app { width: 100%; max-width: 100%; min-width: 0; }
body { margin: 0; }
.shell { width: 100%; max-width: 580px; min-width: 0; margin-inline: auto;
  min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column;
  padding: max(24px, env(safe-area-inset-top))
           max(16px, env(safe-area-inset-right))
           max(32px, env(safe-area-inset-bottom))
           max(16px, env(safe-area-inset-left)); }
.shell > :not(#toast) { width: 100%; min-width: 0; max-width: 100%; }
header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
header > * { min-width: 0; overflow-wrap: anywhere; }
h1 { font-size: clamp(24px, 6vw, 34px); line-height: 1.1; margin: 28px 0 22px; }
button { font: inherit; cursor: pointer; }
.primary { border: 0; border-radius: 12px; padding: 13px 18px; font-weight: 700;
  width: 100%; background: #8ac6ff; color: #0b1627; }
.primary:focus-visible, .history-card button:focus-visible {
  outline: 2px solid #ffd17a; outline-offset: 2px;
}
.result { margin-top: 20px; padding: 14px; border: 1px solid #42617f;
  border-radius: 14px; background: #19324e; }
.result strong { display: block; font-size: 30px; line-height: 1.1; }
.result small { display: block; color: #c3d7ee; margin-top: 8px; }
#recent { margin-top: 30px; }
#recent[hidden] { display: none; }
#items { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
.history-card { position: relative; min-width: 0; border: 1px solid #38506a;
  border-radius: 12px; }
.history-open { background: transparent; border: 0; color: #f1f5ff;
  text-align: left; display: block; width: 100%; padding: 12px 56px 12px 12px;
  min-width: 0; overflow-wrap: anywhere; }
.history-delete { position: absolute; top: 5px; right: 5px; width: 40px;
  height: 40px; border: 1px solid #486480; color: #d7e3f2;
  border-radius: 8px; background: #203e5d; font-size: 22px; }
footer { margin-top: auto; padding-top: 32px; text-align: center;
  color: #a2b8d1; font-size: 12px; }
#toast { position: fixed; top: max(12px, env(safe-area-inset-top));
  left: 50%; transform: translateX(-50%); width: min(440px, calc(100vw - 28px));
  padding: 11px 16px; border: 1px solid #7594b4; border-radius: 10px;
  background: #244466; box-shadow: 0 12px 28px #0008; z-index: 100; }
#toast[hidden] { display: none; }
.toast--enter { animation: toastDown .35s ease-out both; }
.toast--exit { animation: toastLeft .38s ease-in both; }
@keyframes toastDown {
  from { opacity: 0; transform: translate(-50%, calc(-100% - 24px)); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes toastLeft {
  from { opacity: 1; transform: translate(-50%, 0); }
  to { opacity: 0; transform: translate(calc(-50% - 100vw), 0); }
}
@media(prefers-reduced-motion: reduce) {
  .toast--enter, .toast--exit { animation: none; }
}
~~~

The demonstration row uses a visible **40px** delete hit area; consider a 44px or larger effective touch target in the production design system.

## C.10 Apache deployment and update requirements

**public/.htaccess**

~~~apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L,NE]
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "^(index\.html|sw\.js|version\.json|precache-manifest\.json|manifest\.webmanifest)$">
        Header always set Cache-Control "no-store, max-age=0"
    </FilesMatch>
</IfModule>
~~~

The starter builds without a server-side Node process. Make sure **dist/.htaccess** and generated icons are not omitted when uploading via cPanel. Check origin/CDN headers and invalidate CDN copies of HTML/worker/manifest where needed.

**Operational safety:** update checks happen on load/focus/online; a new worker activates only after complete precache. Automatic reload is safe only for this read-only demo. A real editor/form app must postpone reload or get permission when unsaved data exists.

## C.11 What the starter demonstrates vs. what an agent must implement

| Already demonstrated by the listings | Must be configured for a real product |
| --- | --- |
| Build-identified immutable assets and metadata | Semantic version policy and deployment promotion |
| Valid generated PNGs and install manifest | Brand icon, maskable artwork if declared |
| Production SW full-shell precache and offline navigation | Hosted routing, CDN behavior, offline asset set |
| One button, clear result, small metadata | Real provider API, domain state machine, time-zone policy |
| Local snapshot, bounded history, in-card deletion | Stable real record keys, migrations, privacy/retention |
| Responsive layout and reduced-motion toasts | Brand tokens, final accessibility/content review |
| Controller-change auto-refresh for a read-only app | Unsaved edits, multi-tab update coordination |

**Hand-off rule:** The sample data flow must be replaced before claiming a real application is finished. The listings are a reference architecture, not evidence that a particular browser or hosting setup has been verified.

**Related:** [Appendix D](appendix-d-domain-specification.md) and [Appendix E](appendix-e-ux-design-system.md).
