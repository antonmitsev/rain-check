import type { WeatherResponse } from '../types';

// These values are forecasts, not measurements from the user's street.
const RAIN_THRESHOLD_MM = 0.1;

interface ForecastHours {
  times: Array<string | null>;
  amounts: Array<number | null>;
  start: number;
}

export interface RainStartOptions {
  absoluteDate?: boolean;
}

export function rainNow(data: WeatherResponse): boolean | null {
  const current = data?.current;
  if (!current || !Number.isFinite(current.rain) || !Number.isFinite(current.showers)) {
    return null;
  }
  return Number(current.rain) > 0 || Number(current.showers) > 0;
}

function forecastHours(data: WeatherResponse): ForecastHours | null {
  const times = data?.hourly?.time;
  const rain = data?.hourly?.rain;
  const showers = data?.hourly?.showers;
  let amounts: Array<number | null> | undefined;

  // Total precipitation includes snow; prefer rain and showers when available.
  if (Array.isArray(rain) || Array.isArray(showers)) {
    const count = Math.max(rain?.length ?? 0, showers?.length ?? 0);
    amounts = Array.from({ length: count }, (_, index) => {
      const rainAmount = rain?.[index];
      const showerAmount = showers?.[index];
      return Number.isFinite(rainAmount) || Number.isFinite(showerAmount)
        ? (Number.isFinite(rainAmount) ? Number(rainAmount) : 0)
          + (Number.isFinite(showerAmount) ? Number(showerAmount) : 0)
        : null;
    });
  } else {
    // Compatibility with older responses that contain precipitation only.
    amounts = data?.hourly?.precipitation;
  }

  const currentHour = data?.current?.time?.slice(0, 13);
  if (!Array.isArray(times) || !Array.isArray(amounts)
      || typeof currentHour !== 'string' || currentHour.length !== 13) {
    return null;
  }
  const start = times.findIndex(time =>
    typeof time === 'string' && time.slice(0, 13) > currentHour);
  return start < 0 ? null : { times, amounts, start };
}

function approximateTime(time: string, currentTime: string, absoluteDate = false): string | null {
  const date = time.slice(0, 10);
  const clock = time.slice(11, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(clock)) return null;
  if (!absoluteDate && date === currentTime.slice(0, 10)) return `around ${clock} today`;

  const currentDay = Date.parse(`${currentTime.slice(0, 10)}T00:00:00Z`);
  const forecastDay = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(currentDay) || !Number.isFinite(forecastDay)) return null;
  if (!absoluteDate && forecastDay - currentDay === 86_400_000) {
    return `around ${clock} tomorrow`;
  }
  const dateLabel = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC', day: 'numeric', month: 'short'
  }).format(new Date(forecastDay));
  return `around ${clock} on ${dateLabel}`;
}

export function rainStarts(data: WeatherResponse, options: RainStartOptions = {}): string {
  const hours = forecastHours(data);
  if (!hours) return 'The hourly forecast cannot estimate when rain may start.';

  const { times, amounts, start } = hours;
  let hasValidValues = false;
  for (let index = start; index < Math.min(times.length, amounts.length); index += 1) {
    const amount = amounts[index];
    if (!Number.isFinite(amount)) continue;
    hasValidValues = true;
    if (Number(amount) >= RAIN_THRESHOLD_MM) {
      const time = times[index];
      const currentTime = data.current?.time;
      const when = typeof time === 'string' && typeof currentTime === 'string'
        ? approximateTime(time, currentTime, options.absoluteDate)
        : null;
      return when
        ? `Rain is forecast to start ${when} (approximate hourly forecast).`
        : 'The hourly forecast cannot estimate when rain may start.';
    }
  }
  return hasValidValues
    ? 'No rain is forecast within the available hourly forecast period.'
    : 'The hourly forecast cannot estimate when rain may start.';
}

export function describeRainNow(data: WeatherResponse): string {
  const raining = rainNow(data);
  if (raining === null) return 'There is not enough current rainfall data.';
  if (raining) return 'According to current weather data, it is raining in this area.';
  return `According to current weather data, it is not raining in this area. ${rainStarts(data)}`;
}

export function rainUntil(data: WeatherResponse): string {
  const raining = rainNow(data);
  if (raining === null) return 'There is not enough current rainfall data.';
  if (!raining) return 'According to current weather data, it is not raining in this area.';

  const hours = forecastHours(data);
  if (!hours) return 'There is not enough forecast data to estimate when rain will stop.';
  const { times, amounts, start } = hours;
  for (let index = start; index < Math.min(times.length, amounts.length) - 1; index += 1) {
    const amount = amounts[index];
    const nextAmount = amounts[index + 1];
    if (Number.isFinite(amount) && Number.isFinite(nextAmount)
        && Number(amount) < RAIN_THRESHOLD_MM && Number(nextAmount) < RAIN_THRESHOLD_MM) {
      const time = times[index];
      if (typeof time === 'string') {
        return `Rain is expected to stop around ${time.slice(11, 16)} (approximate hourly forecast).`;
      }
    }
  }
  return 'The near-term forecast does not show a clear end to the rain.';
}
