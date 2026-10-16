# RainCheck PWA

RainCheck is an installable Progressive Web App (PWA) built with Vite and vanilla JavaScript.

## Included components

- `public/manifest.webmanifest`: application name, relative scope/start URL, standalone mode, theme, and 192×192/512×512 PNG icons.
- `public/icons/`: home-screen icons.
- `public/sw.js`: production service worker with build-specific cache identity and complete app-shell precaching.
- `scripts/prepare-pwa.mjs`: postbuild script that lists hashed `dist/assets/` files, generates `dist/precache-manifest.json`, and embeds the build ID in `dist/sw.js`.
- `index.html`: manifest, favicon, Apple touch icon, and mobile metadata.
- `src/main.js`: registers the service worker after page load.

Files under `public/` are copied to `dist/` by Vite. `npm run build` runs `vite build && node scripts/prepare-pwa.mjs`. Running `vite build` alone does not finish PWA packaging. The development server does not register the service worker.

## Installation

1. Build and deploy the application using [Apache/cPanel instructions](hosting-cpanel.md).
2. Open it over **HTTPS** on a supported browser and allow the initial page to load.
3. Android Chrome: use the browser's **Install app** or **Add to Home screen** option if offered.
4. iOS Safari: open **Share → Add to Home Screen** (menu labels vary by iOS release).
5. Desktop Chromium browsers: use the browser's install control when available.

Install prompts are browser-dependent. RainCheck does not display a custom installation prompt.

## Offline behavior

During installation, the service worker reads `precache-manifest.json` and caches HTML, icons, the manifest, and **all hashed production JavaScript/CSS assets** before activating. Once installation has finished and the page has been reloaded online, the PWA can launch offline without missing scripts.

**No offline weather forecasts are promised.** Live rain status, city search, reverse geocoding, and fresh forecasts all use third-party APIs, which require an internet connection. An offline forecast request displays an error. External Google Fonts may be unavailable offline; system font fallbacks are provided.

The service worker only handles same-origin GET requests; it deliberately does not intercept calls to weather or geocoding providers. It does not store precise location history or weather responses persistently.

## Online version check

Production builds include a static `version.json` endpoint (see [deployment guide](hosting-cpanel.md)). The service worker explicitly bypasses its cache for this file, so it can be requested separately from the installed app shell to identify the deployment. The UI header uses version metadata embedded in its own JavaScript bundle, rather than querying the endpoint. This reliably identifies the running version while offline. The online endpoint identifies the deployed version, which can be newer. The file reports the build timestamp, not the installation or deployment time. No automatic update prompt is included in this version. Updating `CACHE_NAME` invalidates the old app-shell cache on service-worker activation (currently `raincheck-app-v3`).

## Update behavior

Each production build embeds its own version and UTC timestamp into the service worker cache name. This forces a new installation, precaches new assets, and retires older RainCheck caches. No manual cache version bump is needed. HTML navigation uses the network when online and falls back to the cached shell offline.

After deployment, revisit/reload the page online to acquire updated assets. Browser cache and service-worker updates can make deployment visibility asynchronous.

## Deployment checklist

- [ ] `npm run build` succeeds and generates `dist/precache-manifest.json`.
- [ ] `dist/sw.js` has a build-specific cache name with no `__CACHE_VERSION__` placeholder.
- [ ] All JS and CSS files in `dist/assets/` appear in `precache-manifest.json`.
- [ ] HTTPS works.
- [ ] `index.html`, `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, and `assets/` are present in Document Root.
- [ ] In DevTools → Application → Manifest, the icon and manifest are detected.
- [ ] In DevTools → Application → Service Workers, the worker is active and controls the page after reload.
- [ ] Run `npm run build && npm run preview`, open the app online, wait until the service worker activates, and reload online.
- [ ] In DevTools → Application → Cache Storage, verify the JavaScript and CSS files are cached.
- [ ] Set DevTools → Network to Offline (or stop the preview server) and reload: the UI must render.
- [ ] Do not use `npm run dev` as an offline test; Vite development modules need a running server.
- [ ] Both weather buttons report network failure offline rather than presenting stale data as live information.
- [ ] Test installability on the actual target device/browser.

## Documentation policy

Every requested feature or behavior change must include a matching update to its relevant English documentation in the same set of changes.
