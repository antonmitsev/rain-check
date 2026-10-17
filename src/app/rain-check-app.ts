import type { AppElements } from '../ui/app-shell';
import type { ToastView } from '../ui/toast';
import { BusyState } from './busy-state';
import { ConnectivityController } from './connectivity-controller';
import { LocationController } from './location-controller';
import { WeatherController } from './weather-controller';

export class RainCheckApp {
  private readonly location: LocationController;
  private readonly weather: WeatherController;
  private readonly connectivity: ConnectivityController;

  constructor(elements: AppElements, toast: ToastView) {
    const busy = new BusyState(elements);
    let locationController: LocationController;

    this.weather = new WeatherController(
      elements,
      toast,
      busy,
      () => locationController.location,
      selected => locationController.openHistoryLocation(selected)
    );
    locationController = new LocationController(elements, toast, busy, {
      onLocationSelected: selected => this.weather.locationSelected(selected),
      showSavedWeather: () => this.weather.showSavedWeather()
    });
    this.location = locationController;
    this.connectivity = new ConnectivityController(elements, toast, busy, () => {
      this.location.handleOffline();
      this.weather.handleOffline();
    });
  }

  start(): void {
    this.location.start();
    this.weather.start();
    this.connectivity.start();
    if (navigator.onLine) this.location.autoLocate();
  }
}
