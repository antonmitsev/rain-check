import test from 'node:test';
import assert from 'node:assert/strict';
import { renderHistory } from '../src/ui/history.ts';
import { recordWeatherCheck, getWeatherHistory } from '../src/storage/weather-store.ts';

function storage() {
  const items = new Map();
  return { getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value) };
}

function element() {
  return {
    textContent: '', innerHTML: '', className: '', value: '',
    hidden: false, disabled: false, children: [], listeners: {},
    setAttribute(name, value) { this[name] = value; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren() { this.children = []; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
    classList: { toggle() {} }
  };
}

function setupHistory() {
  const store = storage();
  const now = Date.now() - 30_000;
  const sofia = {latitude:42.6977,longitude:23.3219,name:'Sofia'};
  const plovdiv = {latitude:42.135,longitude:24.75,name:'Plovdiv'};
  const snapshot = raining => ({
    savedAt: now, raining,
    stopForecast: 'Rain was expected to stop at 19:00.',
    nextRainForecast: 'Rain was forecast to start at 20:00.'
  });
  recordWeatherCheck(sofia, snapshot(false), store, now);
  recordWeatherCheck(plovdiv, snapshot(true), store, now + 1);

  globalThis.document = { createElement: element };
  const panel = element();
  const list = element();
  let requests = 0;
  globalThis.fetch = () => { requests++; throw Error('History initiated a request'); };
  let opened = null;
  renderHistory(panel, list, getWeatherHistory(store), {
    open(entry) { opened = entry; },
    remove() {}
  });
  return { panel, list, get opened() { return opened; }, get requests() { return requests; }, store };
}

test('history click only shows stored cards, never requests weather online or offline', () => {
  const history = setupHistory();
  assert.equal(history.panel.hidden, false);
  assert.equal(history.list.children.length, 2);
  history.list.children[0].children[0].listeners.click();
  assert.equal(history.opened.location.name, 'Plovdiv');
  assert.equal(history.opened.snapshot.raining, true);
  assert.equal(history.requests, 0);

  history.list.children[1].children[0].listeners.click();
  assert.equal(history.opened.location.name, 'Sofia');
  assert.equal(history.opened.snapshot.raining, false);
  assert.equal(history.requests, 0);
  assert.deepEqual(getWeatherHistory(history.store).map(entry => entry.location.name), ['Plovdiv', 'Sofia']);
});
