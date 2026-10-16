# RainCheck ☔

A minimal weather app answering two questions: **"Is it raining?"** and **"When will it stop raining?"**

## Features

- Automatically requests browser geolocation at startup (subject to browser permission); manual city search remains available if location access fails.
- **Is it raining?** — current precipitation estimates for the selected area.
- **When will it stop raining?** — approximate stop time from an hourly forecast.
- Open-Meteo API, 10-minute in-memory cache, no user accounts, backend, database, or AI service.
- Responsive interface; deployable as a static website on Apache/cPanel.
- Installable PWA with home-screen icons and offline app shell. Live weather and city search require connectivity.

## Run locally

Node.js and npm are required **only on the development machine**.

```sh
npm install
npm run dev
```

Build for production:

```sh
npm run build
```

Upload **the contents of `dist/`** to the domain or subdomain's document root. Do not upload `src/` or `node_modules/`.

**[Apache, cPanel, DNS and optional Git deployment instructions](docs/hosting-cpanel.md)**

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
