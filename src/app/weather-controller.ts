import { rainNow, rainStarts, rainUntil, transitionTemperature } from '../domain/weather';
import { WeatherService } from '../services/weather-service';
import {
  getWeatherHistory,
  getWeatherSnapshot,
  recordWeatherCheck,
  removeWeatherHistoryItem,
  saveWeatherSnapshot
} from '../storage/weather-store';
import type { RainCheckLocation, WeatherResponse, WeatherSnapshot } from '../types';
import type { AppElements } from '../ui/app-shell';
import { renderHistory } from '../ui/history';
import type { ToastView } from '../ui/toast';
import { WeatherSummaryView } from '../ui/weather-summary';
import type { BusyState } from './busy-state';

const CACHE_TTL_MS = 10 * 60 * 1_000;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export class WeatherController {
  private readonly service = new WeatherService(CACHE_TTL_MS);
  private readonly summary: WeatherSummaryView;
  private viewToken = 0;

  constructor(
    private readonly elements: AppElements,
    private readonly toast: ToastView,
    private readonly busy: BusyState,
    private readonly getLocation: () => RainCheckLocation | null,
    private readonly openHistoryLocation: (location: RainCheckLocation) => void
  ) {
    this.summary = new WeatherSummaryView({
      card: elements.summaryCard,
      now: elements.summaryNow,
      next: elements.summaryNext,
      time: elements.summaryTime,
      day: elements.summaryDay,
      currentTemperature: elements.summaryCurrentTemperature,
      transitionTemperature: elements.summaryTransitionTemperature,
      meta: elements.summaryMeta
    });
  }

  start(): void {
    this.elements.checkButton.addEventListener('click', () => { void this.checkWeather(); });
    this.refreshHistory();
  }

  locationSelected(location: RainCheckLocation): void {
    this.viewToken += 1;
    this.summary.clear();
    if (!navigator.onLine) {
      this.showSavedWeather();
      return;
    }
    this.toast.show(
      'Location confirmed. Press Check weather for the latest forecast.',
      'success'
    );
    // Prefetch silently for a later offline launch; this is not a history entry.
    void this.getAndSaveForecast(location).catch(() => {});
  }

  handleOffline(): void {
    this.viewToken += 1;
    this.service.abortAll();
    this.busy.set(false);
    this.showSavedWeather();
  }

  showSavedWeather(recordCheck = false): void {
    const location = this.getLocation();
    const saved = location ? getWeatherSnapshot(location) : null;
    if (!saved) {
      this.toast.show(
        'No saved weather for this location. Connect once to download a forecast.',
        'offline'
      );
      return;
    }
    this.displaySavedSnapshot(saved);
    if (recordCheck && location) {
      recordWeatherCheck(location, saved);
      this.refreshHistory();
    }
  }

  private displaySavedSnapshot(snapshot: WeatherSnapshot): void {
    const forecastText = snapshot.raining === true ? snapshot.stopForecast
      : snapshot.raining === false
        ? (snapshot.nextRainForecast || 'No saved start-time forecast is available.')
        : 'No reliable forecast is available.';
    this.summary.display(snapshot.raining, forecastText, {
      cached: true,
      savedAt: snapshot.savedAt,
      currentTemperature: snapshot.currentTemperature,
      transitionTemperature: snapshot.transitionTemperature
    });
    this.toast.show('Showing saved weather.', 'offline');
  }

  private openHistoryEntry(entry: ReturnType<typeof getWeatherHistory>[number]): void {
    // Viewing history is local-only, even when the device is online.
    this.viewToken += 1;
    this.busy.set(false);
    this.openHistoryLocation(entry.location);
    this.displaySavedSnapshot(entry.snapshot);
  }

  private refreshHistory(): void {
    renderHistory(
      this.elements.historyPanel,
      this.elements.historyList,
      getWeatherHistory(),
      {
        open: entry => this.openHistoryEntry(entry),
        remove: location => {
          if (removeWeatherHistoryItem(location)) {
            this.refreshHistory();
            this.toast.show('Removed from recent checks.', 'success');
          } else {
            this.toast.show('Could not remove this recent check.', 'error');
          }
        }
      }
    );
  }

  private async getAndSaveForecast(location: RainCheckLocation): Promise<WeatherResponse> {
    const forecast = await this.service.getForecast(location);
    const raining = rainNow(forecast.data);
    saveWeatherSnapshot(location, {
      savedAt: forecast.fetchedAt,
      raining,
      observedAt: forecast.data.current?.time,
      stopForecast: rainUntil(forecast.data),
      nextRainForecast: raining === false
        ? rainStarts(forecast.data, { absoluteDate: true }) : null,
      currentTemperature: Number.isFinite(forecast.data.current?.temperature_2m)
        ? Number(forecast.data.current?.temperature_2m) : null,
      transitionTemperature: transitionTemperature(forecast.data, raining)
    });
    return forecast.data;
  }

  private async checkWeather(): Promise<void> {
    if (!navigator.onLine) {
      this.showSavedWeather(true);
      return;
    }
    if (this.busy.isActive) return;
    const location = this.getLocation();
    if (!location) {
      this.toast.show('First select Find me or enter a city.', 'error');
      return;
    }

    const selected = { ...location };
    const requestView = ++this.viewToken;
    this.busy.set(true);
    this.toast.show('Checking the forecast…', 'loading');
    try {
      const data = await this.getAndSaveForecast(selected);
      if (requestView !== this.viewToken) return;
      if (!navigator.onLine) {
        this.showSavedWeather(true);
        return;
      }
      const raining = rainNow(data);
      const saved = getWeatherSnapshot(selected);
      this.summary.display(
        raining,
        raining === true ? rainUntil(data)
          : raining === false ? rainStarts(data) : 'Current conditions are uncertain.',
        { savedAt: saved?.savedAt ?? null,
          currentTemperature: saved?.currentTemperature,
          transitionTemperature: saved?.transitionTemperature }
      );
      this.toast.show('Weather updated.', 'success');

      if (saved) {
        recordWeatherCheck(selected, saved);
        this.refreshHistory();
      }
    } catch (error) {
      if (requestView !== this.viewToken) return;
      if (!navigator.onLine) {
        this.showSavedWeather(true);
      } else {
        const saved = getWeatherSnapshot(selected);
        if (saved) {
          this.displaySavedSnapshot(saved);
          recordWeatherCheck(selected, saved);
          this.refreshHistory();
        } else {
          this.toast.show(errorMessage(error, 'Could not load the forecast.'), 'error');
        }
      }
    } finally {
      if (requestView === this.viewToken) this.busy.set(false);
    }
  }
}
