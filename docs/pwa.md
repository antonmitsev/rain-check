# RainCheck PWA

RainCheck is an installable Progressive Web App (PWA) built with Vite, vanilla TypeScript, and modular SCSS.

## Included components

- `public/manifest.webmanifest`: application name, relative scope/start URL, standalone mode, theme, and 192×192/512×512 PNG icons.
- `public/icons/app-icon.svg`: RainCheck's shared vector artwork, from which PNG assets are generated.
- `scripts/prepare-icons.mjs`: uses `@resvg/resvg-js` to build opaque **180×180 Apple touch**, **192×192 / 512×512 Web Manifest**, and **32×32 favicon** PNGs automatically.
- `public/icons/`: generated PNG icons are included in the production build and fetched by the browser when requested; they are not part of the service-worker startup precache.
- `public/sw.js`: production service worker with build-specific cache identity and complete app-shell precaching.
- `scripts/prepare-pwa.mjs`: postbuild script that lists hashed `dist/assets/` files, generates `dist/precache-manifest.json`, and embeds the build ID in `dist/sw.js`.
- `index.html`: manifest, favicon, Apple touch icon, and mobile metadata.
- `src/main.ts`: mounts and starts the browser application.
- `src/ui/router.ts`: switches the cached Home and informational screens through offline-safe hash routes.
- `src/pwa/register-service-worker.ts`: registers the service worker after page load and owns the update lifecycle.

Files under `public/` are copied to `dist/` by Vite. `npm run build` generates icons, runs the strict TypeScript check, compiles TypeScript/SCSS with Vite, and prepares the PWA precache. Running `vite build` alone does not finish PWA packaging. The development server does not register the service worker.

## Informational routes

About, T&C, and Cookies & Storage use `#/about`, `#/terms`, and `#/cookies`. Hash routing keeps every navigation on the precached `index.html`, so Apache fallback rules and extra HTML files are unnecessary. The Home weather screen remains mounted while an informational screen is open; returning does not discard its browser state or trigger a page reload. Route transitions respect the system reduced-motion preference.

Google Analytics 4 is optional and is loaded only after explicit acceptance in the analytics prompt. The one-year consent cookie is shared across tonymitsev.com and RainCheck; the Cookies & Storage page lets visitors change it. Analytics requests are third-party network requests and are not needed for offline startup or weather functionality.

## Installation

1. Build and deploy the application using [Apache/cPanel instructions](hosting-cpanel.md).
2. Open it over **HTTPS** on a supported browser and allow the initial page to load.
3. Android Chrome: use the browser's **Install app** or **Add to Home screen** option if offered.
4. iOS Safari: open **Share → Add to Home Screen** (menu labels vary by iOS release). The app advertises a dedicated opaque `./icons/apple-touch-icon.png` at **180×180** and an Apple web-app title.
5. Desktop Chromium browsers: use the browser's install control when available.

Install prompts are browser-dependent. RainCheck does not display a custom installation prompt.

### iPhone icon troubleshooting

If iOS installed RainCheck with a single **R** instead of its icon, confirm that the newly deployed `https://raincheck.tonymitsev.com/icons/apple-touch-icon.png` returns the generated **180×180 PNG**. `index.html` must contain `<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">`; Web Manifest icons alone are not a reliable iOS Home Screen fallback. `npm run build` creates these files from the shared SVG and deploys them. The browser fetches the relevant icon when needed; the service worker does not download all icon sizes during installation.

For an **already installed** Home Screen icon, remove the shortcut and add it again from Safari after deploying the build. The Home Screen icon may be retained across ordinary Service Worker updates. **Removing a shortcut is not the same as clearing Safari website data**; do not erase localStorage and saved forecasts to update an icon.

### Responsive landscape mode

Portrait keeps a centered **580px max-width** single-column layout. On landscape viewports at least **740px** wide, the shell expands up to **920px**, with location and city search on the **left**, the **Check weather** button and unified forecast on the **right**, and recent history below. The layout retains min-width guards, safe-area padding for iPhone, natural vertical scrolling on short-height landscape screens, and responsive history columns. Narrower landscape viewports stay single-column.

## External links from the installed iPhone PWA

Installed iOS PWAs may open ordinary `target="_blank"` links inside an in-app viewer instead of Safari. On **iOS 17 and later**, RainCheck intercepts deliberate taps on **external HTTPS** links *only while running standalone* and navigates to `x-safari-https://...`. This scheme is not part of the Web platform standard and was reported to work on iOS 17, 18.5, and 26, but Apple can change its behavior. If the scheme stops working, standard browser navigation still applies in regular Safari and on other platforms; there is no guaranteed fallback once the non-standard scheme is invoked in standalone mode.

The link's normal `href` remains the HTTPS destination so copy-link, long press, other browsers, and ordinary navigation keep useful URLs. Internal `#/about`, `#/terms`, and `#/cookies` routes and same-origin links are excluded. This is implemented by `src/ui/external-links.ts`, registered once on startup. The behavior needs real-device verification with an installed iOS PWA; no visual or automated test was run as part of the change.

## Connection indicator and theme

RainCheck hides its connection banner during normal online operation to keep the forecast higher on the page. The warning banner appears only while offline or when the origin server is unreachable:

- **ONLINE** — no banner is displayed; the standard blue theme is used.
- **OFFLINE** — `navigator.onLine` reports offline; a warm amber theme and explicit offline message appear. The Check weather button stays active and fills the single gradient weather summary with saved observations or forecasts instantly; city search and GPS lookup do not issue requests.
- **SERVER UNREACHABLE** — the browser may still have internet but a network-only request to this app's `version.json` fails (for example, after stopping `npm run preview`). The warm warning theme appears. Live weather actions remain enabled because third-party APIs may still work.

The browser's `online` and `offline` events update the warning state immediately. Other status, loading, and error messages appear in a top toast that enters from above, exits to the left and respects reduced-motion preferences. The layout uses a bottom-aligned, non-overlapping footer on short pages. The app rechecks origin reachability on startup and when the window regains focus or visibility. Connectivity signals do not guarantee that an individual weather provider is working.

## Recent checks history

RainCheck hides Recent checks when empty. Otherwise it shows up to **three** most recent distinct locations explicitly checked with **Check weather**, each with a compact next-change summary, last check time and wet/dry status. Repeating a check for the same rounded coordinates replaces its older entry and moves it to the top. The entries are stored in the existing localStorage store (`raincheck:offline:v1`) and remain visible after offline restart.

The main app uses a centered 580px maximum width on desktop and fills narrower mobile screens. History cards stay within the app width, wrap long names and forecasts, and include a small × button **inside the card** at the top-right for removing a single row. Removal changes only the localStorage history, not forecast snapshots, and uses no network requests.

Selecting a history item displays the snapshot captured on its last check, with a clearly marked saved timestamp. It **never** makes an API request, runs GPS, shows a loader, or changes the order of history, even while online. Silent weather prefetch and location selection alone do not create history entries. The full weather snapshot store still keeps up to eight locations independently of the three visible recent checks.

## Offline behavior

During installation, the service worker reads `precache-manifest.json` and caches HTML, the manifest, and **all hashed production JavaScript/CSS assets** before activating. Icon files remain available from the deployment and are fetched when a browser or installation flow requests them; the app UI does not depend on them. Once installation has finished and the page has been reloaded online, the PWA can launch offline without missing scripts.

**Offline data is historical.** After an online weather fetch, the app saves a time-stamped observation, current 2 m temperature, the computed rain-stop forecast, and (when dry) the next expected rain onset and its hourly 2 m temperature in browser localStorage, along with the last selected location. Offline actions read these snapshots immediately without loaders or network calls. The single blue-to-yellow or yellow-to-blue gradient displays wet/dry conditions and the next predicted change, with the current temperature and the temperature forecast for the transition interval when available. Prominent phase labels are in English. The small metadata line is limited to APPROXIMATE · Fetched on [date/time], prefixed with CACHED when showing offline data. The display labels stored forecasts as CACHED and includes the saved fetch time; the provider observation timestamp remains in localStorage but is not displayed. A previously viewed place can be restored when launching the PWA offline. If no snapshot exists, a clear empty-state message is shown.

Live rain observations and fresh forecasts still need connectivity. Offline city search and geolocation lookup do not start new requests. Cached weather is never automatically presented as current conditions. Saved predicted rain start times include an absolute calendar date so they remain meaningful on later offline days. Snapshots saved by older versions remain readable, but may lack a next-rain estimate. External Google Fonts may be unavailable offline; system font fallbacks are provided.

The service worker only handles same-origin GET requests; it deliberately does not intercept calls to weather or geocoding providers. It does not cache third-party API responses via the service worker. The application separately persists a limited localStorage snapshot (up to eight locations, coordinates rounded to three decimals), which can be removed using the browser's Clear Site Data option.

## Online version check

Production builds include a static `version.json` endpoint (see [deployment guide](hosting-cpanel.md)). The service worker explicitly bypasses its cache for this file, so it can be requested separately from the installed app shell to identify the deployment. The UI header uses version metadata embedded in its own JavaScript bundle, rather than querying the endpoint. This reliably identifies the running version while offline. The online endpoint identifies the deployed version, which can be newer. The file reports the build timestamp, not the installation or deployment time. No automatic update prompt is included in this version. Updating `CACHE_NAME` invalidates the old app-shell cache on service-worker activation (currently `raincheck-app-v3`).

## Update behavior

Every production build embeds a unique build identity in `sw.js` and generates a fresh `precache-manifest.json` listing hashed bundles. Installation bypasses the browser HTTP cache and finishes precaching before the new worker activates. Navigation uses a network-first request that bypasses the browser HTTP cache, retaining the cached app as an offline fallback.

The production app registers with `updateViaCache: 'none'`, explicitly checks for worker updates on load, focus, tab visibility restoration and reconnection, then **reloads an already-controlled online tab once when `controllerchange` fires**. A first-ever service worker installation does not force a refresh. If activation happens offline, the refresh is deferred until the device is online.

`public/.htaccess` adds `Cache-Control: no-store, max-age=0` for `index.html`, `sw.js`, `version.json`, `precache-manifest.json`, and the web manifest. Because Vite output asset filenames are content-hashed, regular asset caching remains safe. For CDN hosting, purge the CDN cache if the origin's headers are ignored. Upload all of `dist/` before opening the app to avoid incomplete worker installs.

**One-time migration:** An older page that is already running a JavaScript bundle without the `controllerchange` listener cannot reload itself automatically. Reload that old installation online once; subsequent deployments will use the new update lifecycle. No need to delete localStorage, weather history, or the installed PWA.

## Deployment checklist

- [ ] `npm run build` succeeds and generates `dist/precache-manifest.json`.
- [ ] A dedicated 180×180 Apple touch PNG and 32×32 favicon are generated, deployed in `dist/icons/`, and available through explicit HTML/manifest links; they are not required in the startup precache.
- [ ] Landscape uses two columns at suitable widths, with 920px shell cap and preserved mobile/portrait width; all controls stay within viewport.
- [ ] `dist/sw.js` has a build-specific cache name with no `__CACHE_VERSION__` placeholder.
- [ ] All JS and CSS files in `dist/assets/` appear in `precache-manifest.json`.
- [ ] HTTPS works.
- [ ] `index.html`, `manifest.webmanifest`, `sw.js`, `icons/apple-touch-icon.png`, `icons/favicon-32.png`, `icons/icon-192.png`, `icons/icon-512.png`, and `assets/` are present in Document Root.
- [ ] In DevTools → Application → Manifest, the icon and manifest are detected.
- [ ] In DevTools → Application → Service Workers, the worker is active and controls the page after reload.
- [ ] Run `npm run build && npm run preview`, open the app online, wait until the service worker activates, and reload online.
- [ ] In DevTools → Application → Cache Storage, verify the JavaScript and CSS files are cached.
- [ ] Set DevTools → Network to Offline (or stop the preview server) and reload: the UI must render.
- [ ] Do not use `npm run dev` as an offline test; Vite development modules need a running server.
- [ ] While online, no ONLINE banner consumes space; with DevTools → Network → Offline, the OFFLINE warning banner and amber theme appear and Check weather stays enabled.
- [ ] First fetch a forecast online, then go offline and click Check weather. The gradient summary and saved timestamp appear immediately, without a loading state or API traffic.
- [ ] Check four different places online: only the last three appear under Recent checks.
- [ ] Check a previously listed place again: only its newest entry remains, now first.
- [ ] Select a Recent checks item while online and offline: its saved gradient summary appears instantly, with **zero requests** in DevTools → Network.
- [ ] Reload the PWA offline: the three recent checks persist, and merely opening them does not reorder the list.
- [ ] If the saved snapshot reports dry weather, the offline **Is it raining?** answer includes the saved next-rain prediction with an explicit calendar date (when forecast data was available).
- [ ] Close and reopen the PWA offline: saved location and weather are restored.
- [ ] Clear site data, reload offline and click a weather button: the empty-state message appears instead of a spinner.
- [ ] Run `npm test` to verify offline cache storage, retrieval, limits, and fallback formatting.
- [ ] Re-enable network: the warning banner disappears and the normal blue theme returns.
- [ ] Stop `npm run preview` while leaving the device online, then reload the cached app: banner says SERVER UNREACHABLE and uses the warning theme.
- [ ] Third-party API failures fall back to clearly labeled cached data when available, or display an error when there is no snapshot.
- [ ] Test installability on the actual target device/browser.

## Documentation policy

Every requested feature or behavior change must include a matching update to its relevant English documentation in the same set of changes.
