# RainCheck — MVP Requirements v0.1

## 1. Scope

A single-page application showing the selected location, one weather check button, a two-phase gradient weather summary, a three-item recent-check history, and a concise weather response. The goal is to answer nearby rainfall questions clearly and at minimal cost.

## 2. User flow

1. The user opens the page over HTTPS.
2. On startup, the app automatically attempts geolocation. The browser may prompt the user for permission; previously granted or denied permissions follow browser settings.
3. If permission is denied, times out, or geolocation is unavailable, the user can search for a city instead. The **Find me** button allows a manual retry.
4. The user clicks **Check weather** once.
5. The application fetches weather data (or uses a saved offline snapshot) and updates a single gradient summary of the current condition and the next expected change.

## 3. Functional requirements

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| F01 | Geolocation | Automatically attempt location discovery when the app starts, obtain latitude and longitude after permission is granted. Reverse-geocode the coordinates to display a readable location name and an explicit confirmation. If reverse geocoding fails, display coordinates instead. |
| F02 | Manual city fallback | A city search works when geolocation is blocked or unavailable. After 3 typed characters, show selectable city suggestions with administrative region and country. |
| F03 | Current rainfall and onset | If currently raining, report it. If not, find the first future hourly rain/showers amount of at least 0.1 mm and show its approximate time and day. State clearly when no rain is forecast or hourly data is unavailable. Never present a forecast as an on-site observation. |
| F04 | Rain-stop estimate | Estimate an approximate stop time using the hourly forecast. |
| F05 | English-only interface | All user-facing labels and status messages are in English. Weather phases read RAINING / STOPS AT or DRY / STARTS AT, with no invented exact time. |
| F06 | Weather cache | Cache responses by approximate coordinates for up to 10 minutes. |
| F07 | Error handling | Explain network, geolocation, and unavailable-data failures. |
| F08 | PWA installation | Provide a valid manifest, 192px and 512px PNG icons, a dedicated opaque 180px Apple touch PNG with an explicit HTML link, standalone display mode, a registered Service Worker, and a reproducible icon generation step before builds. |
| F09 | Offline app shell | Service worker installation precaches HTML and all production JS/CSS assets so the UI can launch offline without a blank screen. Live weather and geocoding still require connectivity. |
| F10 | Build version endpoint | Each production build emits a public `version.json` with package version, UTC build timestamp and optional Git commit. |
| F11 | Visible build identity | The UI header uses metadata bundled into the running JavaScript at build time, showing package version and the first seven commit characters, also offline. The online `version.json` independently reports the deployed build. |
| F12 | Project credits | The footer links to tonymitsev.com and OpenAI as a transparent AI-assisted development acknowledgment, without suggesting official endorsement. |
| F13 | Connectivity indication | Hide the connectivity banner when online, preserving vertical space. Show the warning banner and warm theme only while offline or when the origin server is unreachable. Keep weather actions responsive while offline. |
| F14 | Persistent offline forecasts | Save the last selected location and up to eight time-stamped weather snapshots in localStorage. Persist the rain-stop forecast and the next expected rain onset for dry conditions. Offline answers include historical timestamps and use an explicit date for future rain estimates, without spinners or API requests. |
| F15 | Compact hero heading | Render "Do I need an umbrella?" on one line, with compact typography and subtle positive letter spacing. Place the grouped tagline `RAIN AT A GLANCE | ONE CHECK · NO SIGN-UP` above it. The two text groups must not break internally; if necessary, wrap only between groups, so `NO SIGN-UP` is never orphaned on iPhone-sized screens. Do not add a separate descriptive paragraph. |
| F16 | Enforce HTTPS on Apache | Include `public/.htaccess` in the production build to redirect HTTP requests to HTTPS with HTTP 301, preserving the host, path, and query string. Require an available SSL/TLS certificate. |
| F17 | Unified results UI | Keep one **Check weather** button with no secondary caption and one gradient summary. Use blue-to-yellow for wet-to-dry, yellow-to-blue for dry-to-wet, and a single-state color when no change is forecast. Prominently display English condition/transition labels and approximate change time. Reduce metadata to APPROXIMATE · Fetched on [date/time] (prefix CACHED when offline). Do not repeat verbose forecast sentences or observation timestamps in the UI. |
| F18 | Three recent weather checks | Hide the entire recent-check section if the history is empty. Otherwise show the last three unique checked locations, newest first, with short forecast summaries rather than full sentences. Rechecking a location replaces its previous entry and moves it to the top. Persist history in localStorage and open entries without GPS, geocoding, API requests, or loaders. Silent prefetch is not a history entry. |
| F19 | Transient feedback toast | Keep an accessible top toast with no reserved layout height. Animate entry from above and dismissal toward the left, respecting reduced-motion preferences. |
| F20 | Bottom footer layout | Use a full-height flex column so credits sit at the viewport bottom when content is short, but follow naturally after longer content without overlaying results. |
| F21 | Responsive history and deletion | The app container uses `width: 100%; max-width: 580px` and stays centered on desktop. History cards must fit that width and narrower mobile viewports, wrapping long city names or forecast text. Place an accessible × button inside each card's top-right corner (not beside the card), without nesting interactive buttons. Removing an entry changes only the history store and does not delete cached forecasts or fetch weather. |
| F22 | Automatic PWA refresh | Each production build produces a distinct precache identity. Apache disables HTTP caching for HTML and PWA metadata; the app checks for new service workers on load and return to an active online state, then reloads controlled pages when the new complete worker activates. Offline weather history remains intact. |

| F23 | Responsive landscape | Preserve the centered 580px-wide portrait/single-column layout. In landscape at widths 740px and above, use a two-column workspace (location and city search left; primary action and forecast right) with a centered 920px max-width shell, safe-area padding, and responsive recent history. Below the threshold, retain single column without horizontal scrolling. |
| F24 | iOS Home Screen icon | Build an opaque 180×180 `apple-touch-icon.png` from the shared vector source; link it in HTML, include it in the production precache and `dist/icons/`, and document removal/re-addition of an old letter-only iOS shortcut without clearing local data. |

## 4. Non-functional requirements

- Responsive layout for mobile and desktop.
- Respect viewport width at every level (body, #app, shell, header, location controls, search form, weather card, recent checks and footer). Prevent intrinsic flex-item and input minimum widths from causing horizontal overflow, without masking it using overflow clipping. Maintain the centered 580px desktop maximum.
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

- One Check weather button, without a subtitle, updates both phases of the single gradient summary with English-only labels.
- Turning a wide-screen device to landscape puts search/location left and Check weather/status right without horizontal overflow; portrait remains at the 580px maximum.
- iOS Add to Home Screen uses the actual 180px PNG icon, not a letter fallback, after redeploying and recreating an old shortcut.
- Four successful checks across four locations leave only three entries, in newest-first order.
- Rechecking the same coordinates replaces the old entry; opening that entry does not reorder it.
- Clicking any recent check online or offline fills the single summary from its stored snapshot without API calls.
- Silent weather prefetches and merely selecting a location do not create history records.
- Empty history does not reserve space; a non-empty history has short status summaries and survives page reloads.
- Narrow mobile widths have no horizontal scrolling even for long history entries. Each entry has a separate × control that removes the entry without a new weather request or deleting the cached forecast.
- After deploying a complete new production build, an online browser with the updated PWA listener loads the new build after the next worker activates, without manual site-data clearing.
- A successful GPS lookup visibly confirms the resolved city/region/country or falls back to coordinates.
- City suggestions are debounced and selectable by mouse or keyboard.
- Denied geolocation permission is handled explicitly.
- No invented or falsely precise stop times.
- Repeated requests within 10 minutes reuse cached data.
- Dry weather with predicted rain displays the next approximate rain time; rain tomorrow shows a day indicator; missing forecasts never produce invented times.
- The production application runs as a static website without a backend.
- After one successful online visit, the application shell is available offline.
- PWA installation works on supported browsers under HTTPS.
- The ONLINE banner is absent during normal connected operation; switching offline reveals the OFFLINE banner and changes the theme.
- Restoring the connection hides the warning banner, restores the normal theme, and enables weather actions.
- If the origin server is stopped but the browser still has internet, the banner reads SERVER UNREACHABLE with the warning theme; weather actions remain enabled because third-party APIs may still be reachable.
- After one successful online weather fetch, go offline and click Check weather: the gradient summary shows the saved state and timestamp immediately, with no API request or loader.
- Refresh the installed PWA offline: the previously selected location and saved forecast are available.
- With no saved weather, offline actions show a clear empty-state message.
- The hero combines the two eyebrow phrases using a pipe, has no paragraph below the heading, and uses positive letter spacing.
- Card internals are compact, while margins between major sections allow visual breathing room. The toast floats above content and footer credits stay at the bottom of short pages.

## 7. Out of scope for v0.1

- Push notifications, accounts, maps, history, and radar maps.
- AI-written answers and paid OpenAI API requests.
- Minute-level accuracy or guaranteed conditions at an individual street address.
