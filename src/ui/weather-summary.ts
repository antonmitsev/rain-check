import { forecastTimeParts } from './weather-presentation';

interface SummaryElements {
  card: HTMLElement;
  now: HTMLElement;
  next: HTMLElement;
  time: HTMLElement;
  day: HTMLElement;
  meta: HTMLElement;
}

export interface DisplayWeatherOptions {
  cached?: boolean;
  savedAt?: number | null;
}

export class WeatherSummaryView {
  constructor(private readonly elements: SummaryElements) {}

  clear(): void {
    const { card, now, next, time, day, meta } = this.elements;
    card.className = 'weather-summary neutral';
    now.textContent = '—';
    next.textContent = '—';
    time.textContent = '';
    day.textContent = '';
    meta.textContent = 'Check weather to see the forecast.';
  }

  display(
    raining: boolean | null,
    forecastText: string,
    { cached = false, savedAt = null }: DisplayWeatherOptions = {}
  ): void {
    const { card, now, next, time, day, meta } = this.elements;
    const forecastTime = forecastTimeParts(forecastText);
    const noRainExpected = raining === false && forecastText.includes('No rain is forecast');
    const tone = raining === null ? 'neutral'
      : forecastTime ? (raining ? 'wet-to-dry' : 'dry-to-wet')
        : raining ? 'wet-only' : 'dry-only';

    card.className = `weather-summary ${tone}`;
    now.textContent = raining === true ? 'RAINING' : raining === false ? 'DRY' : 'UNKNOWN';
    next.textContent = forecastTime
      ? (raining ? 'STOPS AT' : 'STARTS AT')
      : noRainExpected ? 'NO RAIN EXPECTED' : 'TIME UNKNOWN';
    time.textContent = forecastTime?.time ?? '';
    day.textContent = forecastTime?.day ?? '';
    const metadata = [cached ? 'CACHED' : null, 'APPROXIMATE']
      .filter((value): value is string => Boolean(value));
    if (Number.isFinite(savedAt)) {
      metadata.push(`Fetched on ${new Date(Number(savedAt)).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })}`);
    }
    meta.textContent = metadata.join(' · ');
  }
}
