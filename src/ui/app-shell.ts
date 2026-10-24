export interface AppElements {
  routeViewport: HTMLDivElement;
  homeScreen: HTMLElement;
  toast: HTMLDivElement;
  analyticsConsent: HTMLElement;
  versionBadge: HTMLSpanElement;
  connectionBanner: HTMLDivElement;
  connectionLabel: HTMLElement;
  connectionDescription: HTMLSpanElement;
  themeMeta: HTMLMetaElement | null;
  place: HTMLElement;
  locationStatus: HTMLElement;
  cityInput: HTMLInputElement;
  suggestions: HTMLDivElement;
  locateButton: HTMLButtonElement;
  cityForm: HTMLFormElement;
  citySubmitButton: HTMLButtonElement;
  checkButton: HTMLButtonElement;
  summaryCard: HTMLElement;
  summaryNow: HTMLElement;
  summaryNext: HTMLElement;
  summaryTime: HTMLElement;
  summaryDay: HTMLElement;
  summaryCurrentTemperature: HTMLElement;
  summaryTransitionTemperature: HTMLElement;
  summaryMeta: HTMLElement;
  historyPanel: HTMLElement;
  historyList: HTMLDivElement;
}

const appTemplate = `
<section class="shell">
<div id="toast" class="toast" role="status" aria-live="polite" aria-atomic="true" hidden></div>
<aside class="analytics-consent" id="analytics-consent" aria-label="Analytics cookie preferences" hidden>
  <p>RainCheck can use Google Analytics to understand app usage. Choose whether to allow analytics cookies.</p>
  <div class="analytics-consent__actions">
    <button type="button" data-analytics-consent="accepted">Accept analytics</button>
    <button type="button" data-analytics-consent="rejected">Reject analytics</button>
    <a href="#/cookies">Details</a>
  </div>
</aside>
<header>
  <a class="brand" href="#/" aria-label="RainCheck home"><span class="brand-icon" aria-hidden="true">☁</span> RainCheck</a>
  <span class="version" id="app-version" title="Application build">v0.1</span>
</header>
<div class="route-viewport" id="route-viewport">
<div class="route-page" id="home-screen" data-route-page="home">
  <div class="connection-banner" id="connection-banner" role="status" aria-live="polite" hidden>
    <span class="connection-dot" aria-hidden="true"></span>
    <strong id="connection-label">ONLINE</strong>
    <span id="connection-description">Live weather available</span>
  </div>
  <div class="hero">
    <div class="eyebrow">
      <span class="eyebrow-lead">RAIN AT A GLANCE</span>
      <span class="eyebrow-details"><span class="eyebrow-separator" aria-hidden="true">|</span> ONE CHECK · NO SIGN-UP</span>
    </div>
    <h1 tabindex="-1">Do I need an <em>umbrella?</em></h1>
  </div>
  <div class="weather-workspace">
    <section class="location-panel" aria-label="Location">
      <div class="location-line">
        <span class="pin" aria-hidden="true">⌖</span>
        <div>
          <small>Location</small>
          <strong id="place">Not selected yet</strong>
          <small id="location-status" class="location-status" aria-live="polite">Choose a city or find your location</small>
        </div>
        <button id="locate" class="link-btn" type="button">Find me</button>
      </div>
      <form id="city-form">
        <label for="city">Or enter a city</label>
        <div class="city-input">
          <input id="city" name="city" placeholder="e.g. London" autocomplete="address-level2" required minlength="2">
          <button type="submit">Search</button>
        </div>
        <div id="suggestions" class="suggestions" role="listbox" aria-label="City suggestions" hidden></div>
      </form>
    </section>
    <div class="weather-workspace__result">
      <div class="actions">
        <button id="check" class="action" type="button">
          <span class="action-symbol" aria-hidden="true">☔</span>
          <span>Check weather</span>
        </button>
      </div>
      <section id="weather-results" class="weather-results" aria-live="polite">
        <article class="weather-summary neutral" id="summary-card" aria-label="Current rain and the next change">
          <div class="summary-main">
            <div class="summary-phase summary-current">
              <strong class="summary-headline" id="summary-now">—</strong>
              <span class="summary-temperature" id="summary-current-temperature"></span>
            </div>
            <span class="summary-arrow" aria-hidden="true">→</span>
            <div class="summary-phase summary-future">
              <strong class="summary-headline summary-transition" id="summary-next">—</strong>
              <strong class="summary-time" id="summary-time"></strong>
              <span class="summary-day" id="summary-day"></span>
              <span class="summary-temperature" id="summary-transition-temperature"></span>
            </div>
          </div>
          <p class="summary-meta" id="summary-meta">Check weather to see the forecast.</p>
        </article>
      </section>
    </div>
  </div>
  <section class="history" id="recent-checks" aria-label="Recent weather checks" hidden>
    <div class="history-heading"><h2>Recent checks</h2></div>
    <div id="history-list" class="history-list"></div>
  </section>
</div>
</div>
<footer>
  <nav class="footer-nav" aria-label="Information">
    <a href="#/about">About</a>
    <a href="#/terms">T&amp;C</a>
    <a href="#/cookies">Cookies</a>
  </nav>
  <div>Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Location names: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · Local conditions may differ.</div>
  <div class="credits">Created by <a href="https://tonymitsev.com/" target="_blank" rel="noopener noreferrer">tonymitsev.com</a> · AI-assisted development with <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">OpenAI</a></div>
</footer>
</section>`;

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required app element: ${selector}`);
  return element;
}

export function mountAppShell(root: HTMLElement): AppElements {
  root.innerHTML = appTemplate;
  const cityForm = required<HTMLFormElement>(root, '#city-form');
  return {
    routeViewport: required<HTMLDivElement>(root, '#route-viewport'),
    homeScreen: required<HTMLElement>(root, '#home-screen'),
    toast: required<HTMLDivElement>(root, '#toast'),
    analyticsConsent: required<HTMLElement>(root, '#analytics-consent'),
    versionBadge: required<HTMLSpanElement>(root, '#app-version'),
    connectionBanner: required<HTMLDivElement>(root, '#connection-banner'),
    connectionLabel: required<HTMLElement>(root, '#connection-label'),
    connectionDescription: required<HTMLSpanElement>(root, '#connection-description'),
    themeMeta: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]'),
    place: required<HTMLElement>(root, '#place'),
    locationStatus: required<HTMLElement>(root, '#location-status'),
    cityInput: required<HTMLInputElement>(root, '#city'),
    suggestions: required<HTMLDivElement>(root, '#suggestions'),
    locateButton: required<HTMLButtonElement>(root, '#locate'),
    cityForm,
    citySubmitButton: required<HTMLButtonElement>(cityForm, 'button[type="submit"]'),
    checkButton: required<HTMLButtonElement>(root, '#check'),
    summaryCard: required<HTMLElement>(root, '#summary-card'),
    summaryNow: required<HTMLElement>(root, '#summary-now'),
    summaryNext: required<HTMLElement>(root, '#summary-next'),
    summaryTime: required<HTMLElement>(root, '#summary-time'),
    summaryDay: required<HTMLElement>(root, '#summary-day'),
    summaryCurrentTemperature: required<HTMLElement>(root, '#summary-current-temperature'),
    summaryTransitionTemperature: required<HTMLElement>(root, '#summary-transition-temperature'),
    summaryMeta: required<HTMLElement>(root, '#summary-meta'),
    historyPanel: required<HTMLElement>(root, '#recent-checks'),
    historyList: required<HTMLDivElement>(root, '#history-list')
  };
}
