# RainCheck — MVP Requirements v0.1

## 1. Scope

A single-page application showing the selected location, two action buttons, and a concise weather response. The goal is to answer nearby rainfall questions clearly and at minimal cost.

## 2. User flow

1. The user opens the page over HTTPS.
2. The user grants geolocation permission when selecting **Find my location**.
3. If permission is denied or geolocation is unavailable, the user can search for a city instead.
4. The user clicks **Is it raining?** or **When will it stop raining?**.
5. The application fetches weather data (or uses a valid cached response) and displays a concise answer in English.

## 3. Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| F01 | Geolocation | Obtain latitude and longitude after permission is granted. Reverse-geocode the coordinates to display a readable location name and an explicit confirmation. If reverse geocoding fails, display coordinates instead. |
| F02 | Manual city fallback | A city search works when geolocation is blocked or unavailable. After 3 typed characters, show selectable city suggestions with administrative region and country. |
| F03 | Is it raining? | Display current estimated rainfall conditions without presenting forecast values as on-site measurements. |
| F04 | When will it stop raining? | Estimate an approximate stop time using the hourly forecast. |
| F05 | English responses | Responses are brief and do not claim exact stop times. |
| F06 | Weather cache | Cache responses by approximate coordinates for up to 10 minutes. |
| F07 | Error handling | Explain network, geolocation, and unavailable-data failures. |

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

- Both action buttons work independently.\n- A successful GPS lookup visibly confirms the resolved city/region/country or falls back to coordinates.\n- City suggestions are debounced and selectable by mouse or keyboard.
- Denied geolocation permission is handled explicitly.
- No invented or falsely precise stop times.
- Repeated requests within 10 minutes reuse cached data.
- The production application runs as a static website without a backend.

## 7. Out of scope for v0.1

- Push notifications, accounts, maps, history, and radar maps.
- AI-written answers and paid OpenAI API requests.
- Minute-level accuracy or guaranteed conditions at an individual street address.
