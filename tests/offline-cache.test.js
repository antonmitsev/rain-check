import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberLocation, getLastLocation, saveWeatherSnapshot, getWeatherSnapshot, formatCachedWeather } from '../src/storage/weather-store.ts';

function storage() {
  const entries = new Map();
  return {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value)
  };
}

const sofia = { latitude: 42.69771, longitude: 23.3219, name: 'Sofia, Bulgaria' };

test('saves a location with reduced precision for the next offline start', () => {
  const store = storage();
  assert.equal(rememberLocation(sofia, store), true);
  assert.deepEqual(getLastLocation(store), {
    latitude: 42.698, longitude: 23.322, name: 'Sofia, Bulgaria'
  });
});

test('persists a time-stamped rain report and forecast across app sessions', () => {
  const store = storage();
  const timestamp = Date.now() - 120_000;
  saveWeatherSnapshot(sofia, { savedAt: timestamp, raining: true, observedAt: '2026-10-16T14:30', stopForecast: 'Rain was expected to stop around 17:00.' }, store);
  const snapshot = getWeatherSnapshot({ ...sofia, latitude: 42.6979 }, store);
  assert.equal(snapshot.raining, true);
  assert.match(formatCachedWeather(snapshot, 'now'), /Saved weather from .*Weather time: 2026-10-16 14:30.*Rain was reported/);
  assert.match(formatCachedWeather(snapshot, 'until'), /Saved forecast from .*17:00/);
  assert.match(formatCachedWeather(snapshot, 'until'), /not a live forecast/);
});

test('returns a clear message when no snapshot is available', () => {
  assert.match(formatCachedWeather(null, 'now'), /No saved weather/);
  assert.equal(getWeatherSnapshot(sofia, storage()), null);
});

test('storage failures do not crash the application', () => {
  const denied = {getItem() {throw new Error('denied');},setItem() {throw new Error('denied');}};
  assert.equal(rememberLocation(sofia, denied), false);
  assert.equal(getLastLocation(denied), null);
  assert.equal(getWeatherSnapshot(sofia, denied), null);
});

test('keeps no more than eight recent weather snapshots', () => {
  const store = storage();
  for (let i = 0; i < 10; i++) {
    saveWeatherSnapshot({latitude:40 + i,longitude:20,name:'Town'},{
      savedAt:Date.now()-60_000+i*1000,
      raining:false,stopForecast:'No rain.'
    },store);
  }
  assert.equal(getWeatherSnapshot({latitude:40,longitude:20,name:'Town'},store),null);
  assert.ok(getWeatherSnapshot({latitude:49,longitude:20,name:'Town'},store));
});

test('keeps the upcoming rain estimate in a dry-weather snapshot for offline use', () => {
  const store = storage();
  const time = Date.now() - 30_000;
  saveWeatherSnapshot(sofia, {
    savedAt: time,
    raining: false,
    observedAt: '2026-10-16T14:00',
    stopForecast: 'It was not raining.',
    nextRainForecast: 'Rain was forecast to start around 18:00 today (approximate hourly forecast).'
  }, store);
  const snapshot = getWeatherSnapshot(sofia, store);
  const message = formatCachedWeather(snapshot, 'now');
  assert.match(message, /No rain was reported/);
  assert.match(message, /Rain was forecast to start around 18:00/);
  assert.match(message, /not a live observation or forecast/);
});

test('supports snapshots created before next-rain forecasting was added', () => {
  const store = storage();
  saveWeatherSnapshot(sofia, {
    savedAt: Date.now(), raining: false, stopForecast: 'No rain.'
  }, store);
  const message = formatCachedWeather(getWeatherSnapshot(sofia, store), 'now');
  assert.match(message, /No rain was reported/);
  assert.doesNotMatch(message, /undefined|null/);
});
