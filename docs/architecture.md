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
GET https://api.open-meteo.com/v1/forecast?latitude=42.6977&longitude=23.3219&current=rain,showers,precipitation&hourly=precipitation,precipitation_probability&forecast_days=2&timezone=auto
```

City search:

```http
GET https://geocoding-api.open-meteo.com/v1/search?name=Sofia&count=1&language=en&format=json
```

## Location resolution

On application startup, geolocation is attempted automatically, using browser permission settings. The **Find me** button can retry the same process. When allowed, the app reverse-geocodes the returned coordinates through OpenStreetMap Nominatim, then shows the resolved city/region/country with an explicit confirmation. If name resolution fails, it shows rounded coordinates rather than claiming the location was not found. Reverse lookups are cached by rounded coordinates. Nominatim is used only after a geolocation result (including the automatic startup lookup), never for autocomplete. The application includes OpenStreetMap attribution and must comply with the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) (including its maximum request rate). For higher traffic, replace the public reverse service with a provider suitable for production scale.

Manual city searches use Open-Meteo Geocoding API. Suggestions start after 3 characters with a 350 ms debounce, abort stale requests, and present up to 7 locations. City name, administrative area and country distinguish ambiguous matches.

## Answer algorithm

### Is it raining?

- When `current.rain > 0 || current.showers > 0`, report estimated rainfall in the area.
- When both values are zero, report no estimated rainfall.
- When current weather data is missing, report uncertainty rather than guessing.

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

## Build identification

The custom Vite plugin in `vite.config.js` emits `version.json` into the production bundle at build time. This static file contains the semantic version from `package.json`, the UTC build timestamp, and Git HEAD or CI-provided SHA when available. No server-side runtime is needed. The service worker bypasses its cache for this endpoint. A single build metadata object is generated during Vite configuration. The build injects it into the JavaScript bundle using `define: { __BUILD_INFO__: ... }` and emits the same object as `dist/version.json`. The UI header reads bundled `__BUILD_INFO__`, so its version and seven-character commit hash always identify the actual running JavaScript, even when offline. It shows only the version if the commit is unavailable. In contrast, the network-only `version.json` endpoint identifies the currently deployed build and may differ from a cached PWA.

## PWA architecture

The Vite build copies the files from `public/` directly into `dist/`. `manifest.webmanifest` describes the app and its installable icons; `sw.js` is registered after page load. The service worker caches the application shell and static assets on the same origin and uses network-first HTML navigation with a cached fallback. Cross-origin Open-Meteo and Nominatim requests are deliberately not cached by the service worker; live weather and city search require a network connection. See [PWA guide](pwa.md).

## Deployment

See [Apache/cPanel deployment](hosting-cpanel.md).
