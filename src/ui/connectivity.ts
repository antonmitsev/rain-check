import type { AppElements } from './app-shell';

export interface ConnectionViewState {
  offline: boolean;
  warning: boolean;
  hadWarning: boolean;
}

export function renderConnectionState(
  elements: AppElements,
  originUnavailable: boolean
): ConnectionViewState {
  const offline = !navigator.onLine;
  const warning = offline || originUnavailable;
  const hadWarning = document.body.classList.contains('offline-mode');
  document.body.classList.toggle('offline-mode', warning);
  elements.connectionBanner.hidden = !warning;
  elements.connectionLabel.textContent = offline
    ? 'OFFLINE' : originUnavailable ? 'SERVER UNREACHABLE' : 'ONLINE';
  elements.connectionDescription.textContent = offline
    ? 'Showing saved weather; no live requests'
    : originUnavailable ? 'App is cached; live weather may still work' : 'Live weather available';
  elements.themeMeta?.setAttribute('content', warning ? '#382a22' : '#101c2d');
  return { offline, warning, hadWarning };
}
