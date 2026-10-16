import './style.css';
import { rememberLocation, getLastLocation, saveWeatherSnapshot, getWeatherSnapshot, formatCachedWeather } from './offline-cache.js';

const app = document.querySelector('#app');
const CACHE_TTL = 10 * 60 * 1000;
const STOP_THRESHOLD = 0.1;
let location = null;
let busy = false;
let weatherCache = new Map();
let suggestionTimer;
let suggestionController;
let cityMatches = [];
let activeSuggestion = -1;
let originUnavailable = false;
let originCheckId = 0;
let gpsRequestId = 0;
let citySearchController;
const inflightWeather = new Map();
const reverseCache = new Map();

app.innerHTML = `
<section class="shell">
  <header><div class="brand"><span class="brand-icon" aria-hidden="true">☁</span> RainCheck</div><span class="version" id="app-version" title="Application build">v0.1</span></header>
  <div class="connection-banner" id="connection-banner" role="status" aria-live="polite">
    <span class="connection-dot" aria-hidden="true"></span>
    <strong id="connection-label">ONLINE</strong>
    <span id="connection-description">Live weather available</span>
  </div>
  <div class="hero"><div class="eyebrow">WEATHER IN TWO CLICKS</div><h1>Do I need an <em>umbrella?</em></h1><p>Two questions. Short answers. No sign-up.</p></div>
  <section class="location-panel" aria-label="Location">
    <div class="location-line"><span class="pin">⌖</span><div><small>Location</small><strong id="place">Not selected yet</strong><small id="location-status" class="location-status" aria-live="polite">Choose a city or find your location</small></div><button id="locate" class="link-btn" type="button">Find me</button></div>
    <form id="city-form"><label for="city">Or enter a city</label><div class="city-input"><input id="city" name="city" placeholder="e.g. London" autocomplete="address-level2" required minlength="2"><button type="submit">Search</button></div><div id="suggestions" class="suggestions" role="listbox" aria-label="City suggestions" hidden></div></form>
  </section>
  <div class="actions"><button id="now" class="action" type="button"><span class="action-symbol">☔</span><span>Is it raining?</span><small>Right now</small></button><button id="until" class="action" type="button"><span class="action-symbol">◷</span><span>When will it stop?</span><small>Next few hours</small></button></div>
  <section id="answer" class="answer" aria-live="polite" role="status"><span class="answer-label">ANSWER</span><p>Choose a location and click a button.</p></section>
  <footer>
    <div>Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Location names: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · Local conditions may differ.</div>
    <div class="credits">Created by <a href="https://tonymitsev.com/" target="_blank" rel="noopener noreferrer">tonymitsev.com</a> · AI-assisted development with <a href="https://openai.com/" target="_blank" rel="noopener noreferrer">OpenAI</a></div>
  </footer>
</section>`;

const versionBadge = document.querySelector('#app-version');
const connectionLabel = document.querySelector('#connection-label');
const connectionDescription = document.querySelector('#connection-description');
const themeMeta = document.querySelector('meta[name="theme-color"]');

function showBuildVersion() {
  // This metadata is bundled with the exact JavaScript currently running, even offline.
  const build = __BUILD_INFO__;
  const hash = typeof build.commit === 'string' && /^[a-f0-9]{7,40}$/i.test(build.commit)
    ? build.commit.slice(0, 7)
    : null;
  versionBadge.textContent = `v${build.version}${hash ? ` · ${hash}` : ''}`;
  versionBadge.title = [`Version: ${build.version}`, hash && `Commit: ${build.commit}`, `Built: ${build.builtAt}`]
    .filter(Boolean).join(' | ');
}
showBuildVersion();

const place = document.querySelector('#place');
const status = document.querySelector('#location-status');
const cityInput = document.querySelector('#city');
const suggestions = document.querySelector('#suggestions');
const answer = document.querySelector('#answer');
const locateButton = document.querySelector('#locate');
const cityForm = document.querySelector('#city-form');
const actionButtons = [document.querySelector('#now'), document.querySelector('#until')];

function render(message, category = '') {
  answer.className = `answer ${category}`;
  answer.innerHTML = '<span class="answer-label">ANSWER</span>';
  const p = document.createElement('p');
  p.textContent = message;
  answer.append(p);
}
function setBusy(value) {
  busy = value;
  // Offline actions stay clickable so they can show saved data immediately.
  actionButtons.forEach(button => { button.disabled = value && navigator.onLine; });
  locateButton.disabled = value && navigator.onLine;
  cityForm.querySelector('button').disabled = value && navigator.onLine;
  cityInput.disabled = false;
}

function showSavedWeather(kind = 'now') {
  const saved = location ? getWeatherSnapshot(location) : null;
  render(formatCachedWeather(saved, kind), 'offline');
}

function restoreSavedLocation() {
  const saved = getLastLocation();
  if (!saved) return;
  location = saved;
  place.textContent = saved.name;
  status.textContent = '✓ Saved location';
  cityInput.value = saved.name;
}
function updateConnectionState() {
  const offline = !navigator.onLine;
  const warning = offline || originUnavailable;
  const hadWarning = document.body.classList.contains('offline-mode');
  document.body.classList.toggle('offline-mode', warning);
  connectionLabel.textContent = offline ? 'OFFLINE' : originUnavailable ? 'SERVER UNREACHABLE' : 'ONLINE';
  connectionDescription.textContent = offline
    ? 'Showing saved weather; no live requests'
    : originUnavailable ? 'App is cached; live weather may still work' : 'Live weather available';
  themeMeta?.setAttribute('content', warning ? '#382a22' : '#101c2d');

  if (offline) {
    ++gpsRequestId;
    clearTimeout(suggestionTimer);
    suggestionController?.abort();
    citySearchController?.abort();
    for (const request of inflightWeather.values()) request.controller.abort();
    clearSuggestions();
    setBusy(false);
    showSavedWeather('now');
  } else {
    setBusy(busy);
    if (originUnavailable && !hadWarning && !busy) {
      render('The app server is unreachable. Cached UI is available; live weather may still work.', 'offline');
    } else if (!warning && hadWarning && !busy) {
      render('Connection restored. Choose a question for fresh weather data.', 'success');
    }
  }
}

// A cached PWA can run while its origin server is down, even if navigator.onLine is true.
async function checkAppServer() {
  if (!import.meta.env.PROD || !navigator.onLine) return;
  const checkId = ++originCheckId;
  let unavailable = false;
  try {
    // version.json is explicitly network-only in the service worker.
    await fetch(new URL('./version.json', document.baseURI), { cache: 'no-store' });
  } catch {
    unavailable = true;
  }
  if (checkId !== originCheckId || !navigator.onLine) return;
  originUnavailable = unavailable;
  updateConnectionState();
}
function setLocation(latitude, longitude, name, source = 'city') {
  clearTimeout(suggestionTimer);
  suggestionController?.abort();
  location = {latitude, longitude, name};
  rememberLocation(location);
  place.textContent = name;
  status.textContent = source === 'gps' ? '✓ GPS location confirmed' : '✓ Location selected';
  cityInput.value = source === 'gps' ? '' : name;
  clearSuggestions();
  if (!navigator.onLine) {
    showSavedWeather('now');
  } else {
    render('Location confirmed. Choose a question.', 'success');
    // Prefetch the first forecast silently so it is available for a later offline launch.
    void getWeather(location).catch(() => {});
  }
}
function clearSuggestions() {
  suggestions.replaceChildren();
  suggestions.hidden = true;
  cityMatches = [];
  activeSuggestion = -1;
}
function cityLabel(city) {
  return [city.name, city.admin1, city.country].filter(Boolean).filter((part, i, arr) => arr.indexOf(part) === i).join(', ');
}
function chooseMatch(city) {
  if (!city) return;
  setLocation(city.latitude, city.longitude, cityLabel(city));
}
function showSuggestions(cities) {
  clearSuggestions();
  cityMatches = cities;
  if (!cities.length) {
    const message = document.createElement('div');
    message.className = 'suggestion-empty';
    message.textContent = 'No matching cities';
    suggestions.append(message);
  }
  cities.forEach((city, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'suggestion-item';
    item.setAttribute('role', 'option');
    item.id = `suggestion-${index}`;
    item.textContent = cityLabel(city);
    item.addEventListener('click', () => chooseMatch(city));
    suggestions.append(item);
  });
  suggestions.hidden = false;
}
async function searchCities(query, signal) {
  if (!navigator.onLine) throw new Error('City search is unavailable offline.');
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({name: query, count: '7', language: 'en', format: 'json'}).toString();
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error('City search is unavailable.');
  const data = await response.json();
  return data.results ?? [];
}
function suggestCities() {
  if (!navigator.onLine) { clearSuggestions(); return; }
  clearTimeout(suggestionTimer);
  suggestionController?.abort();
  const query = cityInput.value.trim();
  if (query.length < 3) { clearSuggestions(); return; }
  const controller = new AbortController();
  suggestionController = controller;
  suggestionTimer = setTimeout(async () => {
    try {
      const cities = await searchCities(query, controller.signal);
      if (!controller.signal.aborted && cityInput.value.trim() === query) showSuggestions(cities);
    } catch (error) {
      if (error.name !== 'AbortError') clearSuggestions();
    }
  }, 350);
}
async function reverseGeocode(latitude, longitude) {
  const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
  if (reverseCache.has(key)) return reverseCache.get(key);
  // One lookup per explicit GPS action; never use Nominatim for autocomplete.
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({
    lat: String(latitude), lon: String(longitude),
    format: 'jsonv2', zoom: '10', addressdetails: '1', 'accept-language': 'en'
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error('Reverse geocoding unavailable');
  const data = await response.json();
  const addr = data.address ?? {};
  const name = [addr.city || addr.town || addr.village || addr.municipality || addr.county,
    addr.state, addr.country].filter(Boolean).filter((value, i, arr) => arr.indexOf(value) === i).join(', ');
  if (!name) throw new Error('No place name available');
  reverseCache.set(key, name);
  return name;
}
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser does not support geolocation.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, timeout: 12000, maximumAge: 300000
    });
  });
}
async function locate() {
  if (!navigator.onLine) {
    if (!location) restoreSavedLocation();
    showSavedWeather('now');
    return;
  }
  if (busy) return;
  const requestId = ++gpsRequestId;
  setBusy(true);
  render('Finding your location…', 'loading');
  try {
    const pos = await getCurrentPosition();
    if (!navigator.onLine || requestId !== gpsRequestId) return;
    const { latitude, longitude } = pos.coords;
    let name;
    try {
      name = await reverseGeocode(latitude, longitude);
    } catch {
      name = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
    if (!navigator.onLine || requestId !== gpsRequestId) return;
    setLocation(latitude, longitude, name, 'gps');
  } catch (error) {
    if (!navigator.onLine || requestId !== gpsRequestId) return;
    render(error.code === 1
      ? 'Location access was denied. Enter a city below.'
      : 'Could not determine your location. Enter a city below.', 'error');
  } finally {
    if (requestId === gpsRequestId) setBusy(false);
  }
}
async function chooseCity(event) {
  event.preventDefault();
  if (!navigator.onLine) {
    showSavedWeather('now');
    return;
  }
  if (busy) return;
  const name = cityInput.value.trim();
  if (name.length < 2) return;
  setBusy(true);
  render('Searching for cities…', 'loading');
  clearTimeout(suggestionTimer);
  suggestionController?.abort();
  const controller = new AbortController();
  citySearchController = controller;
  try {
    const cities = await searchCities(name, controller.signal);
    if (!navigator.onLine || controller.signal.aborted) return;
    if (!cities.length) throw new Error('City not found. Try another name.');
    if (cities.length === 1) chooseMatch(cities[0]);
    else {
      showSuggestions(cities);
      render('Select the correct location from the suggestions.');
    }
  } catch (error) {
    if (!navigator.onLine || controller.signal.aborted) return;
    render(error.message || 'City search failed.', 'error');
  } finally {
    if (citySearchController === controller) {
      citySearchController = undefined;
      setBusy(false);
    }
  }
}
cityInput.addEventListener('input', suggestCities);
cityInput.addEventListener('keydown', (event) => {
  if (suggestions.hidden || !cityMatches.length) return;
  if (event.key === 'Escape') { clearSuggestions(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    activeSuggestion = (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + cityMatches.length) % cityMatches.length;
    [...suggestions.querySelectorAll('.suggestion-item')].forEach((item, i) => {
      item.classList.toggle('active', i === activeSuggestion);
      item.setAttribute('aria-selected', String(i === activeSuggestion));
    });
  } else if (event.key === 'Enter' && activeSuggestion >= 0) {
    event.preventDefault();
    chooseMatch(cityMatches[activeSuggestion]);
  }
});
document.addEventListener('click', (event) => {
  if (!cityForm.contains(event.target)) clearSuggestions();
});
async function getWeather(atLocation = location) {
  // Offline mode never starts a fetch, even when a cached in-memory result exists.
  if (!navigator.onLine) throw new Error('Offline');
  const key = `${atLocation.latitude.toFixed(2)}:${atLocation.longitude.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
  const inProgress = inflightWeather.get(key);
  if (inProgress) return inProgress.promise;
  const controller = new AbortController();
  const promise = (async () => {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude: String(atLocation.latitude),
      longitude: String(atLocation.longitude),
      current: 'rain,showers,precipitation',
      hourly: 'precipitation,precipitation_probability',
      forecast_days: '2',
      timezone: 'auto'
    }).toString();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('The weather service is unavailable.');
    const data = await response.json();
    if (controller.signal.aborted || !navigator.onLine) throw new Error('Offline');
    const timestamp = Date.now();
    weatherCache.set(key, { data, time: timestamp });
    if (rainNow(data) !== null) {
      saveWeatherSnapshot(atLocation, {
        savedAt: timestamp,
        raining: rainNow(data),
        stopForecast: rainUntil(data)
      });
    }
    return data;
  })();
  inflightWeather.set(key, { promise, controller });
  try {
    return await promise;
  } finally {
    if (inflightWeather.get(key)?.controller === controller) inflightWeather.delete(key);
  }
}
function rainNow(data) {
  const current = data.current;
  if (!current || !Number.isFinite(current.rain) || !Number.isFinite(current.showers))
    return null;
  return current.rain > 0 || current.showers > 0;
}
function rainUntil(data) {
  const raining = rainNow(data);
  if (raining === null) return 'There is not enough current rainfall data.';
  if (!raining) return 'According to current weather data, it is not raining in this area.';
  const times = data.hourly?.time;
  const amounts = data.hourly?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(amounts)) return 'There is not enough forecast data to estimate when rain will stop.';
  // Open-Meteo hourly timestamps are local to the requested timezone; current.time has the same convention.
  const currentHour = data.current?.time?.slice(0, 13);
  const start = times.findIndex(t => t.slice(0, 13) > currentHour);
  if (start < 0) return 'There is not enough forecast data to estimate when rain will stop.';
  for (let i = start; i < amounts.length - 1; i++) {
    if (Number.isFinite(amounts[i]) && Number.isFinite(amounts[i + 1])
        && amounts[i] < STOP_THRESHOLD && amounts[i + 1] < STOP_THRESHOLD) {
      const hour = times[i].slice(11, 16);
      return `Rain is expected to stop around ${hour} (approximate hourly forecast).`;
    }
  }
  return 'The near-term forecast does not show a clear end to the rain.';
}
async function ask(kind) {
  if (!navigator.onLine) {
    showSavedWeather(kind);
    return;
  }
  if (busy) return;
  if (!location) return render('First select Find me or enter a city.', 'error');
  setBusy(true);
  render('Checking the forecast…', 'loading');
  try {
    const data = await getWeather(location);
    if (!navigator.onLine) {
      showSavedWeather(kind);
      return;
    }
    const raining = rainNow(data);
    const message = kind === 'now'
      ? raining === null ? 'There is not enough current rainfall data.'
        : raining ? 'According to current weather data, it is raining in this area.'
        : 'According to current weather data, it is not raining in this area.'
      : rainUntil(data);
    render(message, 'success');
  } catch (error) {
    if (!navigator.onLine) showSavedWeather(kind);
    else {
      const saved = location && getWeatherSnapshot(location);
      render(saved
        ? `Weather service unavailable. ${formatCachedWeather(saved, kind)}`
        : error.message || 'Could not load the forecast.', saved ? 'offline' : 'error');
    }
  } finally {
    setBusy(false);
  }
}
locateButton.addEventListener('click', locate);
// Start location discovery when the app opens; the manual city search remains available after failure.
cityForm.addEventListener('submit', chooseCity);
actionButtons[0].addEventListener('click', () => ask('now'));
actionButtons[1].addEventListener('click', () => ask('until'));

window.addEventListener('online', () => {
  originUnavailable = false;
  updateConnectionState();
  void checkAppServer();
});
window.addEventListener('offline', () => {
  ++originCheckId;
  originUnavailable = false;
  updateConnectionState();
});
window.addEventListener('focus', () => { void checkAppServer(); });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void checkAppServer();
});
restoreSavedLocation();
updateConnectionState();
void checkAppServer();

if (navigator.onLine) void locate();

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => {
        console.warn('Service worker registration failed:', error);
      });
    });
  } else {
    // Vite dev modules are not an offline build. Remove stale workers on this origin.
    navigator.serviceWorker.getRegistration('./')
      .then(registration => registration?.unregister())
      .catch(error => console.warn('Could not unregister development service worker:', error));
  }
}
