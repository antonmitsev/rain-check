const STORAGE_KEY = 'raincheck:offline:v1';
const MAX_SNAPSHOTS = 8;
const MAX_HISTORY = 3;

function getStorage(storage) {
  try { return storage ?? globalThis.localStorage; } catch { return null; }
}

function readStore(storage) {
  try {
    const parsed = JSON.parse(getStorage(storage)?.getItem(STORAGE_KEY) || 'null');
    return parsed && parsed.schema === 1 && typeof parsed === 'object'
      ? { schema: 1, lastLocation: parsed.lastLocation ?? null, snapshots: parsed.snapshots ?? {},
        history: Array.isArray(parsed.history) ? parsed.history : [] }
      : { schema: 1, lastLocation: null, snapshots: {}, history: [] };
  } catch {
    return { schema: 1, lastLocation: null, snapshots: {} };
  }
}

function writeStore(store, storage) {
  try {
    getStorage(storage)?.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    // Storage may be denied, full, or unavailable. The app remains usable online.
    return false;
  }
}

function safeLocation(location) {
  if (!Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)
      || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180
      || typeof location.name !== 'string') return null;
  // Do not persist full GPS precision. About 100 m precision is sufficient for forecasts.
  return {
    latitude: Number(location.latitude.toFixed(3)),
    longitude: Number(location.longitude.toFixed(3)),
    name: location.name.slice(0, 160)
  };
}

export function locationKey(location) {
  const safe = safeLocation(location);
  return safe ? `${safe.latitude.toFixed(2)}:${safe.longitude.toFixed(2)}` : null;
}

export function rememberLocation(location, storage) {
  const safe = safeLocation(location);
  if (!safe) return false;
  const store = readStore(storage);
  store.lastLocation = safe;
  return writeStore(store, storage);
}

export function getLastLocation(storage) {
  return safeLocation(readStore(storage).lastLocation);
}

export function saveWeatherSnapshot(location, conditions, storage) {
  const key = locationKey(location);
  if (!key || typeof conditions !== 'object' || !conditions
      || !Number.isFinite(conditions.savedAt)
      || ![true, false, null].includes(conditions.raining)
      || typeof conditions.stopForecast !== 'string') return false;
  const store = readStore(storage);
  store.snapshots[key] = {
    savedAt: conditions.savedAt,
    raining: conditions.raining,
    stopForecast: conditions.stopForecast.slice(0, 400),
    nextRainForecast: typeof conditions.nextRainForecast === 'string'
      ? conditions.nextRainForecast.slice(0, 400)
      : null,
    observedAt: typeof conditions.observedAt === 'string' ? conditions.observedAt.slice(0, 25) : null
  };
  const ordered = Object.entries(store.snapshots)
    .filter(([, record]) => Number.isFinite(record?.savedAt))
    .sort((a, b) => b[1].savedAt - a[1].savedAt)
    .slice(0, MAX_SNAPSHOTS);
  store.snapshots = Object.fromEntries(ordered);
  return writeStore(store, storage);
}

export function getWeatherSnapshot(location, storage) {
  const key = locationKey(location);
  const entry = key && readStore(storage).snapshots[key];
  if (!entry || !Number.isFinite(entry.savedAt)
      || entry.savedAt > Date.now() + 60_000
      || ![true, false, null].includes(entry.raining)
      || typeof entry.stopForecast !== 'string') return null;
  return entry;
}

export function formatCachedWeather(snapshot, kind) {
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

function safeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object'
      || !Number.isFinite(snapshot.savedAt)
      || snapshot.savedAt > Date.now() + 60_000
      || ![true, false, null].includes(snapshot.raining)
      || typeof snapshot.stopForecast !== 'string') return null;
  return {
    savedAt: snapshot.savedAt,
    raining: snapshot.raining,
    observedAt: typeof snapshot.observedAt === 'string' ? snapshot.observedAt.slice(0, 25) : null,
    stopForecast: snapshot.stopForecast.slice(0, 400),
    nextRainForecast: typeof snapshot.nextRainForecast === 'string'
      ? snapshot.nextRainForecast.slice(0, 400) : null
  };
}

// History stores snapshots as they were at the last explicit Check weather action.
// Neither rendering nor opening a history entry refreshes forecasts or changes its order.
export function getWeatherHistory(storage) {
  const entries = readStore(storage).history;
  return entries
    .map(entry => {
      const location = safeLocation(entry?.location);
      const snapshot = safeSnapshot(entry?.snapshot);
      if (!location || !snapshot || !Number.isFinite(entry?.checkedAt)
          || entry.checkedAt > Date.now() + 60_000) return null;
      return { location, checkedAt: entry.checkedAt, snapshot };
    })
    .filter(Boolean)
    .sort((a, b) => b.checkedAt - a.checkedAt)
    .filter((entry, index, all) => all.findIndex(item =>
      locationKey(item.location) === locationKey(entry.location)) === index)
    .slice(0, MAX_HISTORY);
}

export function recordWeatherCheck(location, snapshot, storage, checkedAt = Date.now()) {
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
