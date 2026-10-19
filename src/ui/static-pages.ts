export type StaticRoute = 'about' | 'terms' | 'cookies';

interface StaticPageContent {
  title: string;
  eyebrow: string;
  body: string;
}

const pages: Record<StaticRoute, StaticPageContent> = {
  about: {
    title: 'About RainCheck',
    eyebrow: 'ABOUT',
    body: `
      <p>RainCheck is a small, installable weather app that answers one question clearly: do you need an umbrella?</p>
      <p>It uses Open-Meteo forecasts, works with saved results offline, and keeps location history only in your browser.</p>
      <p>Forecasts are approximate and local conditions may differ.</p>`
  },
  terms: {
    title: 'Terms & Conditions',
    eyebrow: 'T&C',
    body: `
      <p>RainCheck is provided for general information, without guarantees of accuracy or availability.</p>
      <p>Do not rely on it for safety-critical decisions. Weather data comes from third-party providers and remains subject to their terms.</p>
      <p>Optional Google Analytics is used only if you accept analytics cookies. See <a href="#/cookies">Cookies &amp; Storage</a> for details and controls.</p>
      <p>By using the app, you accept these limitations.</p>`
  },
  cookies: {
    title: 'Cookies & Storage',
    eyebrow: 'COOKIES',
    body: `
      <p>RainCheck does not configure advertising tags or ad-personalisation cookies. With your permission, this app loads Google Analytics 4 (measurement ID G-21R1C34RPH) to measure visits and app usage, sending page-view data to Google. The Google tag is not loaded unless you choose “Accept analytics”; choosing “Reject analytics” blocks further RainCheck analytics events.</p>
      <p>Google Analytics may set first-party cookies including <code>_ga</code> and <code>_ga_21R1C34RPH</code> to distinguish users and maintain session state. Their default expiry is two years, though browser privacy settings may shorten it. See <a href="https://support.google.com/analytics/answer/11397207" target="_blank" rel="noopener noreferrer">Google’s cookie information</a>.</p>
      <p>The analytics choice is shared with tonymitsev.com using a one-year preference cookie. If the shared choice is “rejected”, the Google tag is not loaded on either site. Rejecting also clears the Google Analytics cookies for this domain.</p>
      <p>RainCheck also uses local storage for your selected location, saved forecasts, recent checks and your analytics choice, plus Cache Storage for offline startup. This app-specific data stays in your browser and can be removed by clearing site data. The buttons below appear only when no valid analytics preference cookie is present. Once you choose Accept or Reject, the current choice remains visible and the buttons return when that cookie expires.</p>
      <div class="analytics-preferences" aria-label="Analytics cookie preferences">
        <button type="button" data-analytics-consent="accepted">Accept analytics</button>
        <button type="button" data-analytics-consent="rejected">Reject analytics</button>
        <span class="analytics-consent-status" role="status"></span>
      </div>`
  }
};

export function createStaticPage(route: StaticRoute): HTMLElement {
  const content = pages[route];
  const page = document.createElement('section');
  page.className = 'route-page static-page';
  page.dataset.routePage = route;
  page.innerHTML = `
    <article class="static-page__content">
      <span class="static-page__eyebrow">${content.eyebrow}</span>
      <h1 tabindex="-1">${content.title}</h1>
      ${content.body}
    </article>`;
  return page;
}
