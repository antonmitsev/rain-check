import type { CityMatch } from '../types';

interface GeocodingResponse {
  results?: CityMatch[];
}

interface NominatimResponse {
  address?: Record<string, string | undefined>;
}

export class GeocodingService {
  private readonly reverseCache = new Map<string, string>();

  async searchCities(query: string, signal: AbortSignal): Promise<CityMatch[]> {
    if (!navigator.onLine) throw new Error('City search is unavailable offline.');
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({
      name: query, count: '7', language: 'en', format: 'json'
    }).toString();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('City search is unavailable.');
    const data = await response.json() as GeocodingResponse;
    return Array.isArray(data.results) ? data.results : [];
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const key = `${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
    const cached = this.reverseCache.get(key);
    if (cached) return cached;

    // One lookup per explicit GPS action; never use Nominatim for autocomplete.
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.search = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'jsonv2',
      zoom: '10',
      addressdetails: '1',
      'accept-language': 'en'
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error('Reverse geocoding unavailable');
    const data = await response.json() as NominatimResponse;
    const address = data.address ?? {};
    const name = [
      address.city || address.town || address.village || address.municipality || address.county,
      address.state,
      address.country
    ].filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ');
    if (!name) throw new Error('No place name available');
    this.reverseCache.set(key, name);
    return name;
  }
}
