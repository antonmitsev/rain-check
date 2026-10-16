import './style.css';

const app = document.querySelector('#app');
const CACHE_TTL = 10 * 60 * 1000;
const STOP_THRESHOLD = 0.1;
let location = null;
let busy = false;
let weatherCache = new Map();

app.innerHTML = `
<section class="shell">
  <header><div class="brand"><span class="brand-icon" aria-hidden="true">☁</span> RainCheck</div><span class="version">v0.1</span></header>
  <div class="hero"><div class="eyebrow">WEATHER IN TWO CLICKS</div><h1>Do I need an<br><em>umbrella?</em></h1><p>Two questions. Short answers. No sign-up.</p></div>
  <section class="location-panel" aria-label="Location">
    <div class="location-line"><span class="pin">⌖</span><div><small>Location</small><strong id="place">Not selected yet</strong></div><button id="locate" class="link-btn" type="button">Find me</button></div>
    <form id="city-form"><label for="city">Or enter a city</label><div class="city-input"><input id="city" name="city" placeholder="e.g. London" autocomplete="address-level2" required minlength="2"><button type="submit">Select</button></div></form>
  </section>
  <div class="actions"><button id="now" class="action" type="button"><span class="action-symbol">☔</span><span>Is it raining?</span><small>Right now</small></button><button id="until" class="action" type="button"><span class="action-symbol">◷</span><span>When will it stop?</span><small>Next few hours</small></button></div>
  <section id="answer" class="answer" aria-live="polite" role="status"><span class="answer-label">ANSWER</span><p>Select местоположение и натисни бутон.</p></section>
  <footer>Weather data: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Local conditions may differ.</footer>
</section>`;

const place = document.querySelector('#place');
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
  [...actionButtons, locateButton, cityForm.querySelector('button')].forEach(b => b.disabled = value);
}
function setLocation(latitude, longitude, name) {
  location = {latitude, longitude, name};
  place.textContent = name;
  render('Готово. Select въпрос.');
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
  if (busy) return;
  setBusy(true);
  render('Finding your location…', 'loading');
  try {
    const pos = await getCurrentPosition();
    setLocation(pos.coords.latitude, pos.coords.longitude, 'My current location');
  } catch (error) {
    render(error.code === 1
      ? 'Location access was denied. Enter a city below.'
      : 'Could not determine your location. Enter a city below.', 'error');
  } finally { setBusy(false); }
}
async function chooseCity(event) {
  event.preventDefault();
  if (busy) return;
  const name = new FormData(cityForm).get('city')?.trim();
  if (!name || name.length < 2) return;
  setBusy(true);
  render('Finding the city…', 'loading');
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({name, count: '1', language: 'en', format: 'json'}).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error('The city search service is unavailable.');
    const data = await response.json();
    const city = data.results?.[0];
    if (!city) throw new Error('City not found. Try another name.');
    setLocation(city.latitude, city.longitude, [city.name, city.country].filter(Boolean).join(', '));
  } catch (error) { render(error.message || 'Something went wrong.', 'error'); }
  finally { setBusy(false); }
}
async function getWeather() {
  const key = `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`;
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.time < CACHE_TTL) return cached.data;
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'rain,showers,precipitation',
    hourly: 'precipitation,precipitation_probability',
    forecast_days: '2',
    timezone: 'auto'
  }).toString();
  const response = await fetch(url);
  if (!response.ok) throw new Error('The weather service is unavailable.');
  const data = await response.json();
  weatherCache.set(key, {data, time: Date.now()});
  return data;
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
  if (busy) return;
  if (!location) return render('Първо избери „Find me“ или въведи град.', 'error');
  setBusy(true);
  render('Checking the forecast…', 'loading');
  try {
    const data = await getWeather();
    const raining = rainNow(data);
    const message = kind === 'now'
      ? raining === null ? 'There is not enough current rainfall data.'
        : raining ? 'According to current weather data, it is raining in this area.'
        : 'According to current weather data, it is not raining in this area.'
      : rainUntil(data);
    render(message, 'success');
  } catch (error) { render(error.message || 'Could not load the forecast.', 'error'); }
  finally { setBusy(false); }
}
locateButton.addEventListener('click', locate);
cityForm.addEventListener('submit', chooseCity);
actionButtons[0].addEventListener('click', () => ask('now'));
actionButtons[1].addEventListener('click', () => ask('until'));
