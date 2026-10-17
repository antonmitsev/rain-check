import type { AppElements } from '../ui/app-shell';

export class BusyState {
  private active = false;

  constructor(private readonly elements: AppElements) {}

  get isActive(): boolean {
    return this.active;
  }

  set(active: boolean): void {
    this.active = active;
    this.refresh();
  }

  refresh(): void {
    // Offline actions stay clickable so saved data can be shown immediately.
    const disabled = this.active && navigator.onLine;
    this.elements.checkButton.disabled = disabled;
    this.elements.locateButton.disabled = disabled;
    this.elements.citySubmitButton.disabled = disabled;
    this.elements.cityInput.disabled = false;
  }
}
