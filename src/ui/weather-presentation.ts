export interface ForecastTimeParts {
  time: string;
  day: string;
}

// Forecast strings remain in storage for backwards compatibility. Only a
// recognised approximate time is promoted into the large visual summary.
export function forecastTimeParts(forecastText: string | null | undefined): ForecastTimeParts | null {
  const match = typeof forecastText === 'string'
    ? forecastText.match(/around\s+(\d{2}:\d{2})(?:\s+(today|tomorrow)|\s+on\s+(\d{1,2}\s+[A-Za-z]{3}))?/i)
    : null;
  if (!match) return null;
  return {
    time: match[1],
    day: match[2] === 'tomorrow' ? 'tomorrow'
      : match[2] === 'today' ? 'today' : (match[3] || '')
  };
}

export function compactForecast(raining: boolean | null, text: string | null): string {
  const next = forecastTimeParts(text);
  if (next) {
    const day = next.day ? ` ${next.day}` : '';
    return `${raining === true ? 'Stops' : 'Starts'} ~${next.time}${day}`;
  }
  if (raining === false && typeof text === 'string' && text.includes('No rain is forecast')) {
    return 'No rain expected';
  }
  return 'Time unknown';
}
