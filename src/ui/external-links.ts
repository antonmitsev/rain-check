/**
 * iOS Home Screen PWAs can keep target="_blank" navigation inside an in-app
 * browser. iOS 17+ supports an observed, non-standard x-safari-https:// URL
 * scheme that asks the system to route a link to Safari.
 *
 * Only intercept explicit clicks on external HTTPS links in iOS standalone.
 * Leave ordinary browser navigation, internal routes and modified clicks alone.
 */
function isStandaloneIos(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios && (navigatorWithStandalone.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches);
}

function supportsSafariScheme(): boolean {
  const match = navigator.userAgent.match(/OS (\d+)[._]/);
  return Boolean(match && Number(match[1]) >= 17);
}

export function installExternalLinkRouting(): void {
  document.addEventListener('click', event => {
    if (event.defaultPrevented || !event.isTrusted || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || !isStandaloneIos() || !supportsSafariScheme()) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;

    let url: URL;
    try { url = new URL(anchor.href); } catch { return; }
    if (url.protocol !== 'https:' || url.origin === window.location.origin) return;

    // Use the installed PWA's explicit user gesture, not automatic redirects.
    event.preventDefault();
    window.location.href = 'x-safari-' + url.href;
  });
}
