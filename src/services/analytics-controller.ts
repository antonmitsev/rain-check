type AnalyticsConsent = 'accepted' | 'rejected';

const consentKey = 'raincheck:analytics-consent:v1';
const sharedConsentCookie = 'tm_analytics_consent';
const measurementId = 'G-21R1C34RPH';

declare global {
  interface Window {
    dataLayer?: ArrayLike<unknown>[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readCookieConsent(): AnalyticsConsent | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${sharedConsentCookie}=(accepted|rejected)(?:;|$)`));
  return match?.[1] === 'accepted' || match?.[1] === 'rejected' ? match[1] : null;
}

function writeCookieConsent(consent: AnalyticsConsent): void {
  const sharedDomain = window.location.hostname === 'tonymitsev.com'
    || window.location.hostname.endsWith('.tonymitsev.com');
  const domain = sharedDomain ? '; Domain=tonymitsev.com' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${sharedConsentCookie}=${consent}; Max-Age=31536000; Path=/${domain}; SameSite=Lax${secure}`;
}

function clearAnalyticsCookies(): void {
  const sharedDomain = window.location.hostname === 'tonymitsev.com'
    || window.location.hostname.endsWith('.tonymitsev.com');
  const domains = sharedDomain ? ['; Domain=tonymitsev.com', ''] : [''];
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  for (const name of ['_ga', '_ga_21R1C34RPH']) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax${secure}`;
    }
  }
}

function readConsent(): AnalyticsConsent | null {
  const shared = readCookieConsent();
  // A localStorage compatibility copy must never revive an expired cookie.
  if (!shared) {
    clearAnalyticsCookies();
    try { window.localStorage.removeItem(consentKey); } catch { /* Storage can be unavailable. */ }
  } else if (shared === 'rejected') {
    clearAnalyticsCookies();
  }
  return shared;
}

function pagePath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export class AnalyticsController {
  private consent: AnalyticsConsent | null = readConsent();
  private loaded = false;
  private currentPage = { title: document.title, path: pagePath() };

  constructor(private readonly banner: HTMLElement) {
    document.addEventListener('click', event => this.handleConsentClick(event));
    window.addEventListener('focus', () => this.syncSharedConsent());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.syncSharedConsent();
    });
    this.banner.hidden = this.consent !== null;
    this.updateConsentLabels();
    if (this.consent === 'accepted') this.enableAnalytics(false);
  }

  pageChanged(title: string): void {
    this.currentPage = { title, path: pagePath() };
    this.syncSharedConsent();
    if (this.consent === 'accepted' && this.loaded) this.trackPageView();
  }

  private syncSharedConsent(): void {
    const shared = readCookieConsent();
    if (shared === this.consent) {
      this.updateConsentLabels();
      return;
    }

    this.consent = shared;
    this.banner.hidden = shared !== null;
    try {
      if (shared) window.localStorage.setItem(consentKey, shared);
      else window.localStorage.removeItem(consentKey);
    } catch {
      // A stored compatibility copy must never override the cookie's lifetime.
    }
    this.updateConsentLabels();
    if (shared === 'accepted') {
      this.enableAnalytics();
    } else {
      clearAnalyticsCookies();
      if (this.loaded) {
        window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
        window.location.reload();
      }
    }
  }

  private handleConsentClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('[data-analytics-consent]');
    if (!button) return;

    const choice = button.dataset.analyticsConsent;
    if (choice !== 'accepted' && choice !== 'rejected') return;
    this.consent = choice;
    this.banner.hidden = true;
    writeCookieConsent(choice);
    if (choice === 'rejected') clearAnalyticsCookies();
    try {
      window.localStorage.setItem(consentKey, choice);
    } catch {
      // The choice still applies for this page view if storage is unavailable.
    }

    // Honor the actual cookie write; do not treat session/localStorage alone as
    // a valid consent after cookies are blocked or the shared cookie expires.
    this.consent = readCookieConsent();
    this.banner.hidden = this.consent !== null;
    this.updateConsentLabels();
    if (this.consent === 'accepted') {
      this.enableAnalytics();
    } else if (this.loaded) {
      window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
      window.location.reload();
    }
  }

  private updateConsentLabels(): void {
    const label = this.consent ? `Current choice: ${this.consent}.` : 'No analytics choice saved yet.';
    document.querySelectorAll<HTMLElement>('.analytics-consent-status').forEach(status => {
      status.textContent = label;
    });
    // Hide both preference actions while the consent cookie is still valid.
    document.querySelectorAll<HTMLButtonElement>('.analytics-preferences [data-analytics-consent]').forEach(button => {
      button.hidden = this.consent !== null;
    });
  }

  private enableAnalytics(trackCurrentPage = true): void {
    if (!import.meta.env.PROD || this.loaded) return;

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function (): void { window.dataLayer?.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.append(script);
    this.loaded = true;
    if (trackCurrentPage) this.trackPageView();
  }

  private trackPageView(): void {
    window.gtag?.('event', 'page_view', {
      page_title: this.currentPage.title,
      page_location: window.location.href,
      page_path: this.currentPage.path
    });
  }
}
