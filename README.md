# RainCheck ☔

A minimal weather app that checks current rainfall and the next expected weather change with a single action.

## Features

- Automatically requests browser geolocation at startup (subject to browser permission); manual city search remains available if location access fails.
- One **Check weather** button updates two status cards: current **Raining / Dry** and upcoming **Will stop / Will start**.
- Wet states and their badges are blue; dry states and their badges are yellow. The upcoming change uses the opposite color of the current conditions.
- Hourly forecasts provide approximate next-rain onset or rain-stop time; both cards support historical offline snapshots.
- Open-Meteo API, 10-minute in-memory cache, no user accounts, backend, database, or AI service.
- Responsive interface; deployable as a static website on Apache/cPanel.
- Installable PWA with an offline app shell and **saved weather snapshots**, available without a network.
- A successful weather fetch is saved on-device along with the selected location, its observation timestamp, and the time it was saved. Up to eight locations are retained; the saved data is always labeled as historical, never live.
- Prominent connectivity banner: **ONLINE**, **OFFLINE**, or **SERVER UNREACHABLE**. An amber offline-style theme appears whenever the browser is offline or the app server cannot be reached. The origin check is a network-only fetch of `version.json`; a server outage does not automatically disable weather services on an otherwise connected device.

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

## Connectivity status

The banner responds to browser online/offline events and checks the app server on startup, focus, and return to a visible tab. **OFFLINE** means the browser reports no network connectivity (weather buttons immediately show the last saved observation or forecast without a request or loading spinner). **SERVER UNREACHABLE** means the app was loaded from cache but its origin cannot be reached; external weather APIs might still work, so the buttons remain enabled. **ONLINE** means the browser reports a connection and the origin check has not failed. `navigator.onLine` and origin reachability are only indicators, not guarantees that every weather provider is available. Offline city lookup and Find me do not make network requests; Find me reuses the saved location.

## Offline cache and privacy

Forecasts are silently prefetched after successful location selection and saved to browser `localStorage` following successful Open-Meteo requests. The last selected location and up to eight compact weather snapshots are kept on the device; coordinates are rounded to three decimal places before storage. Cached reports show the time the forecast was saved and, where provided, the Open-Meteo observation time. For dry weather, the cached response also retains the next predicted rain onset with an explicit calendar date, so offline `today`/`tomorrow` cannot become misleading. Cached rain-stop predictions describe the forecast **as it was at the saved time**.

If no snapshot exists, the app immediately explains that an online visit is required. Offline mode never requests GPS, reverse geocoding, weather, or city suggestions, never shows a loading spinner, and leaves the two weather buttons clickable. Clear browser site data to delete the saved location and snapshots.

Run `npm test` for the offline-cache unit tests.

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
