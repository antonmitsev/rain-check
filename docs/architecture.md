# RainCheck — Architecture v0.1

## Data flow

```text
Browser (Vite + vanilla JavaScript)
 ├── Geolocation API → coordinates
 ├── Manual city search → Open-Meteo Geocoding API → coordinates
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

## Deployment

See [Apache/cPanel deployment](hosting-cpanel.md).
