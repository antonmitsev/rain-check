# RainCheck — MVP Requirements v0.1

## 1. Scope

A single-page application showing the selected location, two action buttons, and a concise weather response. The goal is to answer nearby rainfall questions clearly and at minimal cost.

## 2. User flow

1. The user opens the page over HTTPS.
2. On startup, the app automatically attempts geolocation. The browser may prompt the user for permission; previously granted or denied permissions follow browser settings.
3. If permission is denied, times out, or geolocation is unavailable, the user can search for a city instead. The **Find me** button allows a manual retry.
4. The user clicks **Is it raining?** or **When will it stop raining?**.
5. The application fetches weather data (or uses a valid cached response) and displays a concise answer in English.

## 3. Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| F01 | Geolocation | Automatically attempt location discovery when the app starts, obtain latitude and longitude after permission is granted. Reverse-geocode the coordinates to display a readable location name and an explicit confirmation. If reverse geocoding fails, display coordinates instead. |
| F02 | Manual city fallback | A city search works when geolocation is blocked or unavailable. After 3 typed characters, show selectable city suggestions with administrative region and country. |
| F03 | Is it raining? | Display current estimated rainfall conditions without presenting forecast values as on-site measurements. |
| F04 | When will it stop raining? | Estimate an approximate stop time using the hourly forecast. |
| F05 | English responses | Responses are brief and do not claim exact stop times. |
| F06 | Weather cache | Cache responses by approximate coordinates for up to 10 minutes. |
| F07 | Error handling | Explain network, geolocation, and unavailable-data failures. |
| F08 | PWA installation | Provide a valid web manifest, 192px and 512px icons, standalone display mode, and a registered service worker. |
| F09 | Offline app shell | Service worker installation precaches HTML and all production JS/CSS assets so the UI can launch offline without a blank screen. Live weather and geocoding still require connectivity. |
| F10 | Build version endpoint | Each production build emits a public `version.json` with package version, UTC build timestamp and optional Git commit. |
| F11 | Visible build identity | The UI header uses metadata bundled into the running JavaScript at build time, showing package version and the first seven commit characters, also offline. The online `version.json` independently reports the deployed build. |
| F12 | Project credits | The footer links to tonymitsev.com and OpenAI as a transparent AI-assisted development acknowledgment, without suggesting official endorsement. |
| F13 | Connectivity indication | Show a persistent connection banner and warm warning theme when offline or when the origin server is unreachable. Update automatically when connection state changes. Disable weather and city searches only when the browser reports offline. |

## 4. Non-functional requirements

- Responsive layout for mobile and desktop.
- HTTPS is required for browser geolocation, except on localhost.
- Do not store geolocation history on an application server.
- No user accounts, database, or application-level tracking.
- No paid services for the non-commercial MVP, subject to the Open-Meteo terms of service.
- Provide loading and error states and disable actions during active requests.

## 5. Example responses

- "According to current weather data, it is raining in this area."
- "According to current weather data, it is not raining in this area."
- "Rain is expected to stop at approximately 17:00 (hourly forecast)."
- "The forecast does not provide a reliable stop time."
- "It is not currently raining in this area."

## 6. Acceptance criteria

- Both action buttons work independently.
- A successful GPS lookup visibly confirms the resolved city/region/country or falls back to coordinates.
- City suggestions are debounced and selectable by mouse or keyboard.
- Denied geolocation permission is handled explicitly.
- No invented or falsely precise stop times.
- Repeated requests within 10 minutes reuse cached data.
- The production application runs as a static website without a backend.
- After one successful online visit, the application shell is available offline.
- PWA installation works on supported browsers under HTTPS.
- The banner reads ONLINE while connected; changing DevTools to Offline changes it to OFFLINE and changes the theme.
- Restoring the connection restores the normal theme and enabled weather actions.
- If the origin server is stopped but the browser still has internet, the banner reads SERVER UNREACHABLE with the warning theme; weather actions remain enabled because third-party APIs may still be reachable.

## 7. Out of scope for v0.1

- Push notifications, accounts, maps, history, and radar maps.
- AI-written answers and paid OpenAI API requests.
- Minute-level accuracy or guaranteed conditions at an individual street address.
