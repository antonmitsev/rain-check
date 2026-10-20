import './styles/main.scss';
import { RainCheckApp } from './app/rain-check-app';
import { registerServiceWorker } from './pwa/register-service-worker';
import { mountAppShell } from './ui/app-shell';
import { showBuildVersion } from './ui/build-version';
import { AppRouter } from './ui/router';
import { createToastView } from './ui/toast';
import { AnalyticsController } from './services/analytics-controller';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('RainCheck requires an #app root element.');

const elements = mountAppShell(root);
showBuildVersion(elements.versionBadge);
const analytics = new AnalyticsController(elements.analyticsConsent);

const app = new RainCheckApp(elements, createToastView(elements.toast));
let appStarted = false;
const router = new AppRouter(elements.routeViewport, elements.homeScreen, () => {
  if (appStarted) return;
  appStarted = true;
  app.start();
}, () => analytics.pageChanged(document.title));
router.start();
registerServiceWorker();
