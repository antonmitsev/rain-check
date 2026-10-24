import type {
  RainCheckLocation,
  StorageLike,
  WeatherHistoryEntry,
  WeatherSnapshot
} from '../types';

const STORAGE_KEY = 'raincheck:offline:v1';
const MAX_SNAPSHOTS = 8;
const MAX_HISTORY = 3;

interface PersistedStore {
  schema: 1;
  lastLocation: unknown;
  snapshots: Record<string, unknown>;
  history: unknown[];
}

interface SnapshotInput {
  savedAt: number;
  raining: boolean | null;
  stopForecast: string;
  nextRainForecast?: string | null;
  observedAt?: string | null;
  currentTemperature?: number | null;
  transitionTemperature?: number | null;
}

function emptyStore(): PersistedStore {
  return { schema: 1, lastLocation: null, snapshots: {}, history: [] };
}

function getStorage(storage?: StorageLike): StorageLike | null {
  try {
    return storage ?? globalThis.localStorage;
  } catch {
    return null;
  }
}

function readStore(storage?: StorageLike): PersistedStore {
  try {
    const parsed: unknown = JSON.parse(getStorage(storage)?.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    const candidate = parsed as Partial<PersistedStore>;
    if (candidate.schema !== 1) return emptyStore();
    return {
      schema: 1,
      lastLocation: candidate.lastLocation ?? null,
      snapshots: candidate.snapshots && typeof candidate.snapshots === 'object'
        ? candidate.snapshots : {},
      history: Array.isArray(candidate.history) ? candidate.history : []
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: PersistedStore, storage?: StorageLike): boolean {
  try {
    const target = getStorage(storage);
    if (!target) return false;
    target.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    // Storage may be denied, full, or unavailable. The app remains usable online.
    return false;
  }
}

function safeLocation(value: unknown): RainCheckLocation | null {
  if (!value || typeof value !== 'object') return null;
  const location = value as Partial<RainCheckLocation>;
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
      || Math.abs(Number(location.latitude)) > 90 || Math.abs(Number(location.longitude)) > 180
      || typeof location.name !== 'string') {
    return null;
  }
  // About 100 m precision is sufficient for forecasts; do not persist full GPS precision.
  return {
    latitude: Number(Number(location.latitude).toFixed(3)),
    longitude: Number(Number(location.longitude).toFixed(3)),
    name: location.name.slice(0, 160)
  };
}

function safeSnapshot(value: unknown): WeatherSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Partial<WeatherSnapshot>;
  if (!Number.isFinite(snapshot.savedAt)
      || Number(snapshot.savedAt) > Date.now() + 60_000
      || (snapshot.raining !== true && snapshot.raining !== false && snapshot.raining !== null)
      || typeof snapshot.stopForecast !== 'string') {
    return null;
  }
  return {
    savedAt: Number(snapshot.savedAt),
    raining: snapshot.raining as boolean | null,
    observedAt: typeof snapshot.observedAt === 'string'
      ? snapshot.observedAt.slice(0, 25) : null,
    stopForecast: snapshot.stopForecast.slice(0, 400),
    nextRainForecast: typeof snapshot.nextRainForecast === 'string'
      ? snapshot.nextRainForecast.slice(0, 400) : null,
    currentTemperature: Number.isFinite(snapshot.currentTemperature)
      ? Number(snapshot.currentTemperature) : null,
    transitionTemperature: Number.isFinite(snapshot.transitionTemperature)
      ? Number(snapshot.transitionTemperature) : null
  };
}

export function locationKey(location: RainCheckLocation): string | null {
  const safe = safeLocation(location);
  return safe ? `${safe.latitude.toFixed(2)}:${safe.longitude.toFixed(2)}` : null;
}

export function rememberLocation(location: RainCheckLocation, storage?: StorageLike): boolean {
  const safe = safeLocation(location);
  if (!safe) return false;
  const store = readStore(storage);
  store.lastLocation = safe;
  return writeStore(store, storage);
}

export function getLastLocation(storage?: StorageLike): RainCheckLocation | null {
  return safeLocation(readStore(storage).lastLocation);
}

export function saveWeatherSnapshot(
  location: RainCheckLocation,
  conditions: SnapshotInput,
  storage?: StorageLike
): boolean {
  const key = locationKey(location);
  const snapshot = safeSnapshot({
    ...conditions,
    nextRainForecast: conditions.nextRainForecast ?? null,
    observedAt: conditions.observedAt ?? null
  });
  if (!key || !snapshot) return false;

  const store = readStore(storage);
  store.snapshots[key] = snapshot;
  const ordered = Object.entries(store.snapshots)
    .map(([snapshotKey, value]) => [snapshotKey, safeSnapshot(value)] as const)
    .filter((entry): entry is readonly [string, WeatherSnapshot] => entry[1] !== null)
    .sort((left, right) => right[1].savedAt - left[1].savedAt)
    .slice(0, MAX_SNAPSHOTS);
  store.snapshots = Object.fromEntries(ordered);
  return writeStore(store, storage);
}

export function getWeatherSnapshot(
  location: RainCheckLocation,
  storage?: StorageLike
): WeatherSnapshot | null {
  const key = locationKey(location);
  return key ? safeSnapshot(readStore(storage).snapshots[key]) : null;
}

export function formatCachedWeather(snapshot: WeatherSnapshot | null, kind: 'now' | 'until'): string {
  if (!snapshot) return 'No saved weather for this location. Connect once to download a forecast.';
  const at = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(snapshot.savedAt));
  if (kind === 'until') {
    return `Saved forecast from ${at}: ${snapshot.stopForecast} This is not a live forecast.`;
  }
  const observedAt = typeof snapshot.observedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(snapshot.observedAt)
    ? ` Weather time: ${snapshot.observedAt.replace('T', ' ')} (location time).`
    : '';
  const condition = snapshot.raining === null
    ? 'Rain conditions were unavailable.'
    : snapshot.raining ? 'Rain was reported in this area.' : 'No rain was reported in this area.';
  const nextRain = snapshot.raining === false && typeof snapshot.nextRainForecast === 'string'
    ? ` ${snapshot.nextRainForecast}`
    : '';
  return `Saved weather from ${at}.${observedAt} ${condition}${nextRain} This is not a live observation or forecast.`;
}

// History stores snapshots as they were at the last explicit Check weather action.
// Neither rendering nor opening a history entry refreshes forecasts or changes its order.
export function getWeatherHistory(storage?: StorageLike): WeatherHistoryEntry[] {
  return readStore(storage).history
    .map(value => {
      if (!value || typeof value !== 'object') return null;
      const entry = value as Partial<WeatherHistoryEntry>;
      const location = safeLocation(entry.location);
      const snapshot = safeSnapshot(entry.snapshot);
      if (!location || !snapshot || !Number.isFinite(entry.checkedAt)
          || Number(entry.checkedAt) > Date.now() + 60_000) {
        return null;
      }
      return { location, checkedAt: Number(entry.checkedAt), snapshot };
    })
    .filter((entry): entry is WeatherHistoryEntry => entry !== null)
    .sort((left, right) => right.checkedAt - left.checkedAt)
    .filter((entry, index, all) => all.findIndex(item =>
      locationKey(item.location) === locationKey(entry.location)) === index)
    .slice(0, MAX_HISTORY);
}

export function recordWeatherCheck(
  location: RainCheckLocation,
  snapshot: WeatherSnapshot,
  storage?: StorageLike,
  checkedAt = Date.now()
): boolean {
  const safe = safeLocation(location);
  const saved = safeSnapshot(snapshot);
  if (!safe || !saved || !Number.isFinite(checkedAt)) return false;
  const key = locationKey(safe);
  const history = getWeatherHistory(storage).filter(entry =>
    locationKey(entry.location) !== key);
  history.unshift({ location: safe, checkedAt, snapshot: saved });
  const store = readStore(storage);
  store.history = history.slice(0, MAX_HISTORY);
  return writeStore(store, storage);
}

/** Remove one recent check without touching snapshots or the saved location. */
export function removeWeatherHistoryItem(
  location: RainCheckLocation,
  storage?: StorageLike
): boolean {
  const key = locationKey(location);
  if (!key) return false;
  const history = getWeatherHistory(storage);
  const kept = history.filter(entry => locationKey(entry.location) !== key);
  if (kept.length === history.length) return false;
  const store = readStore(storage);
  store.history = kept;
  return writeStore(store, storage);
}
