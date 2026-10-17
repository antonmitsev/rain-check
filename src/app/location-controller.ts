import { GeocodingService } from '../services/geocoding-service';
import { getCurrentPosition } from '../services/geolocation-service';
import { getLastLocation, rememberLocation } from '../storage/weather-store';
import type { CityMatch, RainCheckLocation } from '../types';
import type { AppElements } from '../ui/app-shell';
import { cityLabel, SuggestionsView } from '../ui/suggestions';
import type { ToastView } from '../ui/toast';
import type { BusyState } from './busy-state';

const SUGGESTION_DELAY_MS = 350;

interface LocationActions {
  onLocationSelected(location: RainCheckLocation): void;
  showSavedWeather(): void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function isPermissionDenied(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error
    && (error as { code?: unknown }).code === 1);
}

export class LocationController {
  private readonly geocoding = new GeocodingService();
  private readonly suggestions: SuggestionsView;
  private currentLocation: RainCheckLocation | null = null;
  private suggestionTimer: number | undefined;
  private suggestionController: AbortController | undefined;
  private citySearchController: AbortController | undefined;
  private gpsRequestId = 0;

  constructor(
    private readonly elements: AppElements,
    private readonly toast: ToastView,
    private readonly busy: BusyState,
    private readonly actions: LocationActions
  ) {
    this.suggestions = new SuggestionsView(elements.suggestions);
  }

  get location(): RainCheckLocation | null {
    return this.currentLocation;
  }

  start(): void {
    this.bindEvents();
    this.restoreSavedLocation();
  }

  autoLocate(): void {
    void this.locate();
  }

  handleOffline(): void {
    this.gpsRequestId += 1;
    window.clearTimeout(this.suggestionTimer);
    this.suggestionController?.abort();
    this.citySearchController?.abort();
    this.suggestions.clear();
    this.busy.set(false);
  }

  openHistoryLocation(location: RainCheckLocation): void {
    this.gpsRequestId += 1;
    window.clearTimeout(this.suggestionTimer);
    this.suggestionController?.abort();
    this.citySearchController?.abort();
    this.suggestions.clear();
    this.busy.set(false);
    this.currentLocation = { ...location };
    rememberLocation(this.currentLocation);
    this.elements.place.textContent = this.currentLocation.name;
    this.elements.locationStatus.textContent = '✓ Saved history entry';
    this.elements.cityInput.value = this.currentLocation.name;
  }

  private bindEvents(): void {
    this.elements.locateButton.addEventListener('click', () => { void this.locate(); });
    this.elements.cityForm.addEventListener('submit', event => { void this.chooseCity(event); });
    this.elements.cityInput.addEventListener('input', () => this.scheduleSuggestions());
    this.elements.cityInput.addEventListener('keydown', event => this.handleSuggestionKey(event));
    document.addEventListener('click', event => {
      if (event.target instanceof Node && !this.elements.cityForm.contains(event.target)) {
        this.suggestions.clear();
      }
    });
  }

  private restoreSavedLocation(): void {
    const saved = getLastLocation();
    if (!saved) return;
    this.currentLocation = saved;
    this.elements.place.textContent = saved.name;
    this.elements.locationStatus.textContent = '✓ Saved location';
    this.elements.cityInput.value = saved.name;
  }

  private selectLocation(
    latitude: number,
    longitude: number,
    name: string,
    source: 'city' | 'gps' = 'city'
  ): void {
    window.clearTimeout(this.suggestionTimer);
    this.suggestionController?.abort();
    this.currentLocation = { latitude, longitude, name };
    rememberLocation(this.currentLocation);
    this.elements.place.textContent = name;
    this.elements.locationStatus.textContent = source === 'gps'
      ? '✓ GPS location confirmed' : '✓ Location selected';
    this.elements.cityInput.value = source === 'gps' ? '' : name;
    this.suggestions.clear();
    this.actions.onLocationSelected(this.currentLocation);
  }

  private chooseMatch(city: CityMatch): void {
    this.selectLocation(city.latitude, city.longitude, cityLabel(city));
  }

  private scheduleSuggestions(): void {
    if (!navigator.onLine) {
      this.suggestions.clear();
      return;
    }
    window.clearTimeout(this.suggestionTimer);
    this.suggestionController?.abort();
    const query = this.elements.cityInput.value.trim();
    if (query.length < 3) {
      this.suggestions.clear();
      return;
    }
    const controller = new AbortController();
    this.suggestionController = controller;
    this.suggestionTimer = window.setTimeout(async () => {
      try {
        const cities = await this.geocoding.searchCities(query, controller.signal);
        if (!controller.signal.aborted && this.elements.cityInput.value.trim() === query) {
          this.suggestions.show(cities, city => this.chooseMatch(city));
        }
      } catch (error) {
        if (!isAbortError(error)) this.suggestions.clear();
      }
    }, SUGGESTION_DELAY_MS);
  }

  private handleSuggestionKey(event: KeyboardEvent): void {
    if (this.suggestions.hidden || !this.suggestions.hasOptions) return;
    if (event.key === 'Escape') {
      this.suggestions.clear();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.suggestions.moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && this.suggestions.chooseActive()) {
      event.preventDefault();
    }
  }

  private async locate(): Promise<void> {
    if (!navigator.onLine) {
      if (!this.currentLocation) this.restoreSavedLocation();
      this.actions.showSavedWeather();
      return;
    }
    if (this.busy.isActive) return;
    const requestId = ++this.gpsRequestId;
    this.busy.set(true);
    this.toast.show('Finding your location…', 'loading');
    try {
      const position = await getCurrentPosition();
      if (!navigator.onLine || requestId !== this.gpsRequestId) return;
      const { latitude, longitude } = position.coords;
      let name: string;
      try {
        name = await this.geocoding.reverseGeocode(latitude, longitude);
      } catch {
        name = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      if (!navigator.onLine || requestId !== this.gpsRequestId) return;
      this.selectLocation(latitude, longitude, name, 'gps');
    } catch (error) {
      if (!navigator.onLine || requestId !== this.gpsRequestId) return;
      this.toast.show(
        isPermissionDenied(error)
          ? 'Location access was denied. Enter a city below.'
          : 'Could not determine your location. Enter a city below.',
        'error'
      );
    } finally {
      if (requestId === this.gpsRequestId) this.busy.set(false);
    }
  }

  private async chooseCity(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!navigator.onLine) {
      this.actions.showSavedWeather();
      return;
    }
    if (this.busy.isActive) return;
    const name = this.elements.cityInput.value.trim();
    if (name.length < 2) return;

    this.busy.set(true);
    this.toast.show('Searching for cities…', 'loading');
    window.clearTimeout(this.suggestionTimer);
    this.suggestionController?.abort();
    const controller = new AbortController();
    this.citySearchController = controller;
    try {
      const cities = await this.geocoding.searchCities(name, controller.signal);
      if (!navigator.onLine || controller.signal.aborted) return;
      if (!cities.length) throw new Error('City not found. Try another name.');
      if (cities.length === 1) {
        this.chooseMatch(cities[0]);
      } else {
        this.suggestions.show(cities, city => this.chooseMatch(city));
        this.toast.show('Select the correct location from the suggestions.');
      }
    } catch (error) {
      if (!navigator.onLine || controller.signal.aborted) return;
      this.toast.show(errorMessage(error, 'City search failed.'), 'error');
    } finally {
      if (this.citySearchController === controller) {
        this.citySearchController = undefined;
        this.busy.set(false);
      }
    }
  }
}
