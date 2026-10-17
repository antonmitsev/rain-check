export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (!import.meta.env.PROD) {
    // Vite development modules are not an offline build. Remove stale workers on this origin.
    void navigator.serviceWorker.getRegistration('./')
      .then(registration => registration?.unregister())
      .catch(error => console.warn('Could not unregister development service worker:', error));
    return;
  }

  // Reload only previously controlled tabs after the complete new shell activates.
  const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);
  let reloadStarted = false;
  let reloadDeferred = false;

  function reloadUpdatedApp(): void {
    if (!hadControllerOnLoad || reloadStarted) return;
    if (!navigator.onLine) {
      reloadDeferred = true;
      return;
    }
    reloadStarted = true;
    window.location.reload();
  }

  async function checkForUpdate(): Promise<void> {
    if (!navigator.onLine) return;
    if (reloadDeferred) {
      reloadUpdatedApp();
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration('./');
      if (registration) await registration.update();
    } catch (error) {
      console.warn('Could not check for a PWA update:', error);
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', reloadUpdatedApp);
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none'
      });
      await registration.update();
    } catch (error) {
      console.warn('Service worker registration failed:', error);
    }
  });
  window.addEventListener('focus', () => { void checkForUpdate(); });
  window.addEventListener('online', () => { void checkForUpdate(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkForUpdate();
  });
}
