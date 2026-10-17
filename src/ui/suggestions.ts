import type { CityMatch } from '../types';

export function cityLabel(city: CityMatch): string {
  return [city.name, city.admin1, city.country]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ');
}

export class SuggestionsView {
  private cities: CityMatch[] = [];
  private activeIndex = -1;
  private selectCity: ((city: CityMatch) => void) | null = null;

  constructor(private readonly element: HTMLDivElement) {}

  get hidden(): boolean {
    return this.element.hidden;
  }

  get hasOptions(): boolean {
    return this.cities.length > 0;
  }

  clear(): void {
    this.element.replaceChildren();
    this.element.hidden = true;
    this.cities = [];
    this.activeIndex = -1;
    this.selectCity = null;
  }

  show(cities: CityMatch[], onSelect: (city: CityMatch) => void): void {
    this.clear();
    this.cities = cities;
    this.selectCity = onSelect;
    if (!cities.length) {
      const message = document.createElement('div');
      message.className = 'suggestion-empty';
      message.textContent = 'No matching cities';
      this.element.append(message);
    }
    cities.forEach((city, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'suggestion-item';
      item.setAttribute('role', 'option');
      item.id = `suggestion-${index}`;
      item.textContent = cityLabel(city);
      item.addEventListener('click', () => onSelect(city));
      this.element.append(item);
    });
    this.element.hidden = false;
  }

  moveActive(direction: 1 | -1): void {
    if (!this.cities.length) return;
    this.activeIndex = (this.activeIndex + direction + this.cities.length) % this.cities.length;
    this.element.querySelectorAll<HTMLElement>('.suggestion-item').forEach((item, index) => {
      const active = index === this.activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
    });
  }

  chooseActive(): boolean {
    const city = this.cities[this.activeIndex];
    if (!city || !this.selectCity) return false;
    this.selectCity(city);
    return true;
  }
}
