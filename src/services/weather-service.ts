import type { RainCheckLocation, WeatherResponse } from '../types';

interface CachedForecast {
  data: WeatherResponse;
  fetchedAt: number;
}

interface InflightForecast {
  controller: AbortController;
  promise: Promise<CachedForecast>;
}

export class WeatherService {
  private readonly cache = new Map<string, CachedForecast>();
  private readonly inflight = new Map<string, InflightForecast>();

  constructor(private readonly cacheTtlMs: number) {}

  async getForecast(location: RainCheckLocation): Promise<CachedForecast> {
    if (!navigator.onLine) throw new Error('Offline');
    const key = this.locationKey(location);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < this.cacheTtlMs) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing.promise;

    const controller = new AbortController();
    const promise = this.fetchForecast(location, controller.signal);
    this.inflight.set(key, { promise, controller });
    try {
      return await promise;
    } finally {
      if (this.inflight.get(key)?.controller === controller) this.inflight.delete(key);
    }
  }

  abortAll(): void {
    for (const request of this.inflight.values()) request.controller.abort();
  }

  private locationKey(location: RainCheckLocation): string {
    return `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`;
  }

  private async fetchForecast(
    location: RainCheckLocation,
    signal: AbortSignal
  ): Promise<CachedForecast> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: 'rain,showers,precipitation',
      hourly: 'rain,showers,precipitation,precipitation_probability',
      forecast_days: '2',
      timezone: 'auto'
    }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('The weather service is unavailable.');
    const data = await response.json() as WeatherResponse;
    if (signal.aborted || !navigator.onLine) throw new Error('Offline');

    const forecast = { data, fetchedAt: Date.now() };
    this.cache.set(this.locationKey(location), forecast);
    return forecast;
  }
}
