export interface RainCheckLocation {
  latitude: number;
  longitude: number;
  name: string;
}

export interface CityMatch {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country?: string;
}

export interface WeatherCurrent {
  time?: string;
  temperature_2m?: number | null;
  rain?: number | null;
  showers?: number | null;
  precipitation?: number | null;
}

export interface WeatherHourly {
  time?: Array<string | null>;
  temperature_2m?: Array<number | null>;
  rain?: Array<number | null>;
  showers?: Array<number | null>;
  precipitation?: Array<number | null>;
  precipitation_probability?: Array<number | null>;
}

export interface WeatherResponse {
  current?: WeatherCurrent;
  hourly?: WeatherHourly;
}

export interface WeatherSnapshot {
  savedAt: number;
  raining: boolean | null;
  stopForecast: string;
  nextRainForecast: string | null;
  observedAt: string | null;
  currentTemperature: number | null;
  transitionTemperature: number | null;
}

export interface WeatherHistoryEntry {
  location: RainCheckLocation;
  checkedAt: number;
  snapshot: WeatherSnapshot;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BuildInfo {
  version: string;
  builtAt: string;
  commit: string | null;
}

export type ToastTone = '' | 'success' | 'loading' | 'offline' | 'error';
