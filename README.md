# RainCheck ☔

A minimal weather app answering two questions: **"Is it raining?"** and **"When will it stop raining?"**

## Features

- Browser geolocation (with permission) or manual city search.
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

## Technology

Vite + vanilla JavaScript + CSS. There is no React runtime; this keeps the app small and dependency-light. Weather and geocoding services are provided by [Open-Meteo](https://open-meteo.com/), subject to its terms of use.

## Documentation

- [MVP requirements](docs/requirements.md)
- [Architecture and algorithm](docs/architecture.md)
- [Apache shared hosting / cPanel](docs/hosting-cpanel.md)
- [PWA installation and offline behavior](docs/pwa.md)

## Limitations

Current conditions describe an estimated area, not a physical sensor at the exact user location. The precipitation stop time is **approximate** and based on an hourly forecast, not radar nowcasting. The browser sends coordinates to Open-Meteo; this app has no application server.

## Contribution rule

Every feature change must update the relevant English documentation in the same change (README, requirements, architecture, deployment notes and/or PWA guide). Keep code comments and UI copy in English.

## License

[MIT](LICENSE) © 2026 Anton Mitsev.
