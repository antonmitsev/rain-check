import './style.css';
import { rainNow, rainStarts, describeRainNow, rainUntil } from './weather.js';
import { rememberLocation, getLastLocation, saveWeatherSnapshot, getWeatherSnapshot, formatCachedWeather } from './offline-cache.js';

const app = document.querySelector('#app');
const CACHE_TTL = 10 * 60 * 1000;
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
  <div class="hero"><div class="eyebrow">RAIN AT A GLANCE</div><h1>Do I need an <em>umbrella?</em></h1><p>Two questions. Short answers. No sign-up.</p></div>
  <section class="location-panel" aria-label="Location">
    <div class="location-line"><span class="pin">⌖</span><div><small>Location</small><strong id="place">Not selected yet</strong><small id="location-status" class="location-status" aria-live="polite">Choose a city or find your location</small></div><button id="locate" class="link-btn" type="button">Find me</button></div>
    <form id="city-form"><label for="city">Or enter a city</label><div class="city-input"><input id="city" name="city" placeholder="e.g. London" autocomplete="address-level2" required minlength="2"><button type="submit">Search</button></div><div id="suggestions" class="suggestions" role="listbox" aria-label="City suggestions" hidden></div></form>
  </section>
  <div class="actions"><button id="check" class="action" type="button"><span class="action-symbol">☔</span><span>Check weather</span><small>Current conditions & next change</small></button></div>
  <section id="weather-results" class="weather-results" aria-live="polite">
    <article class="weather-card neutral" id="current-card"><span class="weather-badge" id="current-badge">CURRENT</span><h2 id="current-title">Not checked yet</h2><p id="current-detail">Choose a location to check the weather.</p></article>
    <article class="weather-card neutral" id="forecast-card"><span class="weather-badge" id="forecast-badge">FORECAST</span><h2 id="forecast-title">Waiting for data</h2><p id="forecast-detail">The next weather change will appear here.</p></article>
  </section>
  <section id="answer" class="answer" aria-live="polite" role="status"><span class="answer-label">STATUS</span><p>Choose a location and check the weather.</p></section>
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
const actionButtons = [document.querySelector('#check')];
const currentCard = document.querySelector('#current-card');
const forecastCard = document.querySelector('#forecast-card');

function render(message, category = '') {
  answer.className = `answer ${category}`;
  answer.innerHTML = '<span class="answer-label">ANSWER</span>';
  const p = document.createElement('p');
  p.textContent = message;
  answer.append(p);
}
function updateCard(card, badgeId, titleId, detailId, tone, badge, title, detail) {
  card.className = `weather-card ${tone}`;
  document.querySelector(badgeId).textContent = badge;
  document.querySelector(titleId).textContent = title;
  document.querySelector(detailId).textContent = detail;
}

function displayWeather(raining, currentText, forecastText, { cached = false, savedAt = null } = {}) {
  const currentTone = raining === true ? 'wet' : raining === false ? 'dry' : 'neutral';
  const futureTone = raining === true ? 'dry' : raining === false ? 'wet' : 'neutral';
  const prefix = cached ? 'SAVED ' : '';
  updateCard(currentCard, '#current-badge', '#current-title', '#current-detail',
    currentTone, prefix + (raining === true ? 'RAINING' : raining === false ? 'DRY' : 'UNKNOWN'),
    raining === true ? 'It is raining' : raining === false ? 'It is not raining' : 'Conditions unavailable',
    currentText);
  updateCard(forecastCard, '#forecast-badge', '#forecast-title', '#forecast-detail',
    futureTone, prefix + (raining === true ? 'WILL STOP' : raining === false ? 'WILL START' : 'FORECAST'),
    raining === true ? 'When will it stop?' : raining === false ? 'When will it start?' : 'Forecast unavailable',
    forecastText);
  if (cached) render(`Saved weather from ${new Date(savedAt).toLocaleString('en-GB')}. Not live data.`, 'offline');
  else render('Forecast checked. Times are approximate.', 'success');
}

function setBusy(value) {
  busy = value;
  // Offline actions stay clickable so they can show saved data immediately.
  actionButtons.forEach(button => { button.disabled = value && navigator.onLine; });
  locateButton.disabled = value && navigator.onLine;
  cityForm.querySelector('button').disabled = value && navigator.onLine;
  cityInput.disabled = false;
}

function showSavedWeather() {
  const saved = location ? getWeatherSnapshot(location) : null;
  if (!saved) return render('No saved weather for this location. Connect once to download a forecast.', 'offline');
  const currentText = saved.raining === true ? 'Rain was recorded at the last check.'
    : saved.raining === false ? 'No rain was recorded at the last check.' : 'Current rain data was unavailable.';
  const forecastText = saved.raining === true ? saved.stopForecast
    : saved.raining === false ? (saved.nextRainForecast || 'No saved start-time forecast is available.')
    : 'No reliable forecast is available.';
  displayWeather(saved.raining, currentText, forecastText, { cached: true, savedAt: saved.savedAt });
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
  updateCard(currentCard, '#current-badge', '#current-title', '#current-detail',
    'neutral', 'CURRENT', 'Waiting for weather', 'Checking the selected location.');
  updateCard(forecastCard, '#forecast-badge', '#forecast-title', '#forecast-detail',
    'neutral', 'FORECAST', 'Waiting for forecast', 'The next change will appear here.');
  if (!navigator.onLine) {
    showSavedWeather();
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
      hourly: 'rain,showers,precipitation,precipitation_probability',
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
        observedAt: data.current?.time,
        stopForecast: rainUntil(data),
        nextRainForecast: rainNow(data) === false ? rainStarts(data, { absoluteDate: true }) : null
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
async function ask() {
  if (!navigator.onLine) {
    showSavedWeather();
    return;
  }
  if (busy) return;
  if (!location) return render('First select Find me or enter a city.', 'error');
  setBusy(true);
  render('Checking the forecast…', 'loading');
  try {
    const data = await getWeather(location);
    if (!navigator.onLine) {
      showSavedWeather();
      return;
    }
    const raining = rainNow(data);
    displayWeather(raining,
      raining === true ? 'Rain is currently detected in this area.'
        : raining === false ? 'No rain is currently detected in this area.'
        : 'Current rainfall data is unavailable.',
      raining === true ? rainUntil(data)
        : raining === false ? rainStarts(data)
        : 'Current conditions are uncertain.');
  } catch (error) {
    if (!navigator.onLine) showSavedWeather();
    else {
      const saved = location && getWeatherSnapshot(location);
      if (saved) showSavedWeather();
      else render(error.message || 'Could not load the forecast.', 'error');
    }
  } finally {
    setBusy(false);
  }
}
locateButton.addEventListener('click', locate);
// Start location discovery when the app opens; the manual city search remains available after failure.
cityForm.addEventListener('submit', chooseCity);
actionButtons[0].addEventListener('click', ask);

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
