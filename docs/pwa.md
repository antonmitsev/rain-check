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

## Connection indicator and theme

RainCheck always shows a connection banner below the header:

- **ONLINE** — browser connectivity is reported and the origin check has not failed; the standard blue theme is used.
- **OFFLINE** — `navigator.onLine` reports offline; a warm amber theme and explicit offline message appear. Weather actions stay active and display saved observations or forecasts instantly; city search and GPS lookup do not issue requests.
- **SERVER UNREACHABLE** — the browser may still have internet but a network-only request to this app's `version.json` fails (for example, after stopping `npm run preview`). The warm warning theme appears. Live weather actions remain enabled because third-party APIs may still work.

The browser's `online` and `offline` events update the state immediately. The app rechecks origin reachability on startup and when the window regains focus or visibility. Connectivity signals do not guarantee that an individual weather provider is working.

## Offline behavior

During installation, the service worker reads `precache-manifest.json` and caches HTML, icons, the manifest, and **all hashed production JavaScript/CSS assets** before activating. Once installation has finished and the page has been reloaded online, the PWA can launch offline without missing scripts.

**Offline data is historical.** After an online weather fetch, the app saves a time-stamped observation, the computed rain-stop forecast, and (when dry) the next expected rain onset in browser localStorage, along with the last selected location. Offline actions read these snapshots immediately without loaders or network calls. The display identifies the time of the observation (when provided), the time the snapshot was saved, and that it is **not live**. A previously viewed place can be restored when launching the PWA offline. If no snapshot exists, a clear empty-state message is shown.

Live rain observations and fresh forecasts still need connectivity. Offline city search and geolocation lookup do not start new requests. Cached weather is never automatically presented as current conditions. Saved predicted rain start times include an absolute calendar date so they remain meaningful on later offline days. Snapshots saved by older versions remain readable, but may lack a next-rain estimate. External Google Fonts may be unavailable offline; system font fallbacks are provided.

The service worker only handles same-origin GET requests; it deliberately does not intercept calls to weather or geocoding providers. It does not cache third-party API responses via the service worker. The application separately persists a limited localStorage snapshot (up to eight locations, coordinates rounded to three decimals), which can be removed using the browser's Clear Site Data option.

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
- [ ] With DevTools → Network → Offline: banner says OFFLINE, amber theme appears, and weather buttons stay enabled.
- [ ] First fetch a forecast online, then go offline and click both buttons. Cached values and their timestamps appear immediately, without a loading state or API traffic.
- [ ] If the saved snapshot reports dry weather, the offline **Is it raining?** answer includes the saved next-rain prediction with an explicit calendar date (when forecast data was available).
- [ ] Close and reopen the PWA offline: saved location and weather are restored.
- [ ] Clear site data, reload offline and click a weather button: the empty-state message appears instead of a spinner.
- [ ] Run `npm test` to verify offline cache storage, retrieval, limits, and fallback formatting.
- [ ] Re-enable network: banner returns to ONLINE and normal blue theme returns.
- [ ] Stop `npm run preview` while leaving the device online, then reload the cached app: banner says SERVER UNREACHABLE and uses the warning theme.
- [ ] Third-party API failures fall back to clearly labeled cached data when available, or display an error when there is no snapshot.
- [ ] Test installability on the actual target device/browser.

## Documentation policy

Every requested feature or behavior change must include a matching update to its relevant English documentation in the same set of changes.
