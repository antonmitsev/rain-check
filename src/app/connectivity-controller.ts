import type { AppElements } from '../ui/app-shell';
import { renderConnectionState } from '../ui/connectivity';
import type { ToastView } from '../ui/toast';
import type { BusyState } from './busy-state';

export class ConnectivityController {
  private originUnavailable = false;
  private checkId = 0;

  constructor(
    private readonly elements: AppElements,
    private readonly toast: ToastView,
    private readonly busy: BusyState,
    private readonly onOffline: () => void
  ) {}

  start(): void {
    window.addEventListener('online', () => {
      this.originUnavailable = false;
      this.render();
      void this.checkAppServer();
    });
    window.addEventListener('offline', () => {
      this.checkId += 1;
      this.originUnavailable = false;
      this.render();
    });
    window.addEventListener('focus', () => { void this.checkAppServer(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.checkAppServer();
    });
    this.render();
    void this.checkAppServer();
  }

  private render(): void {
    const { offline, warning, hadWarning } = renderConnectionState(
      this.elements,
      this.originUnavailable
    );
    if (offline) {
      this.onOffline();
      return;
    }

    this.busy.refresh();
    if (this.originUnavailable && !hadWarning && !this.busy.isActive) {
      this.toast.show(
        'The app server is unreachable. Cached UI is available; live weather may still work.',
        'offline'
      );
    } else if (!warning && hadWarning && !this.busy.isActive) {
      this.toast.show(
        'Connection restored. Press Check weather for a fresh forecast.',
        'success'
      );
    }
  }

  // A cached PWA can run while its origin is down even if navigator.onLine is true.
  private async checkAppServer(): Promise<void> {
    if (!import.meta.env.PROD || !navigator.onLine) return;
    const checkId = ++this.checkId;
    let unavailable = false;
    try {
      // version.json is explicitly network-only in the service worker.
      await fetch(new URL('./version.json', document.baseURI), { cache: 'no-store' });
    } catch {
      unavailable = true;
    }
    if (checkId !== this.checkId || !navigator.onLine) return;
    this.originUnavailable = unavailable;
    this.render();
  }
}
