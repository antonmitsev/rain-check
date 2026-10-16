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
  <div class="hero"><div class="eyebrow">ВРЕМЕТО НА ДВА КЛИКА</div><h1>Да взема ли<br><em>чадър?</em></h1><p>Два въпроса. Кратки отговори. Без регистрация.</p></div>
  <section class="location-panel" aria-label="Местоположение">
    <div class="location-line"><span class="pin">⌖</span><div><small>Местоположение</small><strong id="place">Все още не е зададено</strong></div><button id="locate" class="link-btn" type="button">Намери ме</button></div>
    <form id="city-form"><label for="city">Или въведи град</label><div class="city-input"><input id="city" name="city" placeholder="Например София" autocomplete="address-level2" required minlength="2"><button type="submit">Избери</button></div></form>
  </section>
  <div class="actions"><button id="now" class="action" type="button"><span class="action-symbol">☔</span><span>Вали ли?</span><small>Точно сега</small></button><button id="until" class="action" type="button"><span class="action-symbol">◷</span><span>Докога ще вали?</span><small>Следващите часове</small></button></div>
  <section id="answer" class="answer" aria-live="polite" role="status"><span class="answer-label">ОТГОВОР</span><p>Избери местоположение и натисни бутон.</p></section>
  <footer>Прогнозни данни: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · Възможни са локални отклонения.</footer>
</section>`;

const place = document.querySelector('#place');
const answer = document.querySelector('#answer');
const locateButton = document.querySelector('#locate');
const cityForm = document.querySelector('#city-form');
const actionButtons = [document.querySelector('#now'), document.querySelector('#until')];

function render(message, category = '') {
  answer.className = `answer ${category}`;
  answer.innerHTML = '<span class="answer-label">ОТГОВОР</span>';
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
  render('Готово. Избери въпрос.');
}
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Браузърът не поддържа геолокация.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false, timeout: 12000, maximumAge: 300000
    });
  });
}
async function locate() {
  if (busy) return;
  setBusy(true);
  render('Търся местоположението…', 'loading');
  try {
    const pos = await getCurrentPosition();
    setLocation(pos.coords.latitude, pos.coords.longitude, 'Текущото ми местоположение');
  } catch (error) {
    render(error.code === 1
      ? 'Достъпът до местоположение е отказан. Въведи град по-долу.'
      : 'Не успях да взема местоположението. Въведи град по-долу.', 'error');
  } finally { setBusy(false); }
}
async function chooseCity(event) {
  event.preventDefault();
  if (busy) return;
  const name = new FormData(cityForm).get('city')?.trim();
  if (!name || name.length < 2) return;
  setBusy(true);
  render('Търся града…', 'loading');
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({name, count: '1', language: 'bg', format: 'json'}).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error('Няма връзка с услугата за градове.');
    const data = await response.json();
    const city = data.results?.[0];
    if (!city) throw new Error('Не намирам този град. Опитай с друго име.');
    setLocation(city.latitude, city.longitude, [city.name, city.country].filter(Boolean).join(', '));
  } catch (error) { render(error.message || 'Възникна грешка.', 'error'); }
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
  if (!response.ok) throw new Error('Метеорологичната услуга е недостъпна.');
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
  if (raining === null) return 'Няма достатъчно данни за текущите валежи.';
  if (!raining) return 'Според текущите метеоданни в района не вали.';
  const times = data.hourly?.time;
  const amounts = data.hourly?.precipitation;
  if (!Array.isArray(times) || !Array.isArray(amounts)) return 'Няма достатъчно данни кога ще спре.';
  // Open-Meteo hourly timestamps are local to the requested timezone; current.time has the same convention.
  const currentHour = data.current?.time?.slice(0, 13);
  const start = times.findIndex(t => t.slice(0, 13) > currentHour);
  if (start < 0) return 'Няма достатъчно данни кога ще спре.';
  for (let i = start; i < amounts.length - 1; i++) {
    if (Number.isFinite(amounts[i]) && Number.isFinite(amounts[i + 1])
        && amounts[i] < STOP_THRESHOLD && amounts[i + 1] < STOP_THRESHOLD) {
      const hour = times[i].slice(11, 16);
      return `Очаква се дъждът да спре около ${hour} ч. (приблизителна почасова прогноза).`;
    }
  }
  return 'Не се очертава ясно спиране на дъжда в близката прогноза.';
}
async function ask(kind) {
  if (busy) return;
  if (!location) return render('Първо избери „Намери ме“ или въведи град.', 'error');
  setBusy(true);
  render('Проверявам прогнозата…', 'loading');
  try {
    const data = await getWeather();
    const raining = rainNow(data);
    const message = kind === 'now'
      ? raining === null ? 'Няма достатъчно актуални данни за валежите.'
        : raining ? 'Според текущите метеоданни в района вали.'
        : 'Според текущите метеоданни в района не вали.'
      : rainUntil(data);
    render(message, 'success');
  } catch (error) { render(error.message || 'Не успях да заредя прогнозата.', 'error'); }
  finally { setBusy(false); }
}
locateButton.addEventListener('click', locate);
cityForm.addEventListener('submit', chooseCity);
actionButtons[0].addEventListener('click', () => ask('now'));
actionButtons[1].addEventListener('click', () => ask('until'));
