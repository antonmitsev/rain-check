import { createStaticPage, type StaticRoute } from './static-pages';

type AppRoute = 'home' | StaticRoute;
type Direction = 'left' | 'right';

const routeTitles: Record<AppRoute, string> = {
  home: 'RainCheck — Is it raining?',
  about: 'About — RainCheck',
  terms: 'Terms & Conditions — RainCheck',
  cookies: 'Cookies & Storage — RainCheck'
};

function routeFromHash(): AppRoute {
  const route = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
  return route === 'about' || route === 'terms' || route === 'cookies' ? route : 'home';
}

function waitForAnimation(element: HTMLElement): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    let timeout = 0;
    const finish = (): void => {
      window.clearTimeout(timeout);
      element.removeEventListener('animationend', handleAnimationEnd);
      resolve();
    };
    const handleAnimationEnd = (event: AnimationEvent): void => {
      if (event.target !== element) return;
      finish();
    };
    timeout = window.setTimeout(finish, 320);
    element.addEventListener('animationend', handleAnimationEnd);
  });
}

export class AppRouter {
  private currentRoute: AppRoute = 'home';
  private currentPage: HTMLElement;
  private transitioning = false;
  private queuedRoute: AppRoute | null = null;

  constructor(
    private readonly viewport: HTMLElement,
    private readonly homePage: HTMLElement,
    private readonly onHomeActivated: () => void,
    private readonly onRouteChanged: () => void = () => undefined
  ) {
    this.currentPage = homePage;
  }

  start(): void {
    window.addEventListener('hashchange', () => { void this.showRoute(routeFromHash()); });
    const initialRoute = routeFromHash();
    if (initialRoute === 'home') {
      this.activateHome(false);
      this.onRouteChanged();
      return;
    }

    this.homePage.hidden = true;
    this.homePage.inert = true;
    this.currentRoute = initialRoute;
    this.currentPage = createStaticPage(initialRoute);
    this.viewport.append(this.currentPage);
    this.finishActivation(this.currentPage, initialRoute, false);
    this.onRouteChanged();
  }

  private activateHome(focusHeading: boolean): void {
    this.homePage.hidden = false;
    this.homePage.inert = false;
    this.finishActivation(this.homePage, 'home', focusHeading);
    this.onHomeActivated();
  }

  private async showRoute(nextRoute: AppRoute): Promise<void> {
    if (nextRoute === this.currentRoute) return;
    if (this.transitioning) {
      this.queuedRoute = nextRoute;
      return;
    }
    this.transitioning = true;
    const outgoing = this.currentPage;
    const direction: Direction = nextRoute === 'home' ? 'right' : 'left';
    const incoming = nextRoute === 'home' ? this.homePage : createStaticPage(nextRoute);

    incoming.hidden = false;
    incoming.inert = false;
    if (incoming !== this.homePage) this.viewport.append(incoming);
    outgoing.inert = true;
    outgoing.setAttribute('aria-hidden', 'true');
    outgoing.classList.add(`route-page--exit-${direction}`);
    incoming.classList.add(`route-page--enter-${direction}`);

    this.currentRoute = nextRoute;
    this.currentPage = incoming;
    this.finishActivation(incoming, nextRoute, true);
    this.onRouteChanged();
    if (nextRoute === 'home') this.onHomeActivated();

    await Promise.all([waitForAnimation(outgoing), waitForAnimation(incoming)]);
    outgoing.classList.remove(`route-page--exit-${direction}`);
    incoming.classList.remove(`route-page--enter-${direction}`);
    if (outgoing === this.homePage) {
      outgoing.hidden = true;
    } else {
      outgoing.remove();
    }
    this.transitioning = false;

    const queuedRoute = this.queuedRoute;
    this.queuedRoute = null;
    if (queuedRoute && queuedRoute !== this.currentRoute) await this.showRoute(queuedRoute);
  }

  private finishActivation(page: HTMLElement, route: AppRoute, focusHeading: boolean): void {
    document.title = routeTitles[route];
    page.setAttribute('aria-hidden', 'false');
    if (focusHeading) page.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
