import type { RainCheckLocation, WeatherHistoryEntry } from '../types';
import { compactForecast } from './weather-presentation';

export interface HistoryActions {
  open(entry: WeatherHistoryEntry): void;
  remove(location: RainCheckLocation): void;
}

export function renderHistory(
  panel: HTMLElement,
  list: HTMLDivElement,
  entries: WeatherHistoryEntry[],
  actions: HistoryActions
): void {
  list.replaceChildren();
  panel.hidden = entries.length === 0;

  for (const entry of entries) {
    const row = document.createElement('div');
    row.className = 'history-item';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'history-open';
    openButton.title = 'Show saved weather without downloading a new forecast';

    const heading = document.createElement('span');
    heading.className = 'history-item-heading';
    const name = document.createElement('strong');
    name.className = 'history-location';
    name.textContent = entry.location.name;
    const time = document.createElement('time');
    time.className = 'history-time';
    time.dateTime = new Date(entry.checkedAt).toISOString();
    time.textContent = new Date(entry.checkedAt).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    heading.append(name, time);

    const details = document.createElement('span');
    details.className = 'history-item-details';
    const badge = document.createElement('span');
    badge.className = `history-weather-badge ${entry.snapshot.raining === true
      ? 'wet' : entry.snapshot.raining === false ? 'dry' : 'neutral'}`;
    badge.textContent = entry.snapshot.raining === true
      ? 'RAINING' : entry.snapshot.raining === false ? 'DRY' : 'UNKNOWN';
    const summary = document.createElement('span');
    summary.className = 'history-summary';
    summary.textContent = compactForecast(
      entry.snapshot.raining,
      entry.snapshot.raining === true
        ? entry.snapshot.stopForecast : entry.snapshot.nextRainForecast
    );
    details.append(badge, summary);
    openButton.append(heading, details);
    openButton.addEventListener('click', () => actions.open(entry));

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'history-remove';
    removeButton.textContent = '×';
    removeButton.title = 'Remove this recent check';
    removeButton.setAttribute('aria-label', `Remove ${entry.location.name} from recent checks`);
    removeButton.addEventListener('click', () => actions.remove(entry.location));

    row.append(openButton, removeButton);
    list.append(row);
  }
}
