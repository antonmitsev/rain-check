# RainCheck PWA

RainCheck is an installable Progressive Web App (PWA) built with Vite and vanilla JavaScript.

## Included components

- `public/manifest.webmanifest`: application name, relative scope/start URL, standalone mode, theme, and 192×192/512×512 PNG icons.
- `public/icons/`: home-screen icons.
- `public/sw.js`: service worker providing a cached offline app shell and static asset caching.
- `index.html`: manifest, favicon, Apple touch icon, and mobile metadata.
- `src/main.js`: registers the service worker after page load.

Files under `public/` are copied to the root of `dist/` by Vite.

## Installation

1. Build and deploy the application using [Apache/cPanel instructions](hosting-cpanel.md).
2. Open it over **HTTPS** on a supported browser and allow the initial page to load.
3. Android Chrome: use the browser's **Install app** or **Add to Home screen** option if offered.
4. iOS Safari: open **Share → Add to Home Screen** (menu labels vary by iOS release).
5. Desktop Chromium browsers: use the browser's install control when available.

Install prompts are browser-dependent. RainCheck does not display a custom installation prompt.

## Offline behavior

The service worker caches the application shell and the local static assets after they have been loaded at least once. After a successful online visit, the installed application can open offline.

**No offline weather forecasts are promised.** Live rain status, city search, reverse geocoding, and fresh forecasts all use third-party APIs, which require an internet connection. An offline forecast request displays an error. External Google Fonts may be unavailable offline; system font fallbacks are provided.

The service worker only handles same-origin GET requests; it deliberately does not intercept calls to weather or geocoding providers. It does not store precise location history or weather responses persistently.

## Online version check

Production builds include a static `version.json` endpoint (see [deployment guide](hosting-cpanel.md)). The service worker does not cache this file, so it can be requested separately from the installed app shell to identify the deployment. The file reports the build timestamp, not the installation or deployment time. No automatic update prompt is included in this version.

## Update behavior

The app shell and assets are cached under a versioned cache name. New static assets are downloaded when requested. For future service worker changes, increment `CACHE_NAME` in `public/sw.js` to retire older caches. Navigation uses the network when available, with the cached app shell as a fallback.

After deployment, revisit/reload the page online to acquire updated assets. Browser cache and service-worker updates can make deployment visibility asynchronous.

## Deployment checklist

- [ ] `npm run build` succeeds.
- [ ] HTTPS works.
- [ ] `index.html`, `manifest.webmanifest`, `sw.js`, `icons/icon-192.png`, `icons/icon-512.png`, and `assets/` are present in Document Root.
- [ ] In DevTools → Application → Manifest, the icon and manifest are detected.
- [ ] In DevTools → Application → Service Workers, the worker is active and controls the page after reload.
- [ ] The app opens with network disabled after the first online load.
- [ ] Both weather buttons report network failure offline rather than presenting stale data as live information.
- [ ] Test installability on the actual target device/browser.

## Documentation policy

Every requested feature or behavior change must include a matching update to its relevant English documentation in the same set of changes.
