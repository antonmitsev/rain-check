import test from 'node:test';
import assert from 'node:assert/strict';
import { rainNow, rainStarts, rainUntil, describeRainNow } from '../src/weather.js';

const current = { time: '2026-10-16T13:45', rain: 0, showers: 0 };
function forecast({ currentValues = {}, times = [
  '2026-10-16T12:00', '2026-10-16T13:00', '2026-10-16T14:00',
  '2026-10-16T15:00', '2026-10-16T16:00'
], rain = [0, 0, 0, 0, 0], showers = [0, 0, 0, 0, 0] } = {}) {
  return { current: { ...current, ...currentValues }, hourly: { time: times, rain, showers } };
}

test('currently raining: do not suggest the next onset', () => {
  const data = forecast({ currentValues: { rain: 0.5 }, rain: [0, 0, 0, 0.4, 0] });
  assert.equal(rainNow(data), true);
  assert.equal(describeRainNow(data), 'According to current weather data, it is raining in this area.');
});

test('currently dry: describe the first upcoming rainy hour', () => {
  const data = forecast({ rain: [0.7, 0.3, 0, 0, 0.15] });
  assert.match(describeRainNow(data), /not raining.*Rain is forecast to start around 16:00 today/);
});

test('showers count as rain in the hourly onset estimate', () => {
  const data = forecast({ showers: [0, 0, 0, 0.2, 0] });
  assert.match(rainStarts(data), /15:00 today/);
});

test('small trace below 0.1 mm does not trigger the onset estimate', () => {
  const data = forecast({ rain: [0, 0, 0.09, 0.1, 0] });
  assert.match(rainStarts(data), /15:00 today/);
});

test('the next calendar day is shown as tomorrow', () => {
  const data = forecast({
    currentValues: { time: '2026-10-16T23:15' },
    times: ['2026-10-16T23:00', '2026-10-17T00:00', '2026-10-17T02:00'],
    rain: [0, 0, 0.6], showers: [0, 0, 0]
  });
  assert.match(rainStarts(data), /02:00 tomorrow/);
});

test('saved offline predictions have absolute dates, even when the forecast is for today', () => {
  const data = forecast({ rain: [0, 0, 0, 0, 0.5] });
  assert.match(rainStarts(data, { absoluteDate: true }), /16:00 on 16 Oct/);
  assert.doesNotMatch(rainStarts(data, { absoluteDate: true }), /today|tomorrow/);
});

test('later dates are labeled explicitly', () => {
  const data = forecast({
    currentValues: { time: '2026-10-16T23:15' },
    times: ['2026-10-17T00:00', '2026-10-18T05:00'],
    rain: [0, 0.2], showers: [0, 0]
  });
  assert.match(rainStarts(data), /05:00 on 18 Oct/);
});

test('dry outlook: state no rain expected in the available forecast', () => {
  assert.match(describeRainNow(forecast()), /No rain is forecast within the available hourly forecast period/);
});

test('missing hourly forecast: do not invent a start time', () => {
  assert.match(describeRainNow({ current }), /hourly forecast cannot estimate/);
  assert.match(rainStarts(forecast({ rain: [null, null, null, null, null], showers: [null, null, null, null, null] })),
    /cannot estimate/);
});

test('unknown current conditions: avoid misleading dry/rain labels', () => {
  assert.match(describeRainNow({ current: {time: current.time}, hourly: {} }), /not enough current rainfall data/);
});

test('stop-time forecast still works for rainy conditions', () => {
  const data = forecast({
    currentValues: { rain: 1 },
    rain: [0.2, 0.2, 1, 0, 0], showers: [0, 0, 0, 0, 0]
  });
  assert.match(rainUntil(data), /stop around 15:00/);
});
