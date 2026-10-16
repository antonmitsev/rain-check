import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberLocation, getLastLocation, saveWeatherSnapshot, getWeatherSnapshot, formatCachedWeather } from '../src/offline-cache.js';

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
  const timestamp = Date.parse('2026-10-16T11:41:00Z');
  saveWeatherSnapshot(sofia, { savedAt: timestamp, raining: true, stopForecast: 'Rain was expected to stop around 17:00.' }, store);
  const snapshot = getWeatherSnapshot({ ...sofia, latitude: 42.6979 }, store);
  assert.equal(snapshot.raining, true);
  assert.match(formatCachedWeather(snapshot, 'now'), /Saved weather from .*Rain was reported/);
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
      savedAt:Date.parse('2026-10-16T11:41:00Z')+i*1000,
      raining:false,stopForecast:'No rain.'
    },store);
  }
  assert.equal(getWeatherSnapshot({latitude:40,longitude:20,name:'Town'},store),null);
  assert.ok(getWeatherSnapshot({latitude:49,longitude:20,name:'Town'},store));
});
