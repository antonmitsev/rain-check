import './styles/main.scss';
import { RainCheckApp } from './app/rain-check-app';
import { registerServiceWorker } from './pwa/register-service-worker';
import { mountAppShell } from './ui/app-shell';
import { showBuildVersion } from './ui/build-version';
import { createToastView } from './ui/toast';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('RainCheck requires an #app root element.');

const elements = mountAppShell(root);
showBuildVersion(elements.versionBadge);

const app = new RainCheckApp(elements, createToastView(elements.toast));
app.start();
registerServiceWorker();
