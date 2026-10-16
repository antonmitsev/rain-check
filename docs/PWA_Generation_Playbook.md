# Production PWA Generation Playbook

**A reusable engineering, product, and UX specification for generating small, dependable Progressive Web Apps**  
**Version:** 1.1 · **Language for generated UI and code:** English by default · **Format:** Markdown / AI-agent-ready

> **Purpose** — Turn an app idea into a deployable, installable, offline-capable PWA with deliberate information hierarchy, reliable cache updates, accessible interactions, minimal UI clutter, and complete documentation. This playbook distills practical design and engineering decisions refined across the RainCheck development session. Rain/weather and location features are **examples**, not universal dependencies.
>
> **Principle:** Design the smallest coherent experience that answers the user's real question. Make the primary answer obvious, make supporting information secondary, and do not let offline operation, old deployments, or narrow screens break the experience.

---

## 0. How to use this document

Use this playbook as a project-generation specification for an AI coding agent or as a human team's baseline. **For fully guided generation, attach the three executable/specification appendices**: [Appendix C — Reference Architecture](playbook/appendix-c-reference-architecture.md), [Appendix D — Domain Specification](playbook/appendix-d-domain-specification.md), and [Appendix E — UX Design System and iOS Icons](playbook/appendix-e-ux-design-system.md). Fill in the **Project Intake** first. Apply **Core** requirements to every PWA, then opt into the feature-specific modules. Put the playbook in the repository or attach it to your agent's prompt, and request deliverables incrementally.

This is intentionally **generic**, not an instruction to recreate RainCheck. Domain words such as *raining*, *will stop*, *forecast*, and *location* are illustrative examples of mutually exclusive states, time-sensitive data, and saved searches. Replace them with the actual application's domain model.

### Project Intake — copy and fill

| Field | Decision to supply |
| --- | --- |
| Product name, short name, and goal | `[PRODUCT]` — one sentence explaining what the user achieves |
| Primary user question/action | `[ONE PRIMARY TASK]` |
| Input(s) | `[location / search / form / scan / API / other]` |
| Key result states | `[state A, state B, uncertain, no-data]` |
| Data source(s) and API terms | `[provider, endpoints, quotas, required attribution]` |
| Must function offline | `[app shell / last result / history / editing / none]` |
| Freshness requirement | `[maximum acceptable age and what happens when exceeded]` |
| Stored data and privacy | `[what, where, retention, precision, deletion rules]` |
| Deployment | `[Apache/cPanel / CDN / static host / other]` |
| Hosting base path | `[subdomain root / subdirectory]` |
| UI language and terminology | `[English by default; optional other locales]` |
| Primary visual metaphor | `[state colors and transition meaning]` |
| Desktop content width | `[e.g. 580px for a one-task utility]` |
| Install targets | `[iOS Safari, Android Chrome, desktop]` |
| Optional features | `[GPS, autocomplete, recent history, automatic update]` |
| Browser support, accessibility | `[target browsers / WCAG AA as baseline]` |
| Verification policy | `[unit / manual / visual tests only when authorized]` |
| Agent permissions | `[may edit files? may commit? may deploy?]` |

### Suggested delivery artifacts

```text
project/
  index.html
  package.json
  vite.config.js                    # or equivalent bundler configuration
  public/
    manifest.webmanifest
    sw.js
    .htaccess                       # Apache only
    icons/
      icon-192.png
      icon-512.png
      apple-touch-icon.png          # may reuse a suitable PNG
  scripts/
    prepare-pwa.mjs                 # optional precache/build packager
  src/
    main.js                         # app startup and UI orchestration
    style.css                       # responsive design system
    domain/                         # pure business rules
    services/                       # API and optional GPS/geocoding
    storage/                        # persistent snapshots, last selection, history
    pwa/                            # SW registration and update listener
    ui/                             # status view, toast, history renderer
  tests/                             # if verification is in scope
  docs/
    requirements.md
    architecture.md
    pwa.md
    deployment.md
    ux.md
  README.md
```

Use separate modules, even for a small vanilla-JS app, when separating them meaningfully improves correctness and testability. Do not introduce a heavy UI framework unless the product justifies it.

---

## 1. Product rules and UX priorities

### 1.1 One primary task, one primary action

- Establish the single most important task. Use **one primary call to action (CTA)** when two adjacent actions would ultimately request the same data and render different sides of one answer.
- Do not expose separate buttons just because the internal code has two functions. Compose the functions into one user outcome.
- The action label should usually be **one short phrase** (`Check weather`, `Get estimate`, `Find a route`). Avoid a second explanatory line inside the button if it merely repeats the first.
- Prefer the result itself over explanatory chrome. If the action is obvious, no instruction paragraph is needed.
- Avoid controls, badges, or banners whose only purpose is to reassure the user that nothing is wrong.

### 1.2 Information hierarchy

| Priority | What belongs there | Suggested expression |
| --- | --- | --- |
| P0 | Primary condition, result, or decision | Large, unambiguous text; direct position in viewport |
| P1 | Next meaningful change or amount/time | Visually linked to P0, often in the same component |
| P2 | Data quality and timestamp | Compact supporting line; not a second card |
| P3 | Recent history, alternatives, details | Below the main action/result; hide if empty |
| P4 | Attribution, build ID, legal/technical credits | Small footer/secondary treatment |

**The answer must stand on its own.** Do not repeat a message in a headline, a verbose body paragraph, a badge, a toast, and a metadata line. One layer should carry one job.

### 1.3 Describe states, not implementation

- Model the real state space before drawing cards: `A`, `B`, `unknown`, `no transition forecast`, `no cached data`, `offline`, `provider unavailable`.
- A visible transition must be grounded in actual data. If state A is expected to become B, show the two phases together. If no transition is known, avoid a gradient that implies the change will definitely occur.
- Say **approximately** when the source has hour-scale granularity; do not label a forecast as an exact future fact.
- In a generic timed-state UI, examples might be **ACTIVE → ENDS AT 17:00** or **IDLE → STARTS AT 19:00**. The RainCheck equivalent was **RAINING → STOPS AT 17:00** or **DRY → STARTS AT 19:00**.
- Do not invent times from incomplete provider fields or missing forecast periods.

### 1.4 Copywriting rules

- Write **user-facing copy consistently in the chosen UI language**; informal notes from the requester are *requirements to interpret*, not strings to paste into the product.
- Limit primary headlines to essential words: `RAINING`, `DRY`, `STOPS AT`, `STARTS AT`, `TIME UNKNOWN`.
- Keep microcopy short: `APPROXIMATE · Fetched on 16 Oct, 14:30`. For saved data: `CACHED · APPROXIMATE · Fetched on …`.
- Never call old saved data *live* or *current*. Always label the source age and provenance.
- Make fallback language helpful and concrete (`No saved result for this location. Go online once.`), not vague technical jargon.
- Replace accidental orphan words by restructuring the phrase, not by reducing font size until unreadable.
- A header tagline can be shortened from several full sentences to two meaningful groups: `AT A GLANCE | ONE CHECK · NO SIGN-UP`.

### 1.5 Remove empty sections

- Do not show a blank Recent checks card, placeholder list box, or header when the list has zero valid entries.
- **Hidden means no reserved vertical height**, not merely transparent or visually empty.
- On the first visit, focus attention on the primary action and data entry. Progressive disclosure applies to history, warnings, and advanced details.

---

## 2. Responsive UI engineering — solve width at the source

**Important lesson:** Global `box-sizing: border-box` is necessary but does not prevent flex/grid items from expanding due to their intrinsic minimum widths. Do not solve mobile horizontal overflow by hiding it with `overflow-x: hidden` on `body`.

### 2.1 Root-to-leaf width contract

Use a centered app column with a meaningful maximum, but fully responsive on small displays:

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #app { width: 100%; min-width: 0; max-width: 100%; }
body { margin: 0; }

.shell {
  width: 100%;
  max-width: 580px;             /* configurable by product */
  min-width: 0;
  margin-inline: auto;
  padding: 24px 16px 32px;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.shell > :not(.toast) { width: 100%; min-width: 0; max-width: 100%; }
header, .panel, .history, .history-list, .card { min-width: 0; max-width: 100%; }
```

Width `100%` and `max-width` must apply to the actual shell; descendants must not override or stretch it. Avoid contradicting rules appended at the end of the CSS file. Prefer refactoring outdated styles over stacking overrides indefinitely.

### 2.2 Flex/grid minimum widths

```css
.header { display: flex; align-items: center; gap: 10px; }
.header__name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.header__version { flex: 0 1 auto; min-width: 0; max-width: 42%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.input-row { display: flex; gap: 8px; min-width: 0; }
.input-row input { flex: 1 1 0; min-width: 0; width: 0; }
.input-row button { flex: 0 0 auto; }

.card-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.card__title { min-width: 0; overflow-wrap: anywhere; }
.card__summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
```

For a two-phase summary, use `grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)`; let text wrap at intentional word boundaries, and use typography that fits the actual phone width. Avoid fixed widths for form controls when they share a row.

### 2.3 Mobile typography and tagline composition

- Start with the physical viewport, safe areas, and actual device font rendering. A desktop browser resized to 390 CSS pixels is helpful but not equivalent to Mobile Safari.
- Keep headline emphasis strong, but allow sensible wrapping. `white-space: nowrap` on a long H1 may break the layout; remove it on narrow widths.
- For a two-part eyebrow/tagline, group the phrases rather than placing an arbitrary line break:

```html
<div class="eyebrow">
  <span class="eyebrow__lead">AT A GLANCE</span>
  <span class="eyebrow__detail">| ONE CHECK · NO SIGN-UP</span>
</div>
```

```css
.eyebrow { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 8px; row-gap: 2px; }
.eyebrow__lead, .eyebrow__detail { white-space: nowrap; }
```

If even one group cannot fit a very narrow device, shorten the actual copy (or add a genuinely compact variant) rather than forcing overflow.

### 2.4 Spacing: compact *inside*, airy *outside*

- Use a consistent spacing scale, e.g. `4, 8, 12, 16, 24, 32` CSS pixels.
- Controls and informational cards should have efficient internal padding (often 10–16px), without unexplained blank vertical zones.
- Put *more* spacing (often 24–32px) between major sections: hero, location/form, primary action, result, history, footer.
- Remove phantom height from empty paragraphs, unused subtitles, decorative labels, and outdated min-height values.
- Do not put a separate large card around a tiny status or a permanent Answer panel merely to display occasional feedback.
- Ensure cards remain readable in both light and dark themes. Contrast and legibility take precedence over decorative gradients.

### 2.5 Semantic and accessible structure

- One meaningful `<h1>`; section headings follow a sensible order.
- Use `<button>` for actions and `<a>` for navigation.
- Avoid a `<button>` nested inside another `<button>`. For a history row, use one card wrapper containing **two sibling buttons**: open result and delete.
- All controls need visible keyboard focus. Provide specific `aria-label` for icon-only actions.
- A visually small delete symbol may still need an approximately 44×44 CSS-pixel touch target where practical. Do not sacrifice accidental-tap safety to visual minimalism.
- Prefer actual DOM text to injected untrusted HTML. Set external data with `textContent`.
- Respect `prefers-reduced-motion`. Screen-reader announcements should be concise and not flood the user during typing.

---

## 3. The primary result: one coherent component

When two cards explain the **same current state and its next transition**, merge them into **one two-phase card**.

### 3.1 Visual treatment

| Scenario | Color direction | Example content |
| --- | --- | --- |
| State A now → B next | A color → B color | `RAINING → STOPS AT 17:00` (blue → yellow) |
| State B now → A next | B color → A color | `DRY → STARTS AT 19:00` (yellow → blue) |
| A without reliable next change | Solid A color | `RAINING → TIME UNKNOWN` |
| B with no expected A | Solid B color | `DRY → NO RAIN EXPECTED` |
| No reliable current data | Neutral color | `UNKNOWN` |

**Color meaning must be consistent**, including badges, history chips, hover states, and auxiliary indicators. Do not use gradient direction to assert a transition that was not actually forecast.

### 3.2 Minimal supporting metadata

Render one subtle line under the prominent state, not a second explanatory panel:

```text
APPROXIMATE · Fetched on 16 Oct, 14:30
CACHED · APPROXIMATE · Fetched on 16 Oct, 14:30
```

Keep raw provider timestamps, precise observations, API payloads, and explanatory strings in the **data model**, where useful; do not show all of them simultaneously. If the UX genuinely needs more detail, expose it on demand rather than by default.

Time values must identify what the clock represents:

- `fetchedAt`: when the device retrieved data;
- `observedAt`: observation time reported by the provider;
- `forecastAt`: future event/interval from the forecast;
- `checkedAt`: time the user explicitly invoked a check.

Avoid ambiguous `today`/`tomorrow` in persisted forecast text; retain an **absolute date** plus relevant time zone and format relative dates only when displaying up-to-date data.

### 3.3 Unknown and contradictory data

- Validate required fields before interpreting the response.
- Distinguish **zero** from **missing** and **null**.
- Do not turn “hourly forecast unavailable” into “no event expected.”
- Show uncertainty once and in the right place, without an additional duplicate toast.
- If an API has hourly resolution, describe time as an **estimate**, not a precise minute-level guarantee.

---

## 4. Loading, errors, connection state, and transient feedback

### 4.1 Toast behavior

Replace permanent, oversized Answer/Status sections with a **top-aligned toast** that does not reserve space in the document flow.

- Entry: slide **down from above** with a short, soft easing.
- Exit: slide **left off-screen** after a brief timeout.
- Informational/success messages: ~3–4 seconds; errors/offline messages: ~5–7 seconds, configurable.
- A newer message cancels *both* the previous hide timer and exit-animation timer so an older timeout cannot hide the new message.
- Informational toast uses `role="status"` / `aria-live="polite"`; urgent failures may use `role="alert"` carefully.
- Ensure the floating toast does not cover a critical primary control for too long, especially on small displays or with a notch. Respect `env(safe-area-inset-top)`.
- Motion preferences: `@media (prefers-reduced-motion: reduce)` disables transitions/animations; the message still appears and disappears.

A sound, reusable CSS pattern:

```css
.toast {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  width: min(440px, calc(100vw - 28px));
  z-index: 100;
  pointer-events: none;
}
.toast[hidden] { display: none; }
.toast--enter { animation: toast-down .35s ease-out both; }
.toast--exit { animation: toast-left .38s ease-in both; }
@keyframes toast-down {
  from { opacity: 0; transform: translate(-50%, calc(-100% - 24px)); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes toast-left {
  from { opacity: 1; transform: translate(-50%, 0); }
  to   { opacity: 0; transform: translate(calc(-50% - 100vw), 0); }
}
@media (prefers-reduced-motion: reduce) {
  .toast--enter, .toast--exit { animation: none; }
}
```

Do not present a successful update in a toast *and* repeat the same sentence in a permanent status panel.

### 4.2 Connection UX

- **Online is the default, not a banner.** Do not display a permanent ONLINE pill if it merely restates normal operation.
- Show a warning only when the device/browser is **OFFLINE**, the **APP SERVER IS UNREACHABLE**, or a request has failed in a user-relevant way.
- `navigator.onLine` is a connectivity *hint*, not proof that the app origin or third-party API is reachable.
- The app origin may be down while an external API works; avoid globally disabling actions solely because the origin probe fails.
- Keep offline actions available if they can display saved results. Disable or guard only features that strictly need new network data.
- Going offline mid-request must not leave a permanent spinner, disabled screen, or stale in-flight response rendered as current.

### 4.3 Busy-state discipline

- Start a loader **only** if the action is actually waiting on work.
- Check offline/cache state **before** setting `busy` or showing loading feedback.
- Cancel stale searches and requests (`AbortController` where supported), or ignore results using a request/selection token.
- In `finally`, restore the interactive state appropriately—even after network failure, aborted requests, or navigation.
- A failed request may fall back to a saved result, **clearly marked CACHED**, without pretending that the call succeeded live.

---

## 5. Offline-first design is three separate caches, not one

The most important architectural separation:

| Layer | Stores | Purpose | Typical invalidation |
| --- | --- | --- | --- |
| Browser HTTP cache / CDN | HTML, JS, CSS, static files | Download efficiency | Response headers, content hashes, CDN purge |
| Service Worker Cache Storage | App shell, versioned JS/CSS, icons | App **starts and renders** without network | New worker/build cache version; delete old app caches on activation |
| App data storage | Last selection, compact snapshots, history | User can **see last known results** without network | TTL/data policy, bounded history, explicit deletion |
| Optional in-memory cache | Fresh API responses during one session | Avoid duplicate requests / short-term refetch | TTL, selection changes, reload |

Do **not** confuse offline app-shell availability with offline data availability. An offline UI that opens but shows an endless spinner is not an acceptable offline result experience.

### 5.1 Service worker — complete app-shell precaching

- Serve from HTTPS (localhost is a development exception).
- Only register a production service worker in the production build. Development mode should not accidentally be controlled by a stale production worker.
- Cache **all hashed JS/CSS bundles required for startup** plus HTML, manifest, icons, and essential local assets *during install*, not merely after the user navigates a second time.
- Generate a precache manifest from **actual build output**, not assumed filenames; modern bundlers fingerprint assets.
- Installation should fail if a required asset cannot be fetched; do not activate a partially cached shell.
- On activation, delete **only caches belonging to this app** and older build IDs.
- Navigation should be **network first**, with cached HTML/app-shell fallback offline.
- Hashed assets can be cache first inside the build namespace.
- Do not cache third-party API responses in the service worker unless the product explicitly defines that policy; application snapshots are often safer and easier to label.
- Avoid intercepting or caching the online deployment version endpoint (`version.json`).

**Example build flow:**

```text
npm run build
    -> bundler emits index.html + content-hashed assets + version.json
    -> postbuild enumerates output files
    -> postbuild emits precache-manifest.json
    -> postbuild embeds unique build ID into sw.js
    -> dist/ is uploaded in full
```

Use browser HTTP-cache bypasses for new SW installations (e.g., `Request(url, {cache:'reload'})`), and handle scope/base paths correctly. For an app in `/tools/app/`, relative URL and SW scope resolution must not inadvertently point to `/`.

### 5.2 Application snapshots — localStorage versus IndexedDB

Choose storage based on data shape:

- `localStorage`: tiny, bounded, JSON-serializable last-known snapshots/history; no async writes needed.
- `IndexedDB`: larger caches, structured records, attachments, or transactional offline edits.
- Cache Storage: network resources/app shell, **not** a substitute for a domain-level freshness/provenance model.

Suggested generic snapshot schema:

```json
{
  "schema": 1,
  "lastSelection": { "key": "stable-location-or-record-id", "label": "Example place" },
  "snapshots": {
    "stable-location-or-record-id": {
      "fetchedAt": 1792170000000,
      "observedAt": "2026-10-16T14:30",
      "state": "dry",
      "nextTransition": { "kind": "starts", "at": "2026-10-16T19:00", "zone": "Europe/Sofia" },
      "source": "example-provider"
    }
  },
  "recent": [
    { "key": "stable-location-or-record-id", "checkedAt": 1792170000000, "snapshot": {} }
  ]
}
```

This example schema illustrates shape, **not** a migration-ready schema from an existing project. Choose concrete types, validation, and version migration before implementation.

Storage rules:

- Wrap reads, parsing, and writes in `try/catch`. Browser storage can be unavailable, full, denied, or corrupt.
- Use a schema/version field; older or partial records must not crash startup.
- Bound snapshots and history by count/age. RainCheck used **up to 8 snapshots** and **3 recent checked locations** as product-specific defaults, not universal limits.
- Do not persist unnecessary high-precision location coordinates. Round or quantize location keys when exact precision is not required; document the privacy/accuracy tradeoff.
- Never store secrets or unrestricted sensitive information in localStorage.
- Restore the last useful user selection on offline startup when privacy expectations permit.
- Use stable keys for deduplication. Normalize input and validate stored data.
- Explicitly label cached results; saved forecasts are *what was predicted at fetch time*, not an assertion of present-day conditions.
- Deleting a history item should not silently delete the separate snapshot cache unless the user explicitly requests that behavior.

### 5.3 Offline action contract

When offline:

1. User invokes a supported action.
2. The app checks storage immediately (no spinner, GPS lookup, or API call).
3. If a matching valid saved snapshot exists, render its **actual historical value** and fetched timestamp.
4. If not, show a brief informative empty state/toast (`No saved result. Connect once to fetch it.`).
5. Keep the UI responsive and interactive. Do not retain a stale busy state.

When returning online, the app can fetch fresh data via the next explicit action or a clearly justified refresh policy. Silent prefetch should not create a new **user-action history** entry.

---

## 6. Recent history as a small, trustworthy interface

Recent history is not synonymous with browser history, last selections, or automatic API prefetches. Define exactly what counts as a **check**.

### 6.1 History semantics

- Store the **last N distinct explicit user checks**, newest first. Example default: `N = 3`.
- A repeated check with the same stable key **replaces** its older entry and moves to the top.
- Record the actual `checkedAt` time and a **copy of the result as it existed then**. A later silent refresh must not mutate what the user saw in history.
- Opening an existing history record reads its stored snapshot only. **No GPS, geocoding, data API call, loader, reorder, or new history record.** This must be true both online and offline.
- Selecting a history row may restore that item as the current app selection, but must not implicitly fetch.
- History does not appear when empty.

### 6.2 History list item anatomy

A compact row contains:

```text
┌───────────────────────────────────────┐
│ Example location                  [×] │
│ 16 Oct, 14:30                        │
│ [DRY]  Starts ~19:00                 │
└───────────────────────────────────────┘
```

- Title: name or identifier, wrap safely.
- Secondary: checked timestamp, restrained contrast.
- Condition chip: colors match main status, never change their meaning.
- Summary: `Starts ~19:00`, `Stops ~17:00`, `No rain expected`, or `Time unknown`, **not** the raw provider paragraph.
- Delete: small, subtle **×** button **inside the top-right of the same card**, with accessible label and a safe touch target.
- Implement the card as a wrapper with sibling buttons (open and delete), not nested interactive controls.
- Tapping delete removes only that history entry; no network calls, no duplicate item opening, no unexpected data loss.
- Enforce `min-width: 0`, `max-width: 100%`, and reasonable wrapping/clamping so a long name/forecast cannot cause horizontal scroll.

---

## 7. Optional location and search features

Only include this section if the product genuinely needs a position, address, or place.

- Geolocation requires a secure context (HTTPS, or localhost) and browser permission. Treat permissions as explicit user authority.
- **Auto-detect at launch is a product choice, not the default for every PWA.** If adopted, avoid repeated permission prompts and retain a manual alternative.
- If GPS is denied, unavailable, or times out, offer a **manual search** immediately.
- Reverse geocoding may convert GPS coordinates into a human-readable name. If the reverse service fails, show an honest, rounded coordinate fallback.
- Suggestions should be debounced (e.g., ~250–350ms), cancellable, keyboard accessible, and unambiguous enough to distinguish similarly named places.
- Selecting a suggestion updates the displayed location and the saved last selection; clear stale results from the previously selected location.
- Guard against race conditions when GPS and manual city selection overlap; only the latest relevant selection should win.
- If the app is offline, do not perform new geocoding/suggestion network requests. Use a saved location and cached result.
- Observe each geocoding provider's attribution, quota, and acceptable-use requirements. Public Nominatim has usage-policy restrictions that must be reviewed before launch.
- Document how much location precision is stored and why.

---

## 8. PWA identity, installability, and mobile Safari

### 8.1 Web app manifest

Supply a valid `manifest.webmanifest` with appropriate values:

```json
{
  "id": "./",
  "name": "Example App",
  "short_name": "Example",
  "description": "One sentence about the primary task.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0c1728",
  "theme_color": "#101c2d",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
```

Provide genuinely maskable assets before declaring `purpose: "maskable"`. Do not mark an icon maskable if artwork lacks sufficient safe margins. Use a stable manifest ID; check that relative paths work under a subdirectory deployment.

### 8.2 HTML metadata

- `<meta name="viewport" content="width=device-width,initial-scale=1">`
- `<meta name="theme-color" content="...">`
- Manifest link, favicon, Apple touch icon, description, and meaningful title.
- Optional Apple mobile web app metadata where applicable.
- Use safe-area insets for fixed/floating controls and status bars.
- Keep the real PWA theme color synchronized with significant visual state changes where appropriate.

### 8.3 Install guidance

**iOS Safari:** Open the HTTPS site → **Share** → **Add to Home Screen** → optionally enable **Open as Web App**, depending on iOS version → **Add**. The icon then launches the installed web app, with standalone display where supported.

**Android Chrome:** Use **Install app** or **Add to Home screen**, depending on browser eligibility and UI.

**Desktop Chromium:** Use the browser's app installation option if available.

- Do not assume iOS Safari supports the same install-prompt API as Chromium.
- PWA installation controls and wording vary by OS/browser/version. Provide simple in-product instructions only when valuable.
- Installed and browser-tab contexts may have different storage, lifecycle, or update timing behavior. Treat this as a verification dimension.
- The app should be opened online once for the service worker to finish precaching before relying on offline startup.

---

## 9. Build identity, cache busting, and safe automatic updates

Stale deployments were a major real-world issue: uploading `dist/` does **not** guarantee that an already-open or installed PWA immediately uses the new HTML/JS. The solution must coordinate server headers, Service Worker lifecycle, and running page behavior.

### 9.1 Every build has an immutable identity

Generate a `version.json` from one build metadata object:

```json
{
  "version": "1.0.0",
  "builtAt": "2026-10-16T12:00:00.000Z",
  "commit": "abc123def456"
}
```

Use the same object to inject version metadata into the compiled JS. The visible header/build badge must identify the **code currently running**, even offline. The online `version.json` endpoint identifies the **deployed build**, which may be newer. These are intentionally different facts.

Embed the unique build ID (e.g., semantic version + build timestamp or commit + content digest) in the service worker's cache name/script so that each release is discoverably different. Do not rely only on changing `package.json` versions manually.

### 9.2 Update flow

1. Build all hashed assets and generate a matching precache manifest and worker from **the same build**.
2. Upload the entire `dist/` consistently; avoid serving a new manifest that references not-yet-uploaded assets. Prefer atomic release promotion where hosting supports it.
3. Serve HTML, SW script and version metadata with no-store/revalidation headers.
4. On production startup and when a tab becomes active or connectivity returns, trigger the browser's worker update check. Avoid rapid polling when an event-driven check is sufficient.
5. New SW precaches the complete new shell during `install`, then activates and claims clients according to the chosen strategy.
6. An **already-controlled** online page can reload once after `controllerchange`; a first-time registration must not cause a gratuitous reload.
7. Guard against refresh loops and defer reloads while offline. In apps with unsaved edits, **do not auto-reload without preserving state or requesting consent**.
8. Keep application localStorage/IndexedDB snapshots intact; SW shell cache replacement must not delete user history.

An installed legacy build with no update listener may require **one manual online reload** to load the new lifecycle code. Service-worker updates alone cannot force an old page's JavaScript to implement a listener that did not exist in that version.

### 9.3 Apache/cPanel cache control

Use an Apache `.htaccess` file in `public/` so the bundler copies it into `dist/`. Example:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} !=on
    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L,NE]
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "^(index\.html|sw\.js|version\.json|precache-manifest\.json|manifest\.webmanifest)$">
        Header always set Cache-Control "no-store, max-age=0"
    </FilesMatch>
</IfModule>
```

The first block enforces HTTPS while preserving path and query; the second prevents stale HTML/PWA update metadata from being kept in the HTTP cache. Ensure Apache `mod_rewrite`, `mod_headers`, and `.htaccess` overrides are enabled. When using a proxy/CDN, configure origin TLS correctly (e.g., end-to-end HTTPS); an HTTP-only connection from the CDN to origin may trigger redirect loops. Check that the CDN respects or deliberately overrides these cache directives.

**Content-hashed JS/CSS** are different: these may be cached aggressively under their immutable filenames, since any content change creates a new URL.

### 9.4 cPanel upload checklist

```text
[ ] npm install (locally)
[ ] npm run build (including any PWA postbuild step)
[ ] dist/index.html
[ ] dist/assets/ (all new hashed JS and CSS)
[ ] dist/sw.js
[ ] dist/precache-manifest.json
[ ] dist/version.json
[ ] dist/manifest.webmanifest
[ ] dist/icons/
[ ] dist/.htaccess (hidden file: Show Hidden Files in cPanel)
[ ] HTTPS certificate active
[ ] Correct domain/subdomain Document Root or app subdirectory
[ ] Provider/CDN cache invalidated if necessary
[ ] New build ID reported by live /version.json
[ ] Existing installed PWA upgraded while retaining user data
```

Do not upload `src/`, `node_modules/`, private keys, or development files. If the app is hosted in a subdirectory, configure the bundler's `base` and SW scope consistently. A static app does not need an Apache SPA fallback rewrite if it has no client-side routes; add routing rules **only when the app actually needs them**.

### 9.5 Debugging a stale deployment

Compare:

- **Live** `https://example.com/version.json` — what the server deployed;
- **UI build badge** — what the current JavaScript contains;
- Browser **Application → Service Workers** — currently active/waiting worker;
- **Application → Cache Storage** — old versus new precache entries;
- HTTP response headers for `index.html`, `sw.js`, and `version.json`;
- Whether a CDN or reverse proxy is serving older bytes.

Use a manual online reload for the first migration. Do **not** suggest **Clear site data** as the normal update process: it destroys local weather/results/history and should be a last-resort troubleshooting step with explicit warning.

---

## 10. Footer, credits, privacy, and trust

### 10.1 Footer position

The footer should sit at the **bottom of a short page** without overlapping a long page. Prefer layout rather than `position: fixed`:

```css
.shell { min-height: 100dvh; display: flex; flex-direction: column; }
.shell > footer { margin-top: auto; padding-top: 26px; }
```

A footer usually contains only legitimately useful data-source attribution, creator details, and legally necessary notices. Treat project credits and third-party data attribution separately. The text should not compete with the main task.

### 10.2 Privacy

- Explain why the application needs location and who receives it.
- Never assume a product needs tracking or accounts to be useful.
- Specify whether personal data stays in the browser, is sent to external providers, or reaches the app server.
- Keep local storage bounded. Provide an understandable deletion model.
- Do not persist exact GPS coordinates without a product requirement.
- Follow external API attribution, terms, quotas, and data-use limitations.
- Prefer HTTPS everywhere. Service workers, geolocation, and app installability require secure contexts in normal production operation.

### 10.3 Honesty about capability

- “Offline UI loads” must not imply “live data is available offline.”
- “No rain predicted in the available horizon” is not “it will never rain.”
- A `version.json` timestamp is a build time, not necessarily the time someone deployed the files.
- An origin health check does not prove that all third-party services work.
- A run that was not tested must never be labeled “tested successfully.”

---

## 11. Production acceptance criteria

This is a **verification checklist**, not a claim that anything has been executed. A project may choose to defer visual tests; an agent must follow the user's explicit verification policy.

### 11.1 Product and UX

- [ ] One clear primary task and CTA; no redundant action buttons.
- [ ] All end-user copy follows the selected language and terminology.
- [ ] Primary condition/change is immediately visible without redundant explanation.
- [ ] An unknown state is distinct from a negative state.
- [ ] Color encodes meaning consistently; gradients only imply forecasted transitions.
- [ ] Meta text identifies approximate values and the actual fetched time.
- [ ] A cached result cannot be mistaken for a current one.
- [ ] No permanent “Answer” panel for short transient messages.
- [ ] No permanent ONLINE banner; only actionable warnings take space.
- [ ] Toast enters from above and exits left; respects reduced motion.
- [ ] No empty Recent checks section.
- [ ] No redundant subtitle in the primary action.
- [ ] Dense internals and deliberate section-to-section spacing.
- [ ] Footer stays below the content and at the bottom of short pages.
- [ ] Keyboard focus and screen-reader labels for every action, including remove.

### 11.2 Responsive behavior

- [ ] Root → app → shell → each section has an intentional width contract.
- [ ] Desktop app column remains centered and appropriately capped.
- [ ] No horizontal scrolling on representative compact phones, including the target iPhone dimensions.
- [ ] Long place names, timestamps, version hashes, and metadata do not expand the page.
- [ ] Form input shrinks next to its button without overflow.
- [ ] Headlines and grouped taglines wrap only at useful boundaries.
- [ ] History list items stay inside their card, with their delete control inside the card.
- [ ] No `overflow-x: hidden` is used to conceal a structural width error.

### 11.3 Online / offline / cache

- [ ] Fresh startup online succeeds.
- [ ] First-ever offline startup shows the appropriate empty state, not a blank app or frozen loader.
- [ ] After first successful online use, offline reload renders all essential JS/CSS/icons.
- [ ] Offline supported actions use saved data with **zero new API calls** and no loader.
- [ ] Last selected entity is restored if specified.
- [ ] Browser storage denied/corrupt/full fails gracefully.
- [ ] A request aborted by offline transition does not leave `busy = true`.
- [ ] Out-of-order GPS/search/API results cannot overwrite a later selection.
- [ ] Opening history never makes a request or changes order.
- [ ] Repeated checks deduplicate history and update recency.
- [ ] Removing history leaves cached snapshots untouched.
- [ ] Saved timestamps do not use misleading relative-day language.

### 11.4 Installation, updates, hosting

- [ ] Manifest, HTTPS, valid 192/512 icons, and correct scope/start URL.
- [ ] iOS Safari **Share → Add to Home Screen** guidance works for target iOS/browser.
- [ ] Proper standalone appearance, safe areas, and icon fit on installed PWA.
- [ ] Production SW precaches the complete app shell, not only HTML.
- [ ] New build changes worker script/cache identity.
- [ ] Online navigation and new SW installation bypass stale HTTP cache.
- [ ] Live version endpoint remains uncached and reports the new build.
- [ ] Updated worker activates only after successful asset precaching.
- [ ] Existing controlled page receives update appropriately without refresh loops.
- [ ] No unexpected reload of an editor with unsaved input.
- [ ] New deployment preserves app data/history across SW upgrade.
- [ ] Apache HTTPS redirect has no redirect loop behind proxy/CDN.
- [ ] `dist/.htaccess` is included if Apache hosting is used.
- [ ] Source and English documentation are updated together.

---

## 12. Failure patterns: what *not* to generate

| Anti-pattern | Why it fails | Preferred approach |
| --- | --- | --- |
| Two buttons for two halves of one answer | Divides one mental model; duplicate fetches and controls | One action, one two-phase result |
| Giant Answer/Status block | Consumes permanent vertical space for transient feedback | Top toast or inline message only when meaningful |
| “ONLINE” status at all times | Gives no actionable information | Only warn on offline or degraded service |
| Full raw API sentence under a large result | Duplicates the already visible answer | Tiny provenance/approximation line |
| Unnecessary text under CTA | Tall button, weak hierarchy | One concise label |
| Empty history placeholder | Wastes attention and page height | Hide section when no items |
| Delete icon in a separate external column | Looks detached from the row | Position inside the same card; sibling buttons |
| History click fetches fresh data | Breaks offline semantics; changes historical result | Render saved record with zero requests |
| Silent prefetch counts as a user search | Misleading recent history | Record only explicit actions |
| `overflow-x: hidden` on page | Hides the width bug; may clip UI | Fix min-content and flex/grid constraints |
| `max-width:100%` overriding desktop cap | Makes design stretch across desktop | Explicit `width:100%; max-width:<intended cap>` |
| Long nowrap tagline/heading | Orphaned words or horizontal overflow | Shorter grouped copy with intentional wrapping |
| Old SW caches only `index.html` | Blank offline screen when JS chunks are unavailable | Full hashed-asset precache during install |
| Same SW cache ID for every build | Old assets persist | Build-specific worker bytes and cache name |
| Clearing site data to receive updates | Deletes user's local results/history | Update lifecycle + no-store metadata headers |
| Loading spinner in offline action | Calls that cannot complete; frozen UI | Check cache first, render immediately |
| UI mixes two languages accidentally | Undermines product polish | Consistent locale rules, domain-correct phrasing |
| “No forecast” interpreted as “no event” | False certainty | Separate missing, unknown, and negative states |
| Automatic reload with unsaved forms | Data loss | Prompt or persist state before upgrading |
| UI claimed as visually tested when it wasn't | Trust/quality failure | Explicit distinction between implementation and verification |

---

## 13. AI coding agent workflow and review contract

### Phase A — Requirements and product model

1. Extract real intent (not literal implementation wording).
2. Agree on one primary task, state machine, offline promise, and storage policy.
3. Define the data and time contracts, including unknown/negative state handling.
4. Establish mobile and desktop content width and chosen UI language.
5. Produce/update `docs/requirements.md` and `docs/ux.md`.

### Phase B — Functional minimum

1. Build semantic HTML, accessible UI components, and the one primary action.
2. Integrate API/data source and pure state interpretation logic.
3. Implement loading/error/cancel/retry states without deadlocking actions.
4. Add only necessary optional features such as location or search.
5. Update README and architecture notes.

### Phase C — Offline and persistence

1. Set up manifest and install icons.
2. Implement versioned SW with complete app-shell precache.
3. Implement small persistent snapshots and offline launch restoration.
4. Define and implement recent history semantics if requested.
5. Implement online/offline state warnings and cached-result labeling.
6. Document failure/recovery paths.

### Phase D — UX polish

1. Collapse redundant actions into a single outcome where appropriate.
2. Prioritize one result card, coherent color states, and concise microcopy.
3. Hide empty panels, move transient messages to toast, remove duplicate text.
4. Fix root-to-leaf width constraints and typography on phone-size viewports.
5. Keep deletion controls inside their cards, visible but subdued.
6. Balance inner padding with outer spacing; keep footer at bottom.
7. Check semantic/a11y behavior conceptually and through approved testing.

### Phase E — Deployment and updates

1. Generate build/version metadata and hashed bundles.
2. Prepare and validate precache manifest from the build output.
3. Configure HTTPS redirect and appropriate HTTP cache headers.
4. Add version-aware SW update checks and safe page refresh policy.
5. Document manual deployment and recovery of stale installations.
6. Do not delete browser application data to update app-shell code.

### Phase F — Delivery report

An implementation report should state **what changed**, **where**, **how to deploy**, and **what remains unverified**. Use real repository/file/commit links if they exist, not guessed IDs. If user policy prohibits visual testing, do not execute it; document how the user can verify at their convenience. Update English project docs whenever code behavior changes. Do not create background monitoring or scheduled tasks without explicit instruction.

---

## 14. Copy/paste master prompt for a new PWA

The prompt below is a project kickoff brief, **not a complete standalone implementation specification**. Supply this playbook, Appendices C/D/E and a completed Domain Specification alongside it. The agent must identify unresolved domain decisions rather than invent them.

```text
Act as a senior frontend engineer, Lead UX Designer, and production PWA architect.

Build [PRODUCT NAME], a small, installable PWA whose single primary goal is:
[ONE PRIMARY USER OUTCOME].

Inputs: [INPUTS]. Data/API providers: [PROVIDERS].
UI language: English unless explicitly overridden.
Target deployment: [APACHE/CPANEL OR OTHER STATIC HOST], path [ROOT/SUBPATH].
Target clients: [iOS Safari, Android Chrome, Desktop].
Offline requirement: [LAST VALID RESULT / HISTORY / EDITS / APP SHELL ONLY].
State model: [CURRENT STATES + VALID TRANSITIONS + UNKNOWN/NO-DATA CASES].

Follow PWA_Generation_Playbook.md **plus** Appendices C (implementation skeleton),
D (domain/API contract) and E (UX tokens and mobile icons) as the engineering,
UX and acceptance-criteria specifications. Where a pattern is domain-specific,
generalize it rather than copying weather labels or assuming GPS is needed.

Non-negotiable UX:
- One primary CTA, no redundant subtitle or duplicate action.
- One coherent main result, emphasizing current state and next change.
- Short English labels; do not repeat raw provider sentences.
- Display compact freshness metadata and explicitly label cached data.
- Hide empty secondary sections.
- Compact padding inside cards/buttons; breathing room between sections.
- A responsive centered shell with width:100%, a justified max-width,
  border-box sizing, and min-width:0 throughout necessary flex/grid children.
- No horizontal scrolling on mobile and no overflow-x:hidden workaround.
- Small, accessible delete controls INSIDE history cards if history is enabled.
- Toasts enter from above, exit left, and respect reduced motion.
- Offline/critical warnings only; no permanent ONLINE banner.
- Footer sits at the bottom of short pages without overlapping long pages.

Non-negotiable engineering:
- Production HTTPS, manifest, actual install icons, correct scope/base path.
- Service worker precaches the whole built app shell (including hashed JS/CSS).
- Versioned build/cache, network-first HTML fallback offline, correct update
  lifecycle, cache headers that prevent stale deployments.
- Distinguish browser HTTP cache, SW app-shell cache, and persistent app data.
- Offline-supported actions never launch API calls or loaders.
- Clearly timestamp and label cached data; never claim it is live.
- Persist bounded user history only for explicit actions; deduplicate by
  stable key; view and delete records with zero network calls.
- Defensive storage, request cancellation, and stale-response protection.
- Correct third-party attribution, privacy disclosures, and accessibility.

Deliver:
1. Working code and documented build/deployment procedure.
2. README + requirements + architecture + PWA/update + UX docs (English).
3. Clear acceptance criteria, manual QA steps, and known limitations.
4. A concise change/deployment report with actual commit refs if committed.

Agent execution policy: [WHETHER TO RUN TESTS / VISUAL TESTS / COMMIT / DEPLOY].
Do not claim tests were run if they were not. Do not set up scheduled/background
monitoring without my explicit request. Preserve existing user data during updates.
```

---

## 15. Ready-made Definition of Done

A PWA is ready to hand over when:

1. The primary user question can be answered with the fewest reasonable interactions.
2. The mobile layout preserves viewport width, the desktop shell is intentionally capped, and the visual hierarchy is clear.
3. The user can understand success, uncertainty, network failure, and saved data without reading an explanation of the technology.
4. The app installs on its declared targets and loads its complete shell offline after an initial successful online visit.
5. Previously fetched domain data can be presented offline as historical data, where promised.
6. Recent history behaves predictably and does not issue new requests when opened or removed.
7. A newly deployed release can be discovered and activated without routinely clearing local data.
8. Every meaningful state and error has a defined response and recovery path.
9. Attribution, privacy constraints, and app update behavior are documented.
10. Implementation and documentation match; any verification not performed is clearly disclosed.

---

## Appendix A — Reference mapping from the original RainCheck project

The source project uses Vite + vanilla JavaScript. For teams reviewing a similar implementation, these file types illustrate the role boundaries without making the project itself a dependency:

| Concern | Representative RainCheck source |
| --- | --- |
| UI composition and action orchestration | `src/main.js` |
| Responsive design, status gradients, toast, history rows | `src/style.css` |
| Pure domain interpretation (rain onset/cessation) | `src/weather.js` |
| Persistent local snapshots and last-three history | `src/offline-cache.js` |
| Production worker and offline startup | `public/sw.js` |
| Build-specific precache generation | `scripts/prepare-pwa.mjs` |
| Version metadata emitted from the build | `vite.config.js` → `dist/version.json` |
| PWA identity | `public/manifest.webmanifest` and PNG icons |
| HTTPS and browser cache headers | `public/.htaccess` |
| Deployment and offline behavior | `docs/hosting-cpanel.md`, `docs/pwa.md` |

Reference repository: <https://github.com/antonmitsev/rain-check>

**Generalization rule:** Reuse the decisions and contracts, not the rain-specific text, fixed cache counts, guessed provider API semantics, or the original product's aesthetic as universal defaults.

## Appendix B — Documentation quality rules

- Keep all project-facing documentation in **English** unless the project explicitly requests another language.
- Write documentation as indexed, modular sections with stable headings and concrete acceptance criteria; this makes it reusable with search and RAG tools.
- Keep a requirements matrix with IDs, acceptance criteria, optionality, and implementation status.
- Link decisions to implementation files and deployment consequences.
- When changing UX, update UX/design notes, requirements, and README accordingly.
- When changing offline/update behavior, update the PWA and deployment docs in the **same work unit**.
- Distinguish “implemented”, “verified”, and “not verified”; never merge these terms.
- Give explicit user controls for deleting saved data/history and for undoing actions where feasible.

## Appendix C — Runnable PWA reference architecture

[**Appendix C: Executable Reference Architecture**](playbook/appendix-c-reference-architecture.md) provides a copyable Vite/vanilla-JS project, complete offline app-shell precaching, versioning, defensive storage, updating, manifest, generated icons (including a 180×180 Apple touch PNG), and Apache caching. The demonstration provider is intentionally fake and labelled as such; replace it before release.

## Appendix D — Deterministic domain specification

[**Appendix D: Domain Specification Template**](playbook/appendix-d-domain-specification.md) provides an explicit provider interface, state machine, decision table, thresholds, timezone contract, storage schema, race handling, edge cases and domain acceptance criteria. A generic starter must not invent domain rules.

## Appendix E — UX tokens, components and mobile icons

[**Appendix E: UX Design System**](playbook/appendix-e-ux-design-system.md) specifies spacing/typography/color tokens, layout and focus contracts, accessible card/toast/history anatomy, design decisions and a full iPhone Home Screen icon checklist. Do not depend exclusively on webmanifest icon declarations for iOS; generate an opaque 180×180 PNG and reference it using apple-touch-icon.

**For a reproducible new product:** fill the Project Intake, complete Appendix D for the domain, use Appendix C as a scaffold, apply Appendix E, and evaluate the main playbook's acceptance matrix.

*End of playbook.*