import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rememberLocation, saveWeatherSnapshot, getWeatherSnapshot,
  recordWeatherCheck, getWeatherHistory
} from '../src/offline-cache.js';

function storage() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value) };
}
const place = (lat, name) => ({latitude:lat, longitude:23.32, name});
const snapshot = (raining, savedAt = Date.now() - 30_000) => ({
  raining, savedAt, observedAt: '2026-10-16T13:00',
  stopForecast: 'Rain is expected to stop around 18:00.',
  nextRainForecast: 'Rain is forecast to start around 20:00 on 16 Oct.'
});

test('only three distinct locations are retained, newest checks first', () => {
  const store = storage();
  const base = Date.now() - 10_000;
  for (let i = 0; i < 4; i++) {
    assert.equal(recordWeatherCheck(place(40 + i, 'Place ' + i),
      snapshot(i % 2 === 0), store, base + i), true);
  }
  const results = getWeatherHistory(store);
  assert.equal(results.length, 3);
  assert.deepEqual(results.map(item => item.location.name), ['Place 3', 'Place 2', 'Place 1']);
});

test('same coordinates keep only their most recent check and move it to the top', () => {
  const store = storage();
  const first = place(42.6977, 'Sofia');
  const nearby = place(42.6979, 'Sofia, Bulgaria');
  const second = place(43.075, 'Plovdiv');
  const now = Date.now() - 10000;
  recordWeatherCheck(first, snapshot(false), store, now);
  recordWeatherCheck(second, snapshot(false), store, now + 1);
  recordWeatherCheck(nearby, snapshot(true), store, now + 2);
  const records = getWeatherHistory(store);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map(item => item.location.name), ['Sofia, Bulgaria', 'Plovdiv']);
  assert.equal(records[0].snapshot.raining, true);
  assert.equal(records[0].checkedAt, now + 2);
});

test('historical check remains unchanged after a silent newer prefetch', () => {
  const store = storage();
  const city = place(42.6977, 'Sofia');
  const old = snapshot(false);
  recordWeatherCheck(city, old, store);
  saveWeatherSnapshot(city, snapshot(true, Date.now() - 1000), store);
  assert.equal(getWeatherSnapshot(city, store).raining, true);
  const history = getWeatherHistory(store);
  assert.equal(history[0].snapshot.raining, false);
  assert.match(history[0].snapshot.nextRainForecast, /20:00/);
});

test('remembering another location does not add a history item or make a weather request', () => {
  const store = storage();
  rememberLocation(place(42.6977, 'Sofia'), store);
  saveWeatherSnapshot(place(42.6977, 'Sofia'), snapshot(false), store);
  assert.equal(getWeatherHistory(store).length, 0);
});

test('history survives re-reading localStorage and tolerates older saved data', () => {
  const store = storage();
  const city = place(42.6977, 'Sofia');
  recordWeatherCheck(city, snapshot(false), store);
  const oldEntry = JSON.parse(store.getItem('raincheck:offline:v1'));
  delete oldEntry.history;
  store.setItem('raincheck:offline:v1', JSON.stringify(oldEntry));
  assert.deepEqual(getWeatherHistory(store), []);
});

test('bad or unavailable storage does not crash history', () => {
  const inaccessible = {getItem(){throw Error('Access denied');},setItem(){throw Error('Access denied');}};
  assert.deepEqual(getWeatherHistory(inaccessible), []);
  assert.equal(recordWeatherCheck(place(42.7,'Sofia'),snapshot(false),inaccessible),false);
  const invalid = storage();
  invalid.setItem('raincheck:offline:v1', '{ not json');
  assert.deepEqual(getWeatherHistory(invalid), []);
});
