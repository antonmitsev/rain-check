# RainCheck — Architecture v0.1

## Data flow

```text
Browser (Vite + vanilla JavaScript)
 ├── Geolocation API → coordinates → OSM Nominatim reverse lookup (once per explicit selection)
 ├── Manual city input → debounced Open-Meteo Geocoding suggestions → selected coordinates
 └── Open-Meteo Forecast API → in-memory cache (10 minutes)
                                 ↓
                         Answer algorithm
                                 ↓
                       Concise English text
```

No backend, React runtime, database, or OpenAI API key is required.

## API requests

Forecast request using sample coordinates for Sofia, Bulgaria:

```http
GET https://api.open-meteo.com/v1/forecast?latitude=42.6977&longitude=23.3219&current=rain,showers,precipitation&hourly=rain,showers,precipitation,precipitation_probability&forecast_days=2&timezone=auto
```

City search:

```http
GET https://geocoding-api.open-meteo.com/v1/search?name=Sofia&count=1&language=en&format=json
```

## Location resolution

On application startup, geolocation is attempted automatically, using browser permission settings. The **Find me** button can retry the same process. When allowed, the app reverse-geocodes the returned coordinates through OpenStreetMap Nominatim, then shows the resolved city/region/country with an explicit confirmation. If name resolution fails, it shows rounded coordinates rather than claiming the location was not found. Reverse lookups are cached by rounded coordinates. Nominatim is used only after a geolocation result (including the automatic startup lookup), never for autocomplete. The application includes OpenStreetMap attribution and must comply with the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) (including its maximum request rate). For higher traffic, replace the public reverse service with a provider suitable for production scale.

Manual city searches use Open-Meteo Geocoding API. Suggestions start after 3 characters with a 350 ms debounce, abort stale requests, and present up to 7 locations. City name, administrative area and country distinguish ambiguous matches.

## Unified weather UI

The hero displays the combined eyebrow text `RAIN AT A GLANCE | TWO QUESTIONS. SHORT ANSWERS. NO SIGN-UP.` above a compact, slightly letter-spaced single-line heading. There is no separate hero paragraph. The permanent Answer/Status card has been removed: the existing `render(message, category)` helper now updates a top-positioned ARIA live-region toast, auto-dismissed after a brief delay (longer for errors and offline messages). Notifications float over the viewport and do not push weather cards or history down.

The single **Check weather** action obtains one Open-Meteo response, then populates two cards: current rain state (blue wet / yellow dry) and forecast next change (yellow **Will stop** when currently raining / blue **Will start** when currently dry). Badge background colors match each card. Unknown data uses neutral styling. The two cards are also populated from a saved localStorage snapshot offline; cached readings are clearly labeled as saved rather than live.

## Answer algorithm

The pure functions in `src/weather.js` implement forecast interpretation and can be tested without the UI using `tests/weather.test.js` (`npm test`).

### Is it raining?

- When `current.rain > 0 || current.showers > 0`, report estimated rainfall in the area.
- When both values are zero, report that it is not currently raining **and** search forward from the next hourly forecast interval for the first predicted rain/shower total of at least **0.1 mm**.
- Prefer hourly `rain + showers` (liquid precipitation) over total `precipitation`, since total precipitation can also include snow. The latter is only a compatibility fallback for older API responses.
- Display an **approximate** next start time using the forecast location's local timestamps: `today`, `tomorrow`, or an explicit date.
- If no such interval appears, say no rain is forecast **within the available hourly horizon**, not that rain will never occur.
- When hourly information is missing, report the uncertainty instead of inventing an hour.
- When current data is missing, do not infer current conditions from the future forecast.

### When will it stop raining?

- If it is not currently raining, state that directly.
- Otherwise inspect hourly forecasts starting after the current hourly interval.
- Find the first two consecutive hours with `hourly.precipitation < 0.1`.
- Display the start of that interval as an **approximate** stop time.
- If no interval qualifies, explain that the forecast does not provide a reliable stop time.

This is a simple product heuristic, not a validated meteorological nowcasting technique. Hourly forecasts do not provide the exact minute when rainfall stops, and local conditions may differ from forecasts.

## Caching, privacy and cost

- In-memory weather cache: 10 minutes, keyed by rounded coordinates.
- No server-side storage of the user's location.
- Browser geolocation requires HTTPS (except localhost).
- Open-Meteo offers free non-commercial access under its applicable terms.
- ChatGPT Free is not a programmable API. This MVP does not require an LLM.

## Recent weather check history

The recent-check section renders up to three clickable results from `getWeatherHistory()` in `src/offline-cache.js`. An explicit `Check weather` action copies its matching time-stamped weather snapshot to `history[]` under the existing `raincheck:offline:v1` localStorage key. Entries are deduplicated by the same rounded coordinate key as forecast caching, and only the latest explicit check for a location is retained. Each entry stores the place, explicit-check time, and a **copy** of the forecast snapshot at that check, so a later silent prefetch cannot silently change history.

Opening a history item updates the selected location and renders its stored snapshot directly; it deliberately bypasses `setLocation()`, which would normally start a background prefetch. No GPS, geocoding, or weather request is made, regardless of network connectivity. Merely opening an entry does not mutate its recency or snapshot. Offline explicit checks can refresh the history order using the matching snapshot. Storage failures are tolerated. Coverage includes `tests/history.test.js`.

## Persistent offline weather snapshots

The `src/offline-cache.js` module stores the most recently selected place and up to eight compact, time-stamped weather snapshots in browser localStorage. Coordinates are rounded to three decimals before persistence. Each snapshot contains the time downloaded, the provider's current weather timestamp (when available), the observed rain/no-rain state, the rain-stop forecast, and (when currently dry) the next expected rain onset, as computed at fetch time. Offline rain onset strings use an **absolute calendar date** instead of relative `today` or `tomorrow` wording. A new location triggers silent weather prefetch; later button presses reuse the existing 10-minute in-memory cache.

When `navigator.onLine` is false, the UI keeps the weather buttons clickable and immediately formats the matching saved snapshot. No loader, API request, GPS lookup, or suggestion search is started. Any inflight weather and city requests are aborted when the offline event occurs. When the app starts offline, it restores the last saved location and presents the saved conditions, if available. A missing snapshot produces an informative empty state; an online provider failure can also fall back to saved data, clearly marked historical. localStorage access failures are tolerated without breaking the app.

The `src/offline-cache.js` helpers have unit tests in `tests/offline-cache.test.js`, executed with `npm test`.

## Build identification

The custom Vite plugin in `vite.config.js` emits `version.json` into the production bundle at build time. This static file contains the semantic version from `package.json`, the UTC build timestamp, and Git HEAD or CI-provided SHA when available. No server-side runtime is needed. The service worker bypasses its cache for this endpoint. A single build metadata object is generated during Vite configuration. The build injects it into the JavaScript bundle using `define: { __BUILD_INFO__: ... }` and emits the same object as `dist/version.json`. The UI header reads bundled `__BUILD_INFO__`, so its version and seven-character commit hash always identify the actual running JavaScript, even when offline. It shows only the version if the commit is unavailable. In contrast, the network-only `version.json` endpoint identifies the currently deployed build and may differ from a cached PWA.

## Connectivity state

A connectivity warning banner (hidden while online) and CSS theme are controlled by browser `online`/`offline` events and `navigator.onLine`. Device offline mode bypasses live requests but leaves cached-weather actions responsive and shows a warm warning theme. An additional network-only request to `version.json` checks the app origin on production startup, focus, and tab visibility restoration. A failed origin request is displayed as **SERVER UNREACHABLE** (same warning theme), but does not disable external weather APIs because they may remain available independently. The check is not run in Vite development mode. Origin reachability is an indicator, not definitive proof that Open-Meteo is available.

## PWA architecture

The Vite build copies the files from `public/` directly into `dist/`. `manifest.webmanifest` describes the app and its installable icons; `sw.js` is registered after page load. After `vite build`, `scripts/prepare-pwa.mjs` generates `precache-manifest.json` from the real hashed output assets and assigns a unique cache name for each build. The service worker precaches the complete application shell, including all JS/CSS files, during installation, then uses network-first navigation with a cached fallback. Development mode does not register a service worker. Cross-origin Open-Meteo and Nominatim requests are deliberately not cached by the service worker; live weather and city search require a network connection. See [PWA guide](pwa.md).

## Apache HTTPS enforcement

The `public/.htaccess` file is copied to `dist/.htaccess` during the Vite build. On Apache hosting with `mod_rewrite` and permitted overrides, it redirects non-HTTPS requests to the same host/path/query over HTTPS (301). This is an Apache-level redirect, independent of the PWA service worker or JavaScript. The server needs a valid TLS certificate. Dotfiles must not be omitted during upload; see [deployment instructions](hosting-cpanel.md).

## Deployment

See [Apache/cPanel deployment](hosting-cpanel.md).
