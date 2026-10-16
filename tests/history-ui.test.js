import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { recordWeatherCheck, getWeatherHistory, rememberLocation } from '../src/offline-cache.js';
import { rainNow, rainStarts, describeRainNow, rainUntil } from '../src/weather.js';

const appSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '')
  .replaceAll('import.meta.env.PROD', 'false');

function storage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value) };
}

function element() {
  return {
    textContent: '', innerHTML: '', className: '', value: '',
    hidden: false, disabled: false, children: [], listeners: {},
    setAttribute() {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren() { this.children = []; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    querySelector() { return element(); },
    querySelectorAll() { return []; }
  };
}

function setupApp() {
  const store = storage();
  const now = Date.now() - 30_000;
  const sofia = {latitude:42.6977,longitude:23.3219,name:'Sofia'};
  const plovdiv = {latitude:42.135,longitude:24.75,name:'Plovdiv'};
  const snapshot = raining => ({
    savedAt: now, raining,
    stopForecast: 'Rain was expected to stop at 19:00.',
    nextRainForecast: 'Rain was forecast to start at 20:00.'
  });
  rememberLocation(sofia, store);
  recordWeatherCheck(sofia, snapshot(false), store, now);
  recordWeatherCheck(plovdiv, snapshot(true), store, now + 1);

  const elements = new Map();
  const select = selector => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  };
  const classes = new Set();
  const document = {
    querySelector: select,
    createElement: element,
    addEventListener() {},
    body: { classList: {
      contains: name => classes.has(name),
      toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
    } }
  };
  const navigator = {onLine:false};
  let requests = 0;
  const fetch = () => { requests++; throw Error('History initiated a request'); };
  const bind = {
    rememberLocation: loc => rememberLocation(loc, store),
    getLastLocation: () => sofia,
    saveWeatherSnapshot: () => {},
    getWeatherSnapshot: () => null,
    getWeatherHistory: () => getWeatherHistory(store),
    recordWeatherCheck: (loc, snap) => recordWeatherCheck(loc, snap, store)
  };
  const sandbox = {
    document, navigator, window:{addEventListener(){}},
    // The UI toast auto-dismisses in browsers; timers are inert in this non-visual unit fixture.
    setTimeout: () => 0, clearTimeout: () => {},
    fetch, __BUILD_INFO__:{version:'0.1.0',commit:null,builtAt:new Date().toISOString()},
    clearTimeout, setTimeout,
    ...bind, rainNow, rainStarts, describeRainNow, rainUntil
  };
  runInNewContext(appSource, sandbox);
  return {select, navigator, get requests(){return requests;}, store};
}

test('history click only shows stored cards, never requests weather online or offline', () => {
  const app = setupApp();
  const history = app.select('#history-list');
  assert.equal(history.children.length, 2);
  history.children[0].listeners.click();
  assert.equal(app.select('#place').textContent, 'Plovdiv');
  assert.equal(app.select('#summary-now').textContent, 'ВАЛИ');
  assert.equal(app.requests, 0);

  app.navigator.onLine = true;
  history.children[1].listeners.click();
  assert.equal(app.select('#place').textContent, 'Sofia');
  assert.equal(app.select('#summary-now').textContent, 'СУХО');
  assert.equal(app.requests, 0);
  assert.deepEqual(getWeatherHistory(app.store).map(e => e.location.name), ['Plovdiv','Sofia']);
});
