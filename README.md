# RainCheck ☔

A minimal weather app that checks current rainfall and its next expected change with one action and one prominent gradient summary.

## Features

- Automatically requests browser geolocation at startup (subject to browser permission); manual city search remains available if location access fails.
- One **Check weather** button updates one compact gradient summary in English: **RAINING → STOPS AT [time]** or **DRY → STARTS AT [time]**.
- **Recent checks** is hidden when empty. Otherwise it shows up to three distinct locations, newest first, with short labels such as **Starts ~19:00** instead of a full forecast sentence. Opening an entry uses saved data **without any network request**.
- Layout widths are constrained from the page root through the cards and forms to prevent horizontal scrolling on narrow devices. Flex items may shrink and the heading may wrap on narrow screens.
- **Landscape layout** (at least 740px viewport width): location/search on the left, Check weather and the status card on the right, with a centered **920px maximum-width** shell; portrait remains 580px. History uses responsive cards below the two columns.
- The app uses a centered, full-width layout capped at **580px in portrait** (920px on wide landscape). History text stays within the card on mobile and desktop, and a discreet **×** button sits **inside the top-right corner** of each history card. Removing a history item does not delete its cached forecast.
- The background runs **blue → yellow** for wet-to-dry and **yellow → blue** for dry-to-wet. When no transition is forecast, the single-state color remains instead of implying a change. Unknown times are not invented.
- Only the essential status and approximate time are prominent. A single compact line below reads **APPROXIMATE · Fetched on ...**, prefixed with **CACHED** for stored forecasts. The verbose forecast sentence and redundant observation-time line are no longer shown.
- Open-Meteo API, 10-minute in-memory cache, no user accounts, backend, database, or AI service.
- Responsive interface; deployable as a static website on Apache/cPanel.
- Installable PWA with an offline app shell and **saved weather snapshots**, available without a network.
- A successful weather fetch is saved on-device along with the selected location, its observation timestamp, and the time it was saved. Up to eight locations are retained; the saved data is always labeled as historical, never live.
- No persistent status banner while online: the connectivity warning appears only for **OFFLINE** or **SERVER UNREACHABLE**. The amber offline theme is retained for those states. The origin check is a network-only fetch of `version.json`; a server outage does not automatically disable external weather services.
- The Check weather button has no secondary caption. Compact padding is used inside cards and controls, with larger gaps between the major sections. Status, loading, and error messages appear as **top toasts** that slide down from above and exit to the left when dismissed. Motion is reduced when the operating system requests reduced animations; the footer is pushed to the bottom of short pages without covering longer content. The hero eyebrow groups `RAIN AT A GLANCE` and `| ONE CHECK · NO SIGN-UP` into two unbreakable spans. They share a line on iPhone 13; on smaller screens only the whole second group wraps, and the compact headline uses subtle positive letter spacing.

## Run locally

Node.js and npm are required **only on the development machine**.

```sh
npm install
npm run dev
```

Build for production (including the offline asset manifest and build-specific service worker):

```sh
npm run build
```

Upload **all contents of `dist/`**, including `precache-manifest.json` and hidden `.htaccess`, to the domain or subdomain's document root. The Apache `.htaccess` redirects HTTP traffic to HTTPS with a permanent 301, preserving the requested host, path, and query string. Ensure TLS is configured first. Do not upload `src/` or `node_modules/`.

**[Apache, cPanel, DNS and optional Git deployment instructions](docs/hosting-cpanel.md)**

## iPhone Home Screen icon

RainCheck provides a dedicated, opaque **180×180 PNG** Apple touch icon (not just a Web Manifest icon). The artwork lives in `public/icons/app-icon.svg` and `scripts/prepare-icons.mjs` generates `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, and `favicon-32.png` **before both development and production builds**. The complete build uses:

```sh
npm install
npm run build
```

Upload the full `dist/` including `icons/`. On iPhone, open `https://raincheck.tonymitsev.com/icons/apple-touch-icon.png` to verify the icon file is actually deployed. If a previously installed RainCheck shows only **R**, delete its **Home Screen shortcut** and use **Safari → Share → Add to Home Screen → Add** again. iOS may keep an older shortcut icon even when the installed PWA code updates. **Do not clear website data** merely to replace the shortcut, because that would erase saved forecasts/history.

## Deploying a fresh PWA build

Every `npm run build` generates a new worker cache ID and `version.json`. Upload the **entire** `dist/` folder contents, including the hidden `.htaccess`, `sw.js`, `precache-manifest.json`, `version.json`, `index.html`, and the hashed `assets/`. Apache's `.htaccess` sends `Cache-Control: no-store` for the HTML entrypoint and PWA update metadata (not the hashed assets).

On production pages, the app checks for new service workers on load, when refocused, on reconnect, and when the tab becomes visible. A newly activated worker precaches the updated app and automatically reloads an already-controlled online page. This preserves offline snapshots and history in localStorage. The first deployment of this mechanism may still require **one manual online reload** of an older installed PWA because older running JavaScript has no update listener. If a CDN/proxy serves old files, purge its cache; do not clear browser site data unless troubleshooting. See the [PWA guide](docs/pwa.md).


## Connectivity status

The warning banner is hidden during normal online operation to prioritize the forecast cards. It appears for OFFLINE and SERVER UNREACHABLE. Connectivity is checked on startup, focus, and return to a visible tab. **OFFLINE** means the browser reports no network connectivity (the weather button immediately shows the last saved observation or forecast without a request or loading spinner). **SERVER UNREACHABLE** means the app was loaded from cache but its origin cannot be reached; external weather APIs might still work, so the buttons remain enabled. When online and the origin check has not failed, the regular theme is used without a connection banner. `navigator.onLine` and origin reachability are only indicators, not guarantees that every weather provider is available. Offline city lookup and Find me do not make network requests; Find me reuses the saved location.

## Offline cache and privacy

Forecasts are silently prefetched after successful location selection and saved to browser `localStorage` following successful Open-Meteo requests. The last selected location and up to eight compact weather snapshots are kept on the device; coordinates are rounded to three decimal places before storage. Cached reports show the time the forecast was saved and, where provided, the Open-Meteo observation time. For dry weather, the cached response also retains the next predicted rain onset with an explicit calendar date, so offline `today`/`tomorrow` cannot become misleading. Cached rain-stop predictions describe the forecast **as it was at the saved time**.

If no snapshot exists, the app immediately explains that an online visit is required. Offline mode never requests GPS, reverse geocoding, weather, or city suggestions, never shows a loading spinner, and leaves the weather button clickable. Clear browser site data to delete the saved location and snapshots.

The history is stored alongside snapshots in `localStorage` (`raincheck:offline:v1`). It holds at most three checked locations; opening a history entry never updates its time, reorders the list, calls geolocation, or requests a forecast. Checks use the existing in-memory cache when available, while silent location prefetches are not added to history. Offline Check weather clicks can update the recent-check order from saved data.

Run `npm test` for the offline-cache, history, and weather unit tests.

## Testing PWA offline

Run `npm run build && npm run preview`. Open the page online, wait for the service worker to activate, and reload once before testing in Offline mode. The production JavaScript and CSS are precached at installation. Stopping `npm run dev` is **not** a valid PWA offline test; development mode does not register a service worker. See [PWA tests](docs/pwa.md).

## Online build version

Each `npm run build` generates `dist/version.json` automatically. After uploading the complete `dist/` contents to Apache, check `https://your-domain.example/version.json` (or `https://your-domain.example/rain-check/version.json` for subdirectory deployments).

Example response:

```json
{
  "version": "0.1.0",
  "builtAt": "2026-10-16T12:00:00.000Z",
  "commit": "abc123def456"
}
```

The version is read from `package.json`. `builtAt` is the UTC time of the build, not deployment time. `commit` uses `GITHUB_SHA` / `COMMIT_SHA` or the local Git HEAD; it is `null` when Git metadata is unavailable. Every build gets a new timestamp, even if the semantic version does not change. The UI header displays build metadata embedded in the JavaScript bundle at compilation (for example, `v0.1.0 · abc123d`). This is the **running version**, including offline, and cannot accidentally display the metadata of a newer deployment. If Git metadata is missing it shows the semantic version only. The independent online `version.json` endpoint reports the **deployed version**, which may be newer than a cached PWA installation. See [deployment guide](docs/hosting-cpanel.md).

## Technology

Vite + vanilla JavaScript + CSS. There is no React runtime; this keeps the app small and dependency-light. Weather and geocoding services are provided by [Open-Meteo](https://open-meteo.com/), subject to its terms of use.

## Documentation

- [PWA Generation Playbook — reusable engineering and UX reference for AI agents](docs/PWA_Generation_Playbook.md)
  - [Appendix C — Executable PWA reference architecture](docs/playbook/appendix-c-reference-architecture.md)
  - [Appendix D — Domain/API specification template](docs/playbook/appendix-d-domain-specification.md)
  - [Appendix E — UX tokens, components and iOS icons](docs/playbook/appendix-e-ux-design-system.md)
- [MVP requirements](docs/requirements.md)
- [Architecture and algorithm](docs/architecture.md)
- [Apache shared hosting / cPanel](docs/hosting-cpanel.md)
- [PWA installation and offline behavior](docs/pwa.md)

## Limitations

Current conditions describe an estimated area, not a physical sensor at the exact user location. The precipitation stop time is **approximate** and based on an hourly forecast, not radar nowcasting. The browser sends coordinates to Open-Meteo; this app has no application server.

## Attribution

The application footer links to [tonymitsev.com](https://tonymitsev.com/) as its creator and credits AI-assisted development with [OpenAI](https://openai.com/). This is a development acknowledgment, not an endorsement or official partnership. Weather and map-data attribution remain separate.

## Contribution rule

Every feature change must update the relevant English documentation in the same change (README, requirements, architecture, deployment notes and/or PWA guide). Keep code comments and UI copy in English.

## License

[MIT](LICENSE) © 2026 Anton Mitsev.
