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
      <p>By using the app, you accept these limitations.</p>`
  },
  cookies: {
    title: 'Cookies & Storage',
    eyebrow: 'COOKIES',
    body: `
      <p>RainCheck does not use advertising or analytics cookies.</p>
      <p>It uses browser local storage for your selected location, saved forecasts and recent checks, plus Cache Storage for offline startup.</p>
      <p>You can remove this data at any time by clearing RainCheck site data in your browser.</p>`
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
